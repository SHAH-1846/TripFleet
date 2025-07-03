const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const users = require("../db/models/users");
const user_types = require("../db/models/user_types");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const extractIdFromToken = require("../utils/utils").extractIdFromToken;
const registerDriversValidator =
  require("../validations/userValidations").registerDriversValidator;
const registerCustomersValidator =
  require("../validations/userValidations").registerCustomersValidator;
const updateValidator =
  require("../validations/userValidations").updateValidator;
const updateUserTypeValidator =
  require("../validations/userValidations").updateUserTypeValidator;
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const images = require("../db/models/images");
const Documents = require("../db/models/documents");
const deleteFile = require("../utils/utils").deleteFile;
const { Types } = require("mongoose");
const OTP = require("../db/models/otp");
const vehicles = require("../db/models/vehicles");
dotenv.config();

exports.registerDrivers = async function (req, res) {
  try {
    let id = extractIdFromToken(req);
    if (!id) {
      let response = error_function({
        status: 404,
        message: "Access denied: Missing authentication token",
      });
      return res.status(response.statusCode).send(response);
    }

    //Finding OTP record based on this access_token
    const otpRecord = await OTP.findOne({ _id: id });
    if (!otpRecord) {
      let response = error_function({
        status: 400,
        message: "Verify phone number to continue",
      });
      return res.status(response.statusCode).send(response);
    }
    req.body.phone = otpRecord.phone;

    const documents = req.body.documents ? req.body.documents : [];

    const { errors, isValid, validImageIds } = await registerDriversValidator(
      req.body,
      documents
    );

    if (isValid) {
      //User datas
      const name = req.body.name;
      const phone = otpRecord.phone;
      const whatsappNumber = req.body.whatsappNumber;
      const email = req.body.email;
      const user_type = "68484d1eefb856d41ac28c56"; //ObjectId for driver user_type
      const drivingLicense = req.body.drivingLicense; //ObjectId from the documents collection
      const profilePicture = req.body.profilePicture; //ObjectId from the images collection

      //Vehicle Datas
      const vehicleNumber = req.body.vehicleNumber;
      const vehicleType = req.body.vehicleType; //ObjectId from vehicle_types collection
      const vehicleBodyType = req.body.vehicleBodyType; //ObjectId from vehicle_body_types collection
      const vehicleCapacity = req.body.vehicleCapacity;
      const goodsAccepted = req.body.goodsAccepted; //Boolean value
      const registrationCertificate = req.body.registrationCertificate; //ObjectId from the documents collection
      const truckImages = req.body.truckImages; //An array of ObjectIds from the images collection

      //Terms and conditions and privacy policy
      const termsAndConditionsAccepted = req.body.termsAndConditionsAccepted; //Boolean value
      const privacyPolicyAccepted = req.body.privacyPolicyAccepted; //Boolean value

      //Normalizing vehicle number
      function normalizeVehicleNumber(vehicleNumber) {
        return vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      }
      let vehicle_number = normalizeVehicleNumber(vehicleNumber);

      let new_user = await users.create({
        name,
        phone,
        whatsappNumber,
        email,
        user_type,
        drivingLicense,
        profilePicture,
        termsAndConditionsAccepted,
        privacyPolicyAccepted,
      });

      let new_vehicle = await vehicles.create({
        user: new_user._id,
        vehicleNumber: vehicle_number,
        vehicleType,
        vehicleBodyType,
        vehicleCapacity,
        goodsAccepted,
        registrationCertificate,
        images: validImageIds,
      });

      //Save user_id in drivingLicense record in the documents collection
      if (drivingLicense) {
        const drivingLicenseRecord = await Documents.findById(drivingLicense);
        drivingLicenseRecord.uploadedBy = new_user._id;
        await drivingLicenseRecord.save();
      }

      //Save user_id in registrationCertificate record in documents collection
      if (registrationCertificate) {
        const registrationCertificateRecord = await Documents.findById(
          registrationCertificate
        );
        registrationCertificateRecord.uploadedBy = new_user._id;
        await registrationCertificateRecord.save();
      }

      //Saving user id in truckImages record in images collection
      if (validImageIds && validImageIds.length > 0) {
        await images.updateMany(
          { _id: { $in: validImageIds } },
          { $set: { uploadedBy: new_user._id } }
        );
      }

      //Save user id in profile picture record in images collection
      if (profilePicture) {
        await images.updateMany(
          { _id: profilePicture },
          { $set: { uploadedBy: new_user._id } }
        );
      }

      //Send email for email verification

      //Genarating access token for further authentication and authorization
      let access_token = jwt.sign(
        { user_id: new_user._id },
        process.env.PRIVATE_KEY,
        { expiresIn: "10d" }
      );

      let response = success_function({
        status: 201,
        data: access_token,
        message: "User registered successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      // Also handle cleanup here in case of unexpected errors
      // if (req.file && req.file.path) {
      //   fs.unlink(
      //     path.join(__dirname, "../uploads/users", req.file.filename),
      //     (err) => {
      //       if (err) console.error("Failed to delete uploaded image:", err);
      //     }
      //   );
      // }
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
        drivingLicense: req.body.drivingLicense,
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });

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
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
        drivingLicense: req.body.drivingLicense,
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      return;
    } else {
      console.log("Driver registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
        drivingLicense: req.body.drivingLicense,
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      return;
    }
  }
};

exports.registerCustomers = async function (req, res) {
  try {
    let id = extractIdFromToken(req);
    if (!id) {
      let response = error_function({
        status: 404,
        message: "Access denied: Missing authentication token",
      });
      return res.status(response.statusCode).send(response);
    }

    //Finding OTP record based on this access_token
    const otpRecord = await OTP.findOne({ _id: id });
    if (!otpRecord) {
      let response = error_function({
        status: 400,
        message: "Verify phone number to continue",
      });
      return res.status(response.statusCode).send(response);
    }
    req.body.phone = otpRecord.phone;

    const documents = req.body.documents ? req.body.documents : [];

    const { errors, isValid } = await registerCustomersValidator(
      req.body,
      documents
    );

    if (isValid) {
      //User datas
      const name = req.body.name;
      const email = req.body.email;
      const phone = otpRecord.phone;
      const whatsappNumber = req.body.whatsappNumber;
      const profilePicture = req.body.profilePicture; //ObjectId from the images collection
      const user_type = "68484d1eefb856d41ac28c55"; //ObjectId for driver user_type

      //Terms and conditions and privacy policy
      const termsAndConditionsAccepted = req.body.termsAndConditionsAccepted; //Boolean value
      const privacyPolicyAccepted = req.body.privacyPolicyAccepted; //Boolean value

      let new_user = await users.create({
        name,
        phone,
        whatsappNumber,
        email,
        user_type,
        profilePicture,
        termsAndConditionsAccepted,
        privacyPolicyAccepted,
      });

      //Save user id in profile picture record in images collection
      if (profilePicture) {
        await images.updateMany(
          { _id: profilePicture },
          { $set: { uploadedBy: new_user._id } }
        );
      }

      //Send email for email verification

      //Genarating access token for further authentication and authorization
      let access_token = jwt.sign(
        { user_id: new_user._id },
        process.env.PRIVATE_KEY,
        { expiresIn: "10d" }
      );

      let response = success_function({
        status: 201,
        data: access_token,
        message: "User registered successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      // Also handle cleanup here in case of unexpected errors
      // if (req.file && req.file.path) {
      //   fs.unlink(
      //     path.join(__dirname, "../uploads/users", req.file.filename),
      //     (err) => {
      //       if (err) console.error("Failed to delete uploaded image:", err);
      //     }
      //   );
      // }
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
      });
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
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
        drivingLicense: req.body.drivingLicense,
        registrationCertificate: req.body.registrationCertificate,
        truckImages: req.body.truckImages || [],
      });
      return;
    } else {
      console.log("Customer registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      await cleanupUploadedAssets({
        profilePicture: req.body.profilePicture,
      });
      return;
    }
  }
};

exports.getProfileDatas = async function (req, res) {
  try {
    const userId = extractUserIdFromToken(req);

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
    } else {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
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
      console.log("Error getting profile data : ", error);
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
          { name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
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
      console.log("Registered users datas getting error : ", error);
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
    const deletedDocuments = req.body ? req.body.deletedDocuments : null;

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

async function cleanupUploadedAssets({
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
}
