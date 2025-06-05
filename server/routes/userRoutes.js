const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}


router.post('/', setAccessControl('*'), userController.register);
router.get('/', setAccessControl('1') , userController.getRegisteredUsers);

module.exports = router;