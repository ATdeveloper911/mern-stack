/**
 * Add Northern Pakistan Destinations
 * This script adds all northern, hilly, and valley destinations to the database
 * 
 * Usage: node backend/src/scripts/addNorthernPakistanDestinations.js
 */

const mongoose = require('mongoose');
const Destination = require('../models/Destination');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-travel-planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected');
  addDestinations();
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

async function addDestinations() {
  try {
    console.log('🔄 Adding Northern Pakistan destinations...\n');

    const destinations = [
      // 🏔️ Northern Areas
      {
        name: 'Hunza Valley',
        city: 'Hunza',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'One of the most beautiful valleys in Pakistan, known for its stunning mountain views, rich culture, and hospitable people. Famous for Rakaposhi and Ultar Sar peaks.',
        coordinates: { lat: 36.3167, lng: 74.6500 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80']
      },
      {
        name: 'Gilgit',
        city: 'Gilgit',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Capital of Gilgit-Baltistan, gateway to the Karakoram Highway and various valleys. Rich in history and culture.',
        coordinates: { lat: 35.9208, lng: 74.3083 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Skardu',
        city: 'Skardu',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Gateway to the world\'s highest peaks including K2. Famous for its beautiful lakes, valleys, and trekking routes.',
        coordinates: { lat: 35.2971, lng: 75.6333 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Fairy Meadows',
        city: 'Fairy Meadows',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'One of the most beautiful meadows in the world, offering stunning views of Nanga Parbat (8126m). Perfect for camping and trekking.',
        coordinates: { lat: 35.3667, lng: 74.5833 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Khunjerab Pass',
        city: 'Khunjerab',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Highest paved international border crossing in the world at 4,693 meters. Connects Pakistan with China.',
        coordinates: { lat: 36.8500, lng: 75.4167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Deosai National Park',
        city: 'Deosai',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Second highest plateau in the world at 4,114 meters. Known for its wildflowers, wildlife, and stunning landscapes.',
        coordinates: { lat: 35.0167, lng: 75.3167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Astore Valley',
        city: 'Astore',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Beautiful valley with lush green meadows, rivers, and mountain views. Less crowded and pristine.',
        coordinates: { lat: 35.3667, lng: 74.8500 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Naltar Valley',
        city: 'Naltar',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Famous for its colorful lakes (Blue, Green, White lakes) and skiing resort. Surrounded by pine forests.',
        coordinates: { lat: 36.1833, lng: 74.1500 },
        isPopular: true,
        bestSeason: 'winter',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Shigar Valley',
        city: 'Shigar',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Historic valley with ancient forts and beautiful landscapes. Gateway to various trekking routes.',
        coordinates: { lat: 35.4167, lng: 75.7167 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Khaplu',
        city: 'Khaplu',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Northern Areas',
        description: 'Beautiful town in Ghanche District, known for Khaplu Palace and stunning mountain views.',
        coordinates: { lat: 35.1500, lng: 76.3333 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      
      // 🌄 Hill Stations
      {
        name: 'Murree',
        city: 'Murree',
        country: 'Pakistan',
        region: 'Punjab',
        category: 'Hill Stations',
        description: 'Famous hill station near Islamabad, perfect for a weekend getaway. Known for its cool weather and scenic views.',
        coordinates: { lat: 33.9078, lng: 73.3903 },
        isPopular: true,
        bestSeason: 'winter',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Nathia Gali',
        city: 'Nathia Gali',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Hill Stations',
        description: 'Beautiful hill station in the Galiyat region, known for its pine forests and pleasant weather.',
        coordinates: { lat: 34.0167, lng: 73.3833 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Ayubia',
        city: 'Ayubia',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Hill Stations',
        description: 'Popular hill station with chairlift, hiking trails, and beautiful views of the surrounding mountains.',
        coordinates: { lat: 34.0667, lng: 73.4000 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Patriata (New Murree)',
        city: 'Patriata',
        country: 'Pakistan',
        region: 'Punjab',
        category: 'Hill Stations',
        description: 'Scenic hill station with chairlift offering panoramic views. Popular tourist destination.',
        coordinates: { lat: 33.9167, lng: 73.4167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Malam Jabba',
        city: 'Malam Jabba',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Hill Stations',
        description: 'Famous ski resort in Swat Valley. Offers skiing in winter and beautiful views year-round.',
        coordinates: { lat: 35.2167, lng: 72.5500 },
        isPopular: true,
        bestSeason: 'winter',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Sharan Forest',
        city: 'Sharan',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Hill Stations',
        description: 'Beautiful forest area with hiking trails and camping spots. Perfect for nature lovers.',
        coordinates: { lat: 34.5833, lng: 73.0833 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Galiyat Region',
        city: 'Galiyat',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Hill Stations',
        description: 'Mountainous region with multiple hill stations including Nathia Gali, Ayubia, and Dunga Gali.',
        coordinates: { lat: 34.0500, lng: 73.4000 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      
      // 🌿 Valleys
      {
        name: 'Swat Valley',
        city: 'Swat',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Known as the Switzerland of Pakistan, famous for its natural beauty, waterfalls, and rich history.',
        coordinates: { lat: 35.2208, lng: 72.4250 },
        isPopular: true,
        bestSeason: 'spring',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Kalam Valley',
        city: 'Kalam',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Upper part of Swat Valley, known for its stunning waterfalls, rivers, and mountain views.',
        coordinates: { lat: 35.4833, lng: 72.5833 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Neelum Valley',
        city: 'Neelum',
        country: 'Pakistan',
        region: 'Azad Kashmir',
        category: 'Valleys',
        description: 'One of the most beautiful valleys in Azad Kashmir, known for its rivers, forests, and scenic beauty.',
        coordinates: { lat: 34.5833, lng: 73.9167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Kaghan Valley',
        city: 'Kaghan',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Beautiful valley leading to Naran, famous for its lakes, waterfalls, and mountain scenery.',
        coordinates: { lat: 34.7500, lng: 73.5167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Naran',
        city: 'Naran',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Popular tourist destination, gateway to Saif-ul-Malook Lake and other scenic spots.',
        coordinates: { lat: 34.9081, lng: 73.6514 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Chitral Valley',
        city: 'Chitral',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Beautiful valley famous for Kalash culture, Tirich Mir peak, and natural beauty.',
        coordinates: { lat: 35.8514, lng: 71.7864 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Ratti Gali Lake',
        city: 'Ratti Gali',
        country: 'Pakistan',
        region: 'Azad Kashmir',
        category: 'Valleys',
        description: 'Stunning alpine lake in Neelum Valley, accessible by trekking. Known for its emerald green water.',
        coordinates: { lat: 34.6833, lng: 73.9833 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Leepa Valley',
        city: 'Leepa',
        country: 'Pakistan',
        region: 'Azad Kashmir',
        category: 'Valleys',
        description: 'Remote and beautiful valley in Azad Kashmir, known for its traditional architecture and natural beauty.',
        coordinates: { lat: 34.3333, lng: 73.9167 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Basho Valley',
        city: 'Basho',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Valleys',
        description: 'Beautiful valley in Skardu district, known for its orchards and scenic beauty.',
        coordinates: { lat: 35.2667, lng: 75.5833 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      
      // 🏞️ Lakes & Scenic Spots
      {
        name: 'Saif-ul-Malook Lake',
        city: 'Naran',
        country: 'Pakistan',
        region: 'Khyber Pakhtunkhwa',
        category: 'Lakes',
        description: 'One of the most beautiful lakes in Pakistan, surrounded by mountains. Famous for its legend and stunning views.',
        coordinates: { lat: 34.8833, lng: 73.7000 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Attabad Lake',
        city: 'Hunza',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Lakes',
        description: 'Stunning turquoise lake formed after a landslide. Famous for its boat rides and scenic beauty.',
        coordinates: { lat: 36.3167, lng: 74.8333 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Sheosar Lake',
        city: 'Deosai',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Lakes',
        description: 'Beautiful high-altitude lake in Deosai National Park, surrounded by wildflowers in summer.',
        coordinates: { lat: 35.0167, lng: 75.3167 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Rush Lake',
        city: 'Hunza',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Lakes',
        description: 'Highest alpine lake in Pakistan, accessible by trekking. Offers stunning mountain views.',
        coordinates: { lat: 36.1500, lng: 74.6500 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Upper Kachura Lake',
        city: 'Skardu',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Lakes',
        description: 'Beautiful lake near Skardu, less visited but equally stunning. Surrounded by mountains.',
        coordinates: { lat: 35.4333, lng: 75.4500 },
        isPopular: false,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      },
      {
        name: 'Lower Kachura Lake (Shangrila)',
        city: 'Skardu',
        country: 'Pakistan',
        region: 'Northern Areas',
        category: 'Lakes',
        description: 'Famous resort lake with beautiful views. Popular tourist destination with hotels and restaurants.',
        coordinates: { lat: 35.4167, lng: 75.4667 },
        isPopular: true,
        bestSeason: 'summer',
        images: ['https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=80', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80']
      }
    ];

    let added = 0;
    let skipped = 0;
    let updated = 0;

    for (const destData of destinations) {
      try {
        const existing = await Destination.findOne({ 
          name: { $regex: new RegExp(`^${destData.name}$`, 'i') }
        });

        if (existing) {
          // Update existing destination
          Object.assign(existing, destData);
          await existing.save();
          updated++;
          console.log(`✅ Updated: ${destData.name}`);
        } else {
          // Create new destination
          const destination = new Destination(destData);
          await destination.save();
          added++;
          console.log(`✅ Added: ${destData.name} (${destData.category})`);
        }
      } catch (error) {
        console.error(`❌ Error adding ${destData.name}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Added: ${added} destinations`);
    console.log(`   🔄 Updated: ${updated} destinations`);
    console.log(`   ⏭️  Skipped: ${skipped} destinations`);
    console.log(`\n🎉 Process completed!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
