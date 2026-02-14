const express = require('express');
const router = express.Router();
const { getBudgets, getBudgetById, deleteBudget, createBudget, getBucketList, updateBudget } = require('../controllers/travelFundController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getBudgets);
router.get('/bucket-list', auth, getBucketList);
router.post('/', auth, createBudget);
router.get('/:id', auth, getBudgetById);
router.put('/:id', auth, updateBudget);
router.delete('/:id', auth, deleteBudget);

module.exports = router;
