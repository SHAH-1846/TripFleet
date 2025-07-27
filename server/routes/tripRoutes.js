const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/',setAccessControl('*'), tripController.createTrip);
router.put('/:tripId', tripController.updatedTrip);
router.get('/', setAccessControl("*"), tripController.getAllTrips);
router.get('/my-trips', setAccessControl('*'), tripController.getMyTrips);
router.get('/:id/matched-requests', setAccessControl('*'), tripController.getMatchedCustomerRequests);
router.get('/status', setAccessControl("*"), tripController.getTripStatus);
router.patch('/:tripId/location', tripController.updateTripLocation);
router.patch('/status/:tripId', tripController.updateTripStatus);

module.exports = router;