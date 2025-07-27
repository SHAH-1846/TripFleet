const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const tripRoutes = require('./tripRoutes');
const customerRequestRoutes = require('./customerRequestRoutes');
const bookingRoutes = require('./bookingRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/trips', tripRoutes);
router.use('/customer-requests', customerRequestRoutes);
router.use('/bookings', bookingRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;