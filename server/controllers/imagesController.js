const fs = require("fs");
const path = require("path");
const Image = require("../db/models/images");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
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

    const userId = extractUserIdFromToken(req);
    if (!userId) {
      // Also handle cleanup here in case of unexpected errors
      // if (req.file && req.file.path) {
      //   fs.unlink(
      //     path.join(
      //       __dirname,
      //       `../uploads/images/${folder}`,
      //       req.file.filename
      //     ),
      //     (err) => {
      //       if (err) console.error("Failed to delete uploaded image:", err);
      //     }
      //   );
      // }
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
