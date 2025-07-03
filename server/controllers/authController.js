const loginValidator = require("../validations/authValidations").loginValidator;
const requestOtpValidator =
  require("../validations/authValidations").requestOtpValidator;
const verifyOtpValidator =
  require("../validations/authValidations").verifyOtpValidator;
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractIdFromToken = require("../utils/utils").extractIdFromToken;
const users = require("../db/models/users");
const otpGenerator = require("otp-generator");
const OTP = require("../db/models/otp");
const { sendSMS } = require("../utils/sms");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { extractUserIdFromToken } = require("../utils/utils");
dotenv.config();

exports.login = async function (req, res) {
  try {
    let { errors, isValid, user } = await loginValidator(req.body);

    if (isValid) {
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

      res.redirect(
        `${process.env.FRONTEND_URL}/dashboard?token=${access_token}`
      );
      return;
    } else {
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

exports.requestOtp = async (req, res) => {
  try {
    let { isValid, errors } = requestOtpValidator(req.body);

    if (isValid) {
      let phone = req.body.phone;

      // Generate OTP
      // const otp = otpGenerator.generate(6, {
      //   digits: true,
      //   alphabets: false,
      //   upperCase: false,
      //   specialChars: false,
      // });

      let otp = "123456";
      let salt = await bcrypt.genSalt(10);
      let hashed_otp = await bcrypt.hash(otp, salt);

      // Save OTP in DB (override if already exists)
      let otpRecord = await OTP.findOneAndUpdate(
        { phone },
        { otp: hashed_otp },
        { upsert: true, new: true }
      );

      // Send OTP using SMS API (mock or real)
      // await sendSMS(phone, `Your verification code is ${otp}`);

      let otp_request_token = jwt.sign(
        { id: otpRecord._id },
        process.env.PRIVATE_KEY,
        { expiresIn: "10d" }
      );

      return res.status(200).send(
        success_function({
          status: 200,
          data: otp_request_token,
          message: "OTP sent successfully",
        })
      );
    } else {
      let response = error_function({
        status: 400,
        message: "Validation failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
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
      console.log("OTP request error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    let { isValid, errors } = verifyOtpValidator(req.body);

    if (isValid) {
      const id = extractIdFromToken(req);

      const otpRecord = await OTP.findOne({ _id: id });
      if (!otpRecord) {
        return res
          .status(400)
          .send(error_function({ status: 400, message: "OTP not requested" }));
      }

      const otp = req.body.otp;
      const phone = otpRecord.phone;

      // Check expiry (e.g., 5 minutes)
      const now = new Date();
      const expiry = new Date(otpRecord.updatedAt);
      expiry.setMinutes(expiry.getMinutes() + 5);

      if (now > expiry) {
        return res
          .status(400)
          .send(error_function({ status: 400, message: "OTP expired" }));
      }

      let isMatch = await bcrypt.compare(otp.toString(), otpRecord.otp);

      if (!isMatch) {
        return res
          .status(400)
          .send(error_function({ status: 400, message: "Invalid OTP" }));
      }

      //Finding user based on phone number
      let user = await users.findOne({ phone });
      let phone_verified_token;
      if (user) {
        //User already exists and needs to login
        phone_verified_token = jwt.sign(
          { user_id: user._id },
          process.env.PRIVATE_KEY,
          { expiresIn: "10d" }
        );
      } else {
        //User not exists and needs to register
        phone_verified_token = jwt.sign(
          { id: otpRecord._id },
          process.env.PRIVATE_KEY,
          { expiresIn: "10d" }
        );
      }

      return res.status(200).send(
        success_function({
          status: 200,
          data: phone_verified_token,
          message: "OTP verified successfully",
        })
      );
    } else {
      let response = error_function({
        status: 400,
        message: "Validation failed",
      });
      response.errors = errors;
      return res.status(response.statusCode).send(response);
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
      console.log("OTP verification error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
