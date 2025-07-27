const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const config = require('../config');
const { AuthenticationError, ValidationError, ConflictError } = require('../utils/errors');
const SmsService = require('./SmsService');
const logger = require('../utils/logger');

class AuthService {
  static async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('user_type', 'name');

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    const token = this.generateToken(user._id);
    
    logger.info('User logged in successfully', { userId: user._id, email });
    
    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  static async requestOtp(phone) {
    // Generate secure OTP
    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store OTP with expiry
    await OTP.findOneAndUpdate(
      { phone },
      { 
        otp: hashedOtp,
        attempts: 0,
        expiresAt: new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // Send OTP via SMS (only in production)
    if (config.env === 'production') {
      await SmsService.sendOtp(phone, otp);
    } else {
      logger.info(`OTP for ${phone}: ${otp}`);
    }

    const token = this.generateOtpToken(phone);
    
    return { token };
  }

  static async verifyOtp(token, otp) {
    const decoded = this.verifyOtpToken(token);
    const { phone } = decoded;

    const otpRecord = await OTP.findOne({ phone });
    
    if (!otpRecord) {
      throw new ValidationError('OTP not found or expired');
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ phone });
      throw new ValidationError('OTP expired');
    }

    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.deleteOne({ phone });
      throw new ValidationError('Maximum OTP attempts exceeded');
    }

    const isValidOtp = await bcrypt.compare(otp.toString(), otpRecord.otp);
    
    if (!isValidOtp) {
      await OTP.updateOne({ phone }, { $inc: { attempts: 1 } });
      throw new ValidationError('Invalid OTP');
    }

    // Clean up OTP
    await OTP.deleteOne({ phone });

    // Check if user exists
    const user = await User.findOne({ phone }).populate('user_type', 'name');
    
    if (user) {
      // Existing user - return login token
      const loginToken = this.generateToken(user._id);
      return {
        token: loginToken,
        user: this.sanitizeUser(user),
        isNewUser: false,
      };
    } else {
      // New user - return registration token
      const registrationToken = this.generateRegistrationToken(phone);
      return {
        token: registrationToken,
        isNewUser: true,
      };
    }
  }

  static async registerDriver(data, phone) {
    const existingUser = await User.findOne({
      $or: [
        { email: data.email.toLowerCase() },
        { phone },
        { whatsappNumber: data.whatsappNumber },
      ],
    });

    if (existingUser) {
      throw new ConflictError('User already exists with this email, phone, or WhatsApp number');
    }

    const userData = {
      ...data,
      phone,
      email: data.email.toLowerCase(),
      user_type: config.constants.userTypes.DRIVER,
    };

    const user = await User.create(userData);
    const token = this.generateToken(user._id);

    logger.info('Driver registered successfully', { userId: user._id, email: data.email });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  static async registerCustomer(data, phone) {
    const existingUser = await User.findOne({
      $or: [
        { email: data.email.toLowerCase() },
        { phone },
        { whatsappNumber: data.whatsappNumber },
      ],
    });

    if (existingUser) {
      throw new ConflictError('User already exists with this email, phone, or WhatsApp number');
    }

    const userData = {
      ...data,
      phone,
      email: data.email.toLowerCase(),
      user_type: config.constants.userTypes.CUSTOMER,
    };

    const user = await User.create(userData);
    const token = this.generateToken(user._id);

    logger.info('Customer registered successfully', { userId: user._id, email: data.email });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  static generateToken(userId) {
    return jwt.sign({ user_id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  static generateOtpToken(phone) {
    return jwt.sign({ phone, type: 'otp' }, config.jwt.secret, {
      expiresIn: '10m',
    });
  }

  static generateRegistrationToken(phone) {
    return jwt.sign({ phone, type: 'registration' }, config.jwt.secret, {
      expiresIn: '30m',
    });
  }

  static verifyOtpToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.type !== 'otp') {
        throw new ValidationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new ValidationError('Invalid or expired token');
    }
  }

  static verifyRegistrationToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.type !== 'registration') {
        throw new ValidationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new ValidationError('Invalid or expired registration token');
    }
  }

  static generateOtp() {
    if (config.env === 'production') {
      return crypto.randomInt(100000, 999999).toString();
    }
    return '123456'; // Development only
  }

  static sanitizeUser(user) {
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.__v;
    return userObj;
  }
}

module.exports = AuthService;