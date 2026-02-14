const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  apiKey: {
    type: String,
    required: true,
    trim: true
  },
  service: {
    type: String,
    required: true,
    enum: ['Google Maps', 'OpenWeatherMap', 'Gemini AI', 'OpenTripMap', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    default: ''
  },
  usedIn: {
    type: [String],
    default: [],
    enum: ['Travel Map', 'Travel Hub', 'Weather', 'Money Map', 'Buddy Bot', 'Places to Stay', 'Auto-Fetch', 'Other']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
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
apiKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
