const users = require("../db/models/users");
const trips = require("../db/models/trips");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const tripValidator = require("../validations/tripValidations").tripValidator;
const getDistanceFromLatLonInMeters = require('../utils/tripUtilities').getDistanceFromLatLonInMeters;
const dotenv = require("dotenv");
dotenv.config();

exports.createTrip = async function (req, res) {
  try {
    let { errors, isValid } = tripValidator(req.body);

    if (isValid) {
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
    const start = req.query.start;
    const destination = req.query.destination;
    
    //For finding trips passing near this location
    const lat = req.query.lat;
    const lng = req.query.lng;

    //Customer pickup and dropoff locations
    const pickupLat = req.query.pickupLat;
    const pickupLng = req.query.pickupLng;
    const dropoffLat = req.query.dropoffLat;
    const dropoffLng = req.query.dropoffLng;

    const radius = req.query.radius || 1000; //Optional radius (in meters) for "near" check (default 1000m)
    const filters = [];

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
      const pickupNearbyTrips = await trips.find({
        routeGeoJSON: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)]
            },
            $maxDistance: parseInt(radius)
          }
        },
        ...(filters.length ? { $and: filters } : {})
      });

      // Step 2: Filter those that also pass near dropoff point
      if (dropoffLat && dropoffLng) {
        tripsData = pickupNearbyTrips.filter(trip => {
          return trip.routeGeoJSON.coordinates.some(coord => {
            const [lng, lat] = coord;
            const dist = getDistanceFromLatLonInMeters(lat, lng, parseFloat(dropoffLat), parseFloat(dropoffLng));
            return dist <= parseInt(radius);
          });
        });
      } else {
        tripsData = pickupNearbyTrips;
      }

    } else if (dropoffLat && dropoffLng) {
      // Only dropoff provided
      const dropoffNearbyTrips = await trips.find({
        routeGeoJSON: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(dropoffLng), parseFloat(dropoffLat)]
            },
            $maxDistance: parseInt(radius)
          }
        },
        ...(filters.length ? { $and: filters } : {})
      });
      tripsData = dropoffNearbyTrips;

    } else {
      // No geo filtering
      tripsData = await trips.find(filters.length > 0 ? { $and: filters } : {});
    }

    // const tripsData = await trips.find(filters.length > 0 ? { $and: filters } : {});

    if (trips) {
      let response = success_function({
        status: 200,
        data: tripsData,
        message: "Trip records retrieved successfully",
      });
      res.status(response.statusCode).send(response);
      return;
    }else {
      let response = error_function({
        status : 400,
        message : "No trip records found",
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
