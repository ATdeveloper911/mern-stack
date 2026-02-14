/**
 * Sample Hotels and Restaurants Data
 * Run this script to add sample data to your database
 * 
 * Usage: node backend/src/scripts/addSampleHotelsRestaurants.js
 * 
 * Make sure MongoDB is running and connected!
 */

const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');
const Destination = require('../models/Destination');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-travel-planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  addSampleData();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function addSampleData() {
  try {
    // Get or create a destination (Karachi)
    let karachi = await Destination.findOne({ name: 'Karachi' });
    if (!karachi) {
      karachi = new Destination({
        name: 'Karachi',
        city: 'Karachi',
        country: 'Pakistan',
        description: 'Largest city of Pakistan',
        coordinates: { lat: 24.8607, lng: 67.0011 },
        isPopular: true
      });
      await karachi.save();
      console.log('✅ Created Karachi destination');
    }

    // Sample Hotels
    const hotels = [
      {
        name: 'Marriott Hotel Karachi',
        address: 'Club Road, Karachi, Pakistan',
        destination: karachi._id,
        coordinates: { lat: 24.8607, lng: 67.0011 },
        description: '5-star luxury hotel in the heart of Karachi',
        rating: 4.5,
        priceRange: { min: 100, max: 300, currency: 'USD' },
        amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking'],
        contactNumber: '+92-21-12345678',
        email: 'info@marriottkarachi.com',
        bookingLink: 'https://www.marriott.com',
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800']
      },
      {
        name: 'Pearl Continental Hotel',
        address: 'Club Road, Karachi, Pakistan',
        destination: karachi._id,
        coordinates: { lat: 24.8500, lng: 67.0100 },
        description: 'Luxury hotel with excellent service',
        rating: 4.7,
        priceRange: { min: 150, max: 400, currency: 'USD' },
        amenities: ['WiFi', 'Pool', 'Gym', 'Business Center', 'Restaurant'],
        contactNumber: '+92-21-11111111',
        email: 'info@pchotels.com',
        bookingLink: 'https://www.pchotels.com',
        images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800']
      },
      {
        name: 'Avari Towers',
        address: 'Fatima Jinnah Road, Karachi',
        destination: karachi._id,
        coordinates: { lat: 24.8400, lng: 67.0200 },
        description: 'Modern hotel with great city views',
        rating: 4.3,
        priceRange: { min: 80, max: 250, currency: 'USD' },
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Room Service'],
        contactNumber: '+92-21-22222222',
        email: 'info@avari.com',
        bookingLink: 'https://www.avari.com',
        images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800']
      }
    ];

    // Sample Restaurants
    const restaurants = [
      {
        name: 'Kolachi Restaurant',
        address: 'Seaview, Clifton, Karachi',
        destination: karachi._id,
        coordinates: { lat: 24.8000, lng: 67.0500 },
        description: 'Seaside restaurant with amazing views and delicious Pakistani cuisine',
        rating: 4.6,
        cuisine: ['Pakistani', 'Seafood', 'BBQ'],
        priceRange: { min: 20, max: 80, currency: 'USD' },
        contactNumber: '+92-21-33333333',
        bookingLink: 'https://www.kolachi.com',
        images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800']
      },
      {
        name: 'Butt Karahi House',
        address: 'Burns Road, Karachi',
        destination: karachi._id,
        coordinates: { lat: 24.8700, lng: 67.0300 },
        description: 'Famous for authentic Pakistani karahi and BBQ',
        rating: 4.8,
        cuisine: ['Pakistani', 'BBQ', 'Karahi'],
        priceRange: { min: 10, max: 50, currency: 'USD' },
        contactNumber: '+92-21-44444444',
        images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800']
      },
      {
        name: 'Cafe Flo',
        address: 'DHA Phase 5, Karachi',
        destination: karachi._id,
        coordinates: { lat: 24.8200, lng: 67.0400 },
        description: 'French cafe with excellent coffee and pastries',
        rating: 4.4,
        cuisine: ['French', 'Cafe', 'Bakery'],
        priceRange: { min: 15, max: 60, currency: 'USD' },
        contactNumber: '+92-21-55555555',
        bookingLink: 'https://www.cafeflo.com',
        images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800']
      },
      {
        name: 'Xander\'s',
        address: 'DHA Phase 5, Karachi',
        destination: karachi._id,
        coordinates: { lat: 24.8100, lng: 67.0450 },
        description: 'Modern restaurant with international cuisine',
        rating: 4.5,
        cuisine: ['International', 'Fusion', 'Italian'],
        priceRange: { min: 25, max: 100, currency: 'USD' },
        contactNumber: '+92-21-66666666',
        bookingLink: 'https://www.xanders.com',
        images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800']
      }
    ];

    // Add Hotels
    console.log('\n📦 Adding Hotels...');
    for (const hotelData of hotels) {
      const existing = await Hotel.findOne({ name: hotelData.name });
      if (!existing) {
        const hotel = new Hotel(hotelData);
        await hotel.save();
        console.log(`✅ Added: ${hotelData.name}`);
      } else {
        console.log(`⏭️  Skipped (exists): ${hotelData.name}`);
      }
    }

    // Add Restaurants
    console.log('\n🍽️  Adding Restaurants...');
    for (const restaurantData of restaurants) {
      const existing = await Restaurant.findOne({ name: restaurantData.name });
      if (!existing) {
        const restaurant = new Restaurant(restaurantData);
        await restaurant.save();
        console.log(`✅ Added: ${restaurantData.name}`);
      } else {
        console.log(`⏭️  Skipped (exists): ${restaurantData.name}`);
      }
    }

    console.log('\n🎉 Sample data added successfully!');
    console.log('📍 Now check your Travel Map - hotels and restaurants should appear!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    process.exit(1);
  }
}
