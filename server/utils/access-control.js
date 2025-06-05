const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const error_function = require("./response-handler").error_function;
const control_data = require("./control-data.json");
const users = require("../db/models/users");
const dotenv = require("dotenv");
dotenv.config();

exports.accessControl = async function (access_types, req, res, next) {
  try {
    //middleware to check JWT
    if (access_types == "*") {
      next();
    } else {
      const authHeader = req.headers["authorization"]
        ? req.headers["authorization"]
        : null;
      const token = authHeader ? authHeader.split(" ")[1] : null;
      if (
        token == null ||
        token == "null" ||
        token == "" ||
        token == "undefined"
      ) {
        let response = error_function({
          status: 400,
          message: "Please login to continue",
        });
        res.status(response.statusCode).send(response);
        return;
      } else {
        //verifying token
        jwt.verify(
          token,
          process.env.PRIVATE_KEY,
          async function (err, decoded) {
            if (err) {
              let response = error_function({
                status: 401,
                message: err.message,
              });
              res.status(401).send(response);
              return;
            } else {
              //checking access control
              let allowed = access_types
                .split(",")
                .map((obj) => control_data[obj]);

              let user_type = (await users.findOne({ _id: decoded.user_id }))
                .user_type;

              if (allowed && allowed.includes(user_type)) {
                next();
              } else {
                let response = error_function({
                  status: 403,
                  message: "Not allowed",
                });
                res.status(403).send(response);
              }
            }
          }
        );
      }
    }
  } catch (error) {
    let response = error_function({
      status: 403,
      message: "Something went wrong",
    });
    res.status(400).send(response);
    return;
  }
};
