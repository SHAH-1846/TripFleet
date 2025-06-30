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
const images = require("../db/models/images");
const Documents = require("../db/models/documents");
dotenv.config();

exports.register = async function (req, res) {
  try {
    const documents = req.body.documents ? req.body.documents : [];
    const { errors, isValid, validDocumentIds } = await registrationValidator(
      req.body,
      documents
    );
    console.log("errors : ", errors);
    console.log("isValid : ", isValid);
    console.log("validDocumentIds : ", validDocumentIds);

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
        documents: validDocumentIds,
        password: hashed_password,
      });

      const userResponse = {
        _id: new_user._id,
        firstName: new_user.firstName,
        lastName: new_user.lastName,
        email: new_user.email,
        user_type: new_user.user_type,
        profilePicture: new_user.profilePicture,
        documents: new_user.documents,
      };

      //Saving user id in images record
      if (image) {
        const imageRecord = await images.findById(image);
        imageRecord.uploadedBy = new_user._id;
        await imageRecord.save();
      }

      //Saving user id in documents record
      if (validDocumentIds && validDocumentIds.length > 0) {
        await Documents.updateMany(
          { _id: { $in: validDocumentIds } },
          { $set: { uploadedBy: new_user._id } }
        );
      }

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
    const documents = req.body ? req.body.documents : null;
    const deletedDocuments = req.body
      ? req.body.deletedDocuments
      : null;

    if (!user_id) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      return res.status(response.statusCode).send(response);
    }
    const { errors, isValid, validDocumentIdsToAdd, cleanRemoveDocumentIds } =
      await updateValidator(req.body, user_id, documents, deletedDocuments);

    if (isValid) {
      const allowedFields = ["firstName", "lastName", "profilePicture"]; // you can expand this list
      const updates = {};

      allowedFields.forEach((field) => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });

      if (
        (validDocumentIdsToAdd && validDocumentIdsToAdd.length > 0) ||
        (cleanRemoveDocumentIds && cleanRemoveDocumentIds.length > 0)
      ) {
        const user = await users.findById(user_id).select("documents");
        if (!user) {
          return res.status(404).send(
            error_function({
              status: 404,
              message: "User not found",
            })
          );
        }
        const currentDocumentIds = user.documents.map((id) => id.toString());

        // Remove unwanted documents
        const remainingDocuments = currentDocumentIds.filter(
          (id) => !cleanRemoveDocumentIds.includes(id)
        );

        // Add new documents (avoid duplicates)
        const finalDocumentIds = Array.from(
          new Set([
            ...remainingDocuments,
            ...validDocumentIdsToAdd.map((id) => id.toString()),
          ])
        );

        updates.documents = finalDocumentIds;

        // 1. Convert all IDs to string for comparison
        const addIds = validDocumentIdsToAdd.map((id) => id.toString());
        const removeIds = cleanRemoveDocumentIds.map((id) => id.toString());

        // 2. Filter out common IDs — these should NOT be deleted
        const finalRemoveDocumentIds = removeIds.filter(
          (id) => !addIds.includes(id)
        );

        // 3. Proceed only if there are non-conflicting IDs left to delete
        if (finalRemoveDocumentIds.length > 0) {
          const documentsToDelete = await Documents.find({
            _id: { $in: finalRemoveDocumentIds },
          });

          for (const doc of documentsToDelete) {
            const filePath = path.join(__dirname, "..", doc.path);
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete file ${filePath}:`, err);
              }
            });
          }

          await Documents.deleteMany({ _id: { $in: finalRemoveDocumentIds } });
        }
      }

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
