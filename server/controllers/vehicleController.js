const fs = require("fs");
const path = require("path");
const VehicleType = require("../db/models/vehicle_types");
const vehicleBodyType = require("../db/models/vehicle_body_types");
const Vehicle = require("../db/models/vehicles");
const VehicleStatus = require("../db/models/vehicle_status");
const Image = require("../db/models/images");
const Documents = require("../db/models/documents");
const mongoose = require("mongoose");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const cleanupUploadedAssets = require("../utils/utils").cleanupUploadedAssets;
const vehicleCreationValidator =
  require("../validations/vehicleValidations").vehicleCreationValidator;
const vehicleUpdateValidator =
  require("../validations/vehicleValidations").vehicleUpdateValidator;
const updateVehicleStatusValidator =
  require("../validations/vehicleValidations").updateVehicleStatusValidator;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const vehicles = require("../db/models/vehicles");
dotenv.config();

exports.createVehicle = async (req, res) => {
  try {
    let user_id = extractUserIdFromToken(req);

    if(!user_id) {
      let response = error_function({
        status : 400,
        message : "Please login to continue",
      });
      return res.status(response.statusCode).send(response);
    }

    const { errors, isValid, validImageIds } = await vehicleCreationValidator(
      req.body,
      user_id
    );

    if (isValid) {
      const {
        vehicleNumber,
        vehicleType,
        vehicleBodyType,
        vehicleCapacity,
        goodsAccepted,
        registrationCertificate,
        truckImages,
      } = req.body;

      function normalizeVehicleNumber(vehicleNumber) {
        return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
      }

      let vehicle_number = normalizeVehicleNumber(vehicleNumber);

      const newVehicle = await vehicles.create({
        user: user_id,
        vehicleNumber: vehicle_number,
        vehicleType,
        vehicleBodyType,
        vehicleCapacity,
        goodsAccepted,
        registrationCertificate,
        images: validImageIds,
      });

      //Save user_id in registrationCertificate record in documents collection
      if (registrationCertificate) {
        const registrationCertificateRecord = await Documents.findById(
          registrationCertificate
        );
        registrationCertificateRecord.uploadedBy = user_id;
        await registrationCertificateRecord.save();
      }

      //Saving user id in truckImages record in images collection
      if (validImageIds && validImageIds.length > 0) {
        await Image.updateMany(
          { _id: { $in: validImageIds } },
          { $set: { uploadedBy: user_id } }
        );
      }

      if (newVehicle) {
        let response = success_function({
          status: 201,
          data: newVehicle,
          message: "Vehicle registered successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Vehicle registration failed",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      await cleanupUploadedAssets({
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      let response = error_function({
        status: 400,
        message: "Validation failed",
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
      await cleanupUploadedAssets({
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      return;
    } else {
      console.log("Vehicle registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      await cleanupUploadedAssets({
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      return;
    }
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    let user_id = extractUserIdFromToken(req);
    let images = req.body ? req.body.images : null;
    let deletedImages = req.body ? req.body.deletedImages : null;
    let documents = req.body ? req.body.documents : null;
    let deletedDocuments = req.body ? req.body.deletedDocuments : null;

    const { vehicleId } = req.params;

    const {
      errors,
      isValid,
      validImageIdsToAdd,
      cleanRemoveImageIds,
      validDocumentIdsToAdd,
      cleanRemoveDocumentIds,
    } = await vehicleUpdateValidator(
      req.body,
      user_id,
      vehicleId,
      images,
      deletedImages,
      documents,
      deletedDocuments
    );

    if (isValid) {
      const updateData = req.body;

      // Filter out empty values
      let updateFields = Object.fromEntries(
        Object.entries(req.body).filter(
          ([_, value]) => value !== "" && value !== null && value !== undefined
        )
      );

      if (
        (validImageIdsToAdd && validImageIdsToAdd.length > 0) ||
        (cleanRemoveImageIds && cleanRemoveImageIds.length > 0)
      ) {
        const vehicle = await Vehicle.findById(vehicleId).select("images");
        if (!vehicle) {
          return res.status(404).send(
            error_function({
              status: 404,
              message: "Vehicle not found",
            })
          );
        }
        const currentImageIds = vehicle.images.map((id) => id.toString());

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

        updateFields.images = finalImageIds;

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
        const vehicle = await Vehicle.findById(vehicleId).select("documents");
        if (!vehicle) {
          return res.status(404).send(
            error_function({
              status: 404,
              message: "Vehicle not found",
            })
          );
        }
        const currentDocumentIds = vehicle.documents.map((id) => id.toString());

        // Remove unwanted documents
        const remainingDocuments = currentDocumentIds.filter(
          (id) => !cleanRemoveDocumentIds.includes(id)
        );

        // Add new document (avoid duplicates)
        const finalDocumentIds = Array.from(
          new Set([
            ...remainingDocuments,
            ...validDocumentIdsToAdd.map((id) => id.toString()),
          ])
        );

        updateFields.documents = finalDocumentIds;

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

      //Formatting vehicleNumber
      if (req.body.vehicleNumber) {
        function normalizeVehicleNumber(vehicleNumber) {
          return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
        }

        let vehicle_number = normalizeVehicleNumber(updateData.vehicleNumber);
        updateFields.vehicleNumber = vehicle_number;
      }

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedVehicle) {
        let response = error_function({
          status: 404,
          message: "Vehicle not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 200,
          data: updatedVehicle,
          message: "Vehicle updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
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
      console.log("Vehicles updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateVehicleStatus = async function (req, res) {
  try {
    let user_id;
    let vehicleId = req.params.vehicleId;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (
      token == null ||
      token == "null" ||
      token == "" ||
      token == "undefined"
    ) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      res.status(response.statusCode).send(response);
      return;
    }

    //verifying token
    jwt.verify(token, process.env.PRIVATE_KEY, async function (err, decoded) {
      if (err) {
        let response = error_function({
          status: 401,
          message: err.message,
        });
        res.status(401).send(response);
        return;
      } else {
        user_id = decoded.user_id;
      }
    });
    const { isValid, errors } = await updateVehicleStatusValidator(
      req.body,
      user_id,
      vehicleId
    );

    if (isValid) {
      // Check if vehicle exists
      const vehicle = await vehicles.findById(vehicleId);
      if (!vehicle) {
        let response = error_function({
          status: 404,
          message: "Vehicle not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        // Update vehicle status
        vehicle.status = req.body.status;
        await vehicle.save();

        let response = success_function({
          status: 200,
          data: vehicle,
          message: "Vehicle status updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation failed",
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
      console.log("User types updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const { vehicleType, status, search, user, vehicle } = req.query;

    let filter = {};

    //Validating vehicle
    if (vehicle) {
      if (!mongoose.Types.ObjectId.isValid(vehicle)) {
        let response = error_function({
          status: 400,
          message: "Vehicle must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating user
    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        let response = error_function({
          status: 400,
          message: "User must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating vehicle type
    if (vehicleType) {
      if (!mongoose.Types.ObjectId.isValid(vehicleType)) {
        let response = error_function({
          status: 400,
          message: "Vehicle type must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    //Validating vehicle status
    if (status) {
      if (!mongoose.Types.ObjectId.isValid(status)) {
        let response = error_function({
          status: 400,
          message: "Vehicle status must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    // Specific filters
    if (vehicle) filter._id = vehicle;
    if (user) filter.user = user;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;

    // Global search
    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: new RegExp(search, "i") } },
        { model: { $regex: new RegExp(search, "i") } },
        { brand: { $regex: new RegExp(search, "i") } },
        { color: { $regex: new RegExp(search, "i") } },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate("vehicleType", "-__v")
      .populate("status", "-__v")
      .populate("user", "-password -__v")
      .populate("images", "-__v");

    if (vehicles) {
      let response = success_function({
        status: 200,
        data: vehicles,
        message: "Vehicles fetches successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicles not found",
      });
      return res.status(response).send(response);
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
      console.log("Vehicles listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

// List all vehicle types
exports.listVehicleTypes = async (req, res) => {
  try {
    const types = await VehicleType.find({ status: "active" }).select("-__v");

    if (types) {
      let response = success_function({
        status: 200,
        data: types,
        message: "Vehicle types retrieved successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicle types not found",
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
      console.log("Vehicle types listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

// List all vehicle body types
exports.listVehicleBodyTypes = async (req, res) => {
  try {
    const types = await vehicleBodyType
      .find({ status: "active" })
      .select("-__v");

    if (types) {
      let response = success_function({
        status: 200,
        data: types,
        message: "Vehicle body types retrieved successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicle body types not found",
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
      console.log("Vehicle body types listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.listVehicleStatuses = async (req, res) => {
  try {
    const statuses = await VehicleStatus.find({}, { __v: 0 }).sort({ name: 1 });

    if (statuses) {
      let response = success_function({
        status: 200,
        data: statuses,
        message: "Vehicle statuses fetched successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Vehicle statuses not found",
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
      console.log("Vehicle status listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
