/**
 * API Key management helper
 * Prioritizes keys from ApiKey collection in MongoDB over environment variables
 */

const ApiKey = require('../models/ApiKey');

/**
 * Get a secret/API key by name
 * @param {string} keyName - The name of the key to retrieve (e.g., 'WEATHER_API_KEY', 'GOOGLE_MAPS_API_KEY', 'AI_API_KEY')
 * @returns {Promise<string|null>} The API key value or null if not found
 */
const getSecret = async (keyName) => {
  try {
    // Map environment variable names to service names in ApiKey model
    const serviceMap = {
      'WEATHER_API_KEY': 'OpenWeatherMap',
      'GOOGLE_MAPS_API_KEY': 'Google Maps',
      'AI_API_KEY': 'Gemini AI',
      'OPENTRIPMAP_API_KEY': 'OpenTripMap',
      // Backward-compat alias (if referenced elsewhere)
      'OPENTRIP_API_KEY': 'OpenTripMap'
    };

    const service = serviceMap[keyName] || 'Other';
    
    // Try to find an active key in the database
    const apiKeyDoc = await ApiKey.findOne({ 
      service,
      isActive: true 
    }).sort({ updatedAt: -1 }); // Get the most recently updated key
    
    if (apiKeyDoc) {
      // Update usage statistics
      apiKeyDoc.lastUsed = new Date();
      apiKeyDoc.usageCount += 1;
      await apiKeyDoc.save();
      
      return apiKeyDoc.apiKey;
    }
    
    // Fall back to environment variable if no active key in DB
    return process.env[keyName] || null;
  } catch (error) {
    console.error(`Error retrieving key ${keyName}:`, error);
    // Fall back to environment variable on DB error
    return process.env[keyName] || null;
  }
};

module.exports = {
  getSecret
};
