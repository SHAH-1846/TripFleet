const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/', setAccessControl('*'), bookingController.bookTripForCustomerRequest);
router.get('/', setAccessControl('*'), bookingController.listBookings);
router.get('/my-bookings', setAccessControl('*'), bookingController.getMyBookings);
router.put('/status', setAccessControl('*'), bookingController.updateBookingStatus);

module.exports = router;