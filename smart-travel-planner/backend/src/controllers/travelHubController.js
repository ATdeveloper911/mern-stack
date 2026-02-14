const Destination = require('../models/Destination');
const axios = require('axios');
const { getSecret } = require('../config/secrets');

exports.getAllDestinations = async (req, res) => {
  try {
    const { search, popular, seasonal, category } = req.query;
    let query = {};

    // Filter for Pakistan destinations only
    query.country = { $regex: /Pakistan/i };

    // Build search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (popular === 'true') {
      query.isPopular = true;
    }

    if (seasonal === 'true') {
      query.isSeasonal = true;
    }

    // Category filter - clean and simple
    if (category && category !== 'all') {
      query.category = category;
    }

    let destinations = await Destination.find(query);
    
    // Sort: Popular first, then by name
    destinations = destinations.sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get destinations by category
exports.getDestinationsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const query = {
      country: { $regex: /Pakistan/i },
      category: new RegExp(`^${category}$`, 'i')
    };
    
    const destinations = await Destination.find(query).sort({ isPopular: -1, name: 1 });
    
    res.json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDestinationById = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    // Fetch real-time weather if coordinates exist (don't save to DB to ensure fresh data)
    if (destination.coordinates && destination.coordinates.lat) {
      try {
        // Get API key from secrets helper
        const weatherApiKey = await getSecret('WEATHER_API_KEY');
        if (!weatherApiKey) {
          throw new Error('Weather API key not configured');
        }
        
        const weatherResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${destination.coordinates.lat}&lon=${destination.coordinates.lng}&appid=${weatherApiKey}&units=metric&_t=${Date.now()}`,

          {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
        // Attach real-time weather data (not saved to DB)
        destination.weather = {
          current: weatherResponse.data,
          lastUpdated: new Date()
        };
        // Don't save to DB - always fetch fresh
      } catch (weatherError) {
        console.log('Weather API error:', weatherError.message);
      }
    }

    res.json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createDestination = async (req, res) => {
  try {
    const destination = new Destination(req.body);
    await destination.save();
    res.status(201).json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getWeather = async (req, res) => {
  try {
    const { destination } = req.query;
    
    if (!destination) {
      return res.status(400).json({ message: 'Destination name is required' });
    }

    // Get weather API key using our secrets helper
    const apiKey = await getSecret('WEATHER_API_KEY');
    
    // Check if we have weather API key
    if (!apiKey) {
      return res.status(500).json({ 
        message: 'Weather API key not configured. Please add it in Admin Panel or .env file.' 
      });
    }
    let lat, lng, locationName = destination;

    // First, try to find destination in database
    const dest = await Destination.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${destination}$`, 'i') } },
        { city: { $regex: new RegExp(`^${destination}$`, 'i') } }
      ]
    });

    if (dest && dest.coordinates && dest.coordinates.lat && dest.coordinates.lng) {
      // Use coordinates from database
      lat = dest.coordinates.lat;
      lng = dest.coordinates.lng;
      locationName = dest.name || dest.city || destination;
    } else {
      // If not in database, try to geocode using OpenWeatherMap Geocoding API
      try {
        console.log(`📍 Geocoding location: ${destination}`);
        // Try geocoding the city name
        const geocodeResponse = await axios.get(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`,
          { timeout: 10000 }
        );

        if (geocodeResponse.data && geocodeResponse.data.length > 0) {
          lat = geocodeResponse.data[0].lat;
          lng = geocodeResponse.data[0].lon;
          locationName = geocodeResponse.data[0].name || destination;
          console.log(`✅ Found coordinates for ${locationName}: ${lat}, ${lng}`);
        } else {
          return res.status(404).json({ 
            message: `Location "${destination}" not found. Please check the spelling or try a different city name.` 
          });
        }
      } catch (geocodeError) {
        console.error('❌ Geocoding error:', geocodeError.response?.data || geocodeError.message);
        return res.status(404).json({ 
          message: `Could not find location "${destination}". Please check the spelling or try a different city name.` 
        });
      }
    }

    try {
      // Fetch current weather (Real-time, no cache)
      console.log(`🌤️ Fetching weather for ${locationName} at ${lat}, ${lng}`);
      const currentWeatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&_t=${Date.now()}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          timeout: 10000
        }
      );

      // Fetch 5-day forecast (Real-time, no cache)
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&_t=${Date.now()}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          timeout: 10000
        }
      );

      // Format current weather data
      const currentData = currentWeatherResponse.data;
      const weatherIcon = getWeatherIcon(currentData.weather[0].main, currentData.weather[0].icon);
      
      const formattedCurrent = {
        temperature: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main,
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
        visibility: currentData.visibility ? (currentData.visibility / 1000).toFixed(1) : 'N/A',
        pressure: currentData.main.pressure,
        uvIndex: 'Moderate', // OpenWeatherMap free tier doesn't include UV, using default
        icon: weatherIcon,
        description: currentData.weather[0].description,
        location: locationName // Add location name to response
      };

      // Format forecast data (5 days)
      const forecastList = forecastResponse.data.list;
      const dailyForecast = [];
      const processedDays = new Set();
      
      // Get one forecast per day (at 12:00 PM if available, otherwise first of the day)
      forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayKey = date.toDateString();
        
        if (!processedDays.has(dayKey) && dailyForecast.length < 5) {
          const icon = getWeatherIcon(item.weather[0].main, item.weather[0].icon);
          dailyForecast.push({
            day: dailyForecast.length === 0 ? 'Today' : dayName,
            temp: Math.round(item.main.temp),
            condition: item.weather[0].main,
            icon: icon,
            date: dayKey
          });
          processedDays.add(dayKey);
        }
      });

      // Don't save weather to DB - always fetch real-time data
      // Weather data is returned directly without saving

      res.json({
        current: formattedCurrent,
        forecast: dailyForecast,
        location: {
          name: locationName,
          city: dest?.city || locationName,
          country: dest?.country || 'Unknown'
        }
      });

    } catch (weatherError) {
      console.error('Weather API Error:', weatherError.response?.data || weatherError.message);
      
      if (weatherError.response?.status === 401 || weatherError.response?.data?.cod === 401) {
        console.error('❌ Invalid Weather API Key. Please verify:');
        console.error('   1. API key is correct in .env file');
        console.error('   2. API key is activated (new keys take 10-60 minutes to activate)');
        console.error('   3. Backend server was restarted after adding API key');
        return res.status(500).json({ 
          message: 'Invalid Weather API key. Please check your WEATHER_API_KEY in .env file and ensure it is activated. New keys may take 10-60 minutes to activate.',
          error: weatherError.response?.data?.message || 'Invalid API key'
        });
      }
      
      if (weatherError.response?.status === 429) {
        return res.status(500).json({ 
          message: 'Weather API rate limit exceeded. Please try again later.',
          error: 'Rate limit exceeded'
        });
      }
      
      return res.status(500).json({ 
        message: 'Failed to fetch weather data. Please try again later.',
        error: weatherError.response?.data?.message || weatherError.message 
      });
    }

  } catch (error) {
    console.error('Weather endpoint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get places to visit from OpenTripMap API
exports.getPlacesToVisit = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const apiKey = await getSecret('OPENTRIPMAP_API_KEY');

    if (!apiKey || apiKey === 'your_opentripmap_api_key_here') {
      return res.status(500).json({ 
        message: 'OpenTripMap API key not configured. Please add it in Admin Panel or .env file.' 
      });
    }

    try {
      // Step 1: Get places in radius using OpenTripMap Places API (Real-time)
      // OpenTripMap API uses apikey as query parameter
      // Adding timestamp to ensure fresh data (no caching)
      const placesResponse = await axios.get(
        `https://api.opentripmap.io/0.1/en/places/radius`,
        {
          params: {
            lat: parseFloat(lat),
            lon: parseFloat(lng),
            radius: parseInt(radius),
            limit: parseInt(limit),
            apikey: apiKey,
            kinds: 'interesting_places,tourist_facilities', // Filter for tourist attractions
            _t: Date.now() // Timestamp to prevent caching
          },
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          timeout: 15000,
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors
          }
        }
      );

      // Check for API errors
      if (placesResponse.status !== 200) {
        console.error('OpenTripMap API Error Response:', {
          status: placesResponse.status,
          statusText: placesResponse.statusText,
          data: placesResponse.data
        });
        
        if (placesResponse.status === 401 || placesResponse.status === 403 || placesResponse.status === 436) {
          return res.status(500).json({ 
            message: 'Invalid OpenTripMap API key or authentication failed. Please verify your OPENTRIPMAP_API_KEY in .env file.',
            error: `Status ${placesResponse.status}: ${placesResponse.data?.message || placesResponse.statusText || 'Authentication failed'}`
          });
        }
        
        if (placesResponse.status === 429) {
          return res.status(500).json({ 
            message: 'OpenTripMap API rate limit exceeded. Please try again later.',
            error: 'Rate limit exceeded'
          });
        }
        
        return res.status(500).json({ 
          message: `OpenTripMap API error: ${placesResponse.statusText || 'Unknown error'}`,
          error: placesResponse.data || `Status ${placesResponse.status}`
        });
      }

      if (!placesResponse.data || !placesResponse.data.features || placesResponse.data.features.length === 0) {
        return res.json([]);
      }

      // Step 2: Get detailed information for each place
      const places = [];
      const features = placesResponse.data.features.slice(0, Math.min(limit, 20)); // Limit to 20 places

      for (const feature of features) {
        try {
          const xid = feature.properties.xid;
          
          // Get place details (Real-time)
          const detailResponse = await axios.get(
            `https://api.opentripmap.io/0.1/en/places/xid/${xid}`,
            {
              params: {
                apikey: apiKey,
                _t: Date.now() // Timestamp to prevent caching
              },
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              timeout: 8000,
              validateStatus: function (status) {
                return status < 500; // Don't throw for 4xx errors
              }
            }
          );

          // Skip if detail fetch failed
          if (detailResponse.status !== 200) {
            console.log(`Skipping place ${xid} - detail fetch failed with status ${detailResponse.status}`);
            // Use basic info from feature
            const basicPlace = {
              xid: feature.properties.xid,
              name: feature.properties.name || 'Unnamed Place',
              description: feature.properties.kinds || 'No description available',
              coordinates: {
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0]
              },
              image: null,
              kinds: feature.properties.kinds ? feature.properties.kinds.split(',').slice(0, 3) : [],
              distance: feature.properties.dist || null
            };
            places.push(basicPlace);
            continue;
          }

          const placeData = detailResponse.data;
          
          // Format place data
          const formattedPlace = {
            xid: xid,
            name: placeData.name || 'Unnamed Place',
            description: placeData.wikipedia_extracts?.text || placeData.info?.descr || placeData.kinds || 'No description available',
            coordinates: {
              lat: placeData.point?.lat || feature.geometry.coordinates[1],
              lng: placeData.point?.lon || feature.geometry.coordinates[0]
            },
            image: placeData.preview?.source || placeData.image || null,
            wikipedia: placeData.wikipedia || null,
            kinds: placeData.kinds ? placeData.kinds.split(',').slice(0, 3) : [],
            rating: placeData.rate || null,
            distance: feature.properties.dist || null,
            address: placeData.address || null,
            url: placeData.url || null,
            otm: placeData.otm || null
          };

          places.push(formattedPlace);
        } catch (detailError) {
          // If detail fetch fails, use basic info from feature
          const basicPlace = {
            xid: feature.properties.xid,
            name: feature.properties.name || 'Unnamed Place',
            description: feature.properties.kinds || 'No description available',
            coordinates: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            },
            image: null,
            kinds: feature.properties.kinds ? feature.properties.kinds.split(',').slice(0, 3) : [],
            distance: feature.properties.dist || null
          };
          places.push(basicPlace);
        }
      }

      // Return real-time data with no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json(places);

    } catch (apiError) {
      console.error('OpenTripMap API Error:', {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText
      });
      
      // Handle network errors
      if (!apiError.response) {
        return res.status(500).json({ 
          message: 'Failed to connect to OpenTripMap API. Please check your internet connection and try again.',
          error: apiError.message
        });
      }
      
      const status = apiError.response.status;
      
      if (status === 401 || status === 403 || status === 436) {
        return res.status(500).json({ 
          message: 'Invalid OpenTripMap API key or authentication failed. Please verify your OPENTRIPMAP_API_KEY in .env file and ensure it is correct.',
          error: `Status ${status}: ${apiError.response?.data?.message || apiError.response?.statusText || 'Authentication failed'}`,
          hint: 'Make sure the API key is correct and activated. New keys may take a few minutes to activate.'
        });
      }
      
      if (status === 429) {
        return res.status(500).json({ 
          message: 'OpenTripMap API rate limit exceeded. Please try again later.',
          error: 'Rate limit exceeded'
        });
      }
      
      return res.status(500).json({ 
        message: `Failed to fetch places from OpenTripMap. Status: ${status}`,
        error: apiError.response?.data?.message || apiError.response?.statusText || apiError.message 
      });
    }

  } catch (error) {
    console.error('Places to visit endpoint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to get weather icon emoji
function getWeatherIcon(main, iconCode) {
  const iconMap = {
    'Clear': '☀️',
    'Clouds': iconCode?.includes('d') ? '⛅' : '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  
  return iconMap[main] || '⛅';
}
