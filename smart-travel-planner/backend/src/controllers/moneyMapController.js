const Budget = require('../models/Budget');
const BudgetRule = require('../models/BudgetRule');
const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');
const { getSecret } = require('../config/secrets');

// AI Helper function to get budget estimate from Gemini
const getAIBudgetEstimate = async (destination, numberOfMembers, days, season) => {
  try {
    const apiKey = await getSecret('AI_API_KEY');
    
    if (!apiKey || apiKey === 'your_ai_api_key_here' || apiKey === '') {
      console.log('\n⚠️ AI_API_KEY not configured.');
      console.log('   Please add it via Admin Panel → API Configuration.');
      console.log('   Or set it in backend/.env file as: AI_API_KEY=your_key_here\n');
      return null;
    }
    
    console.log(`\n🔑 Using Gemini API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`📝 Attempting to get AI budget estimate for: ${destination}\n`);

    // Convert season to readable format
    const seasonMap = {
      'peak': 'peak season (high demand, higher prices)',
      'off-peak': 'off-peak season (low demand, lower prices)',
      'shoulder': 'shoulder season (moderate demand, moderate prices)',
      'spring': 'spring season',
      'summer': 'summer season',
      'autumn': 'autumn season',
      'winter': 'winter season'
    };
    const seasonText = seasonMap[season] || season;

    const prompt = `You are a travel budget expert. Calculate a realistic budget breakdown for a trip to ${destination} for ${numberOfMembers} person(s) for ${days} day(s) during ${seasonText}.

Provide a detailed budget breakdown in the following JSON format only (no other text):
{
  "transportation": <number in PKR>,
  "accommodation": <number in PKR>,
  "food": <number in PKR>,
  "activities": <number in PKR>,
  "miscellaneous": <number in PKR>,
  "total": <total in PKR>,
  "recommendations": "<brief money-saving tips>",
  "insights": "<brief insights about budget for this destination>"
}

Consider:
- Local cost of living
- Seasonal price variations
- Number of travelers (group discounts if applicable)
- Typical expenses for this destination
- Currency: PKR (Pakistani Rupees)

Return ONLY valid JSON, no markdown, no explanations.`;

    const models = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-pro'
    ];

    for (const model of models) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        console.log(`\n🔄 Trying model: ${model}`);
        
        const response = await axios.post(
          apiUrl,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: function (status) {
              return status < 500; // Don't throw on 4xx errors, we'll handle them
            }
          }
        );
        
        // Check for API errors in response
        if (response.status !== 200) {
          const errorData = response.data?.error || {};
          throw {
            response: {
              status: response.status,
              data: {
                error: errorData
              }
            },
            message: errorData.message || `HTTP ${response.status}`
          };
        }

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const aiText = response.data.candidates[0].content.parts[0].text.trim();
          
          // Extract JSON from response (handle markdown code blocks)
          let jsonText = aiText;
          if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0].trim();
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0].trim();
          }
          
          // Remove any leading/trailing non-JSON text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          const aiBudget = JSON.parse(jsonText);
          
          console.log(`✅ Successfully got AI budget estimate from ${model}`);
          console.log(`   Total: PKR ${Math.round(aiBudget.total || 0)}\n`);
          
          return {
            transportation: Math.round(aiBudget.transportation || 0),
            accommodation: Math.round(aiBudget.accommodation || 0),
            food: Math.round(aiBudget.food || 0),
            activities: Math.round(aiBudget.activities || 0),
            miscellaneous: Math.round(aiBudget.miscellaneous || 0),
            total: Math.round(aiBudget.total || 0),
            recommendations: aiBudget.recommendations || '',
            insights: aiBudget.insights || ''
          };
        } else {
          console.log(`   ⚠️ No content in response from ${model}`);
        }
      } catch (modelError) {
        const errorMsg = modelError.response?.data?.error?.message || modelError.message;
        const errorCode = modelError.response?.data?.error?.code || modelError.response?.status;
        const fullError = modelError.response?.data?.error || {};
        
        // Log detailed error for debugging
        console.log(`❌ Model ${model} failed:`);
        console.log(`   Status Code: ${errorCode || 'N/A'}`);
        console.log(`   Error Message: ${errorMsg || 'Unknown error'}`);
        if (fullError.status) {
          console.log(`   Error Status: ${fullError.status}`);
        }
        if (modelError.response?.data) {
          console.log(`   Full Error Data:`, JSON.stringify(modelError.response.data, null, 2));
        }
        
        if (errorCode === 400 || errorCode === 401 || errorCode === 403) {
          console.log(`\n💡 This might be an invalid API key.`);
          console.log(`   Please check Admin Panel → API Configuration.`);
          console.log(`   Current API Key: ${apiKey ? apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4) : 'NOT SET'}\n`);
        } else {
          console.log('');
        }
        continue;
      }
    }

    console.log('\n❌ All Gemini models failed. Falling back to default calculation.\n');
    return null;
  } catch (error) {
    console.error('\n❌ AI Budget Estimate Error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    console.error('');
    return null;
  }
};

const parseJsonFromAiText = (aiText) => {
  if (!aiText) return null;
  let jsonText = aiText.trim();

  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  return JSON.parse(jsonText);
};

const fetchTopRatedPlaces = async ({ destination, type, typeLabel, limit = 3 }) => {
  const apiKey = await getSecret('GOOGLE_MAPS_API_KEY');
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    return { places: [], avgPriceLevel: null };
  }

  const textQuery = `${typeLabel} in ${destination}, Pakistan`;

  const searchRes = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: {
      query: textQuery,
      key: apiKey,
      type
    },
    timeout: 12000
  });

  if (searchRes.data.status !== 'OK' || !Array.isArray(searchRes.data.results)) {
    return { places: [], avgPriceLevel: null };
  }

  const sorted = [...searchRes.data.results]
    .filter((p) => p && p.name)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const candidates = sorted.slice(0, Math.max(limit, 6));
  const top = [];

  for (const place of candidates) {
    if (top.length >= limit) break;

    const base = {
      name: place.name,
      rating: place.rating || null,
      price_level: place.price_level ?? null
    };

    if (base.price_level == null && place.place_id) {
      try {
        const detailsRes = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            key: apiKey,
            fields: 'price_level,rating'
          },
          timeout: 10000
        });

        if (detailsRes.data.status === 'OK' && detailsRes.data.result) {
          base.price_level = detailsRes.data.result.price_level ?? base.price_level;
          base.rating = detailsRes.data.result.rating ?? base.rating;
        }
      } catch (e) {
        // best-effort
      }
    }

    top.push(base);
  }

  const priceLevels = top.map((p) => p.price_level).filter((v) => typeof v === 'number');
  const avgPriceLevel = priceLevels.length ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length : null;

  return { places: top, avgPriceLevel };
};

const getHybridSmartAIBudget = async ({ destination, numberOfMembers, days, season, hotels, restaurants }) => {
  const apiKey = await getSecret('AI_API_KEY');
  if (!apiKey || apiKey === 'your_ai_api_key_here' || apiKey === '') {
    return null;
  }

  const seasonText = season;
  const hotelList = (hotels || []).map((h) => `${h.name}${h.price_level != null ? ` (price_level:${h.price_level})` : ''}`).join(', ');
  const restaurantList = (restaurants || []).map((r) => `${r.name}${r.price_level != null ? ` (price_level:${r.price_level})` : ''}`).join(', ');

  const prompt = `I am planning a trip to ${destination} for ${numberOfMembers} people for ${days} days in ${seasonText}. Actual top-rated places found there include hotels: ${hotelList || 'N/A'} and restaurants: ${restaurantList || 'N/A'}. Based on this reality, estimate a detailed budget breakdown in PKR. Return ONLY valid JSON: { accommodation: Number, food: Number, transport: Number, activities: Number, total: Number, insights: String }.`;

  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  for (const model of models) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(
        apiUrl,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          validateStatus: function (status) {
            return status < 500;
          }
        }
      );

      if (response.status !== 200) {
        continue;
      }

      const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) continue;

      const parsed = parseJsonFromAiText(aiText);
      if (!parsed) continue;

      return {
        accommodation: Math.round(parsed.accommodation || 0),
        food: Math.round(parsed.food || 0),
        transport: Math.round(parsed.transport || 0),
        activities: Math.round(parsed.activities || 0),
        total: Math.round(parsed.total || 0),
        insights: parsed.insights || ''
      };
    } catch (e) {
      continue;
    }
  }

  return null;
};

// Fetch real-time pricing from Google Places API
const getRealTimePricing = async (destinationName, lat, lng, numberOfMembers, days) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      console.log('⚠️ Google Maps API key not configured');
      return null;
    }

    let accommodationTotal = 0;
    let foodTotal = 0;
    let transportationTotal = 0;
    let hasValidData = false;

    // Fetch hotels for accommodation pricing
    try {
      const hotelsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: `hotels in ${destinationName}, Pakistan`,
          key: apiKey,
          type: 'lodging',
          location: `${lat},${lng}`,
          radius: 50000
        },
        timeout: 10000
      }).catch((error) => {
        // Handle network/DNS errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.log(`⚠️ Network error fetching hotels: ${error.message}`);
          throw error;
        }
        throw error;
      });

      if (hotelsResponse.data.status === 'OK' && hotelsResponse.data.results) {
        const hotels = hotelsResponse.data.results.slice(0, 5);
        let totalPrice = 0;
        let count = 0;

        for (const hotel of hotels) {
          try {
            const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
              params: {
                place_id: hotel.place_id,
                key: apiKey,
                fields: 'price_level,rating,reviews'
              },
              timeout: 8000
            });

            if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
              const priceLevel = detailsResponse.data.result.price_level || 2; // Default to medium
              // Convert price_level (1-4) to PKR per night
              // 1 = $, 2 = $$, 3 = $$$, 4 = $$$$
              const pricePerNight = priceLevel === 1 ? 3000 : priceLevel === 2 ? 6000 : priceLevel === 3 ? 12000 : 20000;
              totalPrice += pricePerNight;
              count++;
            }
          } catch (err) {
            continue;
          }
        }

        if (count > 0) {
          const avgPricePerNight = totalPrice / count;
          accommodationTotal = Math.round(avgPricePerNight * numberOfMembers * days);
          hasValidData = true;
        }
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log(`⚠️ Network error fetching hotel pricing: ${error.code} - ${error.message}`);
        console.log('💡 This might be a network connectivity issue. Check your internet connection.');
      } else {
        console.log('Error fetching hotel pricing:', error.message);
      }
    }

    // Fetch restaurants for food pricing
    try {
      const restaurantsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: `restaurants in ${destinationName}, Pakistan`,
          key: apiKey,
          type: 'restaurant',
          location: `${lat},${lng}`,
          radius: 50000
        },
        timeout: 10000
      }).catch((error) => {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.log(`⚠️ Network error fetching restaurants: ${error.code} - ${error.message}`);
          throw error;
        }
        throw error;
      });

      if (restaurantsResponse.data.status === 'OK' && restaurantsResponse.data.results) {
        const restaurants = restaurantsResponse.data.results.slice(0, 5);
        let totalPrice = 0;
        let count = 0;

        for (const restaurant of restaurants) {
          try {
            const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
              params: {
                place_id: restaurant.place_id,
                key: apiKey,
                fields: 'price_level,rating'
              },
              timeout: 8000
            });

            if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
              const priceLevel = detailsResponse.data.result.price_level || 2;
              // Convert price_level to PKR per meal per person
              const pricePerMeal = priceLevel === 1 ? 500 : priceLevel === 2 ? 1000 : priceLevel === 3 ? 2000 : 3500;
              totalPrice += pricePerMeal;
              count++;
            }
          } catch (err) {
            continue;
          }
        }

        if (count > 0) {
          const avgPricePerMeal = totalPrice / count;
          // 3 meals per day
          foodTotal = Math.round(avgPricePerMeal * numberOfMembers * days * 3);
          hasValidData = true;
        }
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log(`⚠️ Network error fetching restaurant pricing: ${error.code} - ${error.message}`);
      } else {
        console.log('Error fetching restaurant pricing:', error.message);
      }
    }

    // Estimate transportation (based on distance from major cities)
    // This is a rough estimate - can be improved with Directions API
    const baseTransportCost = 5000; // Base cost per person
    transportationTotal = Math.round(baseTransportCost * numberOfMembers);
    hasValidData = true; // Transportation is always estimated

    // If we have no valid data from APIs, return null to trigger fallback
    if (!hasValidData && accommodationTotal === 0 && foodTotal === 0) {
      console.log('⚠️ No valid pricing data from Google APIs, using fallback');
      return null;
    }

    // Provide fallback estimates if API calls failed but we have partial data
    if (accommodationTotal === 0) {
      // Fallback: Estimate accommodation based on destination type
      const estimatedPerNight = 5000; // PKR per person per night
      accommodationTotal = Math.round(estimatedPerNight * numberOfMembers * days);
      console.log('💡 Using estimated accommodation cost (Google API unavailable)');
    }

    if (foodTotal === 0) {
      // Fallback: Estimate food cost
      const estimatedPerMeal = 800; // PKR per meal per person
      foodTotal = Math.round(estimatedPerMeal * numberOfMembers * days * 3);
      console.log('💡 Using estimated food cost (Google API unavailable)');
    }

    return {
      accommodation: accommodationTotal,
      food: foodTotal,
      transportation: transportationTotal
    };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error(`❌ Network error in real-time pricing: ${error.code} - ${error.message}`);
      console.error('💡 Check your internet connection and DNS settings');
    } else {
      console.error('Real-time pricing error:', error.message);
    }
    return null;
  }
};

const calculateBudget = async (destination, numberOfMembers, days, season) => {
  // Try to get budget rules for destination
  let budgetRule = await BudgetRule.findOne({ destination: { $regex: destination, $options: 'i' } });
  
  // Default base costs if no rule exists
  const defaultBaseCosts = {
    transportation: { perPerson: 50, perDay: 20 },
    accommodation: { perPerson: 80, perDay: 0 },
    food: { perPerson: 30, perDay: 0 },
    activities: { perPerson: 40, perDay: 0 },
    miscellaneous: { perPerson: 20, perDay: 0 }
  };

  const baseCosts = budgetRule?.baseCosts || defaultBaseCosts;
  const seasonalMultiplier = budgetRule?.seasonalMultipliers?.[season] || 1.0;

  // Calculate costs
  const transportation = (baseCosts.transportation.perPerson * numberOfMembers + 
                         baseCosts.transportation.perDay * days) * seasonalMultiplier;
  
  const accommodation = (baseCosts.accommodation.perPerson * numberOfMembers * days) * seasonalMultiplier;
  
  const food = (baseCosts.food.perPerson * numberOfMembers * days) * seasonalMultiplier;
  
  const activities = (baseCosts.activities.perPerson * numberOfMembers * days) * seasonalMultiplier;
  
  const miscellaneous = (baseCosts.miscellaneous.perPerson * numberOfMembers * days) * seasonalMultiplier;

  const total = transportation + accommodation + food + activities + miscellaneous;

  return {
    transportation: Math.round(transportation),
    accommodation: Math.round(accommodation),
    food: Math.round(food),
    activities: Math.round(activities),
    miscellaneous: Math.round(miscellaneous),
    total: Math.round(total)
  };
};

exports.calculateBudget = async (req, res) => {
  try {
    const { destination, numberOfMembers, days, season } = req.body;

    if (!destination || !numberOfMembers || !days || !season) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const hybridResponse = await exports.calculateHybridBudgetInternal({ destination, numberOfMembers, days, season });

    res.json({
      ...hybridResponse
    });
  } catch (error) {
    console.error('Budget calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.calculateHybridBudgetInternal = async ({ destination, numberOfMembers, days, season }) => {
  let hotels = [];
  let restaurants = [];
  let usedGoogleData = false;
  let insights = '';

  try {
    try {
      const [hotelData, restaurantData] = await Promise.all([
        fetchTopRatedPlaces({ destination, type: 'lodging', typeLabel: 'hotels', limit: 3 }),
        fetchTopRatedPlaces({ destination, type: 'restaurant', typeLabel: 'restaurants', limit: 3 })
      ]);

      hotels = hotelData.places;
      restaurants = restaurantData.places;
      usedGoogleData = hotels.length > 0 || restaurants.length > 0;
    } catch (googleErr) {
      usedGoogleData = false;
    }

    const hybridAi = await getHybridSmartAIBudget({
      destination,
      numberOfMembers,
      days,
      season,
      hotels,
      restaurants
    });

    if (hybridAi && hybridAi.total > 0) {
      insights = hybridAi.insights || '';

      const breakdown = {
        accommodation: hybridAi.accommodation,
        food: hybridAi.food,
        transportation: hybridAi.transport,
        activities: hybridAi.activities,
        miscellaneous: 0,
        total: hybridAi.total || (hybridAi.accommodation + hybridAi.food + hybridAi.transport + hybridAi.activities)
      };

      return {
        destination,
        numberOfMembers,
        days,
        season,
        breakdown,
        currency: 'PKR',
        calculationMethod: 'Hybrid-Smart',
        usedGoogleData,
        googlePlaces: {
          hotels,
          restaurants
        },
        insights
      };
    }

    const genericAi = await getAIBudgetEstimate(destination, numberOfMembers, days, season);
    if (genericAi && genericAi.total > 0) {
      return {
        destination,
        numberOfMembers,
        days,
        season,
        breakdown: {
          transportation: genericAi.transportation,
          accommodation: genericAi.accommodation,
          food: genericAi.food,
          activities: genericAi.activities,
          miscellaneous: genericAi.miscellaneous,
          total: genericAi.total
        },
        currency: 'PKR',
        calculationMethod: 'Hybrid-Smart',
        usedGoogleData: false,
        insights: genericAi.insights || ''
      };
    }

    const fallback = await calculateBudget(destination, numberOfMembers, days, season);
    return {
      destination,
      numberOfMembers,
      days,
      season,
      breakdown: fallback,
      currency: 'PKR',
      calculationMethod: 'Hybrid-Smart',
      usedGoogleData: false,
      insights: ''
    };
  } catch (e) {
    const fallback = await calculateBudget(destination, numberOfMembers, days, season);
    return {
      destination,
      numberOfMembers,
      days,
      season,
      breakdown: fallback,
      currency: 'PKR',
      calculationMethod: 'Hybrid-Smart',
      usedGoogleData: false,
      insights: ''
    };
  }
};

exports.calculateHybridBudget = async (req, res) => {
  try {
    const { destination, numberOfMembers, days, season } = req.body;

    if (!destination || !numberOfMembers || !days || !season) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const response = await exports.calculateHybridBudgetInternal({ destination, numberOfMembers, days, season });
    res.json(response);
  } catch (error) {
    console.error('Hybrid budget calculation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.saveBudget = async (req, res) => {
  try {
    const {
      destination,
      destinationId,
      numberOfMembers,
      days,
      season,
      breakdown,
      total,
      currency,
      startDate,
      endDate,
      isManual,
      calculationMethod
    } = req.body;

    if (!destination && !destinationId) {
      return res.status(400).json({ message: 'destination is required' });
    }

    const seasonMap = {
      peak: 'summer',
      'off-peak': 'winter',
      shoulder: 'spring'
    };
    const normalizedSeason = seasonMap[season] || season;

    const allowedSeasons = ['spring', 'summer', 'autumn', 'winter'];
    if (!allowedSeasons.includes(normalizedSeason)) {
      return res.status(400).json({ message: `Invalid season: ${season}` });
    }

    let destinationName = destination;
    if (!destinationName && destinationId) {
      const destDoc = await Destination.findById(destinationId);
      if (!destDoc) {
        return res.status(400).json({ message: 'Invalid destinationId' });
      }
      destinationName = destDoc.name;
    }
    if (destinationName && destinationName !== destinationName.trim()) {
      destinationName = destinationName.trim();
    }

    const cleanBreakdown = {
      accommodation: Number(breakdown?.accommodation || 0),
      transportation: Number(breakdown?.transportation || breakdown?.transport || 0),
      food: Number(breakdown?.food || 0),
      activities: Number(breakdown?.activities || 0),
      miscellaneous: Number(breakdown?.miscellaneous || 0)
    };

    const computedTotal =
      Number.isFinite(Number(total))
        ? Number(total)
        : Math.round(
            cleanBreakdown.accommodation +
              cleanBreakdown.transportation +
              cleanBreakdown.food +
              cleanBreakdown.activities +
              cleanBreakdown.miscellaneous
          );

    const budget = new Budget({
      userId: req.user._id,
      destination: destinationName,
      numberOfMembers: Number(numberOfMembers),
      days: Number(days),
      season: normalizedSeason,
      breakdown: cleanBreakdown,
      total: computedTotal,
      currency: currency || 'PKR',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isManual: Boolean(isManual),
      calculationMethod: calculationMethod || (isManual ? 'Manual' : 'Hybrid-Smart')
    });

    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    console.error('Save Budget Error:', error.message, error.stack);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
