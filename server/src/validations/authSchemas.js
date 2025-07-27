const Joi = require('joi');
const { commonSchemas } = require('../middleware/validation');

const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().min(8).required(),
  }),

  requestOtp: Joi.object({
    phone: commonSchemas.phone.required(),
  }),

  verifyOtp: Joi.object({
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
      'string.pattern.base': 'OTP must be 6 digits',
    }),
  }),

  registerDriver: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: commonSchemas.email.required(),
    whatsappNumber: commonSchemas.phone.required(),
    profilePicture: commonSchemas.objectId,
    drivingLicense: commonSchemas.objectId.required(),
    vehicleNumber: Joi.string().trim().pattern(/^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,2}[ -]?[0-9]{1,4}$/i).required(),
    vehicleType: commonSchemas.objectId.required(),
    vehicleBodyType: commonSchemas.objectId.required(),
    vehicleCapacity: Joi.number().positive().required(),
    goodsAccepted: Joi.boolean().required(),
    registrationCertificate: commonSchemas.objectId.required(),
    truckImages: Joi.array().items(commonSchemas.objectId).min(1).required(),
    termsAndConditionsAccepted: Joi.boolean().valid(true).required(),
    privacyPolicyAccepted: Joi.boolean().valid(true).required(),
  }),

  registerCustomer: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: commonSchemas.email.required(),
    whatsappNumber: commonSchemas.phone.required(),
    profilePicture: commonSchemas.objectId,
    termsAndConditionsAccepted: Joi.boolean().valid(true).required(),
    privacyPolicyAccepted: Joi.boolean().valid(true).required(),
  }),
};

module.exports = authSchemas;