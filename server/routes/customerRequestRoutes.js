const express = require('express');
const router = express.Router();
const customerRequestController = require('../controllers/customerRequestController');
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post('/', setAccessControl('*'), customerRequestController.createCustomerRequest);
router.get('/', setAccessControl('*'), customerRequestController.getAllCustomerRequests);
router.get('/my-customer-requests', setAccessControl('*'), customerRequestController.getMyCustomerRequests);
router.put('/:customerRequestId', setAccessControl('*'), customerRequestController.updateCustomerRequest);
router.get('/matched-trips/:id', setAccessControl('*'), customerRequestController.getMatchedTrips);
router.get('/status',setAccessControl('*'), customerRequestController.getAllCustomerRequestStatuses);

module.exports = router;