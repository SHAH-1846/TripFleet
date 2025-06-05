const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/login', setAccessControl('*'), authController.login);
router.get('/google', passport.authenticate('google', {scope : ['profile', 'email']}));
router.get('/google/callback', passport.authenticate('google', {failureRedirect : 'auth/login'}), authController.googleOAuth);

module.exports = router;