const users = require("../db/models/users");
const jwt = require("jsonwebtoken");
const trips = require("../db/models/trips");
const CustomerRequest = require("../db/models/customer_requests");
const trip_status = require("../db/models/trip_status");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const extractUserIdFromToken = require("../utils/utils").extractUserIdFromToken;
const tripValidator = require("../validations/tripValidations").tripValidator;
const tripsUpdateValidator =
  require("../validations/tripValidations").tripsUpdateValidator;
const tripsLocationUpdateValidator =
  require("../validations/tripValidations").tripsLocationUpdateValidator;
const tripsStatusUpdateValidator =
  require("../validations/tripValidations").tripsStatusUpdateValidator;
const getDistanceFromLatLonInMeters =
  require("../utils/tripUtilities").getDistanceFromLatLonInMeters;
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

exports.createTrip = async function (req, res) {
  try {
    let { errors, isValid } = await tripValidator(req.body);

    if (isValid) {
      const vehicle = req.body.vehicle;
      const startLocation = req.body.startLocation;
      const destination = req.body.destination;
      const routeCoordinates = req.body.routeCoordinates;
      const distance = req.body.distance;
      const duration = req.body.duration;
      const tripDate = req.body.tripDate;
      const startTime = req.body.startTime;
      const endTime = req.body.endTime;
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

      // Format routeCoordinates as GeoJSON LineString
      const geoCoordinates = routeCoordinates.map((point) => [
        point.lng,
        point.lat,
      ]);

      //Set currentLocation to start point initially
      const currentLocation = {
        type: "Point",
        coordinates: [
          startLocation.coordinates.lng,
          startLocation.coordinates.lat,
        ],
      };

      const trip = new trips({
        vehicle,
        startLocation,
        destination,
        routeCoordinates,
        routeGeoJSON: {
          type: "LineString",
          coordinates: geoCoordinates,
        },
        distance,
        duration,
        currentLocation,
        tripDate,
        startTime,
        endTime,
        isStarted: false,
        user: user_id,
      });

      await trip.save();
      let response = success_function({
        status: 201,
        data: trip,
        message: "Trip created successfully",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
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
      console.log("Trip creation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updatedTrip = async function (req, res) {
  try {
    let user_id;

    const authHeader = req.headers["authorization"]
      ? req.headers["authorization"]
      : null;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (
      token == null ||
      token == "null" ||
      token == "" ||
      token == "undefined"
    ) {
      let response = error_function({
        status: 400,
        message: "Please login to continue",
      });
      res.status(response.statusCode).send(response);
      return;
    }

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

    const { errors, isValid } = await tripsUpdateValidator(
      req.body,
      user_id,
      req.params.tripId
    );

    if (isValid) {
      const tripId = req.params.tripId;
      const {
        vehicle,
        startLocation,
        destination,
        routeCoordinates,
        distance,
        duration,
        tripDate,
        startTime,
        endTime,
        isStarted,
        status, // e.g. “scheduled” | “started” | “completed”
        currentLocation, // { lat, lng }  – use only for occasional update
      } = req.body;

      const trip = await trips.findById(tripId);

      if (!trip) {
        let response = error_function({
          status: 404,
          message: "Trip not found",
        });
        return res.status(response.statusCode).send(response);
      }

      // Prevent updates if trip is completed
      if (trip.status === "completed") {
        let response = error_function({
          status: 403,
          message: "Trip is already completed. Updates are not allowed",
        });
        return res.status(response.statusCode).send(response);
      }

      // Prevent updating startLocation if trip has already started
      if (trip.status === "started" && trip.isStarted && startLocation) {
        let response = error_function({
          status: 403,
          message: "Cannot update start location after the trip has started",
        });
        return res.status(response.statusCode).send(response);
      }

      const update = {};

      if (vehicle) update.vehicle = vehicle;
      if (tripDate) update.tripDate = tripDate; // YYYY-MM-DD
      if (startTime) update.startTime = startTime; // HH:mm
      if (endTime) update.endTime = endTime;
      if (status) update.status = status;
      if (isStarted) update.isStarted = isStarted;

      // 2. locations
      if (startLocation) update.startLocation = startLocation;
      if (destination) update.destination = destination;

      // 3. route + metrics
      if (routeCoordinates) {
        update.routeCoordinates = routeCoordinates;
        // keep GeoJSON in sync
        update.routeGeoJSON = {
          type: "LineString",
          coordinates: routeCoordinates.map((p) => [p.lng, p.lat]),
        };
      }
      if (distance) update.distance = distance;
      if (duration) update.duration = duration;

      // 4. occasional location overwrite
      if (currentLocation && currentLocation.lat && currentLocation.lng) {
        update.currentLocation = {
          type: "Point",
          coordinates: [currentLocation.lng, currentLocation.lat],
        };
      }

      const updatedTrip = await trips.findByIdAndUpdate(
        tripId,
        { $set: update },
        { new: true, runValidators: true } // return modified document & validate
      );

      if (updatedTrip) {
        let response = success_function({
          status: 200,
          data: updatedTrip,
          message: "Trip updated successfully",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = error_function({
          status: 404,
          message: "Trip not found",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
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
      console.log("Trip creation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getAllTrips = async function (req, res) {
  try {
    const { tripId, userId } = req.query;

    if (tripId && userId) {
      let tripDatas = await trips
        .findOne({ _id: tripId, user: userId })
        .populate("vehicle user status", "-password -__v");

      if (tripDatas) {
        let response = success_function({
          status: 200,
          data: tripDatas,
          message: "Trip records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Trip record not fouond",
        });
        return res.status(response.statusCode).send(response);
      }
    } else if (tripId) {
      let tripDatas = await trips
        .findOne({ _id: tripId })
        .populate("vehicle user status", "-password -__v");

      if (tripDatas) {
        let response = success_function({
          status: 200,
          data: tripDatas,
          message: "Trip records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Trip record not fouond",
        });
        return res.status(response.statusCode).send(response);
      }
    } else if (userId) {
      let tripDatas = await trips
        .findOne({ user: userId })
        .populate("vehicle user status", "-password -__v");

      if (tripDatas) {
        let response = success_function({
          status: 200,
          data: tripDatas,
          message: "Trip records retrieved successfully ",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 404,
          message: "Trip record not fouond",
        });
        return res.status(response.statusCode).send(response);
      }
    }

    const start = req.query.start;
    const destination = req.query.destination;
    const status = req.query.status;

    //For finding trips passing near this location
    const lat = req.query.lat;
    const lng = req.query.lng;

    //Customer pickup and dropoff locations
    const pickupLat = req.query.pickupLat;
    const pickupLng = req.query.pickupLng;
    const dropoffLat = req.query.dropoffLat;
    const dropoffLng = req.query.dropoffLng;
    const startTime = req.query.startTime;
    const endTime = req.query.endTime;
    const date = req.query.date;
    const radius = req.query.radius || 1000; //Optional radius (in meters) for "near" check (default 1000m)

    // const currentLat = req.query.currentLat; //Actually stored in DB
    // const currentLng = req.query.currentLng; //Actually stored in DB

    const count = Number(await trips.countDocuments());
    const pageNumber = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || count;
    const keyword = req.query.keyword;

    const filters = [];

    // Add filter by tripDate
    if (date) {
      const tripDate = new Date(date);
      const nextDay = new Date(tripDate);
      nextDay.setDate(tripDate.getDate() + 1);

      filters.push({
        tripDate: {
          $gte: tripDate,
          $lt: nextDay,
        },
      });
    }

    if (keyword) {
      filters.push({
        $or: [
          { "startLocation.address": { $regex: keyword, $options: "i" } },
          { "destination.address": { $regex: keyword, $options: "i" } },
        ],
      });
    }

    if (status) {
      filters.push({
        status,
      });
    }

    // Add startTime filter (if trip starts later than or at this time)
    if (startTime) {
      filters.push({
        startTime: { $gte: startTime },
      });
    }

    // Add endTime filter (if trip ends earlier than or at this time)
    if (endTime) {
      filters.push({
        endTime: { $lte: endTime },
      });
    }

    //Text filter for startLocation.address
    if (start) {
      filters.push({
        "startLocation.address": { $regex: new RegExp(start, "i") },
      });
    }

    //Text filter for destination.address
    if (destination) {
      filters.push({
        "destination.address": { $regex: new RegExp(destination, "i") },
      });
    }

    //Geo filter: if lat/lng is provided, find trips passing nearby
    if (lat && lng) {
      filters.push({
        routeGeoJSON: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: parseFloat(radius),
          },
        },
      });
    }

    //Filter trips that pass near pickup and dropoff points
    // if(pickupLat && pickupLng && dropoffLat && dropoffLng) {
    //   filters.push({
    //     $and : [
    //       {
    //         routeGeoJSON : {
    //           $near : {
    //             $geometry : {
    //               type : 'Point',
    //               coordinates : [parseFloat(pickupLng), parseFloat(pickupLat)]
    //             },
    //             $maxDistance : parseInt(radius)
    //           }
    //         }
    //       },
    //       {
    //         routeGeoJSON : {
    //           $near : {
    //             $geometry : {
    //               type : 'Point',
    //               coordinates : [parseFloat(dropoffLng), parseFloat(dropoffLat)]
    //             },
    //             $maxDistance : parseInt(radius)
    //           }
    //         }
    //       }
    //     ]
    //   });
    // }else if(pickupLat && pickupLng) {
    //   //If only pickup point provided
    //   filters.push({
    //     routeGeoJSON : {
    //       $near : {
    //         $geometry : {
    //           type : 'Point',
    //           coordinates : [parseFloat(pickupLng), parseFloat(pickupLat)]
    //         },
    //         $maxDistance : parseInt(radius)
    //       }
    //     }
    //   })
    // }else if(dropoffLat && dropoffLng) {
    //   //If only dropoff point is provided
    //   filters.push({
    //     routeGeoJSON : {
    //       $near : {
    //         $geometry : {
    //           type : 'Point',
    //           coordinates : [parseFloat(dropoffLng, parseFloat(dropoffLat))]
    //         },
    //         $maxDistance : parseInt(radius)
    //       }
    //     }
    //   })
    // }

    let tripsData = [];

    // Step 1: Find trips near pickup point
    if (pickupLat && pickupLng) {
      const pickupNearbyTrips = await trips
        .find({
          routeGeoJSON: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)],
              },
              $maxDistance: parseInt(radius),
            },
          },
          ...(filters.length ? { $and: filters } : {}),
        })
        .populate("vehicle user status", "-password -__v")
        .sort({ _id: -1 })
        .skip(pageSize * (pageNumber - 1))
        .limit(pageSize);

      // Step 2: Filter those that also pass near dropoff point
      if (dropoffLat && dropoffLng) {
        tripsData = pickupNearbyTrips.filter((trip) => {
          //Write the code for calculating distance, duration, date and time for pickup from trip currentLocation here in this filter function
          return trip.routeGeoJSON.coordinates.some((coord) => {
            const [lng, lat] = coord;
            const dist = getDistanceFromLatLonInMeters(
              lat,
              lng,
              parseFloat(dropoffLat),
              parseFloat(dropoffLng)
            );
            return dist <= parseInt(radius);
          });
        });
      } else {
        tripsData = pickupNearbyTrips;
      }
    } else if (dropoffLat && dropoffLng) {
      // Only dropoff provided
      const dropoffNearbyTrips = await trips
        .find({
          routeGeoJSON: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [parseFloat(dropoffLng), parseFloat(dropoffLat)],
              },
              $maxDistance: parseInt(radius),
            },
          },
          ...(filters.length ? { $and: filters } : {}),
        })
        .populate("vehicle user status", "-password -__v")
        .sort({ _id: -1 })
        .skip(pageSize * (pageNumber - 1))
        .limit(pageSize);

      tripsData = dropoffNearbyTrips;
    } else {
      // No geo filtering
      tripsData = await trips
        .find(filters.length > 0 ? { $and: filters } : {})
        .populate("vehicle user status", "-password -__v")
        .sort({ _id: -1 })
        .skip(pageSize * (pageNumber - 1))
        .limit(pageSize);
    }

    // const tripsData = await trips.find(filters.length > 0 ? { $and: filters } : {});

    //Calculating distance, duration, date and time for pickup from trip currentLocation
    //Map tripsData here inorder to get the currentLocation from DB
    // const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    // const pickupUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${currentLat},${currentLng}&destinations=${pickupLat},${pickupLng}&key=${apiKey}`;
    // const dropoffUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${currentLat},${currentLng}&destinations=${dropoffLat},${dropoffLng}&key=${apiKey}`;

    // const [pickupRes, dropoffRes] = apiKey ? await Promise.all([axios.get(pickupUrl), axios.get(dropoffUrl)]) : null;

    // const pickupInfo = apiKey ? pickupRes.data.rows[0].elements[0] : null;
    // const dropoffInfo = apiKey ? dropoffRes.data.rows[0].elements[0] : null;

    // const now = new Date();

    // const pickupArrivalTime = apiKey ? new Date(now.getTime() + pickupInfo.duration.value * 1000) : null;
    // const dropoffArrivalTime = apiKey ? new Date(now.getTime() + dropoffInfo.duration.value * 1000) : null;

    // tripsData.pickup = {};
    // tripsData.pickup.distance = pickupInfo ? pickupInfo.distance : null;
    // tripsData.pickup.duration = pickupInfo ? pickupInfo.duration : null;
    // tripsData.pickup.arrival = {};
    // tripsData.pickup.arrival.timestamp = pickupArrivalTime ? pickupArrivalTime.toISOString() : null;
    // tripsData.pickup.arrival.readable = pickupArrivalTime ? pickupArrivalTime.toLocaleString("en-IN", {timeZone : "Asia/Kolkata"}) : null;
    // tripsData.dropoff = {};
    // tripsData.dropoff.distance = dropoffInfo ? dropoffInfo.distance : null;
    // tripsData.dropoff.duration = dropoffInfo ? dropoffInfo.duration : null;
    // tripsData.dropoff.arrival = {};
    // tripsData.dropoff.arrival.timestamp = dropoffArrivalTime ? dropoffArrivalTime.toISOString() : null;
    // tripsData.dropoff.arrival.readable = dropoffArrivalTime ? dropoffArrivalTime.toLocaleString("en-IN", {timeZone : "Asia/Kolkata"}) : null;

    if (tripsData) {
      let newDatas = tripsData.map((trip) => {
        return {
          ...trip._doc,
          pickup: {
            distance: null, // You might want to change this
            duration: null,
            arrival: {
              timestamp: null,
              readable: null,
            },
          },
          dropoff: {
            distance: null,
            duration: null,
            arrival: {
              timestamp: null,
              readable: null,
            },
          },
        };
      });

      let count = Number(
        await trips.countDocuments(
          filters.length > 0 ? { $and: filters } : null
        )
      );
      let totalPages = Math.ceil(count / pageSize);
      let data = {
        count: count,
        totalPages,
        currentPage: pageNumber,
        datas: tripsData,
      };

      let response = success_function({
        status: 200,
        data,
        message: "Trip records retrieved successfully",
      });
      res.status(response.statusCode).send(response);
      return;
    } else {
      let response = error_function({
        status: 400,
        message: "No trip records found",
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
      console.log("Trips records fetching error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return res
        .status(401)
        .send(error_function({ status: 401, message: "Unauthorized" }));
    }

    const myTrips = await trips
      .find({ user: userId })
      .populate("vehicle status", "-__v")
      .sort({ createdAt: -1 });

    return res.status(200).send(
      success_function({
        status: 200,
        message: "My trips fetched successfully",
        data: myTrips,
      })
    );
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
      console.log("Mytrips error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getMatchedCustomerRequests = async (req, res) => {
  try {
    const { id } = req.params; // Trip ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      let response = error_function({
        status: 400,
        message: "Invallid trip ID",
      });
      return res.status(response.statusCode).send(response);
    }

    const { status, startDate, endDate } = req.query; // Optional filters

    const trip = await trips.findById(id);
    if (!trip || !trip.routeGeoJSON) {
      let response = error_function({
        status: 404,
        message: "Trip not found or missing routeGeoJSON",
      });
      return res.status(response.statusCode).send(response);
    }

    // Build common query conditions
    const baseFilter = {};
    if (status) {
      if (!mongoose.Types.ObjectId.isValid(status)) {
        let response = error_function({
          status: 400,
          message: "Invalid status ID",
        });
        return res.status(response.statusCode).send(response);
      }
      baseFilter.status = status;
    }

    if (startDate || endDate) {
      baseFilter.pickupTime = {};
      if (startDate) baseFilter.pickupTime.$gte = new Date(startDate);
      if (endDate) baseFilter.pickupTime.$lte = new Date(endDate);
    }

    // Match customer requests whose pickup or dropoff locations intersect with the trip route
    const pickupMatches = await CustomerRequest.find({
      ...baseFilter,
      "pickupLocation.coordinates": {
        $geoIntersects: {
          $geometry: trip.routeGeoJSON,
        },
      },
    }).populate("user status", "-__v -password");

    const dropoffMatches = await CustomerRequest.find({
      ...baseFilter,
      "dropoffLocation.coordinates": {
        $geoIntersects: {
          $geometry: trip.routeGeoJSON,
        },
      },
    }).populate("user status", "-__v -password");

    const pickupIds = pickupMatches.map((req) => req._id.toString());
    const dropoffIds = dropoffMatches.map((req) => req._id.toString());

    const both = pickupMatches.filter((req) =>
      dropoffIds.includes(req._id.toString())
    );
    const onlyPickup = pickupMatches.filter(
      (req) => !dropoffIds.includes(req._id.toString())
    );
    const onlyDropoff = dropoffMatches.filter(
      (req) => !pickupIds.includes(req._id.toString())
    );

    const response = success_function({
      status: 200,
      message: "Customer requests matched successfully",
      data: {
        bothLocations: both,
        onlyPickup,
        onlyDropoff,
      },
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
      console.log("Error matching customer requests : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateTripLocation = async function (req, res) {
  try {
    const { errors, isValid } = tripsLocationUpdateValidator(req.body);

    if (isValid) {
      const tripId = req.params.tripId;
      const lat = req.body.lat;
      const lng = req.body.lng;

      const updatedTrip = await trips.findByIdAndUpdate(
        tripId,
        {
          $set: {
            currentLocation: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            lastUpdated: new Date(),
          },
        },
        {
          new: true,
        }
      );

      if (!updatedTrip) {
        let response = error_function({
          status: 404,
          message: "Trip not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 200,
          data: {
            tripId: updatedTrip._id,
            currentLocation: updatedTrip.currentLocation,
            updatedAt: updatedTrip.lastUpdated,
          },
          message: "Location updated successfully",
        });
        return res.status(response.statusCode).send(response);
      }
    } else {
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
      console.log("Trip location update error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.updateTripStatus = async function (req, res) {
  try {
    const { isValid, errors } = await tripsStatusUpdateValidator(req.body);

    if (isValid) {
      const { status } = req.body;

      // Update trip with the new status ID
      const trip = await trips
        .findByIdAndUpdate(
          req.params.tripId,
          {
            status,
            updatedAt: new Date(),
          },
          { new: true }
        )
        .populate("status");

      if (!trip) {
        let response = error_function({
          status: 404,
          message: "Trip not found",
        });
        return res.status(response.statusCode).send(response);
      } else {
        let response = success_function({
          status: 200,
          data: trip,
          message: "Trip status updated successfully",
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
      console.log("Trip status updation error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};

exports.getTripStatus = async function (req, res) {
  try {
    const statuses = await trip_status
      .find({ isActive: true })
      .sort({ createdAt: 1 });

    let response = success_function({
      status: 200,
      data: statuses,
      message: "Trip statuses fetched successfully",
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
      console.log("Trip status fetching error : ", error);
      let response = error_function({
        status: 400,
        message: error.message ? error.message : "Something went wrong",
      });
      res.status(response.statusCode).send(response);
      return;
    }
  }
};
