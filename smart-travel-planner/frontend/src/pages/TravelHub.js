import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, ArrowLeft, Thermometer, Hotel, Utensils, 
  Camera, History, Sparkles, Cloud, Calendar, CheckCircle, 
  Map, Info, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './TravelHub.css';

const TravelHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Data States
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [placesToVisit, setPlacesToVisit] = useState([]);
  
  // UI States
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [aiItinerary, setAiItinerary] = useState(null);
  const [bucketListSuccess, setBucketListSuccess] = useState(false);
  const [bucketListError, setBucketListError] = useState(null);

  useEffect(() => {
    fetchDestinations();
    const destId = searchParams.get('id');
    if (destId) {
      fetchDestinationDetails(destId);
    }
  }, [categoryFilter]);

  // Client-side search filtering
  useEffect(() => {
    if (search) {
      const lowerSearch = search.toLowerCase();
      const filtered = destinations.filter(dest =>
        dest.name.toLowerCase().includes(lowerSearch) ||
        dest.city.toLowerCase().includes(lowerSearch) ||
        dest.country.toLowerCase().includes(lowerSearch)
      );
      setFilteredDestinations(filtered);
    } else {
      setFilteredDestinations(destinations);
    }
  }, [search, destinations]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      let response;
      if (categoryFilter && categoryFilter !== 'all') {
        response = await api.get(`/travel-hub/category/${encodeURIComponent(categoryFilter)}`);
      } else {
        response = await api.get('/travel-hub');
      }
      setDestinations(response.data);
      setFilteredDestinations(response.data);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinationDetails = async (destId) => {
    try {
      setLoading(true);
      // Fetch core data + hotels + restaurants in parallel
      const [destRes, hotelsRes, restaurantsRes] = await Promise.all([
        api.get(`/travel-hub/${destId}`),
        api.get(`/places-to-stay/hotels?destination=${destId}`).catch(() => ({ data: [] })),
        api.get(`/places-to-stay/restaurants?destination=${destId}`).catch(() => ({ data: [] }))
      ]);

      const destination = destRes.data;
      setSelectedDestination(destination);
      
      // Fetch Weather
      if (destination.name) {
        api.get(`/travel-hub/weather?destination=${encodeURIComponent(destination.name)}`)
           .then(res => setWeatherData(res.data))
           .catch(() => console.log('Weather unavailable'));
      }

      setHotels(hotelsRes.data || []);
      setRestaurants(restaurantsRes.data || []);

      // Fetch Places to Visit (OpenTripMap)
      if (destination.coordinates?.lat && destination.coordinates?.lng) {
        fetchPlacesToVisit(destination.coordinates.lat, destination.coordinates.lng);
      }
    } catch (error) {
      console.error('Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacesToVisit = async (lat, lng) => {
    setLoadingPlaces(true);
    try {
      const response = await api.get(
        `/travel-hub/places-to-visit?lat=${lat}&lng=${lng}&radius=10000&limit=20&_t=${Date.now()}`
      );
      setPlacesToVisit(response.data || []);
    } catch (error) {
      console.error('Error places:', error);
      setPlacesToVisit([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const handleDestinationClick = (dest) => {
    fetchDestinationDetails(dest._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToBucketList = async () => {
    if (!selectedDestination) return;
    setBucketListSuccess(false);
    setBucketListError(null);
    
    try {
      const budgetData = {
        destination: selectedDestination.name,
        numberOfMembers: 1,
        days: 1,
        season: selectedDestination.bestSeason || 'summer',
        breakdown: { transportation: 0, accommodation: 0, food: 0, activities: 0, miscellaneous: 0 },
        total: 0,
        isBucketList: true
      };
      
      await api.post('/travel-fund', budgetData);
      setBucketListSuccess(true);
      setTimeout(() => setBucketListSuccess(false), 3000);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add to bucket list.';
      setBucketListError(msg);
      setTimeout(() => setBucketListError(null), 5000);
    }
  };

  const handleGenerateItinerary = async () => {
    if (!selectedDestination) return;
    setLoadingItinerary(true);
    setAiItinerary(null);
    try {
      const response = await api.post('/buddy-bot/message', {
        message: `Create a detailed 3-day itinerary for ${selectedDestination.name}, ${selectedDestination.city}, Pakistan. Include activities, food, and tips. Format with clear headings for Day 1, Day 2, Day 3.`
      });
      const text = response.data.response || response.data.message || response.data;
      setAiItinerary(text);
    } catch (error) {
      alert('Failed to generate itinerary. Please try again.');
    } finally {
      setLoadingItinerary(false);
    }
  };

  const popularDestinations = destinations.filter(d => d.isPopular);

  // --- DETAIL VIEW ---
  if (selectedDestination) {
    return (
      <div className="travel-hub">
        <div className="th-overlay" />
        <div className="th-shell">
          
          {/* Detail Header / Navigation */}
          <div className="th-detail-nav">
            <button onClick={() => setSelectedDestination(null)} className="th-back-btn">
              <ArrowLeft size={18} /> Back to Hub
            </button>
          </div>

          {/* Hero Banner for Destination */}
          <div className="th-detail-hero">
            <div className="th-hero-bg" style={{ 
              backgroundImage: `url(${selectedDestination.images?.[0] || 'https://images.unsplash.com/photo-1589802829985-817e51171b92'})`
            }} />
            <div className="th-hero-content">
              <div className="th-hero-badges">
                {selectedDestination.category && <span className="th-badge">{selectedDestination.category}</span>}
                {selectedDestination.bestSeason && <span className="th-badge th-badge-gold">{selectedDestination.bestSeason}</span>}
              </div>
              <h1 className="th-hero-title">{selectedDestination.name}</h1>
              <p className="th-hero-location">
                <MapPin size={18} /> {selectedDestination.city}, {selectedDestination.country}
              </p>
              {selectedDestination.tagline && <p className="th-hero-tagline">"{selectedDestination.tagline}"</p>}
            </div>
          </div>

          <div className="th-detail-grid">
            {/* Left Column: Info & Actions */}
            <div className="th-col-main">
              {/* About Section */}
              <div className="th-card th-about">
                <div className="th-card-header">
                  <Info className="th-icon-gold" />
                  <h2>About</h2>
                </div>
                <p className="th-text">{selectedDestination.description}</p>
                {selectedDestination.culture && (
                  <div className="th-culture-box">
                    <strong>Culture & Vibes:</strong> {selectedDestination.culture}
                  </div>
                )}
                
                <div className="th-actions-row">
                  <button onClick={handleAddToBucketList} className="th-btn th-btn-primary" disabled={bucketListSuccess}>
                    {bucketListSuccess ? <CheckCircle size={18} /> : <Sparkles size={18} />}
                    {bucketListSuccess ? 'Added to List!' : 'Add to Bucket List'}
                  </button>
                  <button onClick={() => navigate(`/weather?destination=${encodeURIComponent(selectedDestination.name)}`)} className="th-btn th-btn-outline">
                    <Thermometer size={18} /> Check Weather
                  </button>
                </div>
                {bucketListError && <div className="th-error-msg">{bucketListError}</div>}
              </div>

              {/* Places to Visit */}
              {placesToVisit.length > 0 && (
                <div className="th-card">
                  <div className="th-card-header">
                    <Camera className="th-icon-gold" />
                    <h2>Places to Visit</h2>
                  </div>
                  <div className="th-places-list">
                    {placesToVisit.map((place, idx) => (
                      <div key={idx} className="th-place-item">
                        {place.image && <img src={place.image} alt={place.name} className="th-place-img" />}
                        <div className="th-place-info">
                          <h4>{place.name}</h4>
                          <p className="th-text-sm">{place.kinds?.slice(0,3).join(', ').replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itinerary Section */}
              <div className="th-card">
                <div className="th-card-header">
                  <Calendar className="th-icon-gold" />
                  <h2>Itinerary</h2>
                </div>
                
                {!aiItinerary && (
                  <div className="th-ai-prompt">
                    <p>Need a plan? Let our AI build a custom schedule for you.</p>
                    <button onClick={handleGenerateItinerary} className="th-btn th-btn-ai" disabled={loadingItinerary}>
                      {loadingItinerary ? 'Generating...' : '✨ Generate AI Itinerary'}
                    </button>
                  </div>
                )}

                {aiItinerary && (
                  <div className="th-itinerary-result">
                    <button onClick={() => setAiItinerary(null)} className="th-close-ai"><X size={14}/></button>
                    <div className="th-markdown">
                      {typeof aiItinerary === 'string' ? aiItinerary.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      )) : <p>{String(aiItinerary)}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sidebar (Weather, Hotels, Food) */}
            <div className="th-col-side">
              
              {/* Weather Widget */}
              {weatherData && (
                <div className="th-card th-weather-widget">
                  <div className="th-weather-main">
                    <div className="th-temp">{weatherData.current?.temperature}°</div>
                    <div className="th-cond">
                      <Cloud size={24} /> {weatherData.current?.condition}
                    </div>
                  </div>
                  <div className="th-weather-grid">
                    <div><span>Humidity</span><strong>{weatherData.current?.humidity}%</strong></div>
                    <div><span>Wind</span><strong>{weatherData.current?.windSpeed} km/h</strong></div>
                  </div>
                </div>
              )}

              {/* Hotels */}
              <div className="th-card">
                <div className="th-card-header">
                  <Hotel className="th-icon-gold" />
                  <h3>Stay</h3>
                </div>
                {hotels.length > 0 ? (
                  <div className="th-mini-list">
                    {hotels.slice(0, 3).map(h => (
                      <div key={h._id} className="th-mini-item">
                        <img src={h.images?.[0] || '/placeholder.jpg'} alt={h.name} />
                        <div>
                          <h4>{h.name}</h4>
                          <span>⭐ {h.rating || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => navigate('/places-to-stay')} className="th-link-btn">View All Hotels</button>
                  </div>
                ) : <p className="th-text-muted">No hotels found.</p>}
              </div>

              {/* Food */}
              <div className="th-card">
                <div className="th-card-header">
                  <Utensils className="th-icon-gold" />
                  <h3>Food</h3>
                </div>
                {selectedDestination.famousFood?.length > 0 ? (
                  <div className="th-tags-cloud">
                    {selectedDestination.famousFood.map((f, i) => (
                      <span key={i} className="th-tag">{f.name}</span>
                    ))}
                  </div>
                ) : <p className="th-text-muted">No famous food listed.</p>}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN HUB VIEW ---
  return (
    <div className="travel-hub">
      <div className="th-overlay" />
      <div className="th-shell">
        
        {/* Header */}
        <div className="th-header">
          <button onClick={() => navigate('/dashboard')} className="th-back-link">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="th-header-content">
            <h1>Travel Hub</h1>
            <p>Discover the unseen beauty of Pakistan.</p>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="th-controls">
          <div className="th-search-wrapper">
            <Search className="th-search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search destinations, cities..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="th-search-input"
            />
          </div>

          <div className="th-categories">
            {['all', 'Mountains', 'Valleys', 'Lakes', 'Historical', 'Cities', 'Beaches'].map(cat => (
              <button 
                key={cat}
                className={`th-cat-btn ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Section */}
        {popularDestinations.length > 0 && !search && categoryFilter === 'all' && (
          <div className="th-section">
            <h2 className="th-section-title"><Sparkles size={20} className="th-icon-gold"/> Popular Now</h2>
            <div className="th-grid-popular">
              {popularDestinations.slice(0, 4).map(dest => (
                <div key={dest._id} className="th-pop-card" onClick={() => handleDestinationClick(dest)}>
                  <div className="th-pop-img" style={{ backgroundImage: `url(${dest.images?.[0]})` }} />
                  <div className="th-pop-content">
                    <h3>{dest.name}</h3>
                    <p>{dest.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Destinations Grid */}
        <div className="th-section">
          <h2 className="th-section-title"><Map size={20} className="th-icon-gold"/> Explore Destinations</h2>
          
          {loading ? (
            <div className="th-loading">Loading amazing places...</div>
          ) : (
            <div className="th-grid">
              {filteredDestinations.map(dest => (
                <div key={dest._id} className="th-card-dest" onClick={() => handleDestinationClick(dest)}>
                  <div className="th-card-img">
                    {dest.images?.[0] ? (
                      <img src={dest.images[0]} alt={dest.name} />
                    ) : (
                      <div className="th-img-placeholder"><Camera size={32}/></div>
                    )}
                    <span className="th-card-cat">{dest.category}</span>
                  </div>
                  <div className="th-card-body">
                    <h3>{dest.name}</h3>
                    <p className="th-card-loc"><MapPin size={14}/> {dest.city}, {dest.country}</p>
                    <p className="th-card-desc">{dest.description?.substring(0, 60)}...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && filteredDestinations.length === 0 && (
            <div className="th-empty">No destinations found. Try a different search.</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TravelHub;