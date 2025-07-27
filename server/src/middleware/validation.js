const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    req[property] = value;
    next();
  };
};

// Common validation schemas
const commonSchemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }),

  location: Joi.object({
    address: Joi.string().trim().min(1).max(500).required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }),

  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).message('Invalid phone number format'),
  
  email: Joi.string().email().lowercase().trim(),
};

module.exports = {
  validate,
  commonSchemas,
};