const validator = require("validator");
const isEmpty = require("./is_empty");
const isDisposable = require("is-disposable-email");
const isDisposableEmail =
  require("./email-validations/emailValidations").isDisposableEmail;
const isTemporaryEmail =
  require("./email-validations/emailValidations").isTemporaryEmail;
const users = require("../db/models/users");
const bcrypt = require("bcryptjs");

exports.loginValidator = async function (data) {
  try {
    let errors = {};
    let user = !isEmpty(data.email)
      ? await users.findOne({ email: data.email.trim().toLowerCase() })
      : false;

    data = !isEmpty(data) ? data : "";
    data.email = !isEmpty(data.email) ? data.email : "";
    data.password = !isEmpty(data.password) ? data.password : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating email
      if (validator.isEmpty(data.email)) {
        errors.email = "Email is required";
      } else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
        errors.email = "Email must be between 2 and 30 charactors";
      } else if (!validator.isEmail(data.email)) {
        errors.email = "Invalid email";
      } else if (isDisposable(data.email)) {
        errors.email =
          "Please sign in using the email address you used to register";
      } else if (isDisposableEmail(data.email)) {
        errors.email =
          "Please sign in using the email address you used to register";
      } else if (isTemporaryEmail(data.email)) {
        errors.email =
          "Please sign in using the email address you used to register";
      } else if (!user) {
        errors.email = "No account found with the provided email address";
      }

      //Validating Password
      let isMatch = user
        ? await bcrypt.compare(data.password, user.password)
        : false;

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
          "The password you entered is incorrect. Please try again";
      } else if (!isMatch) {
        errors.password = "Incorrect password. Please try again";
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      user,
    };
  } catch (error) {
    console.log("Login validation error : ", error);
    return;
  }
};

exports.requestOtpValidator = function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.phone = !isEmpty(data.phone) ? data.phone : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all the required fields to continue";
    } else {
      // Validate phone number
      if (validator.isEmpty(data.phone)) {
        errors.phone = "Phone number is required";
      } else if (!validator.isMobilePhone(data.phone, "any")) {
        errors.phone = "Invalid phone number format";
      } else if (!/^\+?[1-9]\d{7,14}$/.test(data.phone)) {
        // Optional stricter regex: starts with +, 8-15 digits
        errors.phone =
          "Please enter a valid international phone number (e.g. +919999999999)";
      }
    }

    return {
      isValid: isEmpty(errors),
      errors,
    };
  } catch (error) {
    console.log("OTP request validation error : ", error);
  }
};

exports.verifyOtpValidator = function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.phone = !isEmpty(data.phone) ? data.phone : "";
    data.otp = !isEmpty(data.otp) ? data.otp : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all the required fields to continue";
    } else {
      // Validate phone number
      // if (validator.isEmpty(data.phone)) {
      //   errors.phone = "Phone number is required";
      // } else if (!validator.isMobilePhone(data.phone, "any")) {
      //   errors.phone = "Invalid phone number format";
      // } else if (!/^\+?[1-9]\d{7,14}$/.test(data.phone)) {
      //   // Optional stricter regex: starts with +, 8-15 digits
      //   errors.phone =
      //     "Please enter a valid international phone number (e.g. +919999999999)";
      // }

      //Validate otp
      // Validate OTP
      if (validator.isEmpty(data.otp)) {
        errors.otp = "OTP is required";
      } else if (!validator.isNumeric(data.otp)) {
        errors.otp = "OTP must be a numeric value";
      } else if (data.otp.length < 4 || data.otp.length > 8) {
        errors.otp = "OTP must be between 4 and 8 digits";
      }
    }

    return {
      isValid: isEmpty(errors),
      errors,
    };
  } catch (error) {
    console.log("OTP verification validation error : ", error);
  }
};
