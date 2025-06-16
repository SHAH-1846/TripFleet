const CustomerRequestStatus = require("../db/models/customer_request_status");
const {
  success_function,
  error_function,
} = require("../utils/response-handler");
const CustomerRequest = require("../db/models/customer_requests");
const customerRequestValidator =
  require("../validations/customerRequestValidations").customerRequestValidator;
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Trip = require("../db/models/trips");

exports.createCustomerRequest = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, packageDetails, pickupTime } =
      req.body;

    let user_id;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    //verifying token
    jwt.verify(token, process.env.PRIVATE_KEY, async function (err, decoded) {
      if (err) {
        let response = error_function({
          status: 401,
          message: err.message,
        });
        res.status(401).send(response);
        return;
      } else {
        user_id = decoded.user_id;
      }
    });

    //Validations
    const { errors, isValid } = await customerRequestValidator(
      req.body,
      user_id
    );

    if (isValid) {
      // if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
      //   return res.status(400).json({ success: false, message: "Invalid pickup location coordinates" });
      // }

      // if (!dropoffLocation || !dropoffLocation.coordinates || dropoffLocation.coordinates.length !== 2) {
      //   return res.status(400).json({ success: false, message: "Invalid dropoff location coordinates" });
      // }

      const newRequest = await CustomerRequest.create({
        user: user_id,
        pickupLocation: {
          address: pickupLocation.address,
          coordinates: {
            type: "Point",
            coordinates: pickupLocation.coordinates,
          },
        },
        dropoffLocation: {
          address: dropoffLocation.address,
          coordinates: {
            type: "Point",
            coordinates: dropoffLocation.coordinates,
          },
        },
        packageDetails,
        pickupTime,
      });

      if (newRequest) {
        let response = success_function({
          status: 201,
          data: newRequest,
          message: "Customer request created successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 400,
          message: "Operation failed",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
      let response = error_function({
        status: 400,
        message: "Validation Failed",
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
      console.log("Customer Request creation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMatchedTrips = async (req, res) => {
  try {
    const { id } = req.params; //Customer request id
    const { tripDate, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      let response = error_function({
        status: 400,
        message: "Invalid customer request ID",
      });
      return res.status(response.statusCode).send(response);
    }

    const request = await CustomerRequest.findById(id);
    if (!request) {
      let response = error_function({
        status: 404,
        message: "Customer request not found",
      });
      return res.status(response.statusCode).send(response);
    }

    const pickup = request.pickupLocation.coordinates.coordinates; // [lng, lat]
    const dropoff = request.dropoffLocation.coordinates.coordinates; // [lng, lat]

    // Build the base filter with optional tripDate and status
    const baseFilter = {};
    if (tripDate) {
      baseFilter.tripDate = new Date(tripDate);
    }
    if (status) {
      if(mongoose.Types.ObjectId.isValid(status)) {

        baseFilter.status = status;
      }else {
        let response = error_function({
          status : 400,
          message : "Status must be a valid MongoDB ObjectId",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    // Find trips that pass through pickup location
    const pickupTrips = await Trip.find({
      ...baseFilter,
      routeGeoJSON: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: pickup,
          },
        },
      },
    }).populate("user vehicle", "-__v -password");

    // Find trips that pass through dropoff location
    const dropoffTrips = await Trip.find({
      ...baseFilter,
      routeGeoJSON: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: dropoff,
          },
        },
      },
    }).populate("user vehicle", "-__v -password");

    // Separate trips into categories
    const pickupTripIds = pickupTrips.map((t) => t._id.toString());
    const dropoffTripIds = dropoffTrips.map((t) => t._id.toString());

    const both = pickupTrips.filter((t) =>
      dropoffTripIds.includes(t._id.toString())
    );
    const onlyPickup = pickupTrips.filter(
      (t) => !dropoffTripIds.includes(t._id.toString())
    );
    const onlyDropoff = dropoffTrips.filter(
      (t) => !pickupTripIds.includes(t._id.toString())
    );

    let response = success_function({
      status: 200,
      data: {
        bothLocations: both,
        onlyPickup,
        onlyDropoff,
      },
      message: "Trips fetched successfully",
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
      console.log("Error matching trips : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllCustomerRequestStatuses = async (req, res) => {
  try {
    const statuses = await CustomerRequestStatus.find().sort({ createdAt: 1 });

    if (statuses) {
      let response = success_function({
        status: 200,
        data: statuses,
        message: "Statuses fetched successfully",
      });
      return res.status(response.statusCode).send(response);
    } else {
      let response = error_function({
        status: 404,
        message: "Statuses not found",
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
      console.log("Customer requests status fetching error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
