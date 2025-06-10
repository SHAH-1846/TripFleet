const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/',setAccessControl('2'), tripController.createTrip);
router.put('/:tripId', tripController.updatedTrip);
router.get('/', tripController.getAllTrips);
router.put('/:tripId/location', tripController.updateTripLocation);

module.exports = router;