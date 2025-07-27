const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{7,14}$/.test(v);
      },
      message: 'Invalid phone number format',
    },
  },
  
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    select: false, // Don't include in queries by default
  },
  
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum OTP attempts exceeded'],
  },
  
  expiresAt: {
    type: Date,
    required: [true, 'Expiry time is required'],
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
}, {
  timestamps: true,
});

// Indexes
otpSchema.index({ phone: 1 });
otpSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('OTP', otpSchema);