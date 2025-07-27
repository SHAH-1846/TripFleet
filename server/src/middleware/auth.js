const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const config = require('../config');
const User = require('../models/User');

class AuthMiddleware {
  static authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Access token required');
      }

      const token = authHeader.split(' ')[1];
      
      if (!token || token === 'null' || token === 'undefined') {
        throw new AuthenticationError('Invalid access token');
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.user_id)
        .populate('user_type', 'name')
        .select('-password');

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        next(new AuthenticationError('Invalid or expired token'));
      } else {
        next(error);
      }
    }
  };

  static authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }

      const userRole = req.user.user_type?.name;
      
      if (!roles.includes(userRole)) {
        return next(new AuthorizationError('Insufficient permissions'));
      }

      next();
    };
  };

  static optional = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.split(' ')[1];
      
      if (!token || token === 'null' || token === 'undefined') {
        return next();
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.user_id)
        .populate('user_type', 'name')
        .select('-password');

      if (user) {
        req.user = user;
      }

      next();
    } catch (error) {
      // Ignore auth errors for optional auth
      next();
    }
  };
}

module.exports = AuthMiddleware;