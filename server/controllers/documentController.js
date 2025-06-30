const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const documents = require("../db/models/documents");
const User = require("../db/models/users");
const Vehicle = require("../db/models/vehicles");
const CustomerRequest = require("../db/models/customer_requests");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const dotenv = require("dotenv");
dotenv.config();

exports.uploadDoc = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "No document uploaded",
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

    const docsToInsert = req.files.map((file) => ({
      filename: file.filename,
      path: `/uploads/documents/${folder}/${file.filename}`,
      uploadedBy: userId,
    }));

    const savedDocs = await documents.insertMany(docsToInsert);

    const docsWithUrls = savedDocs.map((img) => ({
      ...img.toObject(),
      url: `http://localhost:${process.env.PORT}${img.path}`,
    }));

    let response = success_function({
      status: 201,
      message: "Document uploaded",
      data: docsWithUrls,
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
      console.log("Document upload error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.deleteDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).send(
        error_function({
          status: 400,
          message: "Invalid document ID",
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

    const document = await documents.findById(documentId);

    if (!document) {
      return res.status(404).send(
        error_function({
          status: 404,
          message: "Document not found",
        })
      );
    }

    if (document.uploadedBy.toString() !== user_id) {
      return res.status(404).send(
        error_function({
          status: 400,
          message: "Not allowed",
        })
      );
    }

    const absolutePath = path.join(__dirname, "..", document.path);
    fs.unlink(absolutePath, (err) => {
      if (err) console.warn("Document file deletion warning:", err.message);
    });

    // Remove from users.documents array
    await User.updateMany({ documents: documentId }, { $pull: { documents: documentId } });

    // Remove from vehicles.documents array
    await Vehicle.updateMany(
      { documents: documentId },
      { $pull: { documents: documentId } }
    );

    // Remove from customerRequests.documents array
    await CustomerRequest.updateMany(
      { documents: documentId },
      { $pull: { documents: documentId } }
    );

    await document.deleteOne();

    const response = success_function({
      status: 200,
      message: "Document and references deleted successfully",
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
      console.log("Document deletion error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
