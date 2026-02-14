const mongoose = require('mongoose');

const budgetRuleSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: true
  },
  baseCosts: {
    transportation: {
      perPerson: Number,
      perDay: Number
    },
    accommodation: {
      perPerson: Number,
      perDay: Number
    },
    food: {
      perPerson: Number,
      perDay: Number
    },
    activities: {
      perPerson: Number,
      perDay: Number
    },
    miscellaneous: {
      perPerson: Number,
      perDay: Number
    }
  },
  seasonalMultipliers: {
    spring: Number,
    summer: Number,
    autumn: Number,
    winter: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BudgetRule', budgetRuleSchema);
