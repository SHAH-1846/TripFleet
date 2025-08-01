const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const Image = require("../db/models/images");
const User = require("../db/models/users");
const Vehicle = require("../db/models/vehicles");
const CustomerRequest = require("../db/models/customer_requests");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const dotenv = require("dotenv");
dotenv.config();

exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "No images uploaded",
        })
      );
    }

    let folder = req.body.target || "general";
    folder = folder.replace(/[^a-zA-Z0-9_-]/g, ""); // sanitize: only alphanumeric, underscore, dash

    const allowedFolders = ["users", "vehicles", "customerRequests"];
    if (!allowedFolders.includes(folder)) {
      req.files.forEach((file) => {
        fs.unlink(path.join(file.path), (err) => {
          if (err) console.error("Failed to delete uploaded image:", err);
        });
      });

      let response = error_function({
        status: 400,
        message:
          "Invalid upload target. Allowed values are: 'users', 'vehicles', or 'customerRequests'.",
      });
      return res.status(response.statusCode).send(response);
    }

    const isNewUser = req.body.newUser === "true" || req.body.newUser === true;
    const userId = !isNewUser ? extractUserIdFromToken(req) : null;

    if (!userId && !isNewUser) {
      // Delete uploaded files if unauthorized
      req.files.forEach((file) => {
        fs.unlink(path.join(file.path), (err) => {
          if (err) console.error("Failed to delete uploaded image:", err);
        });
      });
      return res
        .status(401)
        .send(error_function({ status: 401, message: "Unauthorized" }));
    }

    const imagesToInsert = req.files.map((file) => ({
      filename: file.filename,
      path: `/uploads/images/${folder}/${file.filename}`,
      uploadedBy: userId,
    }));
    
    const savedImages = await Image.insertMany(imagesToInsert);

    const imagesWithUrls = savedImages.map((img) => ({
      ...img.toObject(),
      url: `http://localhost:${process.env.PORT}${img.path}`,
    }));

    // const newImage = await Image.create({
    //   filename: req.file.filename,
    //   path: `/uploads/images/${folder}/${req.file.filename}`,
    //   uploadedBy: userId || null,
    // });

    let response = success_function({
      status: 201,
      message: "Image uploaded",
      data: imagesWithUrls,
    });
    // response.data.path = `uploads/images/${folder}/${req.file.filename}`;
    // response.data.url = `http://localhost:${process.env.PORT}/uploads/images/${folder}/${req.file.filename}`;
    return res.status(response.statusCode).send(response);
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
      console.log("Image upload error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.deleteImageById = async (req, res) => {
  try {
    const imageId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid image ID",
        })
      );
    }

    const user_id = extractUserIdFromToken(req);

    if (!user_id) {
      return res.status(404).send(
        error_function({
          status: 400,
          message: "Please login to continue",
        })
      );
    }

    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).send(
        error_function({
          status: 404,
          message: "Image not found",
        })
      );
    }

    if (image.uploadedBy.toString() !== user_id) {
      return res.status(404).send(
        error_function({
          status: 400,
          message: "Not allowed",
        })
      );
    }

    const absolutePath = path.join(__dirname, "..", image.path);
    fs.unlink(absolutePath, (err) => {
      if (err) console.warn("Image file deletion warning:", err.message);
    });

    // Remove from users.profilePicture
    await User.updateMany(
      { profilePicture: imageId },
      { $unset: { profilePicture: "" } }
    );

    // Remove from vehicles.images array
    await Vehicle.updateMany(
      { images: imageId },
      { $pull: { images: imageId } }
    );

    // Remove from customerRequests.images array
    await CustomerRequest.updateMany(
      { images: imageId },
      { $pull: { images: imageId } }
    );

    await image.deleteOne();

    const response = success_function({
      status: 200,
      message: "Image and references deleted successfully",
    });
    return res.status(response.statusCode).send(response);
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
      console.log("Image deletion error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
