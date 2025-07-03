const express = require('express');
const router = express.Router();
// const getUploadMiddleware = require("../utils/uploadMiddleware");
// const uploadUserImage = getUploadMiddleware("users");
const userController = require('../controllers/userController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/drivers', setAccessControl('*'), userController.registerDrivers);
router.post('/customers', setAccessControl('*'), userController.registerCustomers);
router.get('/profile', setAccessControl('*') , userController.getProfileDatas);
router.put('/', setAccessControl('*'), userController.updateUser);
router.get('/', setAccessControl('*') , userController.getRegisteredUsers);
router.get('/user-types', setAccessControl('*'), userController.getUserTypes);
router.put('/userTypes/:id', setAccessControl('*'), userController.updateuserTypes);

module.exports = router;