const fs = require("fs");
const path = require("path");
const CustomerRequestStatus = require("../db/models/customer_request_status");
const {
  success_function,
  error_function,
} = require("../utils/response-handler");
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const CustomerRequest = require("../db/models/customer_requests");
const customerRequestValidator =
  require("../validations/customerRequestValidations").customerRequestValidator;
const customerRequestUpdateValidator =
  require("../validations/customerRequestValidations").customerRequestUpdateValidator;
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Trip = require("../db/models/trips");
const customer_requests = require("../db/models/customer_requests");
const Image = require("../db/models/images");
const Documents = require("../db/models/documents");

exports.createCustomerRequest = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, packageDetails, pickupTime } =
      req.body;

    let user_id = extractUserIdFromToken(req);
    let images = req.body.images ? req.body.images : [];
    let documents = req.body.documents ? req.body.documents : [];

    //Validations
    const { errors, isValid, validImageIds, validDocumentIds } =
      await customerRequestValidator(req.body, user_id, images, documents);

    if (isValid) {
      // const image = req.file ? req.file.filename : null;

      // if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
      //   return res.status(400).json({ success: false, message: "Invalid pickup location coordinates" });
      // }

      // if (!dropoffLocation || !dropoffLocation.coordinates || dropoffLocation.coordinates.length !== 2) {
      //   return res.status(400).json({ success: false, message: "Invalid dropoff location coordinates" });
      // }

      const newRequest = await CustomerRequest.create({
        user: user_id,
        images: validImageIds,
        documents: validDocumentIds,
        pickupLocation: {
          address: pickupLocation.address,
          coordinates: {
            type: "Point",
            coordinates: pickupLocation.coordinates,
          },
        },
        dropoffLocation: {
          address: dropoffLocation.address,
          coordinates: {
            type: "Point",
            coordinates: dropoffLocation.coordinates,
          },
        },
        packageDetails,
        pickupTime,
      });

      if (newRequest) {
        let response = success_function({
          status: 201,
          data: newRequest,
          message: "Customer request created successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Operation failed",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      // Also handle cleanup here in case of unexpected errors
      if (req.file && req.file.path) {
        fs.unlink(
          path.join(
            __dirname,
            "../uploads/customerRequests",
            req.file.filename
          ),
          (err) => {
            if (err) console.error("Failed to delete uploaded image:", err);
          }
        );
      }
      let response = error_function({
        status: 400,
        message: "Validation Failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Customer Request creation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateCustomerRequest = async (req, res) => {
  try {
    let user_id = extractUserIdFromToken(req);
    let images = req.body ? req.body.images : null;
    let deletedImages = req.body ? req.body.deletedImages : null;
    let documents = req.body ? req.body.documents : null;
    let deletedDocuments = req.body.deletedDocuments
      ? req.body.deletedDocuments
      : null;

    const {
      errors,
      isValid,
      validImageIdsToAdd,
      cleanRemoveImageIds,
      validDocumentIdsToAdd,
      cleanRemoveDocumentIds,
    } = await customerRequestUpdateValidator(
      req.body,
      user_id,
      req.params.customerRequestId,
      images,
      deletedImages,
      documents,
      deletedDocuments
    );

    if (isValid) {
      const customerRequestId = req.params.customerRequestId;

      if (!mongoose.Types.ObjectId.isValid(customerRequestId)) {
        let response = error_function({
          status: 400,
          message: "Invalid request ID",
        });
        return res.status(response.statusCode).send(response);
      }

      const customerRequest = await customer_requests.findById(
        customerRequestId
      );

      if (!customerRequest) {
        let response = error_function({
          status: 404,
          message: "Customer request not found",
        });
        return res.status(response.statusCode).send(response);
      }

      // Only the request creator can update
      if (customerRequest.user.toString() !== user_id) {
        let response = error_function({
          status: 403,
          message: "Unauthorized access to update this request",
        });
        return res.status(response.statusCode).send(response);
      }

      const {
        pickupLocation,
        dropoffLocation,
        packageDetails,
        pickupTime,
        status,
      } = req.body;
      const update = {};

      if (pickupLocation) {
        update.pickupLocation = {
          address:
            pickupLocation.address || customerRequest.pickupLocation.address,
          coordinates: {
            type: "Point",
            coordinates:
              pickupLocation.coordinates ||
              customerRequest.pickupLocation.coordinates.coordinates,
          },
        };
      }

      if (dropoffLocation) {
        update.dropoffLocation = {
          address:
            dropoffLocation.address || customerRequest.dropoffLocation.address,
          coordinates: {
            type: "Point",
            coordinates:
              dropoffLocation.coordinates ||
              customerRequest.dropoffLocation.coordinates.coordinates,
          },
        };
      }

      if (packageDetails) {
        update.packageDetails = {
          weight:
            packageDetails.weight ?? customerRequest.packageDetails?.weight,
          dimensions: {
            length:
              packageDetails.dimensions?.length ??
              customerRequest.packageDetails?.dimensions?.length,
            width:
              packageDetails.dimensions?.width ??
              customerRequest.packageDetails?.dimensions?.width,
            height:
              packageDetails.dimensions?.height ??
              customerRequest.packageDetails?.dimensions?.height,
          },
          description:
            packageDetails.description ??
            customerRequest.packageDetails?.description,
        };
      }

      if (pickupTime) update.pickupTime = pickupTime;
      if (status) update.status = status;

      if (
        (validImageIdsToAdd && validImageIdsToAdd.length > 0) ||
        (cleanRemoveImageIds && cleanRemoveImageIds.length > 0)
      ) {
        const customerRequest = await customer_requests
          .findById(customerRequestId)
          .select("images");
        if (!customerRequest) {
          return res.status(404).send(
            error_function({
              status: 404,
              message: "Customer request not found",
            })
          );
        }
        const currentImageIds = customerRequest.images.map((id) =>
          id.toString()
        );

        // Remove unwanted images
        const remainingImages = currentImageIds.filter(
          (id) => !cleanRemoveImageIds.includes(id)
        );

        // Add new images (avoid duplicates)
        const finalImageIds = Array.from(
          new Set([
            ...remainingImages,
            ...validImageIdsToAdd.map((id) => id.toString()),
          ])
        );

        update.images = finalImageIds;

        // //delete image records from DB
        // await Image.deleteMany({ _id: { $in: cleanRemoveImageIds } });

        // 1. Convert all IDs to string for comparison
        const addIds = validImageIdsToAdd.map((id) => id.toString());
        const removeIds = cleanRemoveImageIds.map((id) => id.toString());

        // 2. Filter out common IDs — these should NOT be deleted
        const finalRemoveImageIds = removeIds.filter(
          (id) => !addIds.includes(id)
        );

        // 3. Proceed only if there are non-conflicting IDs left to delete
        if (finalRemoveImageIds.length > 0) {
          const imagesToDelete = await Image.find({
            _id: { $in: finalRemoveImageIds },
          });

          for (const img of imagesToDelete) {
            const filePath = path.join(__dirname, "..", img.path);
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete file ${filePath}:`, err);
              }
            });
          }

          await Image.deleteMany({ _id: { $in: finalRemoveImageIds } });
        }
      }

      if (
        (validDocumentIdsToAdd && validDocumentIdsToAdd.length > 0) ||
        (cleanRemoveDocumentIds && cleanRemoveDocumentIds.length > 0)
      ) {
        const customerRequest = await customer_requests
          .findById(customerRequestId)
          .select("documents");
        if (!customerRequest) {
          return res.status(404).send(
            error_function({
              status: 404,
              message: "Customer request not found",
            })
          );
        }
        const currentDocumentIds = customerRequest.documents.map((id) =>
          id.toString()
        );

        // Remove unwanted documents
        const remainingDocuments = currentDocumentIds.filter(
          (id) => !cleanRemoveDocumentIds.includes(id)
        );

        // Add new documents (avoid duplicates)
        const finalDocumentIds = Array.from(
          new Set([
            ...remainingDocuments,
            ...validDocumentIdsToAdd.map((id) => id.toString()),
          ])
        );

        update.documents = finalDocumentIds;

        // 1. Convert all IDs to string for comparison
        const addIds = validDocumentIdsToAdd.map((id) => id.toString());
        const removeIds = cleanRemoveDocumentIds.map((id) => id.toString());

        // 2. Filter out common IDs — these should NOT be deleted
        const finalRemoveDocumentIds = removeIds.filter(
          (id) => !addIds.includes(id)
        );

        // 3. Proceed only if there are non-conflicting IDs left to delete
        if (finalRemoveDocumentIds.length > 0) {
          const documentsToDelete = await Documents.find({
            _id: { $in: finalRemoveDocumentIds },
          });

          for (const doc of documentsToDelete) {
            const filePath = path.join(__dirname, "..", doc.path);
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete file ${filePath}:`, err);
              }
            });
          }

          await Documents.deleteMany({ _id: { $in: finalRemoveDocumentIds } });
        }
      }

      const updated = await CustomerRequest.findByIdAndUpdate(
        customerRequestId,
        { $set: update },
        { new: true }
      );

      if (updated) {
        let response = success_function({
          status: 200,
          data: updated,
          message: "Customer request updated successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Problem updating customer request",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation Failed",
      });
      response.errors = errors;
      res.status(response.statusCode).send(response);
      return;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Customer Request updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllCustomerRequests = async function (req, res) {
  try {
    const {
      userId,
      customerRequestId,
      status,
      keyword,
      date,
      lat,
      lng,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
    } = req.query;

    const count = Number(await customer_requests.countDocuments());
    const pageNumber = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || count;
    const radius = req.query.radius || 1000; //Optional radius (in meters) for "near" check (default 1000m)

    const filters = [];

    if (customerRequestId && userId) {
      let datas = await customer_requests
        .findOne({ _id: customerRequestId, user: userId })
        .populate("user status", "-password -__v");

      if (datas) {
        let response = success_function({
          status: 200,
          data: datas,
          message: "Customer request records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Record not fouond",
        });
        return res.status(response.statusCode).send(response);
      }
    } else if (customerRequestId) {
      let datas = await customer_requests
        .findOne({ _id: customerRequestId })
        .populate("user status", "-password -__v");

      if (datas) {
        let response = success_function({
          status: 200,
          data: datas,
          message: "Customer request records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Record not fouond",
        });
        return res.status(response.statusCode).send(response);
      }
    } else if (userId) {
      const total = await customer_requests.countDocuments({ user: userId });
      let datas = await customer_requests
        .find({ user: userId })
        .populate("user status", "-password -__v")
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(parseInt(pageSize));

      if (datas) {
        let response = success_function({
          status: 200,
          data: {
            count: total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: Number(pageNumber),
            datas,
          },
          message: "Customer request records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Record not found",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    // Filter by status
    if (status) {
      if (!mongoose.Types.ObjectId.isValid(status)) {
        let response = error_function({
          status: 400,
          message: "Invalid status ID",
        });
        return res.status(response.statusCode).send(response);
      }
      filters.push({ status });
    }

    // Filter by date
    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      filters.push({
        createdAt: {
          $gte: targetDate,
          $lt: nextDate,
        },
      });
    }

    if (keyword) {
      filters.push({
        $or: [
          { "pickupLocation.address": { $regex: keyword, $options: "i" } },
          { "dropoffLocation.address": { $regex: keyword, $options: "i" } },
          { "packageDetails.description": { $regex: keyword, $options: "i" } },
        ],
      });
    }

    //Geo filter for pickups or dropoffs in a specific location
    if (lat && lng) {
      const geoFilter = {
        $or: [
          {
            "pickupLocation.coordinates": {
              $near: {
                $geometry: {
                  type: "Point",
                  coordinates: [parseFloat(lng), parseFloat(lat)],
                },
                $maxDistance: parseFloat(radius),
              },
            },
          },
          {
            "dropoffLocation.coordinates": {
              $near: {
                $geometry: {
                  type: "Point",
                  coordinates: [parseFloat(lng), parseFloat(lat)],
                },
                $maxDistance: parseFloat(radius),
              },
            },
          },
        ],
      };
      filters.push(geoFilter);
    }

    // Geo Filter for pickup
    if (pickupLat && pickupLng) {
      filters.push({
        "pickupLocation.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)],
            },
            $maxDistance: parseInt(radius),
          },
        },
      });
    }

    // Geo Filter for dropoff
    if (dropoffLat && dropoffLng) {
      filters.push({
        "dropoffLocation.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(dropoffLng), parseFloat(dropoffLat)],
            },
            $maxDistance: parseInt(radius),
          },
        },
      });
    }

    const total = await customer_requests.countDocuments(
      filters.length > 0 ? { $and: filters } : {}
    );
    const requests = await customer_requests
      .find(filters.length > 0 ? { $and: filters } : {})
      .populate("user status")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(parseInt(pageSize));

    const response = success_function({
      status: 200,
      data: {
        count: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: Number(pageNumber),
        datas: requests,
      },
      message: "Customer requests retrieved successfully",
    });

    return res.status(response.statusCode).send(response);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Error fetching customer requests: ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMyCustomerRequests = async (req, res) => {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return res
        .status(401)
        .send(error_function({ status: 401, message: "Unauthorized" }));
    }

    const myRequests = await CustomerRequest.find({ user: userId })
      .populate("status user", "-__v -password")
      .sort({ createdAt: -1 });

    return res.status(200).send(
      success_function({
        status: 200,
        message: "My customer requests fetched successfully",
        data: myRequests,
      })
    );
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("My customer requests : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMatchedTrips = async (req, res) => {
  try {
    const { id } = req.params; //Customer request id
    const { tripDate, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      let response = error_function({
        status: 400,
        message: "Invalid customer request ID",
      });
      return res.status(response.statusCode).send(response);
    }

    const request = await CustomerRequest.findById(id);
    if (!request) {
      let response = error_function({
        status: 404,
        message: "Customer request not found",
      });
      return res.status(response.statusCode).send(response);
    }

    const pickup = request.pickupLocation.coordinates.coordinates; // [lng, lat]
    const dropoff = request.dropoffLocation.coordinates.coordinates; // [lng, lat]

    // Build the base filter with optional tripDate and status
    const baseFilter = {};
    if (tripDate) {
      baseFilter.tripDate = new Date(tripDate);
    }
    if (status) {
      if (mongoose.Types.ObjectId.isValid(status)) {
        baseFilter.status = status;
      } else {
        let response = error_function({
          status: 400,
          message: "Status must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    // Find trips that pass through pickup location
    const pickupTrips = await Trip.find({
      ...baseFilter,
      routeGeoJSON: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: pickup,
          },
        },
      },
    }).populate("user vehicle", "-__v -password");

    // Find trips that pass through dropoff location
    const dropoffTrips = await Trip.find({
      ...baseFilter,
      routeGeoJSON: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: dropoff,
          },
        },
      },
    }).populate("user vehicle", "-__v -password");

    // Separate trips into categories
    const pickupTripIds = pickupTrips.map((t) => t._id.toString());
    const dropoffTripIds = dropoffTrips.map((t) => t._id.toString());

    const both = pickupTrips.filter((t) =>
      dropoffTripIds.includes(t._id.toString())
    );
    const onlyPickup = pickupTrips.filter(
      (t) => !dropoffTripIds.includes(t._id.toString())
    );
    const onlyDropoff = dropoffTrips.filter(
      (t) => !pickupTripIds.includes(t._id.toString())
    );

    let response = success_function({
      status: 200,
      data: {
        bothLocations: both,
        onlyPickup,
        onlyDropoff,
      },
      message: "Trips fetched successfully",
    });
    return res.status(response.statusCode).send(response);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Error matching trips : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllCustomerRequestStatuses = async (req, res) => {
  try {
    const statuses = await CustomerRequestStatus.find().sort({ createdAt: 1 });

    if (statuses) {
      let response = success_function({
        status: 200,
        data: statuses,
        message: "Statuses fetched successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Statuses not found",
      });
      return res.status(response.statusCode).send(response);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      let response = error_function({
        status: 400,
        message: error
          ? error.message
            ? error.message
            : error
          : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      console.log("Customer requests status fetching error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
