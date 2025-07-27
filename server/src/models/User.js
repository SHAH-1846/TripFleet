const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  
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
  
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{7,14}$/.test(v);
      },
      message: 'Invalid WhatsApp number format',
    },
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format',
    },
  },
  
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include in queries by default
  },
  
  profilePicture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
  },
  
  drivingLicense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  },
  
  user_type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserType',
    required: [true, 'User type is required'],
  },
  
  googleId: {
    type: String,
    sparse: true,
  },
  
  emailVerified: {
    type: Boolean,
    default: false,
  },
  
  emailVerifiedAt: {
    type: Date,
  },
  
  termsAndConditionsAccepted: {
    type: Boolean,
    required: [true, 'Terms and conditions must be accepted'],
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Terms and conditions must be accepted',
    },
  },
  
  privacyPolicyAccepted: {
    type: Boolean,
    required: [true, 'Privacy policy must be accepted'],
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Privacy policy must be accepted',
    },
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ user_type: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);