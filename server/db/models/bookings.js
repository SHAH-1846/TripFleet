const mongoose = require("mongoose");

const bookings = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "trips",
      required: true,
    },
    customerRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer_requests",
      required: true,
      unique: true, // ensure one request is booked only once
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true, // customer who made the request
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      default: "685084f96bd3cba167bd01a1",
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "bookings",
  }
);

module.exports = mongoose.model("bookings", bookings);
