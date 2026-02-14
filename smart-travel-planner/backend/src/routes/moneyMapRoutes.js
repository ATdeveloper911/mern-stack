const express = require('express');
const router = express.Router();
const { calculateHybridBudget, saveBudget } = require('../controllers/moneyMapController');
const { auth } = require('../middleware/auth');

router.post('/calculate', auth, calculateHybridBudget);
router.post('/save', auth, saveBudget);

module.exports = router;
