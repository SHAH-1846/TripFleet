// models/UserType.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const user_types = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['admin', 'driver', 'customer'],
    default: 'user'
  },
  permissions: {
    type: [String],
    default: []
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
});

module.exports = mongoose.model('user_types', user_types);