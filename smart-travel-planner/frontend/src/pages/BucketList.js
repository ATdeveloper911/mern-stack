import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, MapPin, Star, Hotel, Plane, 
  Tent, Calendar, Loader, PlusCircle, ExternalLink 
} from 'lucide-react';
import api from '../utils/api';
import './BucketList.css';

// Premium Fallback Images (Guaranteed to load)
const FALLBACK_DEST = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"; // Scenic Mountains
const FALLBACK_HOTEL = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"; // Luxury Resort

const BucketList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('destinations');
  const [destinations, setDestinations] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [tripPlans, setTripPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Bucket List Destinations
      const bucketResponse = await api.get('/travel-fund/bucket-list');
      const bucketItems = bucketResponse.data || [];
      
      // Enhance with details
      const destinationsWithDetails = await Promise.all(
        bucketItems.map(async (item) => {
          try {
            const destResponse = await api.get(`/travel-hub?search=${encodeURIComponent(item.destination)}`);
            if (destResponse.data && destResponse.data.length > 0) {
              const destDetails = destResponse.data[0];
              return {
                ...item,
                description: destDetails.description,
                location: `${destDetails.city || ''}, ${destDetails.country || 'Pakistan'}`.trim(),
                tags: destDetails.famousFor || (destDetails.category ? [destDetails.category] : ['Adventure', 'Nature']),
                rating: destDetails.rating || 4.5,
                image: destDetails.images?.[0] || null
              };
            }
          } catch (err) {
            console.log(`Could not fetch details for ${item.destination}`);
          }
          return {
            ...item,
            description: 'A beautiful destination waiting to be explored.',
            location: `${item.destination}, Pakistan`,
            tags: ['Adventure', 'Nature'],
            rating: 4.5,
            image: null
          };
        })
      );
      setDestinations(destinationsWithDetails);
      
      // 2. Fetch Accommodations
      try {
        const hotelsResponse = await api.get('/places-to-stay/hotels');
        setAccommodations((hotelsResponse.data || []).slice(0, 5)); 
      } catch (err) {
        setAccommodations([]);
      }
      
      // 3. Fetch Trip Plans
      try {
        const budgetsResponse = await api.get('/travel-fund');
        const plans = (budgetsResponse.data || []).filter(b => !b.isBucketList);
        setTripPlans(plans);
      } catch (err) {
        setTripPlans([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type, e) => {
    e.stopPropagation(); // Stop click from triggering card navigation
    if (window.confirm(`Remove this item from your bucket list?`)) {
      try {
        if (type === 'destination' || type === 'trip') {
          await api.delete(`/travel-fund/${id}`);
        } else if (type === 'accommodation') {
          await api.delete(`/places-to-stay/${id}`);
        }
        fetchData(); // Refresh list
      } catch (error) {
        alert('Failed to remove item.');
      }
    }
  };

  // RENDERERS
  const renderDestinationCard = (item) => (
    <div key={item._id} className="bl-card">
      <div 
        className="bl-card-image" 
        style={{ backgroundImage: `url(${item.image || FALLBACK_DEST})` }}
      >
        <button 
          onClick={(e) => handleDelete(item._id, 'destination', e)} 
          className="bl-delete-btn"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
        <span className="bl-badge">Dream Destination</span>
      </div>
      
      <div className="bl-card-content">
        <div className="bl-card-header">
          <h3>{item.destination}</h3>
          <div className="bl-rating">
            <Star size={14} className="bl-star filled" />
            <span>{item.rating}</span>
          </div>
        </div>
        
        <div className="bl-location">
          <MapPin size={14} />
          {item.location}
        </div>
        
        <p className="bl-desc">{item.description?.substring(0, 80)}...</p>
        
        <div className="bl-tags">
          {item.tags?.slice(0, 2).map((tag, i) => (
            <span key={i} className="bl-tag">{tag}</span>
          ))}
        </div>

        <button 
          onClick={() => navigate(`/money-map?destination=${encodeURIComponent(item.destination)}`)}
          className="bl-action-btn"
        >
          <PlusCircle size={16} /> Plan This Trip
        </button>
      </div>
    </div>
  );

  const renderAccommodationCard = (item) => (
    <div key={item._id} className="bl-card">
      <div className="bl-card-image" style={{ backgroundImage: `url(${item.images?.[0] || FALLBACK_HOTEL})` }}>
        <button 
          onClick={(e) => handleDelete(item._id, 'accommodation', e)} 
          className="bl-delete-btn"
        >
          <Trash2 size={16} />
        </button>
        <span className="bl-badge gold">Stay</span>
      </div>

      <div className="bl-card-content">
        <div className="bl-card-header">
          <h3>{item.name}</h3>
          <div className="bl-rating">
            <Star size={14} className="bl-star filled" />
            <span>{item.rating || 4.5}</span>
          </div>
        </div>

        <div className="bl-location">
          <MapPin size={14} />
          {item.address || item.destination || 'Pakistan'}
        </div>

        <div className="bl-price">
          {item.priceRange ? `PKR ${item.priceRange.min} - ${item.priceRange.max}` : 'Price on request'}
        </div>

        <button 
          onClick={() => navigate(`/places-to-stay`)} 
          className="bl-action-btn outline"
        >
          <ExternalLink size={16} /> View Details
        </button>
      </div>
    </div>
  );

  const renderTripPlanCard = (item) => (
    <div key={item._id} className="bl-card trip-card">
      <div className="bl-card-body">
        <div className="bl-trip-header">
          <div className="bl-trip-icon">
            <Plane size={24} />
          </div>
          <div className="bl-trip-title">
            <h3>{item.destination}</h3>
            <span>{item.days} Days Trip</span>
          </div>
          <button onClick={(e) => handleDelete(item._id, 'trip', e)} className="bl-icon-btn">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="bl-trip-details">
          <div className="bl-detail-item">
            <Calendar size={16} />
            <span>{item.season || 'Any'} Season</span>
          </div>
          <div className="bl-detail-item">
            <Tent size={16} />
            <span>{item.numberOfMembers} Travelers</span>
          </div>
        </div>

        <div className="bl-trip-total">
          <span>Estimated Budget</span>
          <strong>PKR {item.total?.toLocaleString()}</strong>
        </div>

        <button 
          onClick={() => navigate(`/money-map?trip=${item._id}`)}
          className="bl-action-btn"
        >
          View Breakdown
        </button>
      </div>
    </div>
  );

  return (
    <div className="bl-page">
      <div className="bl-overlay" />
      <div className="bl-shell">
        
        {/* Header */}
        <header className="bl-header">
          <button onClick={() => navigate('/dashboard')} className="bl-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="bl-header-content">
            <h1>Bucket List</h1>
            <p>Your curated collection of dreams and plans.</p>
          </div>
        </header>

        {/* Tabs */}
        <div className="bl-tabs">
          <button 
            className={`bl-tab ${activeTab === 'destinations' ? 'active' : ''}`}
            onClick={() => setActiveTab('destinations')}
          >
            <MapPin size={16} /> Destinations
          </button>
          <button 
            className={`bl-tab ${activeTab === 'accommodations' ? 'active' : ''}`}
            onClick={() => setActiveTab('accommodations')}
          >
            <Hotel size={16} /> Stays
          </button>
          <button 
            className={`bl-tab ${activeTab === 'trip-plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('trip-plans')}
          >
            <Plane size={16} /> Planned Trips
          </button>
        </div>

        {/* Content */}
        <div className="bl-content">
          {loading ? (
            <div className="bl-loading">
              <Loader className="bl-spin" size={32} />
              <p>Loading your bucket list...</p>
            </div>
          ) : (
            <>
              {activeTab === 'destinations' && (
                destinations.length === 0 ? (
                  <div className="bl-empty">
                    <Tent size={48} />
                    <h3>Your list is empty</h3>
                    <p>Start exploring the Travel Hub to add destinations.</p>
                    <button onClick={() => navigate('/travel-hub')} className="bl-cta-btn">Explore Now</button>
                  </div>
                ) : (
                  <div className="bl-grid">
                    {destinations.map(item => renderDestinationCard(item))}
                  </div>
                )
              )}

              {activeTab === 'accommodations' && (
                accommodations.length === 0 ? (
                  <div className="bl-empty">
                    <Hotel size={48} />
                    <h3>No stays saved</h3>
                    <p>Find the perfect hotel for your next trip.</p>
                    <button onClick={() => navigate('/places-to-stay')} className="bl-cta-btn">Browse Hotels</button>
                  </div>
                ) : (
                  <div className="bl-grid">
                    {accommodations.map(item => renderAccommodationCard(item))}
                  </div>
                )
              )}

              {activeTab === 'trip-plans' && (
                tripPlans.length === 0 ? (
                  <div className="bl-empty">
                    <Plane size={48} />
                    <h3>No plans yet</h3>
                    <p>Use the Money Map to create a budget plan.</p>
                    <button onClick={() => navigate('/money-map')} className="bl-cta-btn">Create Plan</button>
                  </div>
                ) : (
                  <div className="bl-grid">
                    {tripPlans.map(item => renderTripPlanCard(item))}
                  </div>
                )
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default BucketList;