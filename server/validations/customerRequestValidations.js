const validator = require("validator");
const isEmpty = require("./is_empty");
const users = require("../db/models/users");
const trips = require("../db/models/trips");
const Image = require("../db/models/images");
const Documents = require("../db/models/documents");
const requestStatus = require("../db/models/customer_request_status");
const { Types } = require("mongoose");
const customer_requests = require("../db/models/customer_requests");

// Check if coordinates are valid [lng, lat]
const isValidLngLat = (arr) =>
  Array.isArray(arr) &&
  arr.length === 2 &&
  typeof arr[0] === "number" &&
  typeof arr[1] === "number" &&
  arr[1] >= -90 &&
  arr[1] <= 90 &&
  arr[0] >= -180 &&
  arr[0] <= 180;

exports.customerRequestValidator = async function (
  data,
  user_id,
  images,
  documents
) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    user_id = !isEmpty(user_id) ? user_id : "";
    data.pickupLocation = !isEmpty(data.pickupLocation)
      ? data.pickupLocation
      : "";
    data.dropoffLocation = !isEmpty(data.dropoffLocation)
      ? data.dropoffLocation
      : "";
    data.packageDetails = !isEmpty(data.packageDetails)
      ? data.packageDetails
      : "";
    data.pickupTime = !isEmpty(data.pickupTime) ? data.pickupTime : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      // Validate user
      if (isEmpty(user_id)) {
        errors.user = "User is required";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "Invalid user ID";
      } else {
        const userExists = await users.findById(user_id);
        if (!userExists) errors.user = "User not found";
        if (userExists) {
          if (userExists.user_type.toString() === "68484d1eefb856d41ac28c56") {
            errors.user = "Drivers cannot add a customer request";
          }
        }
      }

      // Validate pickupLocation
      if (isEmpty(data.pickupLocation.address)) {
        errors.pickupLocation = { address: "Pickup address is required" };
      } else if (typeof data.pickupLocation.address !== "string") {
        errors.pickupLocation = { address: "Invalid pickup address format" };
      }

      if (isEmpty(data.pickupLocation.coordinates)) {
        errors.pickupLocation = {
          ...(errors.pickupLocation || {}),
          coordinates: "Pickup coordinates are required",
        };
      } else if (!isValidLngLat(data.pickupLocation.coordinates)) {
        errors.pickupLocation = {
          ...(errors.pickupLocation || {}),
          coordinates: "Pickup coordinates must be valid [lng, lat]",
        };
      }

      // Validate dropoffLocation
      if (isEmpty(data.dropoffLocation.address)) {
        errors.dropoffLocation = { address: "Dropoff address is required" };
      } else if (typeof data.dropoffLocation.address !== "string") {
        errors.dropoffLocation = { address: "Invalid dropoff address format" };
      }

      if (isEmpty(data.dropoffLocation.coordinates)) {
        errors.dropoffLocation = {
          ...(errors.dropoffLocation || {}),
          coordinates: "Dropoff coordinates are required",
        };
      } else if (!isValidLngLat(data.dropoffLocation.coordinates)) {
        errors.dropoffLocation = {
          ...(errors.dropoffLocation || {}),
          coordinates: "Dropoff coordinates must be valid [lng, lat]",
        };
      }

      // Validate packageDetails
      if (
        !isEmpty(data.packageDetails.weight) &&
        typeof data.packageDetails.weight !== "number"
      ) {
        errors.packageDetails = {
          ...(errors.packageDetails || {}),
          weight: "Weight must be a number",
        };
      }

      if (!isEmpty(data.packageDetails.dimensions)) {
        const { length, width, height } = data.packageDetails.dimensions;
        if (
          [length, width, height].some(
            (v) => v !== undefined && typeof v !== "number"
          )
        ) {
          errors.packageDetails = {
            ...(errors.packageDetails || {}),
            dimensions: "Dimensions must contain numbers only",
          };
        }
      }

      // Validate pickupTime (optional but must be a date if given)
      if (!isEmpty(data.pickupTime) && !validator.isISO8601(data.pickupTime)) {
        errors.pickupTime = "Pickup time must be a valid ISO8601 date";
      }

      // Validate status (optional but must be valid if provided)
      //   if (!isEmpty(data.status)) {
      //     if (!Types.ObjectId.isValid(data.status)) {
      //       errors.status = "Invalid status ID";
      //     } else {
      //       const statusExists = await requestStatus.findById(data.status);
      //       if (!statusExists) {
      //         errors.status = "Status not found";
      //       }
      //     }
      //   }

      // Validate matchedTrip (optional)
      //   if (!isEmpty(data.matchedTrip)) {
      //     if (!Types.ObjectId.isValid(data.matchedTrip)) {
      //       errors.matchedTrip = "Invalid matched trip ID";
      //     } else {
      //       const tripExists = await trips.findById(data.matchedTrip);
      //       if (!tripExists) {
      //         errors.matchedTrip = "Matched trip not found";
      //       }
      //     }
      //   }

      //Validating images

      if (images.length > 0) {
        var validImageIds = [];

        if (!Array.isArray(images)) {
          errors.images = "Images must be an array of image IDs";
        }

        // Check for duplicate image IDs
        const seen = new Set();
        images.forEach((id, index) => {
          if (seen.has(id)) {
            errors[`images[${index}]`] = "Duplicate image ID detected";
          }
          seen.add(id);
        });

        // Filter out invalid ObjectIds early
        const validObjectIds = images.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidIds = images.filter((id) => !Types.ObjectId.isValid(id));

        invalidIds.forEach((id) => {
          errors[`images[${images.indexOf(id)}]`] = "Invalid MongoDB ObjectId";
        });

        if (validObjectIds.length === 0) {
          errors.images = "No valid images";
        }

        // Fetch all matching images uploaded by the user
        const foundImages = await Image.find({
          _id: { $in: validObjectIds },
          uploadedBy: user_id,
        }).select("_id");

        const foundImageIds = foundImages.map((img) => img._id.toString());

        validObjectIds.forEach((id, i) => {
          if (!foundImageIds.includes(id.toString())) {
            errors[`images[${images.indexOf(id)}]`] =
              "Image not found or not uploaded by this user";
          } else {
            validImageIds.push(id);
          }
        });
      }

      //Validating documents
      if (documents.length > 0) {
        var validDocumentIds = [];

        if (!Array.isArray(documents)) {
          errors.documents = "Documents must be an array of document IDs";
        }

        // Check for duplicate document IDs
        const seen = new Set();
        documents.forEach((id, index) => {
          if (seen.has(id)) {
            errors[`documents[${index}]`] = "Duplicate document ID detected";
          }
          seen.add(id);
        });

        // Filter out invalid ObjectIds early
        const validObjectIds = documents.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidIds = documents.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        invalidIds.forEach((id) => {
          errors[`documents[${documents.indexOf(id)}]`] =
            "Invalid MongoDB ObjectId";
        });

        if (validObjectIds.length === 0) {
          errors.documents = "No valid documents";
        }

        // Fetch all matching documents uploaded by the user
        const foundDocuments = await Documents.find({
          _id: { $in: validObjectIds },
          uploadedBy: user_id,
        }).select("_id");

        const foundDocumentIds = foundDocuments.map((doc) =>
          doc._id.toString()
        );

        validObjectIds.forEach((id, i) => {
          if (!foundDocumentIds.includes(id.toString())) {
            errors[`documents[${documents.indexOf(id)}]`] =
              "Document not found or not uploaded by this user";
          } else {
            validDocumentIds.push(id);
          }
        });
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validImageIds,
      validDocumentIds,
    };
  } catch (err) {
    console.error("Customer request validation error:", err);
    return {
      errors: { server: "Validation process failed" },
      isValid: false,
    };
  }
};

exports.customerRequestUpdateValidator = async function (
  data,
  user_id,
  customerRequestId,
  images,
  deletedImages,
  documents,
  deletedDocuments
) {
  try {
    let errors = {};
    let validImageIdsToAdd = [];
    let cleanRemoveImageIds = [];
    let validDocumentIdsToAdd = [];
    let cleanRemoveDocumentIds = [];

    data = !isEmpty(data) ? data : "";
    user_id = !isEmpty(user_id) ? user_id : "";
    data.pickupLocation = !isEmpty(data.pickupLocation)
      ? data.pickupLocation
      : "";
    data.dropoffLocation = !isEmpty(data.dropoffLocation)
      ? data.dropoffLocation
      : "";
    data.packageDetails = !isEmpty(data.packageDetails)
      ? data.packageDetails
      : "";
    data.pickupTime = !isEmpty(data.pickupTime) ? data.pickupTime : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      // Validate user
      if (isEmpty(user_id)) {
        errors.user = "User is required";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "Invalid user ID";
      } else {
        const user = await users.findById(user_id);
        const customerRequest = await customer_requests.findById(
          customerRequestId
        );
        if (!user) {
          errors.user = "User not found";
        } else if (user.user_type.toString() === "68484d1eefb856d41ac28c56") {
          errors.user = "Drivers cannot update a customer request";
        } else if (user_id !== customerRequest.user.toString()) {
          errors.user = "Not allowed";
        }
      }

      //Validate pickupLocation
      if (!isEmpty(data.pickupLocation.address)) {
        if (isEmpty(data.pickupLocation.address)) {
          errors.pickupLocation = { address: "Pickup address is required" };
        } else if (typeof data.pickupLocation.address !== "string") {
          errors.pickupLocation = { address: "Invalid pickup address format" };
        }
      }

      if (!isEmpty(data.pickupLocation.coordinates)) {
        if (isEmpty(data.pickupLocation.coordinates)) {
          errors.pickupLocation = {
            ...(errors.pickupLocation || {}),
            coordinates: "Pickup coordinates are required",
          };
        } else if (!isValidLngLat(data.pickupLocation.coordinates)) {
          errors.pickupLocation = {
            ...(errors.pickupLocation || {}),
            coordinates: "Pickup coordinates must be valid [lng, lat]",
          };
        }
      }

      //Validating dropoffLocation
      if (!isEmpty(data.dropoffLocation.address)) {
        if (isEmpty(data.dropoffLocation.address)) {
          errors.dropoffLocation = { address: "Dropoff address is required" };
        } else if (typeof data.dropoffLocation.address !== "string") {
          errors.dropoffLocation = {
            address: "Invalid dropoff address format",
          };
        }
      }

      if (!isEmpty(data.dropoffLocation.coordinates)) {
        if (isEmpty(data.dropoffLocation.coordinates)) {
          errors.dropoffLocation = {
            ...(errors.dropoffLocation || {}),
            coordinates: "Dropoff coordinates are required",
          };
        } else if (!isValidLngLat(data.dropoffLocation.coordinates)) {
          errors.dropoffLocation = {
            ...(errors.dropoffLocation || {}),
            coordinates: "Dropoff coordinates must be valid [lng, lat]",
          };
        }
      }

      //Validating packageDetails
      if (
        !isEmpty(data.packageDetails.weight) &&
        typeof data.packageDetails.weight !== "number"
      ) {
        errors.packageDetails = {
          ...(errors.packageDetails || {}),
          weight: "Weight must be a number",
        };
      }

      if (!isEmpty(data.packageDetails.dimensions)) {
        const { length, width, height } = data.packageDetails.dimensions;
        if (
          [length, width, height].some(
            (v) => v !== undefined && typeof v !== "number"
          )
        ) {
          errors.packageDetails = {
            ...(errors.packageDetails || {}),
            dimensions: "Dimensions must contain numbers only",
          };
        }
      }

      // Validate pickupTime (optional but must be a date if given)
      if (!isEmpty(data.pickupTime) && !validator.isISO8601(data.pickupTime)) {
        errors.pickupTime = "Pickup time must be a valid ISO8601 date";
      }

      // Validate status (optional but must be valid if provided)
      if (!isEmpty(data.status)) {
        if (!Types.ObjectId.isValid(data.status)) {
          errors.status = "Invalid status ID";
        } else {
          const statusExists = await requestStatus.findById(data.status);
          if (!statusExists) {
            errors.status = "Status not found";
          }
        }
      }

      //Validating images
      // Validate and sanitize removeImageIds
      if (deletedImages && Array.isArray(deletedImages)) {
        // Step 1: Filter valid ObjectIds
        cleanRemoveImageIds = deletedImages.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidRemoveIds = deletedImages.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        // Step 2: Add validation errors for invalid ObjectIds
        invalidRemoveIds.forEach((id) => {
          errors[`deletedImages[${deletedImages.indexOf(id)}]`] =
            "Invalid image ID for removal";
        });

        // Step 3: Load the vehicle’s current image IDs
        const customerRequest = await customer_requests
          .findById(customerRequestId)
          .select("images");
        const currentImageIds =
          customerRequest?.images?.map((id) => id.toString()) || [];

        // Step 4: Check existence in `images` collection
        const existingImages = await Image.find({
          _id: { $in: cleanRemoveImageIds },
        }).select("_id");

        const existingImageIds = existingImages.map((img) =>
          img._id.toString()
        );

        // Step 5: Check each ID - must exist in DB and in vehicle document
        cleanRemoveImageIds = cleanRemoveImageIds.filter((id) => {
          const inDb = existingImageIds.includes(id);
          const inCustomerRequest = currentImageIds.includes(id);
          if (!inDb) {
            errors[`deletedImages[${deletedImages.indexOf(id)}]`] =
              "Image not found in DB";
          } else if (!inCustomerRequest) {
            errors[`deletedImages[${deletedImages.indexOf(id)}]`] =
              "Image does not belong to this customer request";
          }
          return inDb && inCustomerRequest;
        });
      }

      // Validate and verify uploaded images
      if (images && images.length > 0) {
        if (!Array.isArray(images)) {
          errors.images = "Images must be an array of image IDs";
        } else {
          const validObjectIds = images.filter((id) =>
            Types.ObjectId.isValid(id)
          );
          const invalidIds = images.filter((id) => !Types.ObjectId.isValid(id));

          invalidIds.forEach((id) => {
            errors[`images[${images.indexOf(id)}]`] =
              "Invalid MongoDB ObjectId";
          });

          if (validObjectIds.length === 0) {
            errors.images = "No valid images provided";
          } else {
            // Fetch all matching images uploaded by the user
            const foundImages = await Image.find({
              _id: { $in: validObjectIds },
              uploadedBy: user_id,
            }).select("_id");

            const foundImageIds = foundImages.map((img) => img._id.toString());

            validObjectIds.forEach((id, i) => {
              if (!foundImageIds.includes(id.toString())) {
                errors[`images[${images.indexOf(id)}]`] =
                  "Image not found or not uploaded by this user";
              } else {
                validImageIdsToAdd.push(id);
              }
            });
          }
        }
      }

      //Validating documents
      // Validate and sanitize removeDocumentIds
      if (deletedDocuments && Array.isArray(deletedDocuments)) {
        // Step 1: Filter valid ObjectIds
        cleanRemoveDocumentIds = deletedDocuments.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidRemoveIds = deletedDocuments.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        // Step 2: Add validation errors for invalid ObjectIds
        invalidRemoveIds.forEach((id) => {
          errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
            "Invalid document ID for removal";
        });

        // Step 3: Load the customer request’s current document IDs
        const customerRequest = await customer_requests
          .findById(customerRequestId)
          .select("documents");
        const currentDocumentIds =
          customerRequest?.documents?.map((id) => id.toString()) || [];

        // Step 4: Check existence in `documents` collection
        const existingDocuments = await Documents.find({
          _id: { $in: cleanRemoveDocumentIds },
        }).select("_id");

        const existingDocumentIds = existingDocuments.map((doc) =>
          doc._id.toString()
        );

        // Step 5: Check each ID - must exist in DB and in customer request document
        cleanRemoveDocumentIds = cleanRemoveDocumentIds.filter((id) => {
          const inDb = existingDocumentIds.includes(id);
          const inCustomerRequest = currentDocumentIds.includes(id);
          if (!inDb) {
            errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
              "Document not found in DB";
          } else if (!inCustomerRequest) {
            errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
              "Document does not belong to this customer request";
          }
          return inDb && inCustomerRequest;
        });
      }

      // Validate and verify uploaded documents
      if (documents && documents.length > 0) {
        if (!Array.isArray(documents)) {
          errors.documents = "Documents must be an array of document IDs";
        } else {
          const validObjectIds = documents.filter((id) =>
            Types.ObjectId.isValid(id)
          );
          const invalidIds = documents.filter((id) => !Types.ObjectId.isValid(id));

          invalidIds.forEach((id) => {
            errors[`documents[${documents.indexOf(id)}]`] =
              "Invalid MongoDB ObjectId";
          });

          if (validObjectIds.length === 0) {
            errors.documents = "No valid documents provided";
          } else {
            // Fetch all matching documents uploaded by the user
            const foundDocuments = await Documents.find({
              _id: { $in: validObjectIds },
              uploadedBy: user_id,
            }).select("_id");

            const foundDocumentIds = foundDocuments.map((doc) => doc._id.toString());

            validObjectIds.forEach((id, i) => {
              if (!foundDocumentIds.includes(id.toString())) {
                errors[`documents[${documents.indexOf(id)}]`] =
                  "Document not found or not uploaded by this user";
              } else {
                validDocumentIdsToAdd.push(id);
              }
            });
          }
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validImageIdsToAdd,
      cleanRemoveImageIds,
      validDocumentIdsToAdd,
      cleanRemoveDocumentIds,
    };
  } catch (error) {
    console.log("Customer request update validation error : ", error);
  }
};
