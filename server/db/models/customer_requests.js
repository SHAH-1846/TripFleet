const mongoose = require("mongoose");

const customer_requests = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    dropoffLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    packageDetails: {
      weight: { type: Number }, // in kg
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      description: { type: String },
    },
    pickupTime: {
      type: Date,
      required: false,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref : "customer_request_status",
      default: "684da101412825ef8b404711",
    },
    matchedTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "trips",
      required: false,
    },
  },
  {
    timestamps: true,
    collection : 'customer_requests',
  }
);

// Indexes for spatial queries
customer_requests.index({ "pickupLocation.coordinates": "2dsphere" });
customer_requests.index({ "dropoffLocation.coordinates": "2dsphere" });

module.exports = mongoose.model("customer_requests", customer_requests);
