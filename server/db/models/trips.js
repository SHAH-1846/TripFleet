const mongoose = require("mongoose");
const { trim } = require("validator");

const trips = new mongoose.Schema(
  {
    startLocation: {
      address : String,
      coordinates : {
        lat : Number,
        lng : Number,
      }
    },

    destination: {
      address : String,
      coordinates : {
        lat : Number,
        lng : Number,
      }
    },

    routeCoordinates : [
      {
        lat : Number,
        lng : Number,
      }
    ],

    routeGeoJSON : {
      type : {
        type : String,
        enum : ['LineString'],
        default : 'LineString',
      },
      coordinates : {
        type : [[Number]], //[lng, lat]
      }
    },

    distance: {
      value : Number, // in meters
      text : String, // readable, e.g., "120 km"
    },
    duration: {
      value : Number, // in seconds
      text : String, // e.g., "2 hours 15 mins"
    },
  },
  {
    timestamps: true,
  }
);

trips.index({'startLocation.address' : 'text', 'destination.address' : 'text'});
//Add 2dsphere index for routeGeoJSON
trips.index({routeGeoJSON : '2dsphere'});
module.exports = mongoose.model("trips", trips);