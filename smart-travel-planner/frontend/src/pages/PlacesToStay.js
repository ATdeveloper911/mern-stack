import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hotel, Utensils, MapPin, Star, 
  Phone, Mail, CheckCircle, Search, 
  ArrowRight, X 
} from 'lucide-react';
import api from '../utils/api';
import './PlacesToStay.css';

const PlacesToStay = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hotels'); // 'hotels' or 'restaurants'
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hotelsRes, restaurantsRes] = await Promise.all([
        api.get('/places-to-stay/hotels'),
        api.get('/places-to-stay/restaurants')
      ]);
      setHotels(hotelsRes.data || []);
      setRestaurants(restaurantsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = (items) => {
    if (!searchQuery) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // --- DETAIL VIEW: HOTEL ---
  if (selectedHotel) {
    return (
      <div className="pts-page detail-mode">
        <div className="pts-overlay" />
        <div className="pts-shell">
          
          {/* Detail Header / Navigation */}
          <div className="pts-detail-header-bar">
            <button onClick={() => setSelectedHotel(null)} className="pts-back-pill">
              <ArrowLeft size={18} /> Back to Places to Stay
            </button>
          </div>

          <div className="pts-detail-card">
            {/* Hero Image Section */}
            <div className="pts-detail-hero" style={{ 
              backgroundImage: `url(${selectedHotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'})`
            }}>
              <div className="pts-hero-gradient">
                <h1>{selectedHotel.name}</h1>
                <div className="pts-hero-meta">
                  <span className="pts-rating-badge"><Star size={16} fill="currentColor" /> {selectedHotel.rating || 'N/A'}</span>
                  <span className="pts-location"><MapPin size={16} /> {selectedHotel.address}</span>
                </div>
              </div>
            </div>

            <div className="pts-detail-content">
              {/* Left Column: Info */}
              <div className="pts-main-info">
                <div className="pts-section">
                  <h3>About this stay</h3>
                  <p>{selectedHotel.description || "Experience comfort and luxury in the heart of the city."}</p>
                </div>

                {selectedHotel.amenities && selectedHotel.amenities.length > 0 && (
                  <div className="pts-section">
                    <h3>Amenities</h3>
                    <div className="pts-amenities-grid">
                      {selectedHotel.amenities.map((amenity, idx) => (
                        <div key={idx} className="pts-amenity-item">
                          <CheckCircle size={16} className="pts-check-icon" />
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery */}
                {selectedHotel.images && selectedHotel.images.length > 1 && (
                  <div className="pts-section">
                    <h3>Gallery</h3>
                    <div className="pts-gallery">
                      {selectedHotel.images.slice(1, 4).map((img, idx) => (
                        <img key={idx} src={img} alt={`Room ${idx + 1}`} className="pts-gallery-img" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Sidebar */}
              <div className="pts-sidebar">
                <div className="pts-booking-card">
                  <div className="pts-price-tag">
                    <span className="pts-label">Price Range</span>
                    <div className="pts-price-val">
                      {selectedHotel.priceRange ? 
                        `PKR ${selectedHotel.priceRange.min} - ${selectedHotel.priceRange.max}` : 
                        'Contact for rates'}
                    </div>
                  </div>

                  <div className="pts-contact-list">
                    {selectedHotel.contactNumber && (
                      <div className="pts-contact-item">
                        <Phone size={16} /> {selectedHotel.contactNumber}
                      </div>
                    )}
                    {selectedHotel.email && (
                      <div className="pts-contact-item">
                        <Mail size={16} /> {selectedHotel.email}
                      </div>
                    )}
                  </div>

                  {selectedHotel.bookingLink ? (
                    <a href={selectedHotel.bookingLink} target="_blank" rel="noreferrer" className="pts-action-btn primary">
                      Book Now <ArrowRight size={16} />
                    </a>
                  ) : (
                    <button className="pts-action-btn primary">Call to Book</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DETAIL VIEW: RESTAURANT ---
  if (selectedRestaurant) {
    return (
      <div className="pts-page detail-mode">
        <div className="pts-overlay" />
        <div className="pts-shell">
          
          {/* Detail Header / Navigation */}
          <div className="pts-detail-header-bar">
            <button onClick={() => setSelectedRestaurant(null)} className="pts-back-pill">
              <ArrowLeft size={18} /> Back to Places to Stay
            </button>
          </div>

          <div className="pts-detail-card">
            <div className="pts-detail-hero" style={{ 
              backgroundImage: `url(${selectedRestaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200'})`
            }}>
              <div className="pts-hero-gradient">
                <h1>{selectedRestaurant.name}</h1>
                <div className="pts-hero-meta">
                  <span className="pts-rating-badge"><Star size={16} fill="currentColor" /> {selectedRestaurant.rating || 'N/A'}</span>
                  <span className="pts-location"><MapPin size={16} /> {selectedRestaurant.address}</span>
                </div>
              </div>
            </div>

            <div className="pts-detail-content">
              <div className="pts-main-info">
                <div className="pts-section">
                  <h3>About the dining</h3>
                  <p>{selectedRestaurant.description || "Delicious flavors waiting for you."}</p>
                </div>

                {selectedRestaurant.cuisine && selectedRestaurant.cuisine.length > 0 && (
                  <div className="pts-section">
                    <h3>Cuisines</h3>
                    <div className="pts-tags-cloud">
                      {selectedRestaurant.cuisine.map((c, i) => (
                        <span key={i} className="pts-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pts-sidebar">
                <div className="pts-booking-card">
                  <div className="pts-price-tag">
                    <span className="pts-label">Price Range</span>
                    <div className="pts-price-val">
                      {selectedRestaurant.priceRange ? 
                        `PKR ${selectedRestaurant.priceRange.min} - ${selectedRestaurant.priceRange.max}` : 
                        'Menu Pricing'}
                    </div>
                  </div>

                  <div className="pts-contact-list">
                    {selectedRestaurant.contactNumber && (
                      <div className="pts-contact-item">
                        <Phone size={16} /> {selectedRestaurant.contactNumber}
                      </div>
                    )}
                  </div>
                  
                  {selectedRestaurant.bookingLink ? (
                    <a href={selectedRestaurant.bookingLink} target="_blank" rel="noreferrer" className="pts-action-btn primary">
                      Reserve Table <Utensils size={16} />
                    </a>
                  ) : (
                    <button className="pts-action-btn primary">Call for Reservation</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="pts-page">
      <div className="pts-overlay" />
      <div className="pts-shell">
        
        {/* Header */}
        <header className="pts-header">
          <button onClick={() => navigate('/dashboard')} className="pts-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="pts-header-content">
            <h1>Places to Stay & Eat</h1>
            <p>Curated accommodations and dining experiences.</p>
          </div>
        </header>

        {/* Tabs & Search */}
        <div className="pts-controls">
          <div className="pts-tabs">
            <button 
              className={`pts-tab ${activeTab === 'hotels' ? 'active' : ''}`}
              onClick={() => setActiveTab('hotels')}
            >
              <Hotel size={18} /> Hotels
            </button>
            <button 
              className={`pts-tab ${activeTab === 'restaurants' ? 'active' : ''}`}
              onClick={() => setActiveTab('restaurants')}
            >
              <Utensils size={18} /> Restaurants
            </button>
          </div>

          <div className="pts-search">
            <Search className="pts-search-icon" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="pts-grid-section">
          {loading ? (
            <div className="pts-loading">Loading amazing places...</div>
          ) : (
            <>
              {activeTab === 'hotels' && (
                <div className="pts-grid">
                  {filteredItems(hotels).length > 0 ? filteredItems(hotels).map(hotel => (
                    <div key={hotel._id} className="pts-card" onClick={() => setSelectedHotel(hotel)}>
                      <div className="pts-card-img">
                        <img src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'} alt={hotel.name} />
                        <span className="pts-card-rating"><Star size={12} fill="currentColor"/> {hotel.rating}</span>
                      </div>
                      <div className="pts-card-body">
                        <h3>{hotel.name}</h3>
                        <p className="pts-card-loc"><MapPin size={14}/> {hotel.address}</p>
                        <div className="pts-card-features">
                          {hotel.amenities?.slice(0, 3).map((a, i) => (
                            <span key={i}>{a}</span>
                          ))}
                          {hotel.amenities?.length > 3 && <span>+{hotel.amenities.length - 3}</span>}
                        </div>
                        <div className="pts-card-footer">
                          <span className="pts-card-price">
                            {hotel.priceRange ? `PKR ${hotel.priceRange.min}+` : 'View Rates'}
                          </span>
                          <span className="pts-view-link">Details <ArrowRight size={14} /></span>
                        </div>
                      </div>
                    </div>
                  )) : <div className="pts-empty">No hotels found matching your search.</div>}
                </div>
              )}

              {activeTab === 'restaurants' && (
                <div className="pts-grid">
                  {filteredItems(restaurants).length > 0 ? filteredItems(restaurants).map(rest => (
                    <div key={rest._id} className="pts-card" onClick={() => setSelectedRestaurant(rest)}>
                      <div className="pts-card-img">
                        <img src={rest.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'} alt={rest.name} />
                        <span className="pts-card-rating"><Star size={12} fill="currentColor"/> {rest.rating}</span>
                      </div>
                      <div className="pts-card-body">
                        <h3>{rest.name}</h3>
                        <p className="pts-card-loc"><MapPin size={14}/> {rest.address}</p>
                        <div className="pts-card-features">
                          {rest.cuisine?.slice(0, 3).map((c, i) => (
                            <span key={i}>{c}</span>
                          ))}
                        </div>
                        <div className="pts-card-footer">
                          <span className="pts-card-price">
                            {rest.priceRange ? `PKR ${rest.priceRange.min}-${rest.priceRange.max}` : 'Menu Price'}
                          </span>
                          <span className="pts-view-link">View Menu <ArrowRight size={14} /></span>
                        </div>
                      </div>
                    </div>
                  )) : <div className="pts-empty">No restaurants found matching your search.</div>}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default PlacesToStay;