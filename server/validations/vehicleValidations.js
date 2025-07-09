const validator = require("validator");
const isEmpty = require("./is_empty");
const users = require("../db/models/users");
const vehicles = require("../db/models/vehicles");
const vehicle_types = require("../db/models/vehicle_types");
const vehicle_body_types = require("../db/models/vehicle_body_types");
const Image = require("../db/models/images");
const vehicle_status = require("../db/models/vehicle_status");
const Documents = require("../db/models/documents");
const { Types } = require("mongoose");
const jwt = require("jsonwebtoken");
const user_types = require("../db/models/user_types");

exports.vehicleCreationValidator = async function (data, user_id) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.user = !isEmpty(data.user) ? data.user : "";
    data.vehicleNumber = !isEmpty(data.vehicleNumber) ? data.vehicleNumber : "";
    data.vehicleType = !isEmpty(data.vehicleType) ? data.vehicleType : "";
    data.vehicleBodyType = !isEmpty(data.vehicleBodyType)
      ? data.vehicleBodyType
      : "";
    data.vehicleCapacity = !isEmpty(data.vehicleCapacity)
      ? data.vehicleCapacity
      : "";
    data.goodsAccepted = !isEmpty(data.goodsAccepted) ? data.goodsAccepted : "";
    data.registrationCertificate = !isEmpty(data.registrationCertificate)
      ? data.registrationCertificate
      : "";
    data.truckImages = !isEmpty(data.truckImages) ? data.truckImages : [];

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating user
      if (!user_id) {
        errors.user = "Please login to continue";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "User must be a valid MongoDB ObjectId";
      } else {
        const user = await users.findById(user_id);
        if (!user) {
          errors.user = "User does not exist";
        } else if (user.user_type.toString() === "68484d1eefb856d41ac28c55") {
          errors.user = "Customers cannot add vehicles";
        }
      }

      // Validating Vehicle Number
      function isValidVehicleNumber(vehicleNumber) {
        /*
          Accepts formats like:
          - KL07AB1234
          - KL-07-AB-1234
          - KL 07 AB 1234
        */
        const regex =
          /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,2}[ -]?[0-9]{1,4}$/i;
        return regex.test(vehicleNumber);
      }

      function normalizeVehicleNumber(vehicleNumber) {
        return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      }

      if (validator.isEmpty(data.vehicleNumber)) {
        errors.vehicleNumber = "Vehicle number is required";
      } else if (!isValidVehicleNumber(data.vehicleNumber)) {
        errors.vehicleNumber =
          "Invalid vehicle number format. Examples: KL07AB1234, KL-07-AB-1234, KL 07 AB 1234";
      } else {
        const normalizedNumber = normalizeVehicleNumber(data.vehicleNumber);

        const existing = await vehicles.findOne({
          vehicleNumber: normalizedNumber,
        });

        if (existing) {
          errors.vehicleNumber =
            "A vehicle with this number is already registered in the system";
        }
      }

      //Validating vehicleType
      if (validator.isEmpty(data.vehicleType)) {
        errors.vehicleType = "Vehicle type is required";
      } else if (!Types.ObjectId.isValid(data.vehicleType)) {
        errors.vehicleType = "Vehicle type must be a valid MongoDB ObjectId";
      } else {
        const vehicle_type = await vehicle_types.findById(data.vehicleType);
        if (!vehicle_type) {
          errors.vehicleType = "Vehicle type does not exist";
        }
      }

      //Validating vehicleBodyType
      if (validator.isEmpty(data.vehicleBodyType)) {
        errors.vehicleBodyType = "Vehicle body type is required";
      } else if (!Types.ObjectId.isValid(data.vehicleBodyType)) {
        errors.vehicleBodyType =
          "Invalid vehicle body type ID. Must be a valid MongoDB ObjectId";
      } else {
        const bodyTypeRecord = await vehicle_body_types.findById(
          data.vehicleBodyType
        );
        if (!bodyTypeRecord) {
          errors.vehicleBodyType = "Selected vehicle body type does not exist";
        }
      }

      //Validating vehicleCapacity
      if (
        data.vehicleCapacity === undefined ||
        data.vehicleCapacity === null ||
        data.vehicleCapacity === ""
      ) {
        errors.vehicleCapacity = "Vehicle capacity is required";
      } else if (isNaN(data.vehicleCapacity)) {
        errors.vehicleCapacity = "Vehicle capacity should be a number";
      } else if (Number(data.vehicleCapacity) <= 0) {
        errors.vehicleCapacity = "Vehicle capacity should be greater than zero";
      }

      //Validating goodsAccepted
      if (
        typeof data.goodsAccepted === "undefined" ||
        data.goodsAccepted === null ||
        data.goodsAccepted === ""
      ) {
        errors.goodsAccepted = "Goods accepted field is required";
      } else if (typeof data.goodsAccepted !== "boolean") {
        // In case the frontend sends it as a string like "true" or "false", may want to allow it:
        const normalized = String(data.goodsAccepted).toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          errors.goodsAccepted =
            "Goods accepted must be a boolean value (true or false)";
        } else {
          // Convert and assign normalized boolean
          data.goodsAccepted = normalized === "true";
        }
      }

      // Validate registrationCertificate
      if (validator.isEmpty(data.registrationCertificate)) {
        errors.registrationCertificate = "Registration certificate is required";
      } else if (!Types.ObjectId.isValid(data.registrationCertificate)) {
        errors.registrationCertificate =
          "Registration certificate must be a valid MongoDB ObjectId";
      } else {
        const document = await Documents.findById(data.registrationCertificate);
        if (!document) {
          errors.registrationCertificate =
            "Registration certificate document not found";
        }
      }

      //Validating truckImages
      if (isEmpty(data.truckImages)) {
        errors.truckImages = "Vehicle images are required";
      } else if (!Array.isArray(data.truckImages)) {
        errors.truckImages = "Vehicle images must be an array of image IDs";
      } else if (data.truckImages.length === 0) {
        errors.truckImages = "Vehicle images array cannot be empty";
      } else if (data.truckImages && data.truckImages.length > 0) {
        var validImageIds = [];

        if (!Array.isArray(data.truckImages)) {
          errors.truckImages = "Truck images must be an array of image IDs";
        }

        // Check for duplicate truckImages IDs
        const seen = new Set();
        data.truckImages.forEach((id, index) => {
          if (seen.has(id)) {
            errors[`truckImages[${index}]`] = "Duplicate image ID detected";
          }
          seen.add(id);
        });

        // Filter out invalid ObjectIds early
        const validObjectIds = data.truckImages.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidIds = data.truckImages.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        invalidIds.forEach((id) => {
          errors[`truckImages[${data.truckImages.indexOf(id)}]`] =
            "Invalid MongoDB ObjectId";
        });

        if (validObjectIds.length === 0) {
          errors.truckImages = "No valid images";
        }

        // Fetch all matching images uploaded by the user
        const foundImages = await Image.find({
          _id: { $in: validObjectIds },
        }).select("_id");

        const foundImageIds = foundImages.map((img) => img._id.toString());

        validObjectIds.forEach((id, i) => {
          if (!foundImageIds.includes(id.toString())) {
            errors[`truckImages[${data.truckImages.indexOf(id)}]`] =
              "Image not found";
          } else {
            validImageIds.push(id);
          }
        });
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validImageIds,
    };
  } catch (error) {
    console.log("Vehicle creation validation error : ", error);
  }
};

exports.vehicleUpdateValidator = async function (
  data,
  user_id,
  vehicleId,
  truckImages,
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
    data.user = !isEmpty(data.user) ? data.user : "";
    data.vehicleNumber = !isEmpty(data.vehicleNumber) ? data.vehicleNumber : "";
    data.vehicleType = !isEmpty(data.vehicleType) ? data.vehicleType : "";
    data.vehicleBodyType = !isEmpty(data.vehicleBodyType)
      ? data.vehicleBodyType
      : "";
    data.vehicleCapacity = !isEmpty(data.vehicleCapacity)
      ? data.vehicleCapacity
      : "";
    data.goodsAccepted = !isEmpty(data.goodsAccepted) ? data.goodsAccepted : "";
    data.registrationCertificate = !isEmpty(data.registrationCertificate)
      ? data.registrationCertificate
      : "";
    data.images = !isEmpty(data.images) ? data.images : "";
    data.status = !isEmpty(data.status) ? data.status : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating user
      if (!user_id) {
        errors.user = "Please login to continue";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "User must be a valid MongoDB ObjectId";
      } else {
        let vehicle = await vehicles.findById(vehicleId);
        if (!vehicle) {
          errors.vehicle = "No vehicle found";
        } else if (vehicle.user.toString() !== user_id) {
          errors.user = "Not allowed";
        }
      }
      //Validating vehicle Number
      if (data.vehicleNumber) {
        function isValidVehicleNumber(vehicleNumber) {
          /* 
        This regex allows both formats like:
        KL07AB1234
        KL-07-AB-1234
        KL 07 AB 1234 
        */
          const regex =
            /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,2}[ -]?[0-9]{1,4}$/i;
          return regex.test(vehicleNumber);
        }

        if (!isValidVehicleNumber(data.vehicleNumber)) {
          errors.vehicleNumber = "Invalid vehicle number format";
        } else {
          function normalizeVehicleNumber(vehicleNumber) {
            return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
          }
          let vehicle_number = normalizeVehicleNumber(data.vehicleNumber);
          const existing = await vehicles.findOne({
            vehicleNumber: vehicle_number,
            _id: { $ne: vehicleId },
          });
          if (existing) {
            errors.vehicleNumber = "Vehicle number already exists";
          }
        }
      }

      //Validating vehicleType
      if (data.vehicleType) {
        if (!Types.ObjectId.isValid(data.vehicleType)) {
          errors.vehicleType = "Vehicle type must be a valid MongoDB ObjectId";
        } else {
          const vehicle_type = await vehicle_types.findById(data.vehicleType);
          if (!vehicle_type) {
            errors.vehicleType = "Vehicle type does not exist";
          }
        }
      }

      //Validating vehicleBodyType
      if (data.vehicleBodyType) {
        if (validator.isEmpty(data.vehicleBodyType)) {
          errors.vehicleBodyType = "Vehicle body type is required";
        } else if (!Types.ObjectId.isValid(data.vehicleBodyType)) {
          errors.vehicleBodyType =
            "Invalid vehicle body type ID. Must be a valid MongoDB ObjectId";
        } else {
          const bodyTypeRecord = await vehicle_body_types.findById(
            data.vehicleBodyType
          );
          if (!bodyTypeRecord) {
            errors.vehicleBodyType =
              "Selected vehicle body type does not exist";
          }
        }
      }

      //Validating status
      if (data.status) {
        if (!Types.ObjectId.isValid(data.status)) {
          errors.status = "Vehicle status must be a valid MongoDB ObjectId";
        } else {
          const status = await vehicle_status.findById(data.status);
          if (!status) {
            errors.status = "Vehicle status does not exist";
          }
        }
      }

      //Validating capacity
      if (data.vehicleCapacity) {
        if (
          data.vehicleCapacity === undefined ||
          data.vehicleCapacity === null ||
          data.vehicleCapacity === ""
        ) {
          errors.vehicleCapacity = "Vehicle capacity is required";
        } else if (isNaN(data.vehicleCapacity)) {
          errors.vehicleCapacity = "Vehicle capacity should be a number";
        } else if (Number(data.vehicleCapacity) <= 0) {
          errors.vehicleCapacity =
            "Vehicle capacity should be greater than zero";
        }
      }

      // //Validating registration year
      // if (data.registrationYear) {
      //   const currentYear = new Date().getFullYear();

      //   if (isNaN(data.registrationYear)) {
      //     errors.registrationYear =
      //       "Vehicle registration year should be a number";
      //   } else if (
      //     Number(data.registrationYear) < 1990 ||
      //     Number(data.registrationYear) > currentYear
      //   ) {
      //     errors.registrationYear = `Vehicle registration year should be between 1990 and ${currentYear}`;
      //   }
      // }

      //Validating goodsAccepted
      if (data.goodsAccepted) {
        if (
          typeof data.goodsAccepted === "undefined" ||
          data.goodsAccepted === null ||
          data.goodsAccepted === ""
        ) {
          errors.goodsAccepted = "Goods accepted field is required";
        } else if (typeof data.goodsAccepted !== "boolean") {
          // In case the frontend sends it as a string like "true" or "false", may want to allow it:
          const normalized = String(data.goodsAccepted).toLowerCase();
          if (normalized !== "true" && normalized !== "false") {
            errors.goodsAccepted =
              "Goods accepted must be a boolean value (true or false)";
          } else {
            // Convert and assign normalized boolean
            data.goodsAccepted = normalized === "true";
          }
        }
      }

      //Validating registrationCertificate
      if (data.registrationCertificate) {
        if (validator.isEmpty(data.registrationCertificate)) {
          errors.registrationCertificate =
            "Registration certificate is required";
        } else if (!Types.ObjectId.isValid(data.registrationCertificate)) {
          errors.registrationCertificate =
            "Registration certificate must be a valid MongoDB ObjectId";
        } else {
          const document = await Documents.findById(
            data.registrationCertificate
          );
          if (!document) {
            errors.registrationCertificate =
              "Registration certificate document not found";
          } else if (!document.uploadedBy) {
            errors.registrationCertificate =
              "Not allowed, document not uploaded by any existing user";
          } else if (document.uploadedBy.toString() !== user_id) {
            errors.registrationCertificate = "Not allowed, invalid user";
          }
        }
      }

      //Validating truckImages

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
        const vehicle = await vehicles.findById(vehicleId).select("images");
        const currentImageIds =
          vehicle?.images?.map((id) => id.toString()) || [];

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
          const inVehicle = currentImageIds.includes(id);
          if (!inDb) {
            errors[`deletedImages[${deletedImages.indexOf(id)}]`] =
              "Image not found in DB";
          } else if (!inVehicle) {
            errors[`deletedImages[${deletedImages.indexOf(id)}]`] =
              "Image does not belong to this vehicle";
          }
          return inDb && inVehicle;
        });
      }

      // Validate and verify uploaded images
      if (!isEmpty(data.images)) {
        if (isEmpty(data.images)) {
          errors.images = "Images cannot be empty";
        }
        if (!Array.isArray(data.images)) {
          errors.images = "Images must be an array of image IDs";
        }
      }
      
      if (data.images && data.images.length > 0) {
        if (!Array.isArray(data.images)) {
          errors.images = "Images must be an array of image IDs";
        } else {
          const validObjectIds = data.images.filter((id) =>
            Types.ObjectId.isValid(id)
          );
          const invalidIds = data.images.filter(
            (id) => !Types.ObjectId.isValid(id)
          );

          invalidIds.forEach((id) => {
            errors[`data.images[${data.images.indexOf(id)}]`] =
              "Invalid MongoDB ObjectId";
          });

          if (validObjectIds.length === 0) {
            errors.images = "No valid images provided";
          } else {
            // Check for duplicate images IDs
            const seen = new Set();
            data.images.forEach((id, index) => {
              if (seen.has(id)) {
                errors[`images[${index}]`] = "Duplicate image ID detected";
              }
              seen.add(id);
            });
            // Fetch all matching images uploaded by the user
            const foundImages = await Image.find({
              _id: { $in: validObjectIds },
              uploadedBy: user_id,
            }).select("_id");

            const foundImageIds = foundImages.map((img) => img._id.toString());

            validObjectIds.forEach((id, i) => {
              if (!foundImageIds.includes(id.toString())) {
                errors[`images[${data.images.indexOf(id)}]`] =
                  "Image not found or not uploaded by this user";
              } else {
                validImageIdsToAdd.push(id);
              }
            });
          }
        }
      }

      //Validating documents

      // // Validate and sanitize removeDocumentIds
      // if (deletedDocuments && Array.isArray(deletedDocuments)) {
      //   // Step 1: Filter valid ObjectIds
      //   cleanRemoveDocumentIds = deletedDocuments.filter((id) =>
      //     Types.ObjectId.isValid(id)
      //   );
      //   const invalidRemoveIds = deletedDocuments.filter(
      //     (id) => !Types.ObjectId.isValid(id)
      //   );

      //   // Step 2: Add validation errors for invalid ObjectIds
      //   invalidRemoveIds.forEach((id) => {
      //     errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
      //       "Invalid document ID for removal";
      //   });

      //   // Step 3: Load the vehicle’s current image IDs
      //   const vehicle = await vehicles.findById(vehicleId).select("documents");
      //   const currentDocumentIds =
      //     vehicle?.documents?.map((id) => id.toString()) || [];

      //   // Step 4: Check existence in `images` collection
      //   const existingDocuments = await Documents.find({
      //     _id: { $in: cleanRemoveDocumentIds },
      //   }).select("_id");

      //   const existingDocumentIds = existingDocuments.map((doc) =>
      //     doc._id.toString()
      //   );

      //   // Step 5: Check each ID - must exist in DB and in vehicle document
      //   cleanRemoveDocumentIds = cleanRemoveDocumentIds.filter((id) => {
      //     const inDb = existingDocumentIds.includes(id);
      //     const inVehicle = currentDocumentIds.includes(id);
      //     if (!inDb) {
      //       errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
      //         "Document not found in DB";
      //     } else if (!inVehicle) {
      //       errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
      //         "Document does not belong to this vehicle";
      //     }
      //     return inDb && inVehicle;
      //   });
      // }

      // // Validate and verify uploaded documents
      // if (documents && documents.length > 0) {
      //   if (!Array.isArray(documents)) {
      //     errors.documents = "Documents must be an array of document IDs";
      //   } else {
      //     const validObjectIds = documents.filter((id) =>
      //       Types.ObjectId.isValid(id)
      //     );
      //     const invalidIds = documents.filter(
      //       (id) => !Types.ObjectId.isValid(id)
      //     );

      //     invalidIds.forEach((id) => {
      //       errors[`documents[${documents.indexOf(id)}]`] =
      //         "Invalid MongoDB ObjectId";
      //     });

      //     if (validObjectIds.length === 0) {
      //       errors.documents = "No valid documents provided";
      //     } else {
      //       // Fetch all matching documents uploaded by the user
      //       const foundDocuments = await Documents.find({
      //         _id: { $in: validObjectIds },
      //         uploadedBy: user_id,
      //       }).select("_id");

      //       const foundDocumentIds = foundDocuments.map((doc) =>
      //         doc._id.toString()
      //       );

      //       validObjectIds.forEach((id, i) => {
      //         if (!foundDocumentIds.includes(id.toString())) {
      //           errors[`documents[${documents.indexOf(id)}]`] =
      //             "Document not found or not uploaded by this user";
      //         } else {
      //           validDocumentIdsToAdd.push(id);
      //         }
      //       });
      //     }
      //   }
      // }
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
    console.log("Vehicle updation validation error : ", error);
  }
};

exports.updateVehicleStatusValidator = async function (
  data,
  user_id,
  vehicleId
) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.status = !isEmpty(data.status) ? data.status : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating user
      if (!user_id) {
        errors.user = "Please login to continue";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "User must be a valid MongoDB ObjectId";
      } else {
        let vehicle = await vehicles.findById(vehicleId);
        if (!vehicle) {
          errors.vehicle = "No vehicle found";
        } else if (vehicle.user.toString() !== user_id) {
          errors.user = "Not allowed";
        }
      }

      //Validating status
      if (data.status) {
        if (!Types.ObjectId.isValid(data.status)) {
          errors.status = "Vehicle status must be a valid MongoDB ObjectId";
        } else {
          const status = await vehicle_status.findById(data.status);
          if (!status) {
            errors.status = "Vehicle status does not exist";
          }
        }
      } else {
        errors.status = "Vehicle status is required";
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Vehicle status updation validation error : ", error);
  }
};
