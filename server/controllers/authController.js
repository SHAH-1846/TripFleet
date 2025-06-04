const loginValidator = require("../validations/authValidations").loginValidator;
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const users = require("../db/models/users");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

exports.login = async function (req, res) {
  try {
    let { errors, isValid, user } = await loginValidator(req.body);

    if (isValid) {
      console.log("user : ", user);

      let access_token = jwt.sign(
        { user_id: user._id },
        process.env.PRIVATE_KEY,
        { expiresIn: "10d" }
      );
      let response = success_function({
        status: 200,
        data: access_token,
        message: "Login successful",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      let response = error_function({
        status: 400,
        message: "Validation Failed",
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

exports.googleOAuth = async function (req, res) {
  try {
    let id = req.session.passport.user;
    const user = await users.findById(id);

    if (user) {
      let access_token = jwt.sign(
        { user_id: user._id },
        process.env.PRIVATE_KEY,
        { expiresIn: "10d" }
      );

      res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${access_token}`)
      return;
    }else {
      console.log("Google OAuth, user not found");
      res.redirect(`${process.env.FRONTEND_URL}/error_page`);
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
