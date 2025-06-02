const validator = require("validator");
const isEmpty = require("./is_empty");

exports.registrationValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.firstName = !isEmpty(data.firstName) ? data.firstName : "";
    data.lastName = !isEmpty(data.lastName) ? data.lastName : "";
    data.email = !isEmpty(data.email) ? data.email : "";
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
      }else if (!validator.isLength(data.firstName, { min: 2, max: 30 })) {
        errors.firstName = "First Name must be between 2 and 30 charactors";
      }


      //Validating LastName
      if (validator.isEmpty(data.lastName)) {
        errors.lastName = "Last Name is required";
      }else if (!validator.isLength(data.lastName, { min: 2, max: 30 })) {
        errors.lastName = "Last Name must be between 2 and 30 charactors";
      }


      //Validating Email
      if (validator.isEmpty(data.email)) {
        errors.email = "Email is required";
      }else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
        errors.email = "Email must be between 2 and 30 charactors";
      }else if (!validator.isEmail(data.email)) {
        errors.email = "Invalid email";
      }

      //Validate already exists or not from database


      //Validating Password
      if (validator.isEmpty(data.password)) {
        errors.password = "Password is required";
      }else if (
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
      }else if (validator.isEmpty(data.confirmPassword)) {
        errors.confirmPassword = "Please confirm your password";
      }else if (
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
      }else if (data.password !== data.confirmPassword) {
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
