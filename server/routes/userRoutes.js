const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.post('/', userController.register);
router.get('/', userController.getRegisteredUsers);


module.exports = router;