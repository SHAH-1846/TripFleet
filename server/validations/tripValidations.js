const validator = require("validator");
const isEmpty = require("./is_empty");

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

    //Check if coordinate is valid
    const isValidLatLng = (point) =>
      typeof point.lat === "number" &&
      typeof point.lng === "number" &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180;

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
