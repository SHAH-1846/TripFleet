const validator = require("validator");
const isEmpty = require("./is_empty");
const isDisposable = require("is-disposable-email");
const isDisposableEmail =
  require("./email-validations/emailValidations").isDisposableEmail;
const isTemporaryEmail =
  require("./email-validations/emailValidations").isTemporaryEmail;
const users = require("../db/models/users");
const images = require("../db/models/images");
const { Types } = require("mongoose");
const user_types = require("../db/models/user_types");

exports.registrationValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.firstName = !isEmpty(data.firstName) ? data.firstName : "";
    data.lastName = !isEmpty(data.lastName) ? data.lastName : "";
    data.email = !isEmpty(data.email) ? data.email : "";
    data.image = !isEmpty(data.image) ? data.image : "";
    data.user_type = !isEmpty(data.user_type) ? data.user_type : "";
    data.password = !isEmpty(data.password) ? data.password : "";
    data.confirmPassword = !isEmpty(data.confirmPassword)
      ? data.confirmPassword
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating FirstName
      if (validator.isEmpty(data.firstName)) {
        errors.firstName = "First Name is required";
      } else if (!validator.isLength(data.firstName, { min: 2, max: 30 })) {
        errors.firstName = "First Name must be between 2 and 30 charactors";
      }

      //Validating LastName
      if (validator.isEmpty(data.lastName)) {
        errors.lastName = "Last Name is required";
      } else if (!validator.isLength(data.lastName, { min: 2, max: 30 })) {
        errors.lastName = "Last Name must be between 2 and 30 charactors";
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

      //Validating image
      if (!validator.isEmpty(data.image)) {
        if (!Types.ObjectId.isValid(data.image)) {
          errors.image = "Image must be a valid MongoDB ObjectId";
        } else {
          const image = await images.findById(data.image);
          if (!image) {
            errors.image = "Image does not exist";
          }
        }
      }
      //Validating UserType
      if (validator.isEmpty(data.user_type)) {
        errors.user_type = "User type is required";
      } else if (data.user_type === "admin") {
        errors.user_type =
          "Admin accounts cannot be created through public registration";
      } else if (!Types.ObjectId.isValid(data.user_type)) {
        errors.user_type = "User type must be a valid MongoDB ObjectId";
      } else {
        const userType = await user_types.findById(data.user_type);
        if (!userType) {
          errors.user_type = "User type does not exist";
        } else if (userType.name === "admin") {
          errors.user_type =
            "Admin accounts cannot be created through public registration";
        } else if (userType.name !== "customer" && userType.name !== "driver") {
          errors.user_type = 'User type must be either "customer" or "driver"';
        }
      }

      //Validating Password
      if (validator.isEmpty(data.password)) {
        errors.password = "Password is required";
      } else if (
        !validator.isStrongPassword(data.password, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        errors.password =
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      } else if (validator.isEmpty(data.confirmPassword)) {
        errors.confirmPassword = "Please confirm your password";
      } else if (
        !validator.isStrongPassword(data.confirmPassword, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        errors.confirmPassword =
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword =
          "The confirm password does not match the original password";
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Registration Validation error : ", error);
    return;
  }
};

exports.updateValidator = async function (data, user_id) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.firstName = !isEmpty(data.firstName) ? data.firstName : "";
    data.lastName = !isEmpty(data.lastName) ? data.lastName : "";
    data.profilePicture = !isEmpty(data.profilePicture) ? data.profilePicture : "";

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

      if (data.firstName) {
        //Validating FirstName
        if (validator.isEmpty(data.firstName)) {
          errors.firstName = "First Name is required";
        } else if (!validator.isLength(data.firstName, { min: 2, max: 30 })) {
          errors.firstName = "First Name must be between 2 and 30 charactors";
        }
      }

      if (data.lastName) {
        //Validating LastName
        if (validator.isEmpty(data.lastName)) {
          errors.lastName = "Last Name is required";
        } else if (!validator.isLength(data.lastName, { min: 2, max: 30 })) {
          errors.lastName = "Last Name must be between 2 and 30 charactors";
        }
      }

      
      //Validating image
      if (!validator.isEmpty(data.profilePicture)) {
        if (!Types.ObjectId.isValid(data.profilePicture)) {
          errors.profilePicture = "Profile picture must be a valid MongoDB ObjectId";
        } else {
          const image = await images.findById(data.profilePicture);
          if (!image) {
            errors.profilePicture = "Profile image does not exist";
          }else {
            if(image.uploadedBy.toString() !== user_id) {
              errors.profilePicture = "Not allowed to upload profile picture";
            }
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
