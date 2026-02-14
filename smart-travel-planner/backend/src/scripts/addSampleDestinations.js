const mongoose = require('mongoose');
const Destination = require('../models/Destination');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-travel-planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  addSampleDestinations();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function addSampleDestinations() {
  try {
    console.log('🔄 Adding sample destinations...');

    const destinations = [
      {
        name: 'Hunza Valley',
        city: 'Hunza',
        country: 'Pakistan',
        description: 'Beautiful valley in Gilgit-Baltistan with stunning mountain views and rich culture.',
        coordinates: { lat: 36.3167, lng: 74.6500 },
        isPopular: true,
        bestSeason: 'summer'
      },
      {
        name: 'Swat Valley',
        city: 'Swat',
        country: 'Pakistan',
        description: 'Known as the Switzerland of Pakistan, famous for its natural beauty and waterfalls.',
        coordinates: { lat: 35.2208, lng: 72.4250 },
        isPopular: true,
        bestSeason: 'spring'
      },
      {
        name: 'Skardu',
        city: 'Skardu',
        country: 'Pakistan',
        description: 'Gateway to the world\'s highest peaks including K2, with beautiful lakes and valleys.',
        coordinates: { lat: 35.2971, lng: 75.6333 },
        isPopular: true,
        bestSeason: 'summer'
      },
      {
        name: 'Fairy Meadows',
        city: 'Fairy Meadows',
        country: 'Pakistan',
        description: 'One of the most beautiful meadows in the world, offering stunning views of Nanga Parbat.',
        coordinates: { lat: 35.3667, lng: 74.5833 },
        isPopular: true,
        bestSeason: 'summer'
      },
      {
        name: 'Naran Kaghan',
        city: 'Naran',
        country: 'Pakistan',
        description: 'Popular hill station with beautiful lakes, waterfalls, and scenic views.',
        coordinates: { lat: 34.9081, lng: 73.6514 },
        isPopular: true,
        bestSeason: 'summer'
      },
      {
        name: 'Murree',
        city: 'Murree',
        country: 'Pakistan',
        description: 'Famous hill station near Islamabad, perfect for a weekend getaway.',
        coordinates: { lat: 33.9078, lng: 73.3903 },
        isPopular: true,
        bestSeason: 'winter'
      },
      {
        name: 'Karachi',
        city: 'Karachi',
        country: 'Pakistan',
        description: 'Largest city of Pakistan, known for its beaches, food, and vibrant culture.',
        coordinates: { lat: 24.8607, lng: 67.0011 },
        isPopular: true,
        bestSeason: 'winter'
      },
      {
        name: 'Lahore',
        city: 'Lahore',
        country: 'Pakistan',
        description: 'Cultural capital of Pakistan with rich history, food, and Mughal architecture.',
        coordinates: { lat: 31.5497, lng: 74.3436 },
        isPopular: true,
        bestSeason: 'winter'
      },
      {
        name: 'Islamabad',
        city: 'Islamabad',
        country: 'Pakistan',
        description: 'Capital city of Pakistan, known for its modern architecture and beautiful Margalla Hills.',
        coordinates: { lat: 33.6844, lng: 73.0479 },
        isPopular: true,
        bestSeason: 'spring'
      },
      {
        name: 'Chitral',
        city: 'Chitral',
        country: 'Pakistan',
        description: 'Beautiful valley in Khyber Pakhtunkhwa, famous for Kalash culture and natural beauty.',
        coordinates: { lat: 35.8514, lng: 71.7864 },
        isPopular: true,
        bestSeason: 'summer'
      }
    ];

    let added = 0;
    let skipped = 0;

    for (const destData of destinations) {
      const existing = await Destination.findOne({ 
        name: destData.name,
        city: destData.city 
      });

      if (!existing) {
        const destination = new Destination(destData);
        await destination.save();
        console.log(`✅ Added: ${destData.name}`);
        added++;
      } else {
        console.log(`⏭️  Skipped (already exists): ${destData.name}`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${added} destinations`);
    console.log(`⏭️  Skipped: ${skipped} destinations`);
    console.log(`\n🎉 Done! Total destinations in database: ${await Destination.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding destinations:', error);
    process.exit(1);
  }
}
