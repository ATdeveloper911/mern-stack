const BuddyBotConversation = require('../models/BuddyBotConversation');
const axios = require('axios');
const Destination = require('../models/Destination');
const Budget = require('../models/Budget');
const { getSecret } = require('../config/secrets');

// Helper function to clean markdown formatting from AI response
const cleanResponse = (text) => {
  if (!text) return text;
  
  // Remove markdown bold (**text** or __text__)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  
  // Remove markdown italic (*text* or _text_)
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Remove markdown headers (# ## ###)
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove markdown code blocks (```code```)
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove markdown inline code (`code`)
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove markdown lists (- * +)
  text = text.replace(/^[\s]*[-*+]\s+/gm, '• ');
  
  // Remove markdown numbered lists
  text = text.replace(/^\d+\.\s+/gm, '');
  
  // Clean up multiple spaces
  text = text.replace(/\s{2,}/g, ' ');
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
};

// Helper function to get available Gemini models
const getAvailableModels = async (apiKey) => {
  try {
    // Try v1beta first (more models available)
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(listUrl, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data && response.data.models) {
      // Filter models that support generateContent
      const availableModels = response.data.models
        .filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent')
        )
        .map(model => ({
          name: model.name.replace('models/', ''),
          displayName: model.displayName
        }));
      
      console.log(`✅ Found ${availableModels.length} available Gemini models`);
      return availableModels;
    }
  } catch (error) {
    console.log(`⚠️ Could not fetch model list: ${error.message}`);
  }
  
  // Fallback to common model names
  return [
    { name: 'gemini-pro', displayName: 'Gemini Pro' },
    { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
    { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' }
  ];
};

const getAIResponse = async (userMessage, conversationHistory, userPreferences) => {
  const apiKey = await getSecret('AI_API_KEY');

  // Check if AI API key is set and valid
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your-ai-api-key-here') {
    const trimmedApiKey = apiKey.trim();
    
    // Build system prompt with travel context
    const systemPrompt = `You are TravelBuddy, an expert AI travel assistant specializing in Pakistan travel destinations and planning.

Your expertise includes:
- Destination recommendations (Hunza, Swat, Skardu, Fairy Meadows, etc.)
- Budget planning and cost estimation
- Weather information and travel tips
- Hotel and accommodation suggestions
- Travel requirements and documentation
- Local food recommendations
- Best time to visit different places
- Travel routes and transportation

Guidelines:
- Be friendly, helpful, and conversational
- Provide practical, actionable advice
- Use Pakistani Rupees (PKR) for budget discussions
- Mention specific destinations when relevant
- Keep responses concise but informative
- If asked about weather, suggest checking the Weather page
- If asked about hotels, suggest the Places to Stay section
- If asked about budget, suggest using the Budget Calculator

Always be enthusiastic about travel and help users plan amazing trips!`;

    // Get user's past trips for context
    let pastTripsContext = '';
    if (userPreferences && userPreferences.get) {
      const pastTrips = await Budget.find({ userId: userPreferences.get('userId') }).limit(3);
      if (pastTrips.length > 0) {
        const destinations = pastTrips.map(t => t.destination).join(', ');
        pastTripsContext = `\n\nUser's past trip destinations: ${destinations}. Consider their travel preferences when making recommendations.`;
      }
    }

    // Build conversation context for Gemini
    let fullPrompt = systemPrompt + pastTripsContext + '\n\n';
    
    // Add conversation history
    conversationHistory.slice(-10).forEach(msg => {
      if (msg.role === 'user') {
        fullPrompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        fullPrompt += `Assistant: ${msg.content}\n\n`;
      }
    });
    
    // Add current user message
    fullPrompt += `User: ${userMessage}\n\nAssistant:`;

    // Get available models first
    console.log('🔍 Fetching available Gemini models...');
    const availableModels = await getAvailableModels(trimmedApiKey);
    
    // Try multiple API endpoints for each model
    const endpointsToTry = ['v1beta', 'v1'];
    
    for (const model of availableModels) {
      for (const endpoint of endpointsToTry) {
        const modelName = model.name;
        try {
          console.log(`🔄 Trying Gemini model: ${modelName} (${endpoint})`);
          console.log(`📝 API Key: ${trimmedApiKey ? 'Present (length: ' + trimmedApiKey.length + ')' : 'Missing'}`);
          
          // Try both v1 and v1beta endpoints
          const apiUrl = `https://generativelanguage.googleapis.com/${endpoint}/models/${modelName}:generateContent?key=${trimmedApiKey}`;
        
        const requestData = {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topP: 0.8,
            topK: 40
          }
        };
        
        const response = await axios.post(
          apiUrl,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 20000,
            validateStatus: function (status) {
              return status < 500; // Don't throw on 4xx errors
            }
          }
        );
        
        console.log(`📥 Response status: ${response.status}`);
        
        // Check for successful response
        if (response.status === 200 && response.data) {
          if (response.data.candidates && 
              response.data.candidates[0] && 
              response.data.candidates[0].content && 
              response.data.candidates[0].content.parts && 
              response.data.candidates[0].content.parts[0]) {
            let aiResponse = response.data.candidates[0].content.parts[0].text;
            // Clean markdown formatting from response
            aiResponse = cleanResponse(aiResponse);
            console.log(`✅ AI Response generated successfully using ${modelName} (${endpoint}) (${aiResponse.length} characters)`);
            return aiResponse;
          } else if (response.data.error) {
            console.error(`❌ API Error for ${modelName}:`, JSON.stringify(response.data.error, null, 2));
            // Try next model
            continue;
          } else {
            console.error(`❌ Unexpected response format for ${modelName}`);
            // Try next model
            continue;
          }
        } else if (response.status === 404) {
          console.log(`⚠️ Model ${modelName} (${endpoint}) not found, trying next...`);
          // Try next endpoint or model
          continue;
        } else if (response.status === 401 || response.status === 403) {
          console.error(`❌ API Key authentication failed for ${modelName} (${endpoint})`);
          console.error(`   Error details:`, response.data?.error || response.data);
          console.error('💡 Please verify your AI_API_KEY in backend/.env is a valid Gemini API key');
          console.error('💡 Get a free Gemini API key from: https://makersuite.google.com/app/apikey');
          console.error('💡 Make sure the API key is for Gemini API, NOT Google Maps API');
          // Don't try other models if auth fails
          return null; // Exit function
        } else if (response.status === 400) {
          console.error(`❌ Bad Request for ${modelName} (${endpoint}):`, response.data?.error?.message || 'Invalid request');
          console.error(`   Full error:`, JSON.stringify(response.data?.error || response.data, null, 2));
          // Try next model
          continue;
        } else {
          console.error(`❌ Unexpected status ${response.status} for ${modelName} (${endpoint})`);
          console.error(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
          // Try next model
          continue;
        }
        } catch (error) {
          console.error(`❌ Error with model ${modelName} (${endpoint}):`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            error: error.response?.data?.error || error.response?.data,
            code: error.code
          });
          
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.error('❌ API Key Error: Please verify your Gemini API key is correct and enabled.');
            console.error('💡 Get a free Gemini API key from: https://makersuite.google.com/app/apikey');
            console.error('💡 Make sure the API key is for Gemini API, not Google Maps API');
            return null; // Exit function
          } else if (error.response?.status === 404) {
            console.log(`⚠️ Model ${modelName} (${endpoint}) not found, trying next...`);
            // Try next endpoint or model
            continue;
          } else if (!error.response) {
            console.error(`❌ Network error: ${error.message}`);
            // Try next endpoint or model
            continue;
          } else {
            // Try next endpoint or model
            continue;
          }
        }
      }
    }
    
    // If all models failed, log and fall through to fallback
    console.log('⚠️ All Gemini models failed, using fallback responses');
    console.log('💡 The API key might be incorrect or not enabled for Gemini API');
    console.log('💡 Please verify: https://makersuite.google.com/app/apikey');
    
    // If all attempts failed, use fallback
    console.log('⚠️ Using fallback responses (AI API not available)');
  }

  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
    return "I can help you calculate your travel budget! Please provide: destination, number of members, days, and season. I'll give you a detailed breakdown including transportation, accommodation, food, activities, and miscellaneous costs.";
  }
  
  if (lowerMessage.includes('destination') || lowerMessage.includes('place')) {
    const destinations = await Destination.find({ isPopular: true }).limit(3);
    const names = destinations.map(d => d.name).join(', ');
    return `Here are some popular destinations: ${names}. Would you like more details about any of these?`;
  }
  
  if (lowerMessage.includes('weather')) {
    return "I can check weather conditions for your destination! Just tell me where you're planning to visit, and I'll provide current weather and forecasts to help you plan better.";
  }
  
  if (lowerMessage.includes('hotel') || lowerMessage.includes('accommodation')) {
    return "I can help you find the best hotels! Check out the 'Places to Stay' section for hotels with ratings, reviews, and booking options. Would you like recommendations based on your budget?";
  }
  
  return "I'm here to help you plan your perfect trip! I can assist with destination recommendations, budget calculations, weather information, and travel planning. What would you like to know?";
};

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let conversation = await BuddyBotConversation.findOne({ userId });
    
    if (!conversation) {
      conversation = new BuddyBotConversation({
        userId,
        messages: []
      });
    }

    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Extract preferences from message
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('budget') || lowerMessage.includes('cheap') || lowerMessage.includes('expensive')) {
      if (lowerMessage.includes('cheap') || lowerMessage.includes('low')) {
        conversation.preferences.set('budget', 'low');
      } else if (lowerMessage.includes('expensive') || lowerMessage.includes('luxury') || lowerMessage.includes('high')) {
        conversation.preferences.set('budget', 'high');
      }
    }
    if (lowerMessage.includes('family')) {
      conversation.preferences.set('travelType', 'family');
    } else if (lowerMessage.includes('solo')) {
      conversation.preferences.set('travelType', 'solo');
    } else if (lowerMessage.includes('couple')) {
      conversation.preferences.set('travelType', 'couple');
    }

    // Add userId to preferences for context
    conversation.preferences.set('userId', userId.toString());

    const aiResponse = await getAIResponse(
      message,
      conversation.messages.slice(0, -1),
      conversation.preferences
    );

    conversation.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    await conversation.save();

    res.json({
      response: aiResponse,
      conversationId: conversation._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = await BuddyBotConversation.findOne({ userId: req.user._id });
    
    if (!conversation) {
      return res.json({ messages: [] });
    }

    res.json({
      messages: conversation.messages,
      preferences: conversation.preferences
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.clearConversation = async (req, res) => {
  try {
    await BuddyBotConversation.findOneAndDelete({ userId: req.user._id });
    res.json({ message: 'Conversation cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
