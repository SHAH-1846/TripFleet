const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const users = require("../db/models/users");
const user_types = require("../db/models/user_types");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const registrationValidator =
  require("../validations/userValidations").registrationValidator;
const updateValidator =
  require("../validations/userValidations").updateValidator;
const updateUserTypeValidator =
  require("../validations/userValidations").updateUserTypeValidator;
const dotenv = require("dotenv");
dotenv.config();

exports.register = async function (req, res) {
  try {
    const { errors, isValid } = await registrationValidator(req.body);
    console.log("errors : ", errors);
    console.log("isValid : ", isValid);

    if (isValid) {
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      const email = req.body.email;
      const password = req.body.password;
      const cofirmPassword = req.body.cofirmPassword;
      const user_type = req.body.user_type;
      const image = req.body.image;

      let salt = await bcrypt.genSalt(10);
      let hashed_password = await bcrypt.hash(password, salt);
      console.log("hashed_password : ", hashed_password);

      let new_user = await users.create({
        firstName,
        lastName,
        email,
        user_type,
        profilePicture: image,
        password: hashed_password,
      });

      const userResponse = {
        _id: new_user._id,
        firstName: new_user.firstName,
        lastName: new_user.lastName,
        email: new_user.email,
        user_type: new_user.user_type,
        image,
      };

      //Send email for email verification

      if (new_user) {
        let response = success_function({
          status: 201,
          data: userResponse,
          message: "User registered successfully",
        });
        res.status(response.statusCode).send(response);
        return;
      } else {
        let response = error_function({
          status: 400,
          message: "User registration failed",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      // Also handle cleanup here in case of unexpected errors
      if (req.file && req.file.path) {
        fs.unlink(
          path.join(__dirname, "../uploads/users", req.file.filename),
          (err) => {
            if (err) console.error("Failed to delete uploaded image:", err);
          }
        );
      }
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

exports.getRegisteredUsers = async function (req, res) {
  try {
    const userId = req.query.userId;
    const userTypeId = req.query.userTypeId;

    if (userId) {
      const userDatas = await users
        .findOne({ _id: userId })
        .select("-password -__v")
        .populate({
          path: "user_type profilePicture",
          select: "-password -__v", // Only fetch the 'name' field from UserType
        });

      if (userDatas) {
        let response = success_function({
          status: 200,
          data: userDatas,
          message: "User records fetched successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 404,
          message: "User record not found",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    const count = Number(await users.countDocuments());
    const pageNumber = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || count;
    const keyword = req.query.keyword;
    const filters = [];

    if (keyword) {
      filters.push({
        $or: [
          { firstName: { $regex: keyword, $options: "i" } },
          { lastName: { $regex: keyword, $options: "i" } },
        ],
      });
    }

    if (userTypeId) {
      filters.push({
        user_type: userTypeId,
      });
    }

    let usersData = await users
      .find(filters.length > 0 ? { $and: filters } : null)
      .populate({
        path: "user_type",
        select: "name", // Only fetch the 'name' field from UserType
      })
      .sort({ _id: -1 })
      .skip(pageSize * (pageNumber - 1))
      .limit(pageSize);

    if (usersData) {
      let count = Number(
        await users.countDocuments(
          filters.length > 0 ? { $and: filters } : null
        )
      );
      let totalPages = Math.ceil(count / pageSize);
      let data = {
        count: count,
        totalPages,
        currentPage: pageNumber,
        datas: usersData,
      };

      let response = success_function({
        status: 200,
        data,
        message: "User records retrieved successfully",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      let response = error_function({
        status: 404,
        message: "No user records found",
      });
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

exports.getUserTypes = async function (req, res) {
  try {
    const userTypes = await user_types.find({});

    if (userTypes) {
      let response = success_function({
        status: 200,
        data: userTypes,
        message: "User types fetched successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 400,
        message: "No datas found",
      });
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
      console.log("User types listing error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateuserTypes = async function (req, res) {
  try {
    const { isValid, errors } = await updateUserTypeValidator(req.body);

    if (isValid) {
      // Check if user exists
      const user = await users.findById(req.params.id);
      if (!user) {
        let response = error_function({
          status: 404,
          message: "User not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        // Update user_type
        user.user_type = req.body.userType;
        await user.save();

        let response = success_function({
          status: 200,
          data: user,
          message: "User type updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
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
      console.log("User types updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateUser = async function (req, res) {
  try {
    const user_id = extractUserIdFromToken(req);
    if (!user_id) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      return res.status(response.statusCode).send(response);
    }
    const { errors, isValid } = await updateValidator(req.body, user_id);

    if (isValid) {

      const allowedFields = ["firstName", "lastName", "profilePicture"]; // you can expand this list
      const updates = {};

      allowedFields.forEach((field) => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });

      const updatedUser = await users
        .findByIdAndUpdate(
          { _id: user_id },
          { $set: updates },
          { new: true, runValidators: true }
        )
        .select("-password -__v");

      if (!updatedUser) {
        let response = error_function({
          status: 404,
          message: "User not found",
        });
        return res.status(response.statusCode).send(response);
      }

      let response = success_function({
        status: 200,
        data: updatedUser,
        message: "User updated successfully",
      });
      return res.status(response.statusCode).send(response);
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
      console.log("User updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
