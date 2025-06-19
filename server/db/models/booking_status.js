const mongoose = require("mongoose");

const booking_status = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    //   enum: [
    //     "pending",
    //     "active",
    //     "pickedUp",
    //     "delivered",
    //     "confirmed",
    //     "cancelled",
    //     "completed"
    //   ],
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "booking_status",
  }
);

module.exports = mongoose.model("booking_status", booking_status);
