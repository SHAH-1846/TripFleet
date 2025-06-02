const bcrypt = require('bcryptjs');
const users = require("../db/models/users");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const registrationValidator =
  require("../validations/userValidations").registrationValidator;
const dotenv = require("dotenv");
dotenv.config();

exports.register = async function (req, res) {
  try {
    const { errors, isValid } = await registrationValidator(req.body);

    if (isValid) {

      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      const email = req.body.email;
      const password = req.body.password;
      const cofirmPassword = req.body.cofirmPassword;
      const user_type = req.body.user_type;

      let salt = await bcrypt.genSalt(10);
      let hashed_password = await bcrypt.hash(password, salt);
      console.log("hashed_password : ", hashed_password);

      let new_user = await users.create({
        firstName,
        lastName,
        email,
        user_type,
        password : hashed_password,
      });

      //Send email for email verification

      let response = success_function({
        status : 201,
        message : "User registered successfully",
      });
      res.status(response.statusCode).send(response);
      return;

    }else {
        let response = error_function({
            status : 400,
            message : "Validation Failed",
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
      console.log("registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
