const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');
const { getSecret } = require('../config/secrets');

exports.getMapData = async (req, res) => {
  try {
    const { destinationId } = req.query;

    let destinations = [];
    let hotels = [];
    let restaurants = [];

    if (destinationId) {
      const destination = await Destination.findById(destinationId);
      if (destination) {
        destinations = [destination];
        hotels = await Hotel.find({ destination: destinationId });
        restaurants = await Restaurant.find({ destination: destinationId });
      }
    } else {
      destinations = await Destination.find({ isPopular: true }).limit(20);
      // Fetch all hotels and restaurants with coordinates
      hotels = await Hotel.find({ 
        coordinates: { $exists: true, $ne: null },
        'coordinates.lat': { $exists: true },
        'coordinates.lng': { $exists: true }
      }).limit(50);
      restaurants = await Restaurant.find({ 
        coordinates: { $exists: true, $ne: null },
        'coordinates.lat': { $exists: true },
        'coordinates.lng': { $exists: true }
      }).limit(50);
    }

    res.json({
      destinations: destinations.map(d => ({
        id: d._id,
        name: d.name,
        coordinates: d.coordinates,
        type: 'destination'
      })),
      hotels: hotels.map(h => ({
        id: h._id,
        name: h.name,
        coordinates: h.coordinates,
        type: 'hotel',
        address: h.address,
        rating: h.rating
      })),
      restaurants: restaurants.map(r => ({
        id: r._id,
        name: r.name,
        coordinates: r.coordinates,
        type: 'restaurant',
        address: r.address,
        rating: r.rating
      })),
      mapsApiKey: await getSecret('GOOGLE_MAPS_API_KEY')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRoute = async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    // Get Google Maps API key from secrets helper
    const mapsApiKey = await getSecret('GOOGLE_MAPS_API_KEY');
    
    // Google Maps Directions API integration
    if (mapsApiKey) {
      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          {
            params: {
              origin,
              destination,
              mode,
              key: mapsApiKey
            }
          }
        );

        if (response.data.status === 'OK' && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          const leg = route.legs[0];
          
          return res.json({
            origin,
            destination,
            distance: leg.distance.text,
            distanceValue: leg.distance.value,
            duration: leg.duration.text,
            durationValue: leg.duration.value,
            route: route.overview_polyline.points,
            steps: leg.steps.map(step => ({
              instruction: step.html_instructions,
              distance: step.distance.text,
              duration: step.duration.text
            })),
            status: 'OK'
          });
        } else {
          return res.status(400).json({
            message: 'Route not found',
            status: response.data.status
          });
        }
      } catch (apiError) {
        console.error('Google Maps API error:', apiError.message);
        return res.status(500).json({
          message: 'Error fetching route from Maps API',
          error: apiError.message
        });
      }
    }

    // Fallback if API key not configured
    res.json({
      origin,
      destination,
      distance: 'N/A',
      duration: 'N/A',
      route: [],
      message: 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY to .env file'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.geocodeAddress = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const mapsApiKey = await getSecret('GOOGLE_MAPS_API_KEY');
    if (mapsApiKey) {
      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: {
              address,
              key: mapsApiKey
            }
          }
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          return res.json({
            address: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            },
            placeId: result.place_id,
            status: 'OK'
          });
        } else {
          return res.status(404).json({
            message: 'Address not found',
            status: response.data.status
          });
        }
      } catch (apiError) {
        console.error('Geocoding API error:', apiError.message);
        return res.status(500).json({
          message: 'Error geocoding address',
          error: apiError.message
        });
      }
    }

    res.status(503).json({
      message: 'Geocoding API not configured'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
