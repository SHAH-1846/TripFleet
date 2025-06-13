const mongoose = require('mongoose');

const vehicles = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
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
      ref : "vehicle_types",
      required : true,
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    color: { type: String },
    capacity: { type: Number }, // in kg or liters
    registrationYear: { type: Number },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref : "vehicle_status",
      default: '684bbcb5a9dcd0556d12b2a5',
      required : true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('vehicles', vehicles);
