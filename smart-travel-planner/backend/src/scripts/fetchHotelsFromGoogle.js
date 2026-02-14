const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');

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

// Fetch hotels from Google Places API
const fetchHotelsFromGoogle = async (lat, lng, destinationName, apiKey) => {
  try {
    // Use Google Places API Text Search to find hotels
    const searchQuery = `hotels in ${destinationName}, Pakistan`;
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: searchQuery,
        key: apiKey,
        type: 'lodging', // Hotels and accommodations
        location: `${lat},${lng}`,
        radius: 50000 // 50km radius
      },
      timeout: 10000
    });

    if (response.data.status === 'OK' && response.data.results) {
      return response.data.results.slice(0, 5); // Get top 5 hotels
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.log(`   ⚠️ No hotels found for ${destinationName}`);
      return [];
    } else {
      console.log(`   ⚠️ Google Places API error: ${response.data.status}`);
      return [];
    }
  } catch (error) {
    console.error(`   ❌ Error fetching hotels for ${destinationName}:`, error.message);
    return [];
  }
};

// Get detailed place information
const getPlaceDetails = async (placeId, apiKey) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: apiKey,
        fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,photos,geometry,opening_hours,price_level,reviews'
      },
      timeout: 10000
    });

    if (response.data.status === 'OK' && response.data.result) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching place details:`, error.message);
    return null;
  }
};

// Get photo URL from Google Places
const getPhotoUrl = (photoReference, apiKey, maxWidth = 400) => {
  if (!photoReference) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
};

// Main function to fetch and add hotels
const fetchAndAddHotels = async () => {
  try {
    await connectDB();

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      console.error('❌ Google Maps API key not found in .env file');
      console.log('Please add GOOGLE_MAPS_API_KEY to your .env file');
      process.exit(1);
    }

    // Get all destinations with coordinates
    const destinations = await Destination.find({
      coordinates: { $exists: true, $ne: null },
      'coordinates.lat': { $exists: true },
      'coordinates.lng': { $exists: true }
    });

    console.log(`\n📍 Found ${destinations.length} destinations with coordinates\n`);

    let totalHotelsAdded = 0;
    let totalHotelsSkipped = 0;

    for (const destination of destinations) {
      const { lat, lng } = destination.coordinates;
      console.log(`\n🏨 Fetching hotels for: ${destination.name} (${destination.city})`);

      // Check if hotels already exist for this destination
      const existingHotels = await Hotel.find({ destination: destination._id });
      if (existingHotels.length > 0) {
        console.log(`   ℹ️  ${existingHotels.length} hotels already exist. Skipping...`);
        totalHotelsSkipped += existingHotels.length;
        continue;
      }

      // Fetch hotels from Google Places API
      const places = await fetchHotelsFromGoogle(lat, lng, destination.name, apiKey);

      if (places.length === 0) {
        console.log(`   ⚠️  No hotels found`);
        continue;
      }

      console.log(`   ✅ Found ${places.length} hotels from Google`);

      // Process each hotel
      for (const place of places) {
        try {
          // Get detailed information
          const details = await getPlaceDetails(place.place_id, apiKey);
          
          if (!details) {
            console.log(`   ⚠️  Could not get details for: ${place.name}`);
            continue;
          }

          // Check if hotel already exists by name and address
          const existingHotel = await Hotel.findOne({
            name: details.name,
            address: details.formatted_address || place.formatted_address
          });

          if (existingHotel) {
            console.log(`   ⏭️  Skipping duplicate: ${details.name}`);
            totalHotelsSkipped++;
            continue;
          }

          // Get images
          const images = [];
          if (details.photos && details.photos.length > 0) {
            // Get first 3 photos
            details.photos.slice(0, 3).forEach(photo => {
              const photoUrl = getPhotoUrl(photo.photo_reference, apiKey);
              if (photoUrl) images.push(photoUrl);
            });
          }

          // Extract amenities from reviews or use default
          const amenities = [];
          if (details.reviews && details.reviews.length > 0) {
            const reviewText = details.reviews.map(r => r.text).join(' ').toLowerCase();
            if (reviewText.includes('wifi') || reviewText.includes('wi-fi')) amenities.push('WiFi');
            if (reviewText.includes('parking')) amenities.push('Parking');
            if (reviewText.includes('pool')) amenities.push('Pool');
            if (reviewText.includes('gym') || reviewText.includes('fitness')) amenities.push('Gym');
            if (reviewText.includes('spa')) amenities.push('Spa');
            if (reviewText.includes('restaurant')) amenities.push('Restaurant');
            if (reviewText.includes('breakfast')) amenities.push('Breakfast');
          }

          // Create hotel object
          const hotelData = {
            name: details.name || place.name,
            destination: destination._id,
            address: details.formatted_address || place.formatted_address || 'Address not available',
            coordinates: {
              lat: details.geometry?.location?.lat || place.geometry?.location?.lat || lat,
              lng: details.geometry?.location?.lng || place.geometry?.location?.lng || lng
            },
            rating: details.rating || place.rating || 0,
            contactNumber: details.formatted_phone_number || details.international_phone_number || null,
            email: null, // Google Places API doesn't provide email
            bookingLink: details.website || null,
            description: details.reviews && details.reviews.length > 0 
              ? details.reviews[0].text.substring(0, 200) 
              : `Hotel in ${destination.name}, ${destination.city}`,
            images: images.length > 0 ? images : [],
            amenities: amenities.length > 0 ? amenities : ['WiFi', 'Parking'], // Default amenities
            priceRange: {
              min: details.price_level ? (details.price_level * 20) : null, // Estimate based on price_level (1-4)
              max: details.price_level ? (details.price_level * 50) : null,
              currency: 'PKR'
            }
          };

          // Save hotel to database
          const hotel = new Hotel(hotelData);
          await hotel.save();
          console.log(`   ✅ Added: ${hotelData.name} (Rating: ${hotelData.rating}/5)`);
          totalHotelsAdded++;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`   ❌ Error processing hotel ${place.name}:`, error.message);
        }
      }

      // Delay between destinations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n\n✅ Process Complete!`);
    console.log(`   📊 Total Hotels Added: ${totalHotelsAdded}`);
    console.log(`   ⏭️  Total Hotels Skipped: ${totalHotelsSkipped}`);
    console.log(`\n`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
fetchAndAddHotels();
