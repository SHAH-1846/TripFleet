const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const images = require("../db/models/images");
const Documents = require("../db/models/documents");
const { Types } = require("mongoose");
dotenv.config();

// Middleware to extract user_id from token
exports.extractUserIdFromToken = (req) => {
  const authHeader = req.headers["authorization"] || null;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token || token === "null" || token === "undefined") return null;

  try {
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
    return decoded.user_id;
  } catch (err) {
    return null;
  }
};

exports.extractIdFromToken = (req) => {
  const authHeader = req.headers["authorization"] || null;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token || token === "null" || token === "undefined") return null;

  try {
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
    return decoded.id;
  } catch (err) {
    return null;
  }
};

const deleteFile = function (relativePath) {
  try {
    const fullPath = path.join(__dirname, "..", relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error("❌ Failed to delete file:", fullPath, err);
      });
    }
  } catch (error) {
    console.error("❌ Error deleting file:", error);
  }
};

exports.cleanupUploadedAssets = async function ({
  profilePicture,
  drivingLicense,
  registrationCertificate,
  truckImages,
}) {
  try {
    // Delete profile picture
    if (Types.ObjectId.isValid(profilePicture)) {
      const img = await images.findById(profilePicture);
      if (img) {
        deleteFile(img.path); // delete from uploads
        await images.deleteOne({ _id: profilePicture }); // delete from DB
      }
    }

    // Delete driving license
    if (Types.ObjectId.isValid(drivingLicense)) {
      const doc = await Documents.findById(drivingLicense);
      if (doc) {
        deleteFile(doc.path); // delete file
        await Documents.deleteOne({ _id: drivingLicense });
      }
    }

    // Delete registration certificate
    if (Types.ObjectId.isValid(registrationCertificate)) {
      const doc = await Documents.findById(registrationCertificate);
      if (doc) {
        deleteFile(doc.path); // delete file
        await Documents.deleteOne({ _id: registrationCertificate });
      }
    }

    // Delete multiple truck images
    if (Array.isArray(truckImages)) {
      const truckImageDocs = await images.find({ _id: { $in: truckImages } });
      for (let img of truckImageDocs) {
        deleteFile(img.path); // delete image file
      }
      await images.deleteMany({ _id: { $in: truckImages } }); // delete records
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
};
