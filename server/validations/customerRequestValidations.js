const validator = require("validator");
const isEmpty = require("./is_empty");
const users = require("../db/models/users");
const trips = require("../db/models/trips");
const requestStatus = require("../db/models/customer_request_status");
const { Types } = require("mongoose");
const customer_requests = require("../db/models/customer_requests");

// Check if coordinates are valid [lng, lat]
const isValidLngLat = (arr) =>
  Array.isArray(arr) &&
  arr.length === 2 &&
  typeof arr[0] === "number" &&
  typeof arr[1] === "number" &&
  arr[1] >= -90 &&
  arr[1] <= 90 &&
  arr[0] >= -180 &&
  arr[0] <= 180;

exports.customerRequestValidator = async function (data, user_id) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    user_id = !isEmpty(user_id) ? user_id : "";
    data.pickupLocation = !isEmpty(data.pickupLocation)
      ? data.pickupLocation
      : "";
    data.dropoffLocation = !isEmpty(data.dropoffLocation)
      ? data.dropoffLocation
      : "";
    data.packageDetails = !isEmpty(data.packageDetails)
      ? data.packageDetails
      : "";
    data.pickupTime = !isEmpty(data.pickupTime) ? data.pickupTime : "";

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
        if (userExists) {
          if (userExists.user_type.toString() === "68484d1eefb856d41ac28c56") {
            errors.user = "Drivers cannot add a customer request";
          }
        }
      }

      // Validate pickupLocation
      if (isEmpty(data.pickupLocation.address)) {
        errors.pickupLocation = { address: "Pickup address is required" };
      } else if (typeof data.pickupLocation.address !== "string") {
        errors.pickupLocation = { address: "Invalid pickup address format" };
      }

      if (isEmpty(data.pickupLocation.coordinates)) {
        errors.pickupLocation = {
          ...(errors.pickupLocation || {}),
          coordinates: "Pickup coordinates are required",
        };
      } else if (!isValidLngLat(data.pickupLocation.coordinates)) {
        errors.pickupLocation = {
          ...(errors.pickupLocation || {}),
          coordinates: "Pickup coordinates must be valid [lng, lat]",
        };
      }

      // Validate dropoffLocation
      if (isEmpty(data.dropoffLocation.address)) {
        errors.dropoffLocation = { address: "Dropoff address is required" };
      } else if (typeof data.dropoffLocation.address !== "string") {
        errors.dropoffLocation = { address: "Invalid dropoff address format" };
      }

      if (isEmpty(data.dropoffLocation.coordinates)) {
        errors.dropoffLocation = {
          ...(errors.dropoffLocation || {}),
          coordinates: "Dropoff coordinates are required",
        };
      } else if (!isValidLngLat(data.dropoffLocation.coordinates)) {
        errors.dropoffLocation = {
          ...(errors.dropoffLocation || {}),
          coordinates: "Dropoff coordinates must be valid [lng, lat]",
        };
      }

      // Validate packageDetails
      if (
        !isEmpty(data.packageDetails.weight) &&
        typeof data.packageDetails.weight !== "number"
      ) {
        errors.packageDetails = {
          ...(errors.packageDetails || {}),
          weight: "Weight must be a number",
        };
      }

      if (!isEmpty(data.packageDetails.dimensions)) {
        const { length, width, height } = data.packageDetails.dimensions;
        if (
          [length, width, height].some(
            (v) => v !== undefined && typeof v !== "number"
          )
        ) {
          errors.packageDetails = {
            ...(errors.packageDetails || {}),
            dimensions: "Dimensions must contain numbers only",
          };
        }
      }

      // Validate pickupTime (optional but must be a date if given)
      if (!isEmpty(data.pickupTime) && !validator.isISO8601(data.pickupTime)) {
        errors.pickupTime = "Pickup time must be a valid ISO8601 date";
      }

      // Validate status (optional but must be valid if provided)
      //   if (!isEmpty(data.status)) {
      //     if (!Types.ObjectId.isValid(data.status)) {
      //       errors.status = "Invalid status ID";
      //     } else {
      //       const statusExists = await requestStatus.findById(data.status);
      //       if (!statusExists) {
      //         errors.status = "Status not found";
      //       }
      //     }
      //   }

      // Validate matchedTrip (optional)
      //   if (!isEmpty(data.matchedTrip)) {
      //     if (!Types.ObjectId.isValid(data.matchedTrip)) {
      //       errors.matchedTrip = "Invalid matched trip ID";
      //     } else {
      //       const tripExists = await trips.findById(data.matchedTrip);
      //       if (!tripExists) {
      //         errors.matchedTrip = "Matched trip not found";
      //       }
      //     }
      //   }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (err) {
    console.error("Customer request validation error:", err);
    return {
      errors: { server: "Validation process failed" },
      isValid: false,
    };
  }
};

exports.customerRequestUpdateValidator = async function (
  data,
  user_id,
  customerRequestId
) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    user_id = !isEmpty(user_id) ? user_id : "";
    data.pickupLocation = !isEmpty(data.pickupLocation)
      ? data.pickupLocation
      : "";
    data.dropoffLocation = !isEmpty(data.dropoffLocation)
      ? data.dropoffLocation
      : "";
    data.packageDetails = !isEmpty(data.packageDetails)
      ? data.packageDetails
      : "";
    data.pickupTime = !isEmpty(data.pickupTime) ? data.pickupTime : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      // Validate user
      if (isEmpty(user_id)) {
        errors.user = "User is required";
      } else if (!Types.ObjectId.isValid(user_id)) {
        errors.user = "Invalid user ID";
      } else {
        const user = await users.findById(user_id);
        const customerRequest = await customer_requests.findById(
          customerRequestId
        );
        if (!user) {
          errors.user = "User not found";
        } else if (user.user_type.toString() === "68484d1eefb856d41ac28c56") {
          errors.user = "Drivers cannot update a customer request";
        } else if (user_id !== customerRequest.user.toString()) {
          errors.user = "Not allowed";
        }
      }

      //Validate pickupLocation
      if (!isEmpty(data.pickupLocation.address)) {
        if (isEmpty(data.pickupLocation.address)) {
          errors.pickupLocation = { address: "Pickup address is required" };
        } else if (typeof data.pickupLocation.address !== "string") {
          errors.pickupLocation = { address: "Invalid pickup address format" };
        }
      }

      if (!isEmpty(data.pickupLocation.coordinates)) {
        if (isEmpty(data.pickupLocation.coordinates)) {
          errors.pickupLocation = {
            ...(errors.pickupLocation || {}),
            coordinates: "Pickup coordinates are required",
          };
        } else if (!isValidLngLat(data.pickupLocation.coordinates)) {
          errors.pickupLocation = {
            ...(errors.pickupLocation || {}),
            coordinates: "Pickup coordinates must be valid [lng, lat]",
          };
        }
      }

      //Validating dropoffLocation
      if (!isEmpty(data.dropoffLocation.address)) {
        if (isEmpty(data.dropoffLocation.address)) {
          errors.dropoffLocation = { address: "Dropoff address is required" };
        } else if (typeof data.dropoffLocation.address !== "string") {
          errors.dropoffLocation = {
            address: "Invalid dropoff address format",
          };
        }
      }

      if (!isEmpty(data.dropoffLocation.coordinates)) {
        if (isEmpty(data.dropoffLocation.coordinates)) {
          errors.dropoffLocation = {
            ...(errors.dropoffLocation || {}),
            coordinates: "Dropoff coordinates are required",
          };
        } else if (!isValidLngLat(data.dropoffLocation.coordinates)) {
          errors.dropoffLocation = {
            ...(errors.dropoffLocation || {}),
            coordinates: "Dropoff coordinates must be valid [lng, lat]",
          };
        }
      }

      //Validating packageDetails
      if (
        !isEmpty(data.packageDetails.weight) &&
        typeof data.packageDetails.weight !== "number"
      ) {
        errors.packageDetails = {
          ...(errors.packageDetails || {}),
          weight: "Weight must be a number",
        };
      }

      if (!isEmpty(data.packageDetails.dimensions)) {
        const { length, width, height } = data.packageDetails.dimensions;
        if (
          [length, width, height].some(
            (v) => v !== undefined && typeof v !== "number"
          )
        ) {
          errors.packageDetails = {
            ...(errors.packageDetails || {}),
            dimensions: "Dimensions must contain numbers only",
          };
        }
      }

      // Validate pickupTime (optional but must be a date if given)
      if (!isEmpty(data.pickupTime) && !validator.isISO8601(data.pickupTime)) {
        errors.pickupTime = "Pickup time must be a valid ISO8601 date";
      }

      // Validate status (optional but must be valid if provided)
        if (!isEmpty(data.status)) {
          if (!Types.ObjectId.isValid(data.status)) {
            errors.status = "Invalid status ID";
          } else {
            const statusExists = await requestStatus.findById(data.status);
            if (!statusExists) {
              errors.status = "Status not found";
            }
          }
        }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Customer request update validation error : ", error);
  }
};
