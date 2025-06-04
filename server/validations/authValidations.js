const validator = require("validator");
const isEmpty = require("./is_empty");
const isDisposable = require("is-disposable-email");
const isDisposableEmail = require("./email-validations/emailValidations").isDisposableEmail;
const isTemporaryEmail = require("./email-validations/emailValidations").isTemporaryEmail;
const users = require('../db/models/users');
const bcrypt = require('bcryptjs');

exports.loginValidator = async function (data) {
  try {
    let errors = {};
    let user = data.email ? (await users.findOne({email : data.email.trim().toLowerCase()})) : false;

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
        errors.email = "Please sign in using the email address you used to register";
      } else if (isDisposableEmail(data.email)) {
        errors.email =
          "Please sign in using the email address you used to register";
      } else if (isTemporaryEmail(data.email)) {
        errors.email =
          "Please sign in using the email address you used to register";
      }else if(!user) {
        errors.email = "No account found with the provided email address";
      }

      //Validating Password
      let isMatch = user ? await bcrypt.compare(data.password, user.password) : false;
      
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
      }else if(!isMatch) {
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
