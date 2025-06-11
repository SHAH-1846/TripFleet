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
router.put('/', setAccessControl('*'), userController.updateUser);
router.get('/', setAccessControl('*') , userController.getRegisteredUsers);
router.get('/userTypes', setAccessControl('*'), userController.getUserTypes);
router.put('/userTypes/:id', setAccessControl('*'), userController.updateuserTypes);

module.exports = router;