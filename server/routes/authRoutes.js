const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/google', passport.authenticate('google', {scope : ['profile', 'email']}));
router.get('/google/callback', passport.authenticate('google', {failureRedirect : 'auth/login'}), authController.googleOAuth);

module.exports = router;