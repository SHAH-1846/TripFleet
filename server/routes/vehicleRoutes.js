const express = require('express');
const router = express.Router();
const getUploadMiddleware = require("../utils/uploadMiddleware");
const uploadVehicleImage = getUploadMiddleware("vehicles");
const vehicleController = require('../controllers/vehicleController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/', setAccessControl('*'),vehicleController.createVehicle);
router.get('/', setAccessControl('*'), vehicleController.getAllVehicles);
router.get('/types', setAccessControl('*'), vehicleController.listVehicleTypes);
router.put('/:vehicleId', setAccessControl('*'), vehicleController.updateVehicle);
router.get('/status', setAccessControl('*'), vehicleController.listVehicleStatuses);
router.put('/status/:vehicleId', setAccessControl('*'), vehicleController.updateVehicleStatus);
module.exports = router;