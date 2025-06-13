const mongoose = require('mongoose');

const vehicle_status = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection : "vehicle_status",
  }
);

module.exports = mongoose.model('vehicle_status', vehicle_status);
