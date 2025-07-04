const validator = require("validator");
const isEmpty = require("./is_empty");
const isDisposable = require("is-disposable-email");
const isDisposableEmail =
  require("./email-validations/emailValidations").isDisposableEmail;
const isTemporaryEmail =
  require("./email-validations/emailValidations").isTemporaryEmail;
const users = require("../db/models/users");
const vehicles = require("../db/models/vehicles");
const images = require("../db/models/images");
const Documents = require("../db/models/documents");
const { Types } = require("mongoose");
const user_types = require("../db/models/user_types");
const vehicle_types = require("../db/models/vehicle_types");
const vehicle_body_types = require("../db/models/vehicle_body_types");

exports.registerCustomersValidator = async function (data, documents) {
  try {
    let errors = {};

    //User datas for validation
    data = !isEmpty(data) ? data : "";
    data.name = !isEmpty(data.name) ? data.name : "";
    data.phone = !isEmpty(data.phone) ? data.phone : "";

    data.whatsappNumber = !isEmpty(data.whatsappNumber)
      ? data.whatsappNumber
      : "";
    data.email = !isEmpty(data.email) ? data.email : "";

    data.profilePicture = !isEmpty(data.profilePicture)
      ? data.profilePicture
      : "";

    //Terms and conditions and privacy policy
    data.termsAndConditionsAccepted = !isEmpty(data.termsAndConditionsAccepted)
      ? data.termsAndConditionsAccepted
      : "";
    data.privacyPolicyAccepted = !isEmpty(data.privacyPolicyAccepted)
      ? data.privacyPolicyAccepted
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating name
      if (validator.isEmpty(data.name)) {
        errors.name = "Name is required";
      } else if (!validator.isLength(data.name, { min: 2, max: 30 })) {
        errors.name = "Name must be between 2 and 30 charactors";
      }

      // Validate phone number
      const userPhoneCount = await users.countDocuments({ phone: data.phone });

      if (validator.isEmpty(data.phone)) {
        errors.phone = "Phone number is required";
      } else if (!validator.isMobilePhone(data.phone, "any")) {
        errors.phone = "Invalid phone number format";
      } else if (!/^\+?[1-9]\d{7,14}$/.test(data.phone)) {
        // Optional stricter regex: starts with +, 8-15 digits
        errors.phone =
          "Please enter a valid international phone number (e.g. +919999999999)";
      } else if (userPhoneCount > 0) {
        errors.phone = "An account with this phone number already exists";
      }

      //Validate whatsappNumber
      const userwhatsappNumberCount = await users.countDocuments({
        whatsappNumber: data.whatsappNumber,
      });

      if (validator.isEmpty(data.whatsappNumber)) {
        errors.whatsappNumber = "Whatsapp number is required";
      } else if (!validator.isMobilePhone(data.whatsappNumber, "any")) {
        errors.whatsappNumber = "Invalid whatsapp number format";
      } else if (!/^\+?[1-9]\d{7,14}$/.test(data.whatsappNumber)) {
        // Optional stricter regex: starts with +, 8-15 digits
        errors.whatsappNumber =
          "Please enter a valid international whatsapp number (e.g. +919999999999)";
      } else if (userwhatsappNumberCount > 0) {
        errors.whatsappNumber =
          "An account with this whatsapp number already exists";
      }

      //Validating Email
      let emailCount = await users.countDocuments({
        email: { $regex: data.email, $options: "i" },
      });

      if (validator.isEmpty(data.email)) {
        errors.email = "Email is required";
      } else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
        errors.email = "Email must be between 2 and 30 charactors";
      } else if (!validator.isEmail(data.email)) {
        errors.email = "Invalid email";
      } else if (isDisposable(data.email)) {
        errors.email = "Disposable email addresses are not allowed";
      } else if (isDisposableEmail(data.email)) {
        errors.email =
          "Please use a real email address — temporary email services are not supported";
      } else if (isTemporaryEmail(data.email)) {
        errors.email =
          "For security reasons, disposable email addresses are not accepted";
      } else if (emailCount > 0) {
        errors.email = "An account with this email already exists";
      }

      //Validating profilePicture
      if (validator.isEmpty(data.profilePicture)) {
        errors.profilePicture = "Profile picture is required";
      } else if (!Types.ObjectId.isValid(data.profilePicture)) {
        errors.profilePicture =
          "Profile picture must be a valid MongoDB ObjectId";
      } else {
        const profilePicture = await images.findById(data.profilePicture);
        if (!profilePicture) {
          errors.profilePicture = "Profile picture does not exist";
        }
      }

      //Validating termsAndConditionsAccepted
      if (
        typeof data.termsAndConditionsAccepted === "undefined" ||
        data.termsAndConditionsAccepted === null ||
        data.termsAndConditionsAccepted === ""
      ) {
        errors.termsAndConditionsAccepted =
          "Terms and conditions field is required";
      } else if (typeof data.termsAndConditionsAccepted !== "boolean") {
        // In case the frontend sends it as a string like "true" or "false", may want to allow it:
        const normalized = String(
          data.termsAndConditionsAccepted
        ).toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          errors.termsAndConditionsAccepted =
            "Terms and conditions field must be a boolean value (true or false)";
        } else {
          // Convert and assign normalized boolean
          data.termsAndConditionsAccepted = normalized === "true";
        }
      }

      if (
        typeof data.privacyPolicyAccepted === "undefined" ||
        data.privacyPolicyAccepted === null ||
        data.privacyPolicyAccepted === ""
      ) {
        errors.privacyPolicyAccepted = "Privacy policy field is required";
      } else if (typeof data.privacyPolicyAccepted !== "boolean") {
        // In case the frontend sends it as a string like "true" or "false", may want to allow it:
        const normalized = String(data.privacyPolicyAccepted).toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          errors.privacyPolicyAccepted =
            "Privacy policy field must be a boolean value (true or false)";
        } else {
          // Convert and assign normalized boolean
          data.privacyPolicyAccepted = normalized === "true";
        }
      }
    }
    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Customers registration Validation error : ", error);
    return;
  }
};

exports.registerDriversValidator = async function (data, documents) {
  try {
    let errors = {};

    //User datas for validation
    data = !isEmpty(data) ? data : "";
    data.name = !isEmpty(data.name) ? data.name : "";
    data.phone = !isEmpty(data.phone) ? data.phone : "";

    data.whatsappNumber = !isEmpty(data.whatsappNumber)
      ? data.whatsappNumber
      : "";
    data.email = !isEmpty(data.email) ? data.email : "";
    data.drivingLicense = !isEmpty(data.drivingLicense)
      ? data.drivingLicense
      : "";
    data.profilePicture = !isEmpty(data.profilePicture)
      ? data.profilePicture
      : "";

    //Vehicle datas for validation
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

    //Terms and conditions and privacy policy
    data.termsAndConditionsAccepted = !isEmpty(data.termsAndConditionsAccepted)
      ? data.termsAndConditionsAccepted
      : "";
    data.privacyPolicyAccepted = !isEmpty(data.privacyPolicyAccepted)
      ? data.privacyPolicyAccepted
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      /* Validating user datas */

      //Validating name
      if (validator.isEmpty(data.name)) {
        errors.name = "Name is required";
      } else if (!validator.isLength(data.name, { min: 2, max: 30 })) {
        errors.name = "Name must be between 2 and 30 charactors";
      }

      // Validate phone number
      const userPhoneCount = await users.countDocuments({ phone: data.phone });

      if (validator.isEmpty(data.phone)) {
        errors.phone = "Phone number is required";
      } else if (!validator.isMobilePhone(data.phone, "any")) {
        errors.phone = "Invalid phone number format";
      } else if (!/^\+?[1-9]\d{7,14}$/.test(data.phone)) {
        // Optional stricter regex: starts with +, 8-15 digits
        errors.phone =
          "Please enter a valid international phone number (e.g. +919999999999)";
      } else if (userPhoneCount > 0) {
        errors.phone = "An account with this phone number already exists";
      }

      //Validate whatsappNumber
      const userwhatsappNumberCount = await users.countDocuments({
        whatsappNumber: data.whatsappNumber,
      });

      if (validator.isEmpty(data.whatsappNumber)) {
        errors.whatsappNumber = "Whatsapp number is required";
      } else if (!validator.isMobilePhone(data.whatsappNumber, "any")) {
        errors.whatsappNumber = "Invalid whatsapp number format";
      } else if (!/^\+?[1-9]\d{7,14}$/.test(data.whatsappNumber)) {
        // Optional stricter regex: starts with +, 8-15 digits
        errors.whatsappNumber =
          "Please enter a valid international whatsapp number (e.g. +919999999999)";
      } else if (userwhatsappNumberCount > 0) {
        errors.whatsappNumber =
          "An account with this whatsapp number already exists";
      }

      //Validating Email
      let emailCount = await users.countDocuments({
        email: { $regex: data.email, $options: "i" },
      });

      if (validator.isEmpty(data.email)) {
        errors.email = "Email is required";
      } else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
        errors.email = "Email must be between 2 and 30 charactors";
      } else if (!validator.isEmail(data.email)) {
        errors.email = "Invalid email";
      } else if (isDisposable(data.email)) {
        errors.email = "Disposable email addresses are not allowed";
      } else if (isDisposableEmail(data.email)) {
        errors.email =
          "Please use a real email address — temporary email services are not supported";
      } else if (isTemporaryEmail(data.email)) {
        errors.email =
          "For security reasons, disposable email addresses are not accepted";
      } else if (emailCount > 0) {
        errors.email = "An account with this email already exists";
      }

      //Validating drivingLicense
      if (validator.isEmpty(data.drivingLicense)) {
        errors.drivingLicense = "Driving license is required";
      } else if (!Types.ObjectId.isValid(data.drivingLicense)) {
        errors.drivingLicense =
          "Driving license must be a valid MongoDB ObjectId";
      } else {
        const drivingLicense = await Documents.findById(data.drivingLicense);
        if (!drivingLicense) {
          errors.drivingLicense = "Driving license record does not exist";
        }
      }

      //Validating profilePicture
      if (validator.isEmpty(data.profilePicture)) {
        errors.profilePicture = "Profile picture is required";
      } else if (!Types.ObjectId.isValid(data.profilePicture)) {
        errors.profilePicture =
          "Profile picture must be a valid MongoDB ObjectId";
      } else {
        const profilePicture = await images.findById(data.profilePicture);
        if (!profilePicture) {
          errors.profilePicture = "Profile picture does not exist";
        }
      }

      /* Validating vehicle datas */

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
        const foundImages = await images
          .find({
            _id: { $in: validObjectIds },
          })
          .select("_id");

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

      //Validating termsAndConditionsAccepted
      if (
        typeof data.termsAndConditionsAccepted === "undefined" ||
        data.termsAndConditionsAccepted === null ||
        data.termsAndConditionsAccepted === ""
      ) {
        errors.termsAndConditionsAccepted =
          "Terms and conditions field is required";
      } else if (typeof data.termsAndConditionsAccepted !== "boolean") {
        // In case the frontend sends it as a string like "true" or "false", may want to allow it:
        const normalized = String(
          data.termsAndConditionsAccepted
        ).toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          errors.termsAndConditionsAccepted =
            "Terms and conditions field must be a boolean value (true or false)";
        } else {
          // Convert and assign normalized boolean
          data.termsAndConditionsAccepted = normalized === "true";
        }
      }

      if (
        typeof data.privacyPolicyAccepted === "undefined" ||
        data.privacyPolicyAccepted === null ||
        data.privacyPolicyAccepted === ""
      ) {
        errors.privacyPolicyAccepted = "Privacy policy field is required";
      } else if (typeof data.privacyPolicyAccepted !== "boolean") {
        // In case the frontend sends it as a string like "true" or "false", may want to allow it:
        const normalized = String(data.privacyPolicyAccepted).toLowerCase();
        if (normalized !== "true" && normalized !== "false") {
          errors.privacyPolicyAccepted =
            "Privacy policy field must be a boolean value (true or false)";
        } else {
          // Convert and assign normalized boolean
          data.privacyPolicyAccepted = normalized === "true";
        }
      }

      //Validating terms and conditions and privacy policy

      //Validating UserType
      // if (validator.isEmpty(data.user_type)) {
      //   errors.user_type = "User type is required";
      // } else if (data.user_type === "admin") {
      //   errors.user_type =
      //     "Admin accounts cannot be created through public registration";
      // } else if (!Types.ObjectId.isValid(data.user_type)) {
      //   errors.user_type = "User type must be a valid MongoDB ObjectId";
      // } else {
      //   const userType = await user_types.findById(data.user_type);
      //   if (!userType) {
      //     errors.user_type = "User type does not exist";
      //   } else if (userType.name === "admin") {
      //     errors.user_type =
      //       "Admin accounts cannot be created through public registration";
      //   } else if (userType.name !== "customer" && userType.name !== "driver") {
      //     errors.user_type = 'User type must be either "customer" or "driver"';
      //   }
      // }

      //Validating Password
      // if (validator.isEmpty(data.password)) {
      //   errors.password = "Password is required";
      // } else if (
      //   !validator.isStrongPassword(data.password, {
      //     minLength: 8,
      //     minLowercase: 1,
      //     minUppercase: 1,
      //     minNumbers: 1,
      //     minSymbols: 1,
      //   })
      // ) {
      //   errors.password =
      //     "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      // } else if (validator.isEmpty(data.confirmPassword)) {
      //   errors.confirmPassword = "Please confirm your password";
      // } else if (
      //   !validator.isStrongPassword(data.confirmPassword, {
      //     minLength: 8,
      //     minLowercase: 1,
      //     minUppercase: 1,
      //     minNumbers: 1,
      //     minSymbols: 1,
      //   })
      // ) {
      //   errors.confirmPassword =
      //     "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      // } else if (data.password !== data.confirmPassword) {
      //   errors.confirmPassword =
      //     "The confirm password does not match the original password";
      // }

      //Validating documents

      // if (documents.length > 0) {
      //   var validDocumentIds = [];

      //   if (!Array.isArray(documents)) {
      //     errors.documents = "Documents must be an array of document IDs";
      //   }

      //   // Check for duplicate document IDs
      //   const seen = new Set();
      //   documents.forEach((id, index) => {
      //     if (seen.has(id)) {
      //       errors[`documents[${index}]`] = "Duplicate document ID detected";
      //     }
      //     seen.add(id);
      //   });

      //   // Filter out invalid ObjectIds early
      //   const validObjectIds = documents.filter((id) =>
      //     Types.ObjectId.isValid(id)
      //   );
      //   const invalidIds = documents.filter(
      //     (id) => !Types.ObjectId.isValid(id)
      //   );

      //   invalidIds.forEach((id) => {
      //     errors[`documents[${documents.indexOf(id)}]`] =
      //       "Invalid MongoDB ObjectId";
      //   });

      //   if (validObjectIds.length === 0) {
      //     errors.documents = "No valid documents";
      //   }

      //   // Fetch all matching documents uploaded by the user
      //   const foundDocuments = await Documents.find({
      //     _id: { $in: validObjectIds },
      //   }).select("_id");

      //   const foundDocumentIds = foundDocuments.map((doc) =>
      //     doc._id.toString()
      //   );

      //   validObjectIds.forEach((id, i) => {
      //     if (!foundDocumentIds.includes(id.toString())) {
      //       errors[`documents[${documents.indexOf(id)}]`] =
      //         "Document not found";
      //     } else {
      //       validDocumentIds.push(id);
      //     }
      //   });
      // }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validImageIds,
    };
  } catch (error) {
    console.log("Drivers registration Validation error : ", error);
    return;
  }
};

exports.updateValidator = async function (data, user_id) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.name = !isEmpty(data.name) ? data.name : "";
    data.whatsappNumber = !isEmpty(data.whatsappNumber)
      ? data.whatsappNumber
      : "";
    data.email = !isEmpty(data.email) ? data.email : "";
    data.profilePicture = !isEmpty(data.profilePicture)
      ? data.profilePicture
      : "";

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
      }

      if (data.name) {
        //Validating name
        if (validator.isEmpty(data.name)) {
          errors.name = "Name is required";
        } else if (!validator.isLength(data.name, { min: 2, max: 30 })) {
          errors.name = "Name must be between 2 and 30 charactors";
        }
      }

      //Validate whatsappNumber
      if (data.whatsappNumber) {
        const userwhatsappNumberCount = await users.countDocuments({
          whatsappNumber: data.whatsappNumber,
          _id: { $ne: user_id }, // Exclude current user's ID
        });

        if (validator.isEmpty(data.whatsappNumber)) {
          errors.whatsappNumber = "Whatsapp number is required";
        } else if (!validator.isMobilePhone(data.whatsappNumber, "any")) {
          errors.whatsappNumber = "Invalid whatsapp number format";
        } else if (!/^\+?[1-9]\d{7,14}$/.test(data.whatsappNumber)) {
          // Optional stricter regex: starts with +, 8-15 digits
          errors.whatsappNumber =
            "Please enter a valid international whatsapp number (e.g. +919999999999)";
        } else if (userwhatsappNumberCount > 0) {
          errors.whatsappNumber =
            "An account with this whatsapp number already exists";
        }
      }

      //Validating email
      if (data.email) {
        let emailCount = await users.countDocuments({
          email: { $regex: data.email, $options: "i" },
          _id: { $ne: user_id }, // Exclude current user's ID
        });

        if (validator.isEmpty(data.email)) {
          errors.email = "Email is required";
        } else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
          errors.email = "Email must be between 2 and 30 charactors";
        } else if (!validator.isEmail(data.email)) {
          errors.email = "Invalid email";
        } else if (isDisposable(data.email)) {
          errors.email = "Disposable email addresses are not allowed";
        } else if (isDisposableEmail(data.email)) {
          errors.email =
            "Please use a real email address — temporary email services are not supported";
        } else if (isTemporaryEmail(data.email)) {
          errors.email =
            "For security reasons, disposable email addresses are not accepted";
        } else if (emailCount > 0) {
          errors.email = "An account with this email already exists";
        }
      }

      //Validating profilePicture
      if (data.profilePicture) {
        if (validator.isEmpty(data.profilePicture)) {
          errors.profilePicture = "Profile picture is required";
        } else if (!Types.ObjectId.isValid(data.profilePicture)) {
          errors.profilePicture =
            "Profile picture must be a valid MongoDB ObjectId";
        } else {
          const profilePicture = await images.findById(data.profilePicture);
          if (!profilePicture) {
            errors.profilePicture = "Profile picture does not exist";
          }
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("User update validation error : ", error);
  }
};

exports.updateUserTypeValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.userType = !isEmpty(data.userType) ? data.userType : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      if (isEmpty(data.userType)) {
        errors.userType = "User type is required";
      } else if (!Types.ObjectId.isValid(data.userType)) {
        errors.userType = "Invalid user type format";
      } else {
        const user_type = await user_types.findOne({
          _id: data.userType,
          isActive: true,
        });
        if (!user_type) {
          errors.userType = "User type not found or inactive";
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Error updating user type : ", error);
  }
};
