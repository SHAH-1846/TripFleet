const users = require("../db/models/users");
const trips = require("../db/models/trips");
const success_function = require("../utils/response-handler").success_function;
const error_function = require("../utils/response-handler").error_function;
const tripValidator = require("../validations/tripValidations").tripValidator;
const getDistanceFromLatLonInMeters =
  require("../utils/tripUtilities").getDistanceFromLatLonInMeters;
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
      const tripDate = req.body.tripDate;
      const startTime = req.body.startTime;
      const endTime = req.body.endTime;

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
    const startTime = req.query.startTime;
    const endTime = req.query.endTime;
    const date = req.query.date;
    const radius = req.query.radius || 1000; //Optional radius (in meters) for "near" check (default 1000m)

    // const currentLat = req.query.currentLat; //Actually stored in DB
    // const currentLng = req.query.currentLng; //Actually stored in DB
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
      const pickupNearbyTrips = await trips.find({
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
      });

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
      const dropoffNearbyTrips = await trips.find({
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
      });
      tripsData = dropoffNearbyTrips;
    } else {
      // No geo filtering
      tripsData = await trips.find(filters.length > 0 ? { $and: filters } : {});
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
        console.log("trip : ", trip);
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

      let response = success_function({
        status: 200,
        data: newDatas,
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
