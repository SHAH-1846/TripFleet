const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trip_status = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'scheduled'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection : 'trip_status',
});

module.exports = mongoose.model('trip_status', trip_status);