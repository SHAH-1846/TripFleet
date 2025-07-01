const mongoose = require('mongoose');

const vehicle_body_types = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection : "vehicle_body_types",
  }
);

module.exports = mongoose.model('vehicle_body_types', vehicle_body_types);
