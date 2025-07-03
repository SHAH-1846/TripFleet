const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Mongoose Models
const Image = require("../db/models/images");
const Document = require("../db/models/documents");
const User = require("../db/models/users");
const Vehicle = require("../db/models/vehicles");
const CustomerRequest = require("../db/models/customer_requests");

function cleanupUploads() {
  // DB Connection
  const MONGO_URI = process.env.MONGODB_URI;
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  mongoose.connection.once("open", async () => {
    console.log("✅ MongoDB connected");
    cleanupUnusedImages()
      .then(() => cleanupUnusedDocuments())
      .finally(() => {
        mongoose.connection.close();
      });
  });

  async function cleanupUnusedImages() {
    try {
      const images = await Image.find({});
      let deletedCount = 0;

      for (const img of images) {
        const imageId = img._id;

        // const isUsed = await Promise.any([
        //   User.exists({ profilePicture: imageId }),
        //   Vehicle.exists({ images: imageId }),
        //   CustomerRequest.exists({ images: imageId }),
        // ]).catch(() => false);

        const imageObjectId = new mongoose.Types.ObjectId(imageId);

        const isUsedInUser = await User.exists({
          profilePicture: imageObjectId,
        });
        const isUsedInVehicle = await Vehicle.exists({ images: imageObjectId });
        const isUsedInRequest = await CustomerRequest.exists({
          images: imageObjectId,
        });

        const isUsed = isUsedInUser || isUsedInVehicle || isUsedInRequest;

        if (!isUsed) {
          // Delete file
          const fullPath = path.join(__dirname, "..", img.path);
          fs.unlink(fullPath, (err) => {
            if (err) console.error("❌ Failed to delete image file:", fullPath);
          });

          // Delete DB record
          await Image.findByIdAndDelete(imageId);
          console.log(`🗑️ Deleted unused image: ${imageId}`);
          deletedCount++;
        }
      }

      console.log(`✅ Finished image cleanup. Total deleted: ${deletedCount}`);
    } catch (error) {
      console.error("❌ Image cleanup error:", error);
    }
  }

  async function cleanupUnusedDocuments() {
    try {
      const documents = await Document.find({});
      let deletedCount = 0;

      for (const doc of documents) {
        const docId = doc._id;

        // const isUsed = await Promise.any([
        //   User.exists({
        //     $or: [{ drivingLicense: docId }, { documents: docId }],
        //   }),
        //   Vehicle.exists({
        //     $or: [{ registrationCertificate: docId }, { documents: docId }],
        //   }),
        //   CustomerRequest.exists({ documents: docId }),
        // ]).catch(() => false);

        const docObjectId = new mongoose.Types.ObjectId(docId);

        const isUsedInUser = await User.exists({
          $or: [{ drivingLicense: docObjectId }, { documents: docObjectId }],
        });

        const isUsedInVehicle = await Vehicle.exists({
          $or: [
            { registrationCertificate: docObjectId },
            { documents: docObjectId },
          ],
        });

        const isUsedInCustomerRequest = await CustomerRequest.exists({
          documents: docObjectId,
        });

        const isUsed =
          isUsedInUser || isUsedInVehicle || isUsedInCustomerRequest;

        if (!isUsed) {
          const fullPath = path.join(__dirname, "..", doc.path);
          fs.unlink(fullPath, (err) => {
            if (err)
              console.error("❌ Failed to delete document file:", fullPath);
          });

          await Document.findByIdAndDelete(docId);
          console.log(`🗑️ Deleted unused document: ${docId}`);
          deletedCount++;
        }
      }

      console.log(
        `✅ Finished document cleanup. Total deleted: ${deletedCount}`
      );
    } catch (error) {
      console.error("❌ Document cleanup error:", error);
    }
  }
}

module.exports = cleanupUploads;
