const AuthService = require('../services/AuthService');
const ApiResponse = require('../utils/response');
const { ValidationError } = require('../utils/errors');

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.json(ApiResponse.success(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  static async requestOtp(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await AuthService.requestOtp(phone);
      
      res.json(ApiResponse.success(result, 'OTP sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req, res, next) {
    try {
      const { otp } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new ValidationError('OTP token required');
      }

      const result = await AuthService.verifyOtp(token, otp);
      
      res.json(ApiResponse.success(result, 'OTP verified successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async registerDriver(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new ValidationError('Registration token required');
      }

      const decoded = AuthService.verifyRegistrationToken(token);
      const result = await AuthService.registerDriver(req.body, decoded.phone);
      
      res.status(201).json(ApiResponse.success(result, 'Driver registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async registerCustomer(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new ValidationError('Registration token required');
      }

      const decoded = AuthService.verifyRegistrationToken(token);
      const result = await AuthService.registerCustomer(req.body, decoded.phone);
      
      res.status(201).json(ApiResponse.success(result, 'Customer registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async googleCallback(req, res, next) {
    try {
      if (!req.user) {
        return res.redirect(`${config.frontend.url}/auth/error`);
      }

      const token = AuthService.generateToken(req.user._id);
      res.redirect(`${config.frontend.url}/auth/success?token=${token}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;