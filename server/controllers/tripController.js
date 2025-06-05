const users = require("../db/models/users");
const trips = require("../db/models/trips");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const tripValidator = require("../validations/tripValidations").tripValidator;
const dotenv = require("dotenv");
dotenv.config();

exports.createTrip = async function (req, res) {
  try {

    let {errors, isValid} = tripValidator(req.body);

    if(isValid) {

    const startLocation = req.body.startLocation;
    const destination = req.body.destination;
    const routeCoordinates = req.body.routeCoordinates;
    const distance = req.body.distance;
    const duration = req.body.duration;

    const geoCoordinates = routeCoordinates.map((point) => [
      point.lng,
      point.lat,
    ]);

    const trip = new trips({
      startLocation,
      destination,
      routeCoordinates,
      routeGeoJSON: {
        type: "LineString",
        coordinates: geoCoordinates,
      },
      distance,
      duration,
    });

    await trip.save();
    let response = success_function({
      status: 201,
      data: trip,
      message: "Trip created successfully",
    });
    res.status(response.statusCode).send(response);
    return;

}else {
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
      return;
    } else {
      console.log("registration error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
