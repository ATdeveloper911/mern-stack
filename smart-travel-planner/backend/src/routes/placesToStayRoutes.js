const express = require('express');
const router = express.Router();
const { getHotels, getRestaurants, getHotelById, getRestaurantById, deleteSavedPlace } = require('../controllers/placesToStayController');
const { auth } = require('../middleware/auth');

router.get('/hotels', auth, getHotels);
router.get('/restaurants', auth, getRestaurants);
router.get('/hotels/:id', auth, getHotelById);
router.get('/restaurants/:id', auth, getRestaurantById);
router.delete('/:id', auth, deleteSavedPlace);

module.exports = router;
