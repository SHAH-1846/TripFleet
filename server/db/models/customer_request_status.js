const mongoose = require("mongoose");

const customer_request_status = new mongoose.Schema(
  {
    name: {
      type: String,
    //   enum: ["open", "pending","active", "matched", "picked_up", "delivered", "cancelled"],
      required: true,
      unique: true,
    },
    description: {
      type: String,
    }
  },
  {
    timestamps: true,
    collection: "customer_request_status"
  }
);

module.exports = mongoose.model("customer_request_status", customer_request_status);
