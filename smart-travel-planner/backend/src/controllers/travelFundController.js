const Budget = require('../models/Budget');

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBucketList = async (req, res) => {
  try {
    const bucketList = await Budget.find({ 
      userId: req.user._id,
      isBucketList: true 
    })
      .sort({ createdAt: -1 });
    
    res.json(bucketList);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { destination, numberOfMembers, days, season, breakdown, total, isBucketList, status, startDate, endDate, accommodation, rating, notes } = req.body;

    // Validate required fields
    if (!destination) {
      return res.status(400).json({ message: 'Destination is required' });
    }

    // Check if this destination already exists in bucket list for this user
    if (isBucketList) {
      const existingBucketItem = await Budget.findOne({
        userId: req.user._id,
        destination: destination,
        isBucketList: true
      });

      if (existingBucketItem) {
        return res.status(400).json({ message: 'This destination is already in your bucket list' });
      }
    }

    const budget = new Budget({
      userId: req.user._id,
      destination,
      numberOfMembers: numberOfMembers || 1,
      days: days || 1,
      season: season || 'summer',
      breakdown: breakdown || {
        transportation: 0,
        accommodation: 0,
        food: 0,
        activities: 0,
        miscellaneous: 0
      },
      total: total || 0,
      isBucketList: isBucketList || false,
      status: status || 'planned',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      accommodation: accommodation || undefined,
      rating: rating || undefined,
      notes: notes || undefined
    });

    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { status, startDate, endDate, accommodation, rating, notes, destination, numberOfMembers, days, season, breakdown, total } = req.body;
    
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Update fields if provided
    if (status !== undefined) budget.status = status;
    if (startDate !== undefined) budget.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) budget.endDate = endDate ? new Date(endDate) : null;
    if (accommodation !== undefined) budget.accommodation = accommodation;
    if (rating !== undefined) budget.rating = rating;
    if (notes !== undefined) budget.notes = notes;
    if (destination !== undefined) budget.destination = destination;
    if (numberOfMembers !== undefined) budget.numberOfMembers = numberOfMembers;
    if (days !== undefined) budget.days = days;
    if (season !== undefined) budget.season = season;
    if (breakdown !== undefined) budget.breakdown = breakdown;
    if (total !== undefined) budget.total = total;

    await budget.save();
    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
