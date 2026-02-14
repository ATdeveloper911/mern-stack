const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  numberOfMembers: {
    type: Number,
    required: true,
    min: 1
  },
  days: {
    type: Number,
    required: true,
    min: 1
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter'],
    required: true
  },
  breakdown: {
    transportation: {
      type: Number,
      default: 0
    },
    accommodation: {
      type: Number,
      default: 0
    },
    food: {
      type: Number,
      default: 0
    },
    activities: {
      type: Number,
      default: 0
    },
    miscellaneous: {
      type: Number,
      default: 0
    }
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  calculationMethod: {
    type: String,
    default: 'Manual'
  },
  isBucketList: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['planned', 'confirmed', 'completed', 'cancelled'],
    default: 'planned'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  accommodation: {
    type: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  notes: {
    type: String
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

// Update updatedAt before saving
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Budget', budgetSchema);
