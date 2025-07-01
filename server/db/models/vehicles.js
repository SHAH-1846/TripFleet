const mongoose = require("mongoose");

const vehicles = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle_types",
      required: true,
    },

    vehicleBodyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle_body_types",
      required: true,
    },

    goodsAccepted: {
      type: Boolean,
      default: true,
    },

    vehicleCapacity: { type: Number, required: true }, // in kg or liters
    registrationYear: { type: Number },

    registrationCertificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "documents",
    },

    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle_status",
      default: "684bbcb5a9dcd0556d12b2a5",
    },

    brand: { type: String },
    model: { type: String },
    color: { type: String },

    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "images",
      },
    ],
    
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "documents",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("vehicles", vehicles);
