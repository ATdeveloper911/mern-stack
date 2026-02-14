const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-travel-planner', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed default API keys
const seedApiKeys = async () => {
  try {
    await connectDB();

    // Default API keys to add
    const defaultApiKeys = [
      {
        name: 'Google Maps API Key',
        apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key-here',
        service: 'Google Maps',
        description: 'Google Maps API for maps, places, and geocoding',
        usedIn: ['Travel Map', 'Travel Hub', 'Places to Stay', 'Auto-Fetch']
      },
      {
        name: 'OpenWeatherMap API Key',
        apiKey: process.env.WEATHER_API_KEY || 'your-weather-api-key-here',
        service: 'OpenWeatherMap',
        description: 'OpenWeatherMap API for weather data',
        usedIn: ['Weather', 'Travel Hub']
      },
      {
        name: 'Gemini AI API Key',
        apiKey: process.env.AI_API_KEY || 'your-ai-api-key-here',
        service: 'Gemini AI',
        description: 'Google Gemini AI API for chatbot and budget calculations',
        usedIn: ['Buddy Bot', 'Money Map', 'Travel Hub']
      },
      {
        name: 'OpenTripMap API Key',
        apiKey: process.env.OPENTRIPMAP_API_KEY || 'your-opentripmap-api-key-here',
        service: 'OpenTripMap',
        description: 'OpenTripMap API for places and attractions',
        usedIn: ['Travel Hub']
      }
    ];

    console.log('\n🌱 Seeding API Keys...\n');

    for (const keyData of defaultApiKeys) {
      // Check if key already exists
      const existing = await ApiKey.findOne({ name: keyData.name });
      
      if (existing) {
        console.log(`⚠️  ${keyData.name} already exists, updating...`);
        
        // Update usedIn modules if not set or different
        if (!existing.usedIn || existing.usedIn.length === 0 || JSON.stringify(existing.usedIn.sort()) !== JSON.stringify(keyData.usedIn.sort())) {
          existing.usedIn = keyData.usedIn;
          console.log(`  ✅ Updated modules: ${keyData.usedIn.join(', ')}`);
        }
        
        // Update if env variable is set
        if (process.env[`${keyData.name.toUpperCase().replace(/\s+/g, '_')}`] || 
            (keyData.name === 'Google Maps API Key' && process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== existing.apiKey) ||
            (keyData.name === 'OpenWeatherMap API Key' && process.env.WEATHER_API_KEY && process.env.WEATHER_API_KEY !== existing.apiKey) ||
            (keyData.name === 'Gemini AI API Key' && process.env.AI_API_KEY && process.env.AI_API_KEY !== existing.apiKey) ||
            (keyData.name === 'OpenTripMap API Key' && process.env.OPENTRIPMAP_API_KEY && process.env.OPENTRIPMAP_API_KEY !== existing.apiKey)) {
          
          // Get the actual value from env
          let envValue = '';
          if (keyData.name === 'Google Maps API Key') envValue = process.env.GOOGLE_MAPS_API_KEY;
          else if (keyData.name === 'OpenWeatherMap API Key') envValue = process.env.WEATHER_API_KEY;
          else if (keyData.name === 'Gemini AI API Key') envValue = process.env.AI_API_KEY;
          else if (keyData.name === 'OpenTripMap API Key') envValue = process.env.OPENTRIPMAP_API_KEY;
          
          if (envValue && envValue !== 'your-google-maps-api-key-here' && envValue !== 'your-weather-api-key-here' && 
              envValue !== 'your-ai-api-key-here' && envValue !== 'your-opentripmap-api-key-here') {
            existing.apiKey = envValue;
            existing.updatedAt = Date.now();
            console.log(`  ✅ Updated API key from .env file`);
          }
        }
        
        existing.updatedAt = Date.now();
        await existing.save();
      } else {
        // Get actual value from .env if available
        let actualKey = keyData.apiKey;
        if (keyData.name === 'Google Maps API Key' && process.env.GOOGLE_MAPS_API_KEY) {
          actualKey = process.env.GOOGLE_MAPS_API_KEY;
        } else if (keyData.name === 'OpenWeatherMap API Key' && process.env.WEATHER_API_KEY) {
          actualKey = process.env.WEATHER_API_KEY;
        } else if (keyData.name === 'Gemini AI API Key' && process.env.AI_API_KEY) {
          actualKey = process.env.AI_API_KEY;
        } else if (keyData.name === 'OpenTripMap API Key' && process.env.OPENTRIPMAP_API_KEY) {
          actualKey = process.env.OPENTRIPMAP_API_KEY;
        }

        const newKey = new ApiKey({
          ...keyData,
          apiKey: actualKey
        });
        await newKey.save();
        console.log(`✅ Added ${keyData.name}`);
      }
    }

    console.log('\n✅ API Keys seeding completed!\n');
    
    // Show all API keys
    const allKeys = await ApiKey.find();
    console.log(`📋 Total API Keys in database: ${allKeys.length}\n`);
    allKeys.forEach(key => {
      console.log(`  - ${key.name} (${key.service})`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding API keys:', error);
    process.exit(1);
  }
};

// Run the seed function
seedApiKeys();
