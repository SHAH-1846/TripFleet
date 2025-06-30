const validator = require("validator");
const isEmpty = require("./is_empty");
const isDisposable = require("is-disposable-email");
const isDisposableEmail =
  require("./email-validations/emailValidations").isDisposableEmail;
const isTemporaryEmail =
  require("./email-validations/emailValidations").isTemporaryEmail;
const users = require("../db/models/users");
const images = require("../db/models/images");
const Documents = require("../db/models/documents");
const { Types } = require("mongoose");
const user_types = require("../db/models/user_types");

exports.registrationValidator = async function (data, documents) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.firstName = !isEmpty(data.firstName) ? data.firstName : "";
    data.lastName = !isEmpty(data.lastName) ? data.lastName : "";
    data.email = !isEmpty(data.email) ? data.email : "";
    data.image = !isEmpty(data.image) ? data.image : "";
    data.user_type = !isEmpty(data.user_type) ? data.user_type : "";
    data.password = !isEmpty(data.password) ? data.password : "";
    data.confirmPassword = !isEmpty(data.confirmPassword)
      ? data.confirmPassword
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating FirstName
      if (validator.isEmpty(data.firstName)) {
        errors.firstName = "First Name is required";
      } else if (!validator.isLength(data.firstName, { min: 2, max: 30 })) {
        errors.firstName = "First Name must be between 2 and 30 charactors";
      }

      //Validating LastName
      if (validator.isEmpty(data.lastName)) {
        errors.lastName = "Last Name is required";
      } else if (!validator.isLength(data.lastName, { min: 2, max: 30 })) {
        errors.lastName = "Last Name must be between 2 and 30 charactors";
      }

      //Validating Email
      let emailCount = await users.countDocuments({
        email: { $regex: data.email, $options: "i" },
      });

      if (validator.isEmpty(data.email)) {
        errors.email = "Email is required";
      } else if (!validator.isLength(data.email, { min: 2, max: 30 })) {
        errors.email = "Email must be between 2 and 30 charactors";
      } else if (!validator.isEmail(data.email)) {
        errors.email = "Invalid email";
      } else if (isDisposable(data.email)) {
        errors.email = "Disposable email addresses are not allowed";
      } else if (isDisposableEmail(data.email)) {
        errors.email =
          "Please use a real email address — temporary email services are not supported";
      } else if (isTemporaryEmail(data.email)) {
        errors.email =
          "For security reasons, disposable email addresses are not accepted";
      } else if (emailCount > 0) {
        errors.email = "An account with this email already exists";
      }

      //Validating image
      if (!validator.isEmpty(data.image)) {
        if (!Types.ObjectId.isValid(data.image)) {
          errors.image = "Image must be a valid MongoDB ObjectId";
        } else {
          const image = await images.findById(data.image);
          if (!image) {
            errors.image = "Image does not exist";
          }
        }
      }
      //Validating UserType
      if (validator.isEmpty(data.user_type)) {
        errors.user_type = "User type is required";
      } else if (data.user_type === "admin") {
        errors.user_type =
          "Admin accounts cannot be created through public registration";
      } else if (!Types.ObjectId.isValid(data.user_type)) {
        errors.user_type = "User type must be a valid MongoDB ObjectId";
      } else {
        const userType = await user_types.findById(data.user_type);
        if (!userType) {
          errors.user_type = "User type does not exist";
        } else if (userType.name === "admin") {
          errors.user_type =
            "Admin accounts cannot be created through public registration";
        } else if (userType.name !== "customer" && userType.name !== "driver") {
          errors.user_type = 'User type must be either "customer" or "driver"';
        }
      }

      //Validating Password
      if (validator.isEmpty(data.password)) {
        errors.password = "Password is required";
      } else if (
        !validator.isStrongPassword(data.password, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        errors.password =
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      } else if (validator.isEmpty(data.confirmPassword)) {
        errors.confirmPassword = "Please confirm your password";
      } else if (
        !validator.isStrongPassword(data.confirmPassword, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        errors.confirmPassword =
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
      } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword =
          "The confirm password does not match the original password";
      }

      //Validating documents

      if (documents.length > 0) {
        var validDocumentIds = [];

        if (!Array.isArray(documents)) {
          errors.documents = "Documents must be an array of document IDs";
        }

        // Check for duplicate document IDs
        const seen = new Set();
        documents.forEach((id, index) => {
          if (seen.has(id)) {
            errors[`documents[${index}]`] = "Duplicate document ID detected";
          }
          seen.add(id);
        });

        // Filter out invalid ObjectIds early
        const validObjectIds = documents.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidIds = documents.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        invalidIds.forEach((id) => {
          errors[`documents[${documents.indexOf(id)}]`] =
            "Invalid MongoDB ObjectId";
        });

        if (validObjectIds.length === 0) {
          errors.documents = "No valid documents";
        }

        // Fetch all matching documents uploaded by the user
        const foundDocuments = await Documents.find({
          _id: { $in: validObjectIds },
        }).select("_id");

        const foundDocumentIds = foundDocuments.map((doc) =>
          doc._id.toString()
        );

        validObjectIds.forEach((id, i) => {
          if (!foundDocumentIds.includes(id.toString())) {
            errors[`documents[${documents.indexOf(id)}]`] =
              "Document not found";
          } else {
            validDocumentIds.push(id);
          }
        });
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validDocumentIds,
    };
  } catch (error) {
    console.log("Registration Validation error : ", error);
    return;
  }
};

exports.updateValidator = async function (
  data,
  user_id,
  documents,
  deletedDocuments
) {
  try {
    let errors = {};
    let validDocumentIdsToAdd = [];
    let cleanRemoveDocumentIds = [];

    data = !isEmpty(data) ? data : "";
    data.firstName = !isEmpty(data.firstName) ? data.firstName : "";
    data.lastName = !isEmpty(data.lastName) ? data.lastName : "";
    data.profilePicture = !isEmpty(data.profilePicture)
      ? data.profilePicture
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      // Validate user
      if (isEmpty(user_id)) {
        errors.user = "User is required";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "Invalid user ID";
      } else {
        const userExists = await users.findById(user_id);
        if (!userExists) errors.user = "User not found";
      }

      if (data.firstName) {
        //Validating FirstName
        if (validator.isEmpty(data.firstName)) {
          errors.firstName = "First Name is required";
        } else if (!validator.isLength(data.firstName, { min: 2, max: 30 })) {
          errors.firstName = "First Name must be between 2 and 30 charactors";
        }
      }

      if (data.lastName) {
        //Validating LastName
        if (validator.isEmpty(data.lastName)) {
          errors.lastName = "Last Name is required";
        } else if (!validator.isLength(data.lastName, { min: 2, max: 30 })) {
          errors.lastName = "Last Name must be between 2 and 30 charactors";
        }
      }

      //Validating image
      if (!validator.isEmpty(data.profilePicture)) {
        if (!Types.ObjectId.isValid(data.profilePicture)) {
          errors.profilePicture =
            "Profile picture must be a valid MongoDB ObjectId";
        } else {
          const image = await images.findById(data.profilePicture);
          if (!image) {
            errors.profilePicture = "Profile image does not exist";
          } else {
            if (image.uploadedBy.toString() !== user_id) {
              errors.profilePicture = "Not allowed to upload profile picture";
            }
          }
        }
      }

      //Validating documents

      // Validate and sanitize removeDocumentIds
      if (deletedDocuments && Array.isArray(deletedDocuments)) {
        // Step 1: Filter valid ObjectIds
        cleanRemoveDocumentIds = deletedDocuments.filter((id) =>
          Types.ObjectId.isValid(id)
        );
        const invalidRemoveIds = deletedDocuments.filter(
          (id) => !Types.ObjectId.isValid(id)
        );

        // Step 2: Add validation errors for invalid ObjectIds
        invalidRemoveIds.forEach((id) => {
          errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
            "Invalid document ID for removal";
        });

        // Step 3: Load the user’s current document IDs
        const user = await users.findById(user_id).select("documents");
        const currentDocumentIds =
          user?.documents?.map((id) => id.toString()) || [];

        // Step 4: Check existence in `documents` collection
        const existingDocuments = await Documents.find({
          _id: { $in: cleanRemoveDocumentIds },
        }).select("_id");

        const existingDocumentIds = existingDocuments.map((doc) =>
          doc._id.toString()
        );

        // Step 5: Check each ID - must exist in DB and in user document
        cleanRemoveDocumentIds = cleanRemoveDocumentIds.filter((id) => {
          const inDb = existingDocumentIds.includes(id);
          const inUser = currentDocumentIds.includes(id);
          if (!inDb) {
            errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
              "Document not found in DB";
          } else if (!inUser) {
            errors[`deletedDocuments[${deletedDocuments.indexOf(id)}]`] =
              "Document does not belong to this user";
          }
          return inDb && inUser;
        });
      }

      // Validate and verify uploaded documents
      if (documents && documents.length > 0) {
        if (!Array.isArray(documents)) {
          errors.documents = "Documents must be an array of document IDs";
        } else {
          const validObjectIds = documents.filter((id) =>
            Types.ObjectId.isValid(id)
          );
          const invalidIds = documents.filter(
            (id) => !Types.ObjectId.isValid(id)
          );

          invalidIds.forEach((id) => {
            errors[`documents[${documents.indexOf(id)}]`] =
              "Invalid MongoDB ObjectId";
          });

          if (validObjectIds.length === 0) {
            errors.documents = "No valid documents provided";
          } else {
            // Fetch all matching documents uploaded by the user
            const foundDocuments = await Documents.find({
              _id: { $in: validObjectIds },
              uploadedBy: user_id,
            }).select("_id");

            const foundDocumentIds = foundDocuments.map((doc) =>
              doc._id.toString()
            );

            validObjectIds.forEach((id, i) => {
              if (!foundDocumentIds.includes(id.toString())) {
                errors[`documents[${documents.indexOf(id)}]`] =
                  "Document not found or not uploaded by this user";
              } else {
                validDocumentIdsToAdd.push(id);
              }
            });
          }
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
      validDocumentIdsToAdd,
      cleanRemoveDocumentIds,
    };
  } catch (error) {
    console.log("User update validation error : ", error);
  }
};

exports.updateUserTypeValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.userType = !isEmpty(data.userType) ? data.userType : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      if (isEmpty(data.userType)) {
        errors.userType = "User type is required";
      } else if (!Types.ObjectId.isValid(data.userType)) {
        errors.userType = "Invalid user type format";
      } else {
        const user_type = await user_types.findOne({
          _id: data.userType,
          isActive: true,
        });
        if (!user_type) {
          errors.userType = "User type not found or inactive";
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Error updating user type : ", error);
  }
};
