const User = require('../models/User');
const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');
const Budget = require('../models/Budget');
const BudgetRule = require('../models/BudgetRule');
const BuddyBotConversation = require('../models/BuddyBotConversation');
const ApiKey = require('../models/ApiKey');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getSecret } = require('../config/secrets');

// User Management
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.autoFillDestination = async (req, res) => {
  try {
    const query = String(req.body?.query || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    const preferGeminiOnly = Boolean(req.body?.geminiOnly);

    const runGeminiEnrichment = async ({ base, formattedAddress }) => {
      const aiKey = await getSecret('AI_API_KEY');
      if (!aiKey || aiKey === 'your_ai_api_key_here') {
        return { merged: base, enriched: false };
      }

      const parseJsonFromAiText = (text) => {
        if (!text) return null;
        let jsonText = String(text).trim();
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0].trim();
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0].trim();
        }
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
          return JSON.parse(match[0]);
        } catch (e) {
          return null;
        }
      };

      const prompt = `You are a travel content writer for an admin dashboard. Create concise, accurate content for a travel destination using the provided real data.

Real data:
- Name: ${base.name}
- Address: ${formattedAddress || ''}
- City: ${base.city}
- Region: ${base.region}
- Country: ${base.country}
- Category: ${base.category}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "tagline": "string (max 90 chars)",
  "description": "string (2-4 sentences)",
  "bestSeason": "all|spring|summer|autumn|winter",
  "category": "Northern Areas|Hill Stations|Valleys|Lakes|Mountains|Beaches|Historical|Cities",
  "culture": "string (short)",
  "history": "string (short)"
}`;

      const models = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      let enrichment = null;
      for (const model of models) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${aiKey}`;
          const response = await axios.post(
            apiUrl,
            {
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 20000,
              validateStatus: (status) => status < 500,
            }
          );

          if (response.status !== 200) {
            continue;
          }

          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = parseJsonFromAiText(text);
          if (!parsed) continue;
          enrichment = parsed;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!enrichment) {
        return { merged: base, enriched: false };
      }

      const merged = {
        ...base,
        tagline: typeof enrichment?.tagline === 'string' ? enrichment.tagline : base.tagline,
        description: typeof enrichment?.description === 'string' ? enrichment.description : base.description,
        bestSeason: typeof enrichment?.bestSeason === 'string' ? enrichment.bestSeason : base.bestSeason,
        category: typeof enrichment?.category === 'string' ? enrichment.category : base.category,
        culture: typeof enrichment?.culture === 'string' ? enrichment.culture : base.culture,
        history: typeof enrichment?.history === 'string' ? enrichment.history : base.history,
      };

      return { merged, enriched: true };
    };

    const autoFillFromGeminiOnly = async () => {
      const aiKey = await getSecret('AI_API_KEY');
      if (!aiKey || aiKey === 'your_ai_api_key_here') {
        return { ok: false, status: 400, message: 'Gemini API key not configured. Please add AI_API_KEY.' };
      }

      const parseJsonFromAiText = (text) => {
        if (!text) return null;
        let jsonText = String(text).trim();
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0].trim();
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0].trim();
        }
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
          return JSON.parse(match[0]);
        } catch (e) {
          return null;
        }
      };

      const prompt = `You are generating admin form autofill data for a travel destination.

Destination search text: ${query}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "name": "string",
  "city": "string",
  "region": "string",
  "country": "string",
  "category": "Northern Areas|Hill Stations|Valleys|Lakes|Mountains|Beaches|Historical|Cities",
  "tagline": "string (max 90 chars)",
  "description": "string (2-4 sentences)",
  "bestSeason": "all|spring|summer|autumn|winter",
  "culture": "string (short)",
  "history": "string (short)",
  "coordinates": { "lat": number|null, "lng": number|null }
}

Rules:
- If you are unsure about coordinates, set them to null.
- Be accurate and avoid inventing facts. Prefer general but correct info.
- Keep country/city/region consistent with the destination.`;

      const models = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      let payload = null;
      for (const model of models) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${aiKey}`;
          const response = await axios.post(
            apiUrl,
            {
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 20000,
              validateStatus: (status) => status < 500,
            }
          );

          if (response.status !== 200) {
            continue;
          }

          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = parseJsonFromAiText(text);
          if (!parsed) continue;
          payload = parsed;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!payload) {
        return { ok: false, status: 502, message: 'Gemini autofill failed.' };
      }

      const base = {
        name: typeof payload?.name === 'string' && payload.name.trim() ? payload.name.trim() : query,
        city: typeof payload?.city === 'string' ? payload.city : '',
        country: typeof payload?.country === 'string' && payload.country.trim() ? payload.country.trim() : 'Pakistan',
        category: typeof payload?.category === 'string' && payload.category.trim() ? payload.category : 'Northern Areas',
        description: typeof payload?.description === 'string' ? payload.description : `Travel destination in ${payload?.country || 'Pakistan'}.`,
        tagline: typeof payload?.tagline === 'string' ? payload.tagline : '',
        isPopular: false,
        bestSeason: typeof payload?.bestSeason === 'string' ? payload.bestSeason : 'all',
        region: typeof payload?.region === 'string' ? payload.region : '',
        culture: typeof payload?.culture === 'string' ? payload.culture : '',
        history: typeof payload?.history === 'string' ? payload.history : '',
        images: [],
        coordinates: {
          lat: typeof payload?.coordinates?.lat === 'number' ? payload.coordinates.lat : null,
          lng: typeof payload?.coordinates?.lng === 'number' ? payload.coordinates.lng : null,
        },
        rating: 0,
        website: '',
        mapsUrl: '',
      };

      const { merged } = await runGeminiEnrichment({ base, formattedAddress: '' });
      return {
        ok: true,
        destination: merged,
        source: 'gemini_only',
        placeId: '',
      };
    };

    const autoFillFromOpenTripMap = async () => {
      const otmKey = await getSecret('OPENTRIPMAP_API_KEY');
      if (!otmKey) {
        return { ok: false, status: 400, message: 'OpenTripMap API key not configured. Please add OPENTRIPMAP_API_KEY.' };
      }

      const suggestResponse = await axios.get('https://api.opentripmap.com/0.1/en/places/autosuggest', {
        params: {
          name: query,
          lat: 30.3753,
          lon: 69.3451,
          radius: 1200000,
          limit: 10,
          apikey: otmKey,
        },
        timeout: 12000,
        validateStatus: (status) => status < 500,
      });

      if (suggestResponse.status !== 200) {
        const serverMessage = suggestResponse.data?.message || suggestResponse.data?.error || '';
        return {
          ok: false,
          status: 502,
          message: `OpenTripMap request failed (HTTP ${suggestResponse.status})${serverMessage ? `: ${serverMessage}` : ''}`,
        };
      }

      const features = suggestResponse.data?.features || [];
      const best = features.find((f) => f?.properties?.country === 'Pakistan') || features[0];
      const first = best;
      const xid = first?.properties?.xid;
      const lat = first?.geometry?.coordinates?.[1];
      const lng = first?.geometry?.coordinates?.[0];
      if (!xid) {
        return { ok: false, status: 404, message: 'No matching place found (OpenTripMap)' };
      }

      const detailsResponse = await axios.get(`https://api.opentripmap.com/0.1/en/places/xid/${encodeURIComponent(xid)}`, {
        params: {
          apikey: otmKey,
        },
        timeout: 12000,
        validateStatus: (status) => status < 500,
      });

      if (detailsResponse.status !== 200) {
        const serverMessage = detailsResponse.data?.message || detailsResponse.data?.error || '';
        return {
          ok: false,
          status: 502,
          message: `OpenTripMap details request failed (HTTP ${detailsResponse.status})${serverMessage ? `: ${serverMessage}` : ''}`,
        };
      }

      const d = detailsResponse.data || {};
      const address = d.address || {};
      const city = address.city || address.town || address.village || address.county || '';
      const country = address.country || 'Pakistan';
      const regionText = [address.state, address.county].filter(Boolean).join(', ');

      const name = d.name || first?.properties?.name || query;

      const kinds = String(d.kinds || '').toLowerCase();
      let category = 'Northern Areas';
      if (kinds.includes('beaches')) category = 'Beaches';
      else if (kinds.includes('lakes')) category = 'Lakes';
      else if (kinds.includes('mountains') || kinds.includes('natural')) category = 'Mountains';
      else if (kinds.includes('valleys')) category = 'Valleys';
      else if (kinds.includes('historic') || kinds.includes('architecture') || kinds.includes('museums') || kinds.includes('fortifications')) category = 'Historical';
      else if (kinds.includes('urban')) category = 'Cities';

      const images = [];
      if (d.preview?.source) images.push(d.preview.source);

      const formattedAddress = [
        address.road,
        address.suburb,
        address.city,
        address.state,
        address.country,
      ]
        .filter(Boolean)
        .join(', ');

      const base = {
        name,
        city,
        country,
        category,
        description:
          d.wikipedia_extracts?.text ||
          (formattedAddress ? `Travel destination in ${city || name}, ${country}. ${formattedAddress}` : `Travel destination in ${country}.`),
        tagline: '',
        isPopular: false,
        bestSeason: 'all',
        region: regionText || '',
        culture: '',
        history: '',
        images,
        coordinates: {
          lat: d.point?.lat ?? lat,
          lng: d.point?.lon ?? lng,
        },
        rating: d.rate || 0,
        website: d.url || d.otm || '',
        mapsUrl: '',
      };

      const { merged, enriched } = await runGeminiEnrichment({ base, formattedAddress });
      return {
        ok: true,
        destination: merged,
        source: enriched ? 'opentripmap+gemini' : 'opentripmap',
        placeId: xid,
      };
    };

    const autoFillFromGooglePlacesNew = async (key) => {
      try {
        const fieldMask = [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.photos',
          'places.types',
          'places.rating',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.addressComponents',
        ].join(',');

        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: query,
            languageCode: 'en',
            regionCode: 'PK',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': key,
              'X-Goog-FieldMask': fieldMask,
            },
            timeout: 12000,
            validateStatus: (status) => status < 500,
          }
        );

        if (response.status !== 200) {
          return {
            ok: false,
            status: 502,
            message: `Google Places (New) request failed (HTTP ${response.status})`,
          };
        }

        const place = response.data?.places?.[0];
        if (!place) {
          return { ok: false, status: 404, message: 'No matching place found.' };
        }

        const formattedAddress = place.formattedAddress || '';

        let city = '';
        let country = 'Pakistan';
        let regionText = '';
        try {
          const comps = Array.isArray(place.addressComponents) ? place.addressComponents : [];
          const byType = (type) => comps.find((c) => Array.isArray(c?.types) && c.types.includes(type));
          const locality = byType('locality')?.longText;
          const admin2 = byType('administrative_area_level_2')?.longText;
          const admin1 = byType('administrative_area_level_1')?.longText;
          const countryName = byType('country')?.longText;

          city = locality || admin2 || '';
          country = countryName || country;
          regionText = [admin1, admin2].filter(Boolean).join(', ');
        } catch (e) {
          // ignore
        }

        if (!city || !regionText || !country) {
          const addressParts = formattedAddress
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
          if (!country && addressParts.length) country = addressParts[addressParts.length - 1];
          if (!city && addressParts.length) city = addressParts[0] || '';
          if (!regionText && addressParts.length > 2) regionText = addressParts.slice(1, -1).join(', ');
        }

        const name = place.displayName?.text || query;
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;

        let category = 'Northern Areas';
        const lowerName = String(name).toLowerCase();
        if (lowerName.includes('valley')) category = 'Valleys';
        else if (lowerName.includes('lake')) category = 'Lakes';
        else if (lowerName.includes('beach')) category = 'Beaches';
        else if (lowerName.includes('mountain') || lowerName.includes('peak')) category = 'Mountains';
        else if (lowerName.includes('hill') || lowerName.includes('station')) category = 'Hill Stations';
        else if (lowerName.includes('fort') || lowerName.includes('museum') || lowerName.includes('monument')) category = 'Historical';
        else if (lowerName.includes('city')) category = 'Cities';

        const images = [];
        const photos = Array.isArray(place.photos) ? place.photos : [];
        photos.slice(0, 5).forEach((p) => {
          if (!p?.name) return;
          images.push(`https://places.googleapis.com/v1/${encodeURIComponent(p.name)}/media?maxHeightPx=1200&key=${key}`);
        });

        const base = {
          name,
          city,
          country: country || 'Pakistan',
          category,
          description: formattedAddress
            ? `Travel destination in ${city || name}, ${country}. ${formattedAddress}`
            : `Travel destination in ${country}.`,
          tagline: '',
          isPopular: false,
          bestSeason: 'all',
          region: regionText || '',
          culture: '',
          history: '',
          images,
          coordinates: {
            lat,
            lng,
          },
          rating: place.rating || 0,
          website: place.websiteUri || '',
          mapsUrl: place.googleMapsUri || '',
        };

        const { merged, enriched } = await runGeminiEnrichment({ base, formattedAddress });
        return {
          ok: true,
          destination: merged,
          source: enriched ? 'google_new+gemini' : 'google_new',
          placeId: place.id || '',
        };
      } catch (e) {
        return { ok: false, status: 502, message: `Google Places (New) request failed: ${e?.message || 'Unknown error'}` };
      }
    };

    const mapsKeyFromSecrets = await getSecret('GOOGLE_MAPS_API_KEY');
    const mapsKeyFromEnv = process.env.GOOGLE_MAPS_API_KEY || null;
    const resolveMapsKey = () => mapsKeyFromSecrets || mapsKeyFromEnv;

    let mapsKey = resolveMapsKey();
    if (preferGeminiOnly) {
      const g = await autoFillFromGeminiOnly();
      if (!g.ok) return res.status(g.status).json({ message: g.message });
      return res.json({ success: true, source: g.source, placeId: g.placeId, destination: g.destination });
    }

    if (!mapsKey || mapsKey === 'your-google-maps-api-key-here') {
      const g = await autoFillFromGeminiOnly();
      if (g.ok) {
        return res.json({ success: true, source: g.source, placeId: g.placeId, destination: g.destination });
      }
      return res.status(400).json({ message: 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY.' });
    }

    const callPlaces = async (q, key) => {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: q,
          key,
          region: 'pk',
          language: 'en',
        },
        timeout: 12000,
        validateStatus: (status) => status < 500,
      });
      return {
        httpStatus: response.status,
        status: response.data?.status,
        errorMessage: response.data?.error_message,
        results: response.data?.results || [],
      };
    };

    const tryPlacesWithKey = async (key) => {
      const queriesToTry = [query, `${query}, Pakistan`, `${query} Pakistan`];
      let last = null;
      for (const q of queriesToTry) {
        last = await callPlaces(q, key);
        if (last.httpStatus !== 200) return last;
        if (last.status === 'OK' && last.results.length) return last;
        if (last.status && last.status !== 'ZERO_RESULTS') return last;
      }
      return last;
    };

    let placesAttempt = await tryPlacesWithKey(mapsKey);

    // If secrets key is active but restricted/denied, and env key exists, try env key too.
    if (
      placesAttempt?.httpStatus === 200 &&
      placesAttempt?.status === 'REQUEST_DENIED' &&
      mapsKeyFromEnv &&
      mapsKeyFromEnv !== mapsKey
    ) {
      mapsKey = mapsKeyFromEnv;
      placesAttempt = await tryPlacesWithKey(mapsKey);
    }

    if (placesAttempt?.httpStatus !== 200) {
      return res.status(502).json({ message: 'Google Places request failed' });
    }

    if (placesAttempt?.status !== 'OK' || !placesAttempt.results?.length) {
      if (placesAttempt?.status === 'ZERO_RESULTS') {
        return res.status(404).json({ message: 'No matching place found. Try a more specific query (e.g., "Hunza Valley Gilgit Baltistan").' });
      }

      if (
        placesAttempt?.status === 'REQUEST_DENIED' &&
        String(placesAttempt?.errorMessage || '').toLowerCase().includes('legacy')
      ) {
        const newPlaces = await autoFillFromGooglePlacesNew(mapsKey);
        if (newPlaces.ok) {
          return res.json({
            success: true,
            source: newPlaces.source,
            placeId: newPlaces.placeId,
            destination: newPlaces.destination,
          });
        }

        const fallback = await autoFillFromOpenTripMap();
        if (!fallback.ok) {
          return res.status(fallback.status).json({ message: fallback.message });
        }
        return res.json({
          success: true,
          source: fallback.source,
          placeId: fallback.placeId,
          destination: fallback.destination,
        });
      }

      if (placesAttempt?.status === 'REQUEST_DENIED') {
        const g = await autoFillFromGeminiOnly();
        if (g.ok) {
          return res.json({ success: true, source: g.source, placeId: g.placeId, destination: g.destination });
        }
      }

      const extra = placesAttempt?.errorMessage ? `: ${placesAttempt.errorMessage}` : '';
      return res.status(400).json({
        message: `Google Places error ${placesAttempt?.status || 'UNKNOWN'}${extra}`,
      });
    }

    const first = placesAttempt.results[0];
    if (!first?.place_id) {
      return res.status(404).json({ message: 'No matching place found' });
    }

    const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: first.place_id,
        key: mapsKey,
        fields: 'name,formatted_address,geometry,photos,types,rating,website,url',
      },
      timeout: 12000,
      validateStatus: (status) => status < 500,
    });

    const detailsStatus = detailsResponse.data?.status;
    const details = detailsResponse.data?.result;
    if (detailsStatus !== 'OK' || !details) {
      const extra = detailsResponse.data?.error_message ? `: ${detailsResponse.data.error_message}` : '';
      return res.status(400).json({ message: `Google Place Details error ${detailsStatus || 'UNKNOWN'}${extra}` });
    }

    const formattedAddress = details.formatted_address || first.formatted_address || '';

    let city = '';
    let country = 'Pakistan';
    let regionText = '';

    try {
      const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          place_id: first.place_id,
          key: mapsKey,
          language: 'en',
        },
        timeout: 12000,
        validateStatus: (status) => status < 500,
      });

      const geoStatus = geocodeResponse.data?.status;
      const comps = geocodeResponse.data?.results?.[0]?.address_components || [];
      if (geoStatus === 'OK' && comps.length) {
        const byType = (type) => comps.find((c) => Array.isArray(c.types) && c.types.includes(type));
        const locality = byType('locality')?.long_name;
        const admin2 = byType('administrative_area_level_2')?.long_name;
        const admin1 = byType('administrative_area_level_1')?.long_name;
        const countryName = byType('country')?.long_name;

        city = locality || admin2 || city;
        country = countryName || country;
        regionText = [admin1, admin2].filter(Boolean).join(', ');
      }
    } catch (e) {
      // ignore geocode failures and fallback to formatted_address parsing
    }

    if (!city || !regionText || !country) {
      const addressParts = formattedAddress
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (!country && addressParts.length) country = addressParts[addressParts.length - 1];
      if (!city && addressParts.length) city = addressParts[0] || '';
      if (!regionText && addressParts.length > 2) regionText = addressParts.slice(1, -1).join(', ');
    }

    const name = details.name || first.name || query;
    const lat = details.geometry?.location?.lat ?? first.geometry?.location?.lat;
    const lng = details.geometry?.location?.lng ?? first.geometry?.location?.lng;

    let category = 'Northern Areas';
    const lowerName = String(name).toLowerCase();
    if (lowerName.includes('valley')) category = 'Valleys';
    else if (lowerName.includes('lake')) category = 'Lakes';
    else if (lowerName.includes('beach')) category = 'Beaches';
    else if (lowerName.includes('mountain') || lowerName.includes('peak')) category = 'Mountains';
    else if (lowerName.includes('hill') || lowerName.includes('station')) category = 'Hill Stations';
    else if (lowerName.includes('fort') || lowerName.includes('museum') || lowerName.includes('monument')) category = 'Historical';
    else if (lowerName.includes('city')) category = 'Cities';

    const images = [];
    const photos = details.photos || [];
    photos.slice(0, 5).forEach((photo) => {
      if (!photo?.photo_reference) return;
      images.push(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${mapsKey}`);
    });

    const base = {
      name,
      city,
      country: country || 'Pakistan',
      category,
      description: formattedAddress ? `Travel destination in ${city || name}, ${country}. ${formattedAddress}` : `Travel destination in ${country}.`,
      tagline: '',
      isPopular: false,
      bestSeason: 'all',
      region: regionText || '',
      culture: '',
      history: '',
      images,
      coordinates: {
        lat,
        lng,
      },
      rating: details.rating || first.rating || 0,
      website: details.website || '',
      mapsUrl: details.url || '',
    };

    const { merged, enriched } = await runGeminiEnrichment({ base, formattedAddress });
    return res.json({
      success: true,
      source: enriched ? 'google+gemini' : 'google',
      placeId: first.place_id,
      destination: merged,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, contactNumber, password, role, isActive } = req.body;

    if (!name || !email || !contactNumber || !password) {
      return res.status(400).json({ message: 'Name, email, contactNumber and password are required' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const user = new User({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      contactNumber: String(contactNumber).trim(),
      password: String(password),
      role: role === 'admin' ? 'admin' : 'user',
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, contactNumber, password, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && String(email).toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({
        email: String(email).toLowerCase().trim(),
        _id: { $ne: user._id },
      });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      user.email = String(email).toLowerCase().trim();
    }

    if (name !== undefined) user.name = String(name).trim();
    if (contactNumber !== undefined) user.contactNumber = String(contactNumber).trim();
    if (role !== undefined) user.role = role === 'admin' ? 'admin' : 'user';
    if (typeof isActive === 'boolean') user.isActive = isActive;

    if (password && String(password).trim()) {
      user.password = String(password);
    }

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Destination Management
exports.getAllDestinations = async (req, res) => {
  try {
    const destinations = await Destination.find().sort({ createdAt: -1 });
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

exports.updateDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    res.json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    res.json({ message: 'Destination deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hotel Management
exports.getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find().populate('destination', 'name city').sort({ createdAt: -1 });
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('destination', 'name city');
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createHotel = async (req, res) => {
  try {
    const hotel = new Hotel(req.body);
    await hotel.save();
    res.status(201).json(hotel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteHotel = async (req, res) => {
  try {
    await Hotel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Hotel deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Restaurant Management
exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('destination', 'name city').sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('destination', 'name city');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRestaurant = async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Restaurant deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Budget Rules Management
exports.getBudgetRules = async (req, res) => {
  try {
    const rules = await BudgetRule.find();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createBudgetRule = async (req, res) => {
  try {
    const rule = new BudgetRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateBudgetRule = async (req, res) => {
  try {
    const rule = await BudgetRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) {
      return res.status(404).json({ message: 'Budget rule not found' });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteBudgetRule = async (req, res) => {
  try {
    await BudgetRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Budget rule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Analytics
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalDestinations = await Destination.countDocuments();
    const popularDestinations = await Destination.countDocuments({ isPopular: true });
    const totalBudgets = await Budget.countDocuments();
    const totalConversations = await BuddyBotConversation.countDocuments();

    // Popular destinations
    const topDestinations = await Budget.aggregate([
      { $group: { _id: '$destination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Budget trends
    const budgetTrends = await Budget.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      destinations: {
        total: totalDestinations,
        popular: popularDestinations
      },
      budgets: {
        total: totalBudgets
      },
      conversations: {
        total: totalConversations
      },
      topDestinations,
      budgetTrends
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to fetch hotels for a destination
async function fetchHotelsForDestination(destination, lat, lng, apiKey) {
  try {
    // Check if hotels already exist
    const existingHotels = await Hotel.find({ destination: destination._id });
    if (existingHotels.length > 0) {
      return 0; // Hotels already exist
    }

    // Search for hotels
    const searchQuery = `hotels in ${destination.name}, Pakistan`;
    
    const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: searchQuery,
        key: apiKey,
        type: 'lodging',
        location: `${lat},${lng}`,
        radius: 50000
      },
      timeout: 10000
    });

    if (placesResponse.data.status !== 'OK' || !placesResponse.data.results) {
      return 0;
    }

    const places = placesResponse.data.results.slice(0, 5); // Top 5 hotels
    let added = 0;

    for (const place of places) {
      try {
        // Get detailed information
        const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            key: apiKey,
            fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,photos,geometry'
          },
          timeout: 10000
        });

        if (detailsResponse.data.status !== 'OK' || !detailsResponse.data.result) {
          continue;
        }

        const details = detailsResponse.data.result;

        // Check if hotel already exists
        const existingHotel = await Hotel.findOne({
          name: details.name,
          address: details.formatted_address || place.formatted_address
        });

        if (existingHotel) {
          continue;
        }

        // Get images
        const images = [];
        if (details.photos && details.photos.length > 0) {
          details.photos.slice(0, 3).forEach(photo => {
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
            images.push(photoUrl);
          });
        }

        // Create hotel
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
          email: null,
          bookingLink: details.website || null,
          description: `Hotel in ${destination.name}, ${destination.city}`,
          images: images,
          amenities: ['WiFi', 'Parking'],
          priceRange: {
            min: details.price_level ? (details.price_level * 20) : null,
            max: details.price_level ? (details.price_level * 50) : null,
            currency: 'PKR'
          }
        };

        const hotel = new Hotel(hotelData);
        await hotel.save();
        added++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing hotel:`, error.message);
      }
    }

    return added;

  } catch (error) {
    console.error(`Error fetching hotels for ${destination.name}:`, error.message);
    return 0;
  }
}

// Auto-fetch locations and hotels from Google Places API
exports.autoFetchLocationsAndHotels = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return res.status(400).json({ 
        message: 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY to .env file.' 
      });
    }

    const { destinationId } = req.body;
    let totalDestinationsAdded = 0;
    let totalHotelsAdded = 0;
    const results = [];

    // If specific destination is selected, only fetch hotels for that destination
    if (destinationId) {
      const destination = await Destination.findById(destinationId);
      if (!destination) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      if (!destination.coordinates || !destination.coordinates.lat || !destination.coordinates.lng) {
        return res.status(400).json({ message: 'Destination does not have valid coordinates' });
      }

      const { lat, lng } = destination.coordinates;
      const hotelsAdded = await fetchHotelsForDestination(destination, lat, lng, apiKey);
      totalHotelsAdded = hotelsAdded;

      return res.json({
        success: true,
        message: `Hotels fetched successfully for ${destination.name}! Added ${hotelsAdded} hotels.`,
        totalDestinationsAdded: 0,
        totalHotelsAdded: hotelsAdded,
        results: [{
          destination: destination.name,
          status: 'success',
          message: `Added ${hotelsAdded} hotels`
        }]
      });
    }

    // Pakistan Northern Regions to search (only if no specific destination)
    const searchQueries = [
      'tourist places in Hunza Valley Pakistan',
      'tourist places in Skardu Pakistan',
      'tourist places in Swat Valley Pakistan',
      'tourist places in Naran Kaghan Pakistan',
      'tourist places in Murree Pakistan',
      'tourist places in Gilgit Pakistan',
      'tourist places in Chitral Pakistan',
      'tourist places in Fairy Meadows Pakistan',
      'tourist places in Shogran Pakistan',
      'tourist places in Malam Jabba Pakistan',
      'tourist places in Kalash Valley Pakistan',
      'tourist places in Neelum Valley Pakistan',
      'tourist places in Azad Kashmir Pakistan',
      'tourist places in Abbottabad Pakistan',
      'tourist places in Ayubia Pakistan'
    ];

    // Variables already declared above (lines 414-416), no need to redeclare

    // Step 1: Fetch destinations from Google Places API
    for (const query of searchQueries) {
      try {
        console.log(`🔍 Searching for: ${query}`);
        
        const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: {
            query: query,
            key: apiKey,
            type: 'tourist_attraction',
            location: '35.0,74.0', // Northern Pakistan approximate center
            radius: 200000 // 200km radius
          },
          timeout: 10000
        });

        if (placesResponse.data.status !== 'OK' || !placesResponse.data.results) {
          results.push({
            query: query,
            status: 'no_results',
            message: 'No places found'
          });
          continue;
        }

        const places = placesResponse.data.results.slice(0, 3); // Top 3 places per query

        for (const place of places) {
          try {
            // Get detailed information
            const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
              params: {
                place_id: place.place_id,
                key: apiKey,
                fields: 'name,formatted_address,geometry,photos,rating,types,formatted_phone_number,website'
              },
              timeout: 10000
            });

            if (detailsResponse.data.status !== 'OK' || !detailsResponse.data.result) {
              continue;
            }

            const details = detailsResponse.data.result;
            const locationName = details.name;
            const city = details.formatted_address?.split(',')[0] || 'Unknown';
            
            // Check if destination already exists
            const existingDest = await Destination.findOne({
              name: { $regex: new RegExp(`^${locationName}$`, 'i') }
            });

            if (existingDest) {
              // Destination exists, now fetch hotels for it
              const { lat, lng } = existingDest.coordinates;
              const hotelsAdded = await fetchHotelsForDestination(existingDest, lat, lng, apiKey);
              totalHotelsAdded += hotelsAdded;
              continue;
            }

            // Get images
            const images = [];
            if (details.photos && details.photos.length > 0) {
              details.photos.slice(0, 3).forEach(photo => {
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${apiKey}`;
                images.push(photoUrl);
              });
            }

            // Determine category based on types or name
            let category = 'Northern Areas';
            if (locationName.toLowerCase().includes('valley')) category = 'Valleys';
            else if (locationName.toLowerCase().includes('lake')) category = 'Lakes';
            else if (locationName.toLowerCase().includes('hill') || locationName.toLowerCase().includes('station')) category = 'Hill Stations';
            else if (locationName.toLowerCase().includes('mountain')) category = 'Mountains';

            // Create destination
            const destData = {
              name: locationName,
              city: city,
              country: 'Pakistan',
              description: `Beautiful tourist destination in ${city}, Pakistan. ${details.formatted_address || ''}`,
              coordinates: {
                lat: details.geometry?.location?.lat || place.geometry?.location?.lat,
                lng: details.geometry?.location?.lng || place.geometry?.location?.lng
              },
              images: images,
              category: category,
              isPopular: true,
              bestSeason: 'summer',
              rating: details.rating || 0
            };

            const destination = new Destination(destData);
            await destination.save();
            totalDestinationsAdded++;

            // Step 2: Fetch hotels for this new destination
            const { lat, lng } = destination.coordinates;
            const hotelsAdded = await fetchHotelsForDestination(destination, lat, lng, apiKey);
            totalHotelsAdded += hotelsAdded;

            results.push({
              destination: locationName,
              status: 'success',
              message: `Added destination and ${hotelsAdded} hotels`
            });

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.error(`Error processing place:`, error.message);
          }
        }

        // Delay between queries
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          query: query,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Auto-fetch complete! Added ${totalDestinationsAdded} destinations and ${totalHotelsAdded} hotels.`,
      totalDestinationsAdded,
      totalHotelsAdded,
      results: results
    });

  } catch (error) {
    console.error('Error auto-fetching locations and hotels:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch hotels from Google Places API for all destinations
exports.fetchHotelsFromGoogle = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return res.status(400).json({ 
        message: 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY to .env file.' 
      });
    }

    // Get all destinations with coordinates
    const destinations = await Destination.find({
      coordinates: { $exists: true, $ne: null },
      'coordinates.lat': { $exists: true },
      'coordinates.lng': { $exists: true }
    });

    let totalHotelsAdded = 0;
    let totalHotelsSkipped = 0;
    const results = [];

    for (const destination of destinations) {
      const { lat, lng } = destination.coordinates;
      
      // Check if hotels already exist for this destination
      const existingHotels = await Hotel.find({ destination: destination._id });
      if (existingHotels.length > 0) {
        results.push({
          destination: destination.name,
          status: 'skipped',
          message: `${existingHotels.length} hotels already exist`
        });
        totalHotelsSkipped += existingHotels.length;
        continue;
      }

      try {
        // Use Google Places API Text Search
        const searchQuery = `hotels in ${destination.name}, Pakistan`;
        
        const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: {
            query: searchQuery,
            key: apiKey,
            type: 'lodging',
            location: `${lat},${lng}`,
            radius: 50000
          },
          timeout: 10000
        });

        if (placesResponse.data.status !== 'OK' || !placesResponse.data.results) {
          results.push({
            destination: destination.name,
            status: 'no_results',
            message: 'No hotels found'
          });
          continue;
        }

        const places = placesResponse.data.results.slice(0, 5); // Top 5 hotels
        let added = 0;

        for (const place of places) {
          try {
            // Get detailed information
            const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
              params: {
                place_id: place.place_id,
                key: apiKey,
                fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,photos,geometry'
              },
              timeout: 10000
            });

            if (detailsResponse.data.status !== 'OK' || !detailsResponse.data.result) {
              continue;
            }

            const details = detailsResponse.data.result;

            // Check if hotel already exists
            const existingHotel = await Hotel.findOne({
              name: details.name,
              address: details.formatted_address || place.formatted_address
            });

            if (existingHotel) {
              continue;
            }

            // Get images
            const images = [];
            if (details.photos && details.photos.length > 0) {
              details.photos.slice(0, 3).forEach(photo => {
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
                images.push(photoUrl);
              });
            }

            // Create hotel
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
              email: null,
              bookingLink: details.website || null,
              description: `Hotel in ${destination.name}, ${destination.city}`,
              images: images,
              amenities: ['WiFi', 'Parking'],
              priceRange: {
                min: details.price_level ? (details.price_level * 20) : null,
                max: details.price_level ? (details.price_level * 50) : null,
                currency: 'PKR'
              }
            };

            const hotel = new Hotel(hotelData);
            await hotel.save();
            added++;
            totalHotelsAdded++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`Error processing hotel:`, error.message);
          }
        }

        results.push({
          destination: destination.name,
          status: 'success',
          message: `Added ${added} hotels`
        });

        // Delay between destinations
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({
          destination: destination.name,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Process complete! Added ${totalHotelsAdded} hotels, skipped ${totalHotelsSkipped} existing hotels.`,
      totalAdded: totalHotelsAdded,
      totalSkipped: totalHotelsSkipped,
      results: results
    });

  } catch (error) {
    console.error('Error fetching hotels from Google:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==================== API KEY MANAGEMENT ====================

// Get all API keys
exports.getApiKeys = async (req, res) => {
  try {
    const apiKeys = await ApiKey.find().sort({ createdAt: -1 });
    // Mask API keys for security (show only last 4 characters)
    const maskedKeys = apiKeys.map(key => ({
      ...key.toObject(),
      apiKey: key.apiKey ? `****${key.apiKey.slice(-4)}` : 'Not set'
    }));
    
    // Disable caching for this endpoint
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log(`✅ Returning ${maskedKeys.length} API keys`);
    res.json(maskedKeys);
  } catch (error) {
    console.error('❌ Error fetching API keys:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get API key by ID
exports.getApiKeyById = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    // Mask the key
    const maskedKey = {
      ...apiKey.toObject(),
      apiKey: apiKey.apiKey ? `****${apiKey.apiKey.slice(-4)}` : 'Not set'
    };
    res.json(maskedKey);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new API key
exports.createApiKey = async (req, res) => {
  try {
    const { name, apiKey, service, description, usedIn } = req.body;

    if (!name || !apiKey || !service) {
      return res.status(400).json({ message: 'Name, API key, and service are required' });
    }

    // Check if name already exists
    const existing = await ApiKey.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'API key with this name already exists' });
    }

    // Optional: Verify Gemini AI API key if service is Gemini AI
    if (service === 'Gemini AI') {
      try {
        const axios = require('axios');
        const testResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [{
              parts: [{ text: 'test' }]
            }]
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
            validateStatus: (status) => status < 500
          }
        );
        
        if (testResponse.status === 400 || testResponse.status === 401 || testResponse.status === 403) {
          return res.status(400).json({ 
            message: 'Invalid API key. Please check your Gemini AI API key.',
            error: testResponse.data?.error?.message || 'API key validation failed'
          });
        }
      } catch (verifyError) {
        // If verification fails with network error, still allow saving (might be network issue)
        if (verifyError.code !== 'ECONNABORTED' && verifyError.code !== 'ETIMEDOUT') {
          console.log('API key verification warning:', verifyError.message);
        }
      }
    }

    const newApiKey = new ApiKey({
      name,
      apiKey,
      service,
      description: description || '',
      usedIn: usedIn || []
    });

    await newApiKey.save();

    // Update .env file
    await updateEnvFile(name, apiKey);

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        ...newApiKey.toObject(),
        apiKey: `****${newApiKey.apiKey.slice(-4)}`
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update API key
exports.updateApiKey = async (req, res) => {
  try {
    const { name, apiKey, service, description, isActive } = req.body;
    const apiKeyId = req.params.id;

    const existing = await ApiKey.findById(apiKeyId);
    if (!existing) {
      return res.status(404).json({ message: 'API key not found' });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== existing.name) {
      const nameExists = await ApiKey.findOne({ name, _id: { $ne: apiKeyId } });
      if (nameExists) {
        return res.status(400).json({ message: 'API key with this name already exists' });
      }
    }

    // Update fields
    if (name) existing.name = name;
    if (apiKey && apiKey.trim() !== '') {
      // Optional: Verify Gemini AI API key if service is Gemini AI
      if (existing.service === 'Gemini AI' || service === 'Gemini AI') {
        try {
          const axios = require('axios');
          const testResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              contents: [{
                parts: [{ text: 'test' }]
              }]
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 5000,
              validateStatus: (status) => status < 500
            }
          );
          
          if (testResponse.status === 400 || testResponse.status === 401 || testResponse.status === 403) {
            return res.status(400).json({ 
              message: 'Invalid API key. Please check your Gemini AI API key.',
              error: testResponse.data?.error?.message || 'API key validation failed'
            });
          }
        } catch (verifyError) {
          // If verification fails with network error, still allow saving (might be network issue)
          if (verifyError.code !== 'ECONNABORTED' && verifyError.code !== 'ETIMEDOUT') {
            console.log('API key verification warning:', verifyError.message);
          }
        }
      }
      
      existing.apiKey = apiKey;
      // Update .env file
      await updateEnvFile(existing.name, apiKey);
    }
    if (service) existing.service = service;
    if (description !== undefined) existing.description = description;
    if (isActive !== undefined) existing.isActive = isActive;

    existing.updatedAt = Date.now();
    await existing.save();

    res.json({
      message: 'API key updated successfully',
      apiKey: {
        ...existing.toObject(),
        apiKey: `****${existing.apiKey.slice(-4)}`
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete API key
exports.deleteApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    await ApiKey.findByIdAndDelete(req.params.id);

    // Remove from .env file
    await removeFromEnvFile(apiKey.name);

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to update .env file
async function updateEnvFile(name, apiKeyValue) {
  try {
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Map API key names to .env variable names
    const envVarMap = {
      'Google Maps API Key': 'GOOGLE_MAPS_API_KEY',
      'OpenWeatherMap API Key': 'WEATHER_API_KEY',
      'Gemini AI API Key': 'AI_API_KEY',
      'OpenTripMap API Key': 'OPENTRIPMAP_API_KEY'
    };

    const envVarName = envVarMap[name] || name.toUpperCase().replace(/\s+/g, '_');

    // Update or add the variable
    const lines = envContent.split('\n');
    let found = false;
    const updatedLines = lines.map(line => {
      if (line.startsWith(`${envVarName}=`)) {
        found = true;
        return `${envVarName}=${apiKeyValue}`;
      }
      return line;
    });

    if (!found) {
      updatedLines.push(`${envVarName}=${apiKeyValue}`);
    }

    // Write back to .env file
    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
    
    // Update process.env immediately for this session
    process.env[envVarName] = apiKeyValue;
    
    console.log(`✅ Updated ${envVarName} in .env file and process.env`);
    console.log(`⚠️ Note: Server restart recommended for all services to use the new key`);
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    // Don't throw error, just log it
  }
}

// Helper function to remove from .env file
async function removeFromEnvFile(name) {
  try {
    const envPath = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) return;

    const envVarMap = {
      'Google Maps API Key': 'GOOGLE_MAPS_API_KEY',
      'OpenWeatherMap API Key': 'WEATHER_API_KEY',
      'Gemini AI API Key': 'AI_API_KEY',
      'OpenTripMap API Key': 'OPENTRIPMAP_API_KEY'
    };

    const envVarName = envVarMap[name] || name.toUpperCase().replace(/\s+/g, '_');

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    const updatedLines = lines.filter(line => !line.startsWith(`${envVarName}=`));

    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
  } catch (error) {
    console.error('Error removing from .env file:', error.message);
  }
}
