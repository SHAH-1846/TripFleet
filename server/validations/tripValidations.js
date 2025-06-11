const validator = require("validator");
const isEmpty = require("./is_empty");
const trip_status = require("../db/models/trip_status");
const { Types } = require("mongoose");

//Check if coordinate is valid
const isValidLatLng = (point) =>
  typeof point.lat === "number" &&
  typeof point.lng === "number" &&
  point.lat >= -90 &&
  point.lat <= 90 &&
  point.lng >= -180 &&
  point.lng <= 180;

exports.tripValidator = function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.startLocation = !isEmpty(data.startLocation) ? data.startLocation : "";
    data.destination = !isEmpty(data.destination) ? data.destination : "";
    data.routeCoordinates = !isEmpty(data.routeCoordinates)
      ? data.routeCoordinates
      : "";
    data.distance = !isEmpty(data.distance) ? data.distance : "";
    data.duration = !isEmpty(data.duration) ? data.duration : "";
    data.tripDate = !isEmpty(data.tripDate) ? data.tripDate : "";
    data.startTime = !isEmpty(data.startTime) ? data.startTime : "";
    data.endTime = !isEmpty(data.endTime) ? data.endTime : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      //Validating startLocation
      if (isEmpty(data.startLocation)) {
        errors.startLocation = "Start location is required";
      } else if (isEmpty(data.startLocation.address)) {
        errors.startLocation = {};
        errors.startLocation.address =
          "Start location address is required and cannot be empty";
      } else if (typeof data.startLocation.address !== "string") {
        errors.startLocation = {};
        errors.startLocation.address =
          "Start location address is invalid. Please provide a valid address";
      } else if (isEmpty(data.startLocation.coordinates)) {
        errors.startLocation = {};
        errors.startLocation.coordinates = "Coordinates is required";
      } else if (!isValidLatLng(data.startLocation.coordinates)) {
        errors.startLocation = {};
        errors.startLocation.coordinates =
          "Coordinates are invalid. Please provide valid latitude and longitude values";
      }

      //Validating destination
      if (isEmpty(data.destination)) {
        errors.destination = "Destination is required";
      } else if (isEmpty(data.destination.address)) {
        errors.destination = {};
        errors.destination.address = "Destination address is required";
      } else if (typeof data.destination.address !== "string") {
        errors.destination = {};
        errors.destination.address =
          "Destination address is invalid. Please provide a valid address";
      } else if (isEmpty(data.destination.coordinates)) {
        errors.destination = {};
        errors.destination.coordinates = "Coordinates is required";
      } else if (!isValidLatLng(data.destination.coordinates)) {
        errors.destination = {};
        errors.destination.coordinates =
          "Coordinates are invalid. Please provide valid latitude and longitude values";
      }

      //Validating routeCoordinates
      if (isEmpty(data.routeCoordinates)) {
        errors.routeCoordinates = "Route coordinates is required";
      } else if (
        !Array.isArray(data.routeCoordinates) ||
        data.routeCoordinates.length < 2 ||
        !data.routeCoordinates.every(isValidLatLng)
      ) {
        errors.routeCoordinates = "Invalid or insufficient routeCoordinates";
      }

      //Validating distance
      if (isEmpty(data.distance)) {
        errors.distance = "Distance is required";
      } else if (isEmpty(data.distance.value)) {
        errors.distance = {};
        errors.distance.value = "Trip distance is required and cannot be empty";
      } else if (isEmpty(data.distance.text)) {
        errors.distance = {};
        errors.distance.text = "Trip distance is required and cannot be empty";
      } else if (
        typeof data.distance.value !== "number" ||
        typeof data.distance.text !== "string"
      ) {
        errors.distance = "Invalid distance format";
      }

      //Validating duration
      if (isEmpty(data.duration)) {
        errors.duration = "Duration is required";
      } else if (isEmpty(data.duration.value)) {
        errors.duration = {};
        errors.duration.value = "Trip duration is required and cannot be empty";
      } else if (isEmpty(data.duration.text)) {
        errors.duration = {};
        errors.duration.text = "Trip duration is required and cannot be empty";
      } else if (
        typeof data.duration.value !== "number" ||
        typeof data.duration.text !== "string"
      ) {
        errors.duration = "Invalid duration format";
      }

      //Validating tripDate
      if (isEmpty(data.tripDate)) {
        errors.tripDate = "Trip date is required";
      }

      //Validating startTime
      if (isEmpty(data.startTime)) {
        errors.startTime = "Trip start time is required";
      }

      //Validating endTime
      if (isEmpty(data.endTime)) {
        errors.endTime = "Trip end time is required";
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Trip validation error : ", error);
    return;
  }
};

exports.tripsLocationUpdateValidator = function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.lat = !isEmpty(data.lat) ? data.lat : "";
    data.lng = !isEmpty(data.lng) ? data.lng : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      if (isEmpty(data.lat)) {
        errors.lat = "Latitude is required";
      } else if (isEmpty(data.lng)) {
        errors.lng = "Longitude is required";
      } else if (!isValidLatLng(data)) {
        errors.coordinates =
          "Coordinates are invalid. Please provide valid latitude and longitude values";
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Error validating location update : ", error);
  }
};

exports.tripsUpdateValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.startLocation = !isEmpty(data.startLocation) ? data.startLocation : "";
    data.destination = !isEmpty(data.destination) ? data.destination : "";
    data.routeCoordinates = !isEmpty(data.routeCoordinates)
      ? data.routeCoordinates
      : "";
    data.status = !isEmpty(data.status) ? data.status : "";
    data.distance = !isEmpty(data.distance) ? data.distance : "";
    data.duration = !isEmpty(data.duration) ? data.duration : "";
    data.tripDate = !isEmpty(data.tripDate) ? data.tripDate : "";
    data.startTime = !isEmpty(data.startTime) ? data.startTime : "";
    data.endTime = !isEmpty(data.endTime) ? data.endTime : "";
    data.isStarted = !isEmpty(data.isStarted) ? data.isStarted : "";
    data.status = !isEmpty(data.status) ? data.status : "";
    data.currentLocation = !isEmpty(data.currentLocation)
      ? data.currentLocation
      : "";

    if (isEmpty(data)) {
      errors.data = "Please complete the required fields to continue";
    } else {
      //Validating startLocation
      if (data.startLocation) {
        if (isEmpty(data.startLocation)) {
          errors.startLocation = "Start location is required";
        } else if (isEmpty(data.startLocation.address)) {
          errors.startLocation = {};
          errors.startLocation.address =
            "Start location address is required and cannot be empty";
        } else if (typeof data.startLocation.address !== "string") {
          errors.startLocation = {};
          errors.startLocation.address =
            "Start location address is invalid. Please provide a valid address";
        } else if (isEmpty(data.startLocation.coordinates)) {
          errors.startLocation = {};
          errors.startLocation.coordinates = "Coordinates is required";
        } else if (!isValidLatLng(data.startLocation.coordinates)) {
          errors.startLocation = {};
          errors.startLocation.coordinates =
            "Coordinates are invalid. Please provide valid latitude and longitude values";
        }
      }

      //Validating destination
      if (data.destination) {
        if (isEmpty(data.destination)) {
          errors.destination = "Destination is required";
        } else if (isEmpty(data.destination.address)) {
          errors.destination = {};
          errors.destination.address = "Destination address is required";
        } else if (typeof data.destination.address !== "string") {
          errors.destination = {};
          errors.destination.address =
            "Destination address is invalid. Please provide a valid address";
        } else if (isEmpty(data.destination.coordinates)) {
          errors.destination = {};
          errors.destination.coordinates = "Coordinates is required";
        } else if (!isValidLatLng(data.destination.coordinates)) {
          errors.destination = {};
          errors.destination.coordinates =
            "Coordinates are invalid. Please provide valid latitude and longitude values";
        }
      }

      //Validating routeCoordinates
      if (data.routeCoordinates) {
        if (isEmpty(data.routeCoordinates)) {
          errors.routeCoordinates = "Route coordinates is required";
        } else if (
          !Array.isArray(data.routeCoordinates) ||
          data.routeCoordinates.length < 2 ||
          !data.routeCoordinates.every(isValidLatLng)
        ) {
          errors.routeCoordinates = "Invalid or insufficient routeCoordinates";
        }
      }

      //Validating distance
      if (data.distance) {
        if (isEmpty(data.distance)) {
          errors.distance = "Distance is required";
        } else if (isEmpty(data.distance.value)) {
          errors.distance = {};
          errors.distance.value =
            "Trip distance is required and cannot be empty";
        } else if (isEmpty(data.distance.text)) {
          errors.distance = {};
          errors.distance.text =
            "Trip distance is required and cannot be empty";
        } else if (
          typeof data.distance.value !== "number" ||
          typeof data.distance.text !== "string"
        ) {
          errors.distance = "Invalid distance format";
        }
      }

      //Validating duration
      if (data.duration) {
        if (isEmpty(data.duration)) {
          errors.duration = "Duration is required";
        } else if (isEmpty(data.duration.value)) {
          errors.duration = {};
          errors.duration.value =
            "Trip duration is required and cannot be empty";
        } else if (isEmpty(data.duration.text)) {
          errors.duration = {};
          errors.duration.text =
            "Trip duration is required and cannot be empty";
        } else if (
          typeof data.duration.value !== "number" ||
          typeof data.duration.text !== "string"
        ) {
          errors.duration = "Invalid duration format";
        }
      }

      //Validating tripDate
      if (data.tripDate) {
        if (isEmpty(data.tripDate)) {
          errors.tripDate = "Trip date is required";
        }
      }

      //Validating startTime
      if (data.startTime) {
        if (isEmpty(data.startTime)) {
          errors.startTime = "Trip start time is required";
        }
      }

      //Validating endTime
      if (data.endTime) {
        if (isEmpty(data.endTime)) {
          errors.endTime = "Trip end time is required";
        }
      }

      //Validation isStarted
      if (data.isStarted) {
        if (data.isStarted !== undefined) {
          if (typeof data.isStarted !== "boolean") {
            errors.isStarted = "Must be either true or false";
          }
        }
      }

      //Validating status
      if (data.status) {
        if (!Types.ObjectId.isValid(data.status)) {
          errors.status = "Status must be a valid MongoDB ObjectId";
        } else {
          const status = await trip_status.findById(data.status);
          if (!status) {
            errors.status = "Trip status does not exist";
          } else if (
            status.name !== "scheduled" &&
            status.name !== "started" &&
            status.name !== "completed"
          ) {
            errors.status =
              "Trip status must be one of: 'scheduled', 'started', or 'completed'.";
          }
        }
      }

      //Validating currentLocation
      if (data.currentLocation) {
        if (isEmpty(data.currentLocation)) {
          errors.currentLocation = "Current location is required";
        } else if (!isValidLatLng(data.currentLocation)) {
          errors.currentLocation = "Invalid or insufficient coordinates";
        }
      }
    }

    return {
      errors,
      isValid: isEmpty(errors),
    };
  } catch (error) {
    console.log("Error updating trips : ", error);
  }
};

exports.tripsStatusUpdateValidator = async function (data) {
  try {
    let errors = {};

    data = !isEmpty(data) ? data : "";
    data.status = !isEmpty(data.status) ? data.status : "";

    if (isEmpty(data)) {
      errors.data = "Please complete all required fields to continue";
    } else {
      if (isEmpty(data.status)) {
        errors.status = "Status is required";
      } else if (!Types.ObjectId.isValid(data.status)) {
        errors.status = "Invalid status ID format";
      } else {
        const status = await trip_status.findOne({
          _id: data.status,
          isActive: true,
        });
        if (!status) {
          errors.status = "Trip status not found or inactive";
        }
      }
    }

    return {
      errors,
      isValid : isEmpty(errors),
    }
  } catch (error) {
    console.log("Error validating trip status : ", error);
  }
};
