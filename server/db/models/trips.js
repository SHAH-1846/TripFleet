const mongoose = require("mongoose");

const trips = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    vehicle : {
      type : mongoose.Schema.Types.ObjectId,
      ref : "vehicles",
    },

    startLocation: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    destination: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    routeCoordinates: [
      {
        lat: Number,
        lng: Number,
      },
    ],

    routeGeoJSON: {
      type: {
        type: String,
        enum: ["LineString"],
        default: "LineString",
      },
      coordinates: {
        type: [[Number]], //[lng, lat]
      },
    },

    distance: {
      value: Number, // in meters
      text: String, // readable, e.g., "120 km"
    },

    duration: {
      value: Number, // in seconds
      text: String, // e.g., "2 hours 15 mins"
    },

    isStarted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "trip_status",
      default: "684942f5ff32840ef8e726f0",
    },

    actualStartTime: Date,
    actualEndTime: Date,

    currentLocation: {
      type: { type: String, default: "Point" },
      coordinates: [Number], //[lng, lat]
    },

    lastUpdated: Date,
    tripDate: Date,
    startTime: String,
    endTime: String,
  },
  {
    timestamps: true,
  }
);

trips.index({ "startLocation.address": "text", "destination.address": "text" });
//Add 2dsphere index for routeGeoJSON
trips.index({ routeGeoJSON: "2dsphere" });
module.exports = mongoose.model("trips", trips);
