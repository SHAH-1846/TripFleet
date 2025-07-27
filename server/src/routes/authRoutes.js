const express = require('express');
const passport = require('passport');
const { validate } = require('../middleware/validation');
const AuthController = require('../controllers/AuthController');
const authSchemas = require('../validations/authSchemas');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post('/login', validate(authSchemas.login), AuthController.login);

/**
 * @route   POST /api/v1/auth/request-otp
 * @desc    Request OTP for phone verification
 * @access  Public
 */
router.post('/request-otp', validate(authSchemas.requestOtp), AuthController.requestOtp);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP and get authentication token
 * @access  Public
 */
router.post('/verify-otp', validate(authSchemas.verifyOtp), AuthController.verifyOtp);

/**
 * @route   POST /api/v1/auth/register/driver
 * @desc    Register new driver
 * @access  Public (requires registration token)
 */
router.post('/register/driver', validate(authSchemas.registerDriver), AuthController.registerDriver);

/**
 * @route   POST /api/v1/auth/register/customer
 * @desc    Register new customer
 * @access  Public (requires registration token)
 */
router.post('/register/customer', validate(authSchemas.registerCustomer), AuthController.registerCustomer);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Google OAuth login
 * @access  Public
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/error' }),
  AuthController.googleCallback
);

module.exports = router;