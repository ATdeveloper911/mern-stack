const express = require('express');
const router = express.Router();
const { getMapData, getRoute, geocodeAddress } = require('../controllers/travelMapController');
const { auth } = require('../middleware/auth');

// Get map data (destinations, hotels, restaurants)
router.get('/data', auth, getMapData);

// Get route between two points
router.get('/route', auth, getRoute);

// Geocode address to coordinates
router.get('/geocode', auth, geocodeAddress);

module.exports = router;
