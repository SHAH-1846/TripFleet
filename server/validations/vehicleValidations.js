const validator = require("validator");
const isEmpty = require("./is_empty");
const users = require("../db/models/users");
const vehicles = require("../db/models/vehicles");
const vehicle_types = require("../db/models/vehicle_types");
const Image = require("../db/models/images");
const vehicle_status = require("../db/models/vehicle_status");
const { Types } = require("mongoose");
const jwt = require("jsonwebtoken");
const user_types = require("../db/models/user_types");

exports.vehicleCreationValidator = async function (data, user_id, images) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.user = !isEmpty(data.user) ? data.user : "";
    data.vehicleNumber = !isEmpty(data.vehicleNumber) ? data.vehicleNumber : "";
    data.vehicleType = !isEmpty(data.vehicleType) ? data.vehicleType : "";
    data.brand = !isEmpty(data.brand) ? data.brand : "";
    data.model = !isEmpty(data.model) ? data.model : "";
    data.color = !isEmpty(data.color) ? data.color : "";
    data.capacity = !isEmpty(data.capacity) ? data.capacity : "";
    data.registrationYear = !isEmpty(data.registrationYear)
      ? data.registrationYear
      : "";

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

      //Validating VehicleNumber
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
      if (validator.isEmpty(data.vehicleNumber)) {
        errors.vehicleNumber = "Vehicle number is required";
      } else if (!isValidVehicleNumber(data.vehicleNumber)) {
        errors.vehicleNumber = "Invalid format";
      } else {
        function normalizeVehicleNumber(vehicleNumber) {
          return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); // Removes -, space, etc.
        }

        let vehicle_number = normalizeVehicleNumber(data.vehicleNumber);

        // Check if vehicle number already exists
        const existing = await vehicles.findOne({
          vehicleNumber: vehicle_number,
        });
        if (existing) {
          errors.vehicleNumber = "Vehicle number already exists";
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

      //Validating brand
      if (validator.isEmpty(data.brand)) {
        errors.brand = "Vehicle brand is required";
      }

      //Validating model
      if (validator.isEmpty(data.model)) {
        errors.model = "Vehicle model is required";
      }

      //Validating color
      if (validator.isEmpty(data.color)) {
        errors.color = "Vehicle color is required";
      }

      //Validating capacity
      if (
        data.capacity === undefined ||
        data.capacity === null ||
        data.capacity === ""
      ) {
        errors.capacity = "Vehicle capacity is required";
      } else if (isNaN(data.capacity)) {
        errors.capacity = "Vehicle capacity should be a number";
      } else if (Number(data.capacity) <= 0) {
        errors.capacity = "Vehicle capacity should be greater than zero";
      }

      //Validating registration year
      const currentYear = new Date().getFullYear();
      if (
        data.registrationYear === undefined ||
        data.registrationYear === null ||
        data.registrationYear === ""
      ) {
        errors.registrationYear = "Vehicle registration year is required";
      } else if (isNaN(data.registrationYear)) {
        errors.registrationYear =
          "Vehicle registration year should be a number";
      } else if (
        Number(data.registrationYear) < 1990 ||
        Number(data.registrationYear) > currentYear
      ) {
        errors.registrationYear = `Vehicle registration year should be between 1990 and ${currentYear}`;
      }

      //Validating images

      if (images.length > 0) {
        var validImageIds = [];

        if (!Array.isArray(images)) {
          errors.images = "Images must be an array of image IDs";
        }

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
  images,
  deletedImages
) {
  try {
    let errors = {};
    let validImageIdsToAdd = [];
    let cleanRemoveImageIds = [];

    data = !isEmpty(data) ? data : "";
    data.user = !isEmpty(data.user) ? data.user : "";
    data.vehicleNumber = !isEmpty(data.vehicleNumber) ? data.vehicleNumber : "";
    data.vehicleType = !isEmpty(data.vehicleType) ? data.vehicleType : "";
    data.brand = !isEmpty(data.brand) ? data.brand : "";
    data.model = !isEmpty(data.model) ? data.model : "";
    data.color = !isEmpty(data.color) ? data.color : "";
    data.capacity = !isEmpty(data.capacity) ? data.capacity : "";
    data.status = !isEmpty(data.status) ? data.status : "";
    data.registrationYear = !isEmpty(data.registrationYear)
      ? data.registrationYear
      : "";

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
      if (data.capacity) {
        if (isNaN(data.capacity)) {
          errors.capacity = "Vehicle capacity should be a number";
        } else if (Number(data.capacity) <= 0) {
          errors.capacity = "Vehicle capacity should be greater than zero";
        }
      }

      //Validating registration year
      if (data.registrationYear) {
        const currentYear = new Date().getFullYear();

        if (isNaN(data.registrationYear)) {
          errors.registrationYear =
            "Vehicle registration year should be a number";
        } else if (
          Number(data.registrationYear) < 1990 ||
          Number(data.registrationYear) > currentYear
        ) {
          errors.registrationYear = `Vehicle registration year should be between 1990 and ${currentYear}`;
        }
      }

      //Validating images

      // if (images && images.length > 0) {
      //   var validImageIds = [];

      //   if (!Array.isArray(images)) {
      //     errors.images = "Images must be an array of image IDs";
      //   }

      //   // Filter out invalid ObjectIds early
      //   const validObjectIds = images.filter((id) =>
      //     Types.ObjectId.isValid(id)
      //   );
      //   const invalidIds = images.filter((id) => !Types.ObjectId.isValid(id));

      //   invalidIds.forEach((id) => {
      //     errors[`images[${images.indexOf(id)}]`] = "Invalid MongoDB ObjectId";
      //   });

      //   if (validObjectIds.length === 0) {
      //     errors.images = "No valid images";
      //   }

      //   // Fetch all matching images uploaded by the user
      //   const foundImages = await Image.find({
      //     _id: { $in: validObjectIds },
      //     uploadedBy: user_id,
      //   }).select("_id");

      //   const foundImageIds = foundImages.map((img) => img._id.toString());

      //   validObjectIds.forEach((id, i) => {
      //     if (!foundImageIds.includes(id.toString())) {
      //       errors[`images[${images.indexOf(id)}]`] =
      //         "Image not found or not uploaded by this user";
      //     } else {
      //       validImageIds.push(id);
      //     }
      //   });
      // }

      // Validate and sanitize removeImageIds
      if (deletedImages && Array.isArray(deletedImages)) {
        // cleanRemoveImageIds = deletedImages.filter((id) =>
        //   Types.ObjectId.isValid(id)
        // );
        // const invalidRemoveIds = deletedImages.filter(
        //   (id) => !Types.ObjectId.isValid(id)
        // );
        // invalidRemoveIds.forEach((id) => {
        //   errors[`removeImageIds[${removeImageIds.indexOf(id)}]`] =
        //     "Invalid image ID for removal";
        // });
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
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validImageIdsToAdd,
      cleanRemoveImageIds,
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
