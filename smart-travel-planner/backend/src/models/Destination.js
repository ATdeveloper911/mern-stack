const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  history: {
    type: String
  },
  famousLocations: [{
    name: String,
    description: String,
    image: String
  }],
  coordinates: {
    lat: Number,
    lng: Number
  },
  images: [String],
  isPopular: {
    type: Boolean,
    default: false
  },
  isSeasonal: {
    type: Boolean,
    default: false
  },
  bestSeason: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter', 'all']
  },
  region: {
    type: String
  },
  category: {
    type: String,
    enum: ['Northern Areas', 'Hill Stations', 'Valleys', 'Lakes', 'Mountains', 'Beaches', 'Historical', 'Cities'],
    required: true
  },
  tagline: {
    type: String,
    default: ''
  },
  culture: {
    type: String
  },
  famousFood: [{
    name: String,
    icon: String,
    description: String
  }],
  famousThings: [{
    name: String,
    icon: String,
    description: String
  }],
  famousFor: [{
    type: String
  }],
  suggestedItinerary: [{
    day: Number,
    title: String,
    activities: [String],
    description: String
  }],
  weather: {
    current: mongoose.Schema.Types.Mixed,
    forecast: [mongoose.Schema.Types.Mixed]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Destination', destinationSchema);
