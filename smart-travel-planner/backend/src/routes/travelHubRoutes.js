const express = require('express');
const router = express.Router();
const { getAllDestinations, getDestinationById, createDestination, getWeather, getPlacesToVisit, getDestinationsByCategory } = require('../controllers/travelHubController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getAllDestinations);
router.get('/category/:category', auth, getDestinationsByCategory);
router.get('/weather', auth, getWeather);
router.get('/places-to-visit', auth, getPlacesToVisit);
router.get('/:id', auth, getDestinationById);
router.post('/', auth, createDestination);

module.exports = router;
