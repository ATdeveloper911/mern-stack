import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Search, Cloud, Wind, Droplets, Thermometer, 
  Sun, Eye, Navigation, CloudRain, Umbrella, Shirt, Car, 
  Sparkles, Sunrise, Sunset, Gauge, CloudSun, // <--- Added CloudSun here
  CloudSnow, CloudLightning, Bot
} from 'lucide-react';
import api from '../utils/api';
import './Weather.css';

const Weather = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDestinations();
    const destParam = searchParams.get('destination');
    if (destParam) {
      setSelectedDestination(destParam);
      fetchWeather(destParam);
    }
  }, []);

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/travel-hub');
      if (response.data && Array.isArray(response.data)) {
        setDestinations(response.data);
        setFilteredDestinations(response.data);
      }
    } catch (error) {
      console.error('Error fetching destinations:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredDestinations(destinations);
    } else {
      const filtered = destinations.filter(dest =>
        dest.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDestinations(filtered);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchWeather(searchQuery);
      setSelectedDestination(searchQuery);
    }
  };

  const fetchWeather = async (destination) => {
    if (!destination) return;
    setLoading(true);
    setWeatherData(null);
    setForecast([]);
    setError(null);
    
    try {
      const response = await api.get(`/travel-hub/weather?destination=${encodeURIComponent(destination)}`);
      if (response.data?.current) {
        setWeatherData(response.data.current);
        setForecast(response.data.forecast || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Weather data unavailable.');
    } finally {
      setLoading(false);
    }
  };

 // --- EXPANDED AI LOGIC ---
  const getTravelTips = () => {
    if (!weatherData) return null;
    const temp = weatherData.temperature;
    const condition = (weatherData.condition || '').toLowerCase();
    const wind = parseFloat(weatherData.windSpeed) || 0;
    const humidity = parseFloat(weatherData.humidity) || 0;

    let tips = {
      clothing: 'Light comfortable clothes.',
      activity: 'Great for sightseeing.',
      travel: 'Roads look clear.',
      alert: null
    };

    // 1. Temperature & Clothing
    if (temp < 5) {
      tips.clothing = 'Thermals, heavy coat, gloves, and a beanie are a must.';
      tips.activity = 'Perfect weather for hot coffee and indoor museums.';
    } else if (temp < 15) {
      tips.clothing = 'Layer up! A warm jacket or sweater is recommended.';
      tips.activity = 'Great for brisk walks, but keep moving to stay warm.';
    } else if (temp > 30) {
      tips.clothing = 'Breathable fabrics (linen/cotton), sunglasses, and a hat.';
      tips.activity = 'Avoid midday sun. Best for evening strolls or water spots.';
    }

    // 2. Conditions & Travel
    if (condition.includes('rain') || condition.includes('drizzle')) {
      tips.clothing += ' Don’t forget a waterproof jacket or umbrella.';
      tips.travel = 'Roads may be slippery. Drive 20% slower than usual.';
      tips.alert = 'Wet conditions expected.';
    } else if (condition.includes('snow')) {
      tips.travel = '4x4 vehicle recommended. Watch for black ice.';
      tips.alert = 'Snowy conditions.';
    } else if (condition.includes('clear') || condition.includes('sunny')) {
      tips.travel = 'Perfect driving conditions. Enjoy the scenic route.';
    }

    // 3. Wind & Humidity
    if (wind > 20) {
      tips.clothing += ' A windbreaker is highly advised.';
      tips.activity = 'Avoid high-altitude trekking today.';
    }
    if (humidity > 80 && temp > 25) {
      tips.activity = 'It will feel sticky. Stay hydrated and seek AC.';
    }

    return tips;
  };

  const generateAIBriefing = () => {
    if (!weatherData) return '';
    const { temperature, feelsLike, condition } = weatherData;
    const desc = condition.toLowerCase();
    
    // Dynamic Greeting based on "Feels Like"
    let opening = "It's a pleasant day.";
    if (feelsLike < 10) opening = "Brrr! It's chilly out there.";
    else if (feelsLike > 30) opening = "It's getting hot!";
    else if (desc.includes('rain')) opening = "Keep your umbrella handy.";
    else if (desc.includes('clear')) opening = "What a beautiful day!";

    // Detailed Sentence
    let detail = `Currently <strong>${temperature}°C</strong> (feels like ${feelsLike}°C).`;
    
    if (desc.includes('cloud')) detail += " The sky is overcast, giving soft lighting for photos.";
    else if (desc.includes('sun') || desc.includes('clear')) detail += " Blue skies ahead—perfect for outdoor plans.";
    else if (desc.includes('rain')) detail += " Rain is falling, so plan for indoor activities.";

    return `${opening} ${detail}`;
  };

  // --- VISUALS: Dynamic Icon Switcher ---
  const getWeatherIcon = (condition) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={64} className="w-anim-rain" />;
    if (c.includes('snow')) return <CloudSnow size={64} className="w-anim-snow" />;
    if (c.includes('storm') || c.includes('thunder')) return <CloudLightning size={64} className="w-anim-storm" />;
    if (c.includes('cloud') || c.includes('overcast')) return <Cloud size={64} className="w-anim-float" />;
    if (c.includes('clear') || c.includes('sun')) return <Sun size={64} className="w-anim-spin" />;
    return <CloudSun size={64} />;
  };

  const tips = getTravelTips();

  return (
    <div className="weather-page">
      {/* Light Overlay for readability */}
      <div className="weather-overlay" />
      
      <div className="weather-shell">
        
        {/* Header */}
        <div className="w-header">
          <button onClick={() => navigate('/dashboard')} className="w-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="w-header-content">
            <h1>Smart Weather</h1>
            <p>AI-powered forecasts for your journey.</p>
          </div>
        </div>

        {/* Controls */}
        <div className="w-controls">
          <form onSubmit={handleSearchSubmit} className="w-search-form">
            <Search className="w-search-icon" size={20} />
            <input
              type="text"
              placeholder="Search city (e.g. Hunza, Lahore)..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-search-input"
            />
            <button type="submit" className="w-search-btn" disabled={loading}>
              {loading ? 'Scanning...' : 'Check'}
            </button>
          </form>
          
          <div className="w-divider"><span>OR</span></div>

          <select
            value={selectedDestination}
            onChange={(e) => {
              setSelectedDestination(e.target.value);
              fetchWeather(e.target.value);
            }}
            className="w-select"
            disabled={loading}
          >
            <option value="">Select Popular Destination</option>
            {destinations.map(dest => (
              <option key={dest._id} value={dest.name}>{dest.name}</option>
            ))}
          </select>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="w-error-card">
            <CloudRain size={32} />
            <div>
              <h3>Weather Unavailable</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* WEATHER CONTENT */}
        {weatherData && (
          <div className="w-content-grid">
            
            {/* 1. HERO CARD */}
            <div className="w-card w-hero">
              <div className="w-hero-top">
                <div>
                  <h2 className="w-city-name">{selectedDestination}</h2>
                  <p className="w-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="w-condition-pill">
                  {weatherData.condition}
                </div>
              </div>

              <div className="w-hero-main">
                <div className="w-temp-display">
                  {weatherData.temperature}°
                </div>
                <div className="w-hero-icon-wrapper">
                  {getWeatherIcon(weatherData.condition)}
                </div>
              </div>

              {/* Advanced Stats Row */}
              <div className="w-stats-row">
                <div className="w-stat-item">
                  <Wind size={18} className="w-icon-blue" />
                  <span>{weatherData.windSpeed} km/h</span>
                </div>
                <div className="w-stat-item">
                  <Droplets size={18} className="w-icon-aqua" />
                  <span>{weatherData.humidity}%</span>
                </div>
                <div className="w-stat-item">
                  <Thermometer size={18} className="w-icon-red" />
                  <span>Feels {weatherData.feelsLike}°</span>
                </div>
                <div className="w-stat-item">
                  <Eye size={18} className="w-icon-purple" />
                  <span>{weatherData.visibility} km</span>
                </div>
              </div>
            </div>

           {/* 2. ENHANCED AI CONCIERGE CARD */}
            <div className="w-card w-ai-card">
              <div className="w-ai-header">
                <div className="w-ai-avatar">
                  <Bot size={20} />
                </div>
                <div className="w-ai-title">
                  <h3>Travel Concierge</h3>
                  <span>AI Analysis & Tips</span>
                </div>
              </div>
              
              <div className="w-ai-briefing" dangerouslySetInnerHTML={{ __html: generateAIBriefing() }} />

              <div className="w-tips-grid">
                {/* Clothing Tip (Purple) */}
                <div className="w-tip-box tip-wear">
                  <div className="w-tip-icon-box icon-purple">
                    <Shirt size={20} />
                  </div>
                  <div className="w-tip-content">
                    <span>What to Wear</span>
                    <p>{tips?.clothing}</p>
                  </div>
                </div>

                {/* Activity Tip (Green) */}
                <div className="w-tip-box tip-do">
                  <div className="w-tip-icon-box icon-green">
                    <Navigation size={20} />
                  </div>
                  <div className="w-tip-content">
                    <span>Best Activity</span>
                    <p>{tips?.activity}</p>
                  </div>
                </div>

                {/* Travel Tip (Orange) */}
                <div className="w-tip-box tip-travel">
                  <div className="w-tip-icon-box icon-orange">
                    <Car size={20} />
                  </div>
                  <div className="w-tip-content">
                    <span>Road Conditions</span>
                    <p>{tips?.travel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SUN & ASTRO CARD (New) */}
            <div className="w-card w-astro-card">
              <h3>Daylight</h3>
              <div className="w-astro-row">
                <div className="w-astro-item">
                  <Sunrise size={24} className="w-icon-gold" />
                  <div>
                    <span className="w-label">Sunrise</span>
                    <span className="w-val">06:15 AM</span>
                  </div>
                </div>
                <div className="w-astro-item">
                  <Sunset size={24} className="w-icon-orange" />
                  <div>
                    <span className="w-label">Sunset</span>
                    <span className="w-val">05:45 PM</span>
                  </div>
                </div>
              </div>
              <div className="w-uv-box">
                <Gauge size={20} />
                <span>UV Index: <strong className="w-uv-val">Moderate (4)</strong></span>
              </div>
            </div>

            {/* 4. FORECAST ROW */}
            <div className="w-forecast-section">
              <h3>5-Day Forecast</h3>
              <div className="w-forecast-grid">
                {forecast.map((day, idx) => (
                  <div key={idx} className="w-forecast-card">
                    <span className="w-f-day">{day.day}</span>
                    <div className="w-f-icon-wrap">
                      {day.condition.toLowerCase().includes('sun') ? <Sun size={20} className="w-icon-gold"/> : <Cloud size={20} className="w-icon-blue"/>}
                    </div>
                    <span className="w-f-temp">{day.temp}°</span>
                    <span className="w-f-cond">{day.condition}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {!weatherData && !loading && !error && (
          <div className="w-empty-state">
            <CloudSun size={64} className="w-empty-icon w-anim-float" />
            <h3>Check Local Conditions</h3>
            <p>Plan your trip safely with real-time weather and AI insights.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Weather;