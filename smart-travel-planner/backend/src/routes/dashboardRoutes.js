const express = require('express');
const router = express.Router();
const { getPopularDestinations, search } = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

router.get('/popular-destinations', auth, getPopularDestinations);
router.get('/search', auth, search);

module.exports = router;
