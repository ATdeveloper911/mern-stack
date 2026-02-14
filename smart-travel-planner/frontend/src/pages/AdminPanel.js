import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AdminPanel.css';
import './AdminPanelNew.css';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [fetchingAuto, setFetchingAuto] = useState(false);
  const [autoFetchMessage, setAutoFetchMessage] = useState(null);
  const [autoFetchDestination, setAutoFetchDestination] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState(null);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    apiKey: '',
    service: 'Google Maps',
    description: ''
  });
  const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'destinations', 'accommodations', 'users', 'content', 'settings', 'reports'
  const [hotelForm, setHotelForm] = useState({
    destination: '',
    name: '',
    address: '',
    coordinates: { lat: '', lng: '' },
    rating: 0,
    priceRange: { min: '', max: '', currency: 'USD' },
    amenities: '',
    contactNumber: '',
    email: '',
    bookingLink: '',
    description: '',
    images: ''
  });
  const [restaurantForm, setRestaurantForm] = useState({
    destination: '',
    name: '',
    address: '',
    coordinates: { lat: '', lng: '' },
    rating: 0,
    cuisine: '',
    priceRange: { min: '', max: '', currency: 'USD' },
    contactNumber: '',
    bookingLink: '',
    description: ''
  });
  const [placeForm, setPlaceForm] = useState({
    name: '',
    city: '',
    country: 'Pakistan',
    description: '',
    tagline: '',
    category: '',
    coordinates: { lat: '', lng: '' },
    history: '',
    culture: '',
    bestSeason: '',
    isPopular: false,
    images: '',
    famousLocations: [{ name: '', description: '', image: '' }],
    famousFood: [{ name: '', icon: '🍛', description: '' }],
    famousThings: [{ name: '', icon: '🎁', description: '' }],
    famousFor: ['']
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  // Fetch API keys when settings section is opened
  useEffect(() => {
    if (activeSection === 'settings') {
      fetchApiKeys();
    }
  }, [activeSection]);

  const fetchData = async () => {
    try {
      const [usersRes, analyticsRes, destinationsRes, hotelsRes, restaurantsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/analytics'),
        api.get('/admin/destinations').catch(() => ({ data: [] })),
        api.get('/admin/hotels').catch(() => ({ data: [] })),
        api.get('/admin/restaurants').catch(() => ({ data: [] }))
      ]);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
      setDestinations(destinationsRes.data);
      setHotels(hotelsRes.data);
      setRestaurants(restaurantsRes.data);
      
      // Also fetch API keys if in settings section
      if (activeSection === 'settings') {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        // Token expired/invalid or not admin: force re-login
        localStorage.removeItem('token');
        alert('⚠️ Session expired or unauthorized. Please login again as Admin.');
        try {
          logout();
        } catch (e) {
          // ignore
        }
        navigate('/login');
      } else {
        alert('❌ Admin data load failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle`);
      fetchData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  // Fetch API Keys
  const fetchApiKeys = async () => {
    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        alert('⚠️ No authentication token found. Please login again.');
        navigate('/login');
        return;
      }
      
      console.log('🔑 Fetching API keys with token:', token.substring(0, 20) + '...');
      
      // Force fresh data by adding cache-busting parameter
      const response = await api.get('/admin/api-keys', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        params: {
          _t: Date.now() // Cache buster
        }
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📦 Response data:', response.data);
      
      // Handle both 200 and 304 responses
      if (response.status === 200 || response.status === 304) {
        const data = response.data || [];
        setApiKeys(data);
        console.log('✅ API keys set in state:', data.length, 'keys');
        
        if (data.length === 0) {
          console.log('ℹ️ No API keys found in database');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching API keys:', error);
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      if (error.response?.status === 401) {
        alert('⚠️ Authentication failed. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 304) {
        // 304 is not an error, but axios might throw it
        console.log('ℹ️ Using cached data (304)');
        // Try to get data from error response if available
        if (error.response?.data) {
          setApiKeys(error.response.data);
        }
      } else {
        alert('Error fetching API keys: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Reset API Key Form
  const resetApiKeyForm = () => {
    setApiKeyForm({
      name: '',
      apiKey: '',
      service: 'Google Maps',
      description: ''
    });
    setEditingApiKey(null);
  };

  // Handle API Key Submit
  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingApiKey) {
        await api.put(`/admin/api-keys/${editingApiKey._id}`, apiKeyForm);
        alert('✅ API key updated successfully!');
      } else {
        await api.post('/admin/api-keys', apiKeyForm);
        alert('✅ API key added successfully!');
      }
      resetApiKeyForm();
      fetchApiKeys();
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('❌ Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle Edit API Key
  const handleEditApiKey = (apiKey) => {
    setApiKeyForm({
      name: apiKey.name,
      apiKey: '', // Don't show full key for security
      service: apiKey.service,
      description: apiKey.description || ''
    });
    setEditingApiKey(apiKey);
  };

  // Handle Delete API Key
  const handleDeleteApiKey = async (apiKeyId) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;
    try {
      await api.delete(`/admin/api-keys/${apiKeyId}`);
      alert('✅ API key deleted successfully!');
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('❌ Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // Geocode address to get coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const handleHotelSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!hotelForm.destination) {
        alert('❌ Please select a destination for this hotel.');
        return;
      }
      // Auto-geocode if coordinates not provided
      let coords = { lat: parseFloat(hotelForm.coordinates.lat), lng: parseFloat(hotelForm.coordinates.lng) };
      if (!coords.lat || !coords.lng) {
        const geocoded = await geocodeAddress(hotelForm.address);
        if (geocoded) coords = geocoded;
      }

      // Process images
      const images = hotelForm.images.split(',').map(img => img.trim()).filter(img => img);

      const hotelData = {
        ...hotelForm,
        coordinates: coords,
        priceRange: {
          min: parseFloat(hotelForm.priceRange.min) || 0,
          max: parseFloat(hotelForm.priceRange.max) || 0,
          currency: hotelForm.priceRange.currency
        },
        amenities: hotelForm.amenities.split(',').map(a => a.trim()).filter(a => a),
        images: images.length > 0 ? images : undefined
      };

      if (editingHotel) {
        await api.put(`/admin/hotels/${editingHotel._id}`, hotelData);
        alert('✅ Hotel updated successfully!');
        setEditingHotel(null);
      } else {
        await api.post('/admin/hotels', hotelData);
        alert('✅ Hotel added successfully!');
      }
      
      setShowHotelForm(false);
      resetHotelForm();
      fetchData();
    } catch (error) {
      console.error('Error saving hotel:', error);
      alert('❌ Error saving hotel: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetHotelForm = () => {
    setHotelForm({
      destination: selectedDestinationId || '',
      name: '',
      address: '',
      coordinates: { lat: '', lng: '' },
      rating: 0,
      priceRange: { min: '', max: '', currency: 'USD' },
      amenities: '',
      contactNumber: '',
      email: '',
      bookingLink: '',
      description: '',
      images: ''
    });
  };

  const handleEditHotel = async (hotelId) => {
    try {
      const response = await api.get(`/admin/hotels/${hotelId}`);
      const hotel = response.data;
      
      setHotelForm({
        destination: hotel.destination?._id || hotel.destination || '',
        name: hotel.name || '',
        address: hotel.address || '',
        coordinates: {
          lat: hotel.coordinates?.lat || '',
          lng: hotel.coordinates?.lng || ''
        },
        rating: hotel.rating || 0,
        priceRange: {
          min: hotel.priceRange?.min || '',
          max: hotel.priceRange?.max || '',
          currency: hotel.priceRange?.currency || 'USD'
        },
        amenities: hotel.amenities?.join(', ') || '',
        contactNumber: hotel.contactNumber || '',
        email: hotel.email || '',
        bookingLink: hotel.bookingLink || '',
        description: hotel.description || '',
        images: hotel.images?.join(', ') || ''
      });
      
      setEditingHotel(hotel);
      setShowHotelForm(true);
    } catch (error) {
      console.error('Error loading hotel:', error);
      alert('❌ Error loading hotel: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteHotel = async (hotelId) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;
    
    try {
      await api.delete(`/admin/hotels/${hotelId}`);
      alert('✅ Hotel deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting hotel:', error);
      alert('❌ Error deleting hotel: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!restaurantForm.destination) {
        alert('❌ Please select a destination for this restaurant.');
        return;
      }
      // Auto-geocode if coordinates not provided
      let coords = { lat: parseFloat(restaurantForm.coordinates.lat), lng: parseFloat(restaurantForm.coordinates.lng) };
      if (!coords.lat || !coords.lng) {
        const geocoded = await geocodeAddress(restaurantForm.address);
        if (geocoded) coords = geocoded;
      }

      const restaurantData = {
        ...restaurantForm,
        coordinates: coords,
        priceRange: {
          min: parseFloat(restaurantForm.priceRange.min) || 0,
          max: parseFloat(restaurantForm.priceRange.max) || 0,
          currency: restaurantForm.priceRange.currency
        },
        cuisine: restaurantForm.cuisine.split(',').map(c => c.trim()).filter(c => c)
      };

      if (editingRestaurant) {
        await api.put(`/admin/restaurants/${editingRestaurant._id}`, restaurantData);
        alert('✅ Restaurant updated successfully!');
        setEditingRestaurant(null);
      } else {
        await api.post('/admin/restaurants', restaurantData);
        alert('✅ Restaurant added successfully!');
      }
      
      setShowRestaurantForm(false);
      resetRestaurantForm();
      fetchData();
    } catch (error) {
      console.error('Error saving restaurant:', error);
      alert('❌ Error saving restaurant: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetRestaurantForm = () => {
    setRestaurantForm({
      destination: selectedDestinationId || '',
      name: '',
      address: '',
      coordinates: { lat: '', lng: '' },
      rating: 0,
      cuisine: '',
      priceRange: { min: '', max: '', currency: 'USD' },
      contactNumber: '',
      bookingLink: '',
      description: ''
    });
  };

  const handleEditRestaurant = async (restaurantId) => {
    try {
      const response = await api.get(`/admin/restaurants/${restaurantId}`);
      const restaurant = response.data;
      
      setRestaurantForm({
        destination: restaurant.destination?._id || restaurant.destination || '',
        name: restaurant.name || '',
        address: restaurant.address || '',
        coordinates: {
          lat: restaurant.coordinates?.lat || '',
          lng: restaurant.coordinates?.lng || ''
        },
        rating: restaurant.rating || 0,
        cuisine: restaurant.cuisine?.join(', ') || '',
        priceRange: {
          min: restaurant.priceRange?.min || '',
          max: restaurant.priceRange?.max || '',
          currency: restaurant.priceRange?.currency || 'USD'
        },
        contactNumber: restaurant.contactNumber || '',
        bookingLink: restaurant.bookingLink || '',
        description: restaurant.description || ''
      });
      
      setEditingRestaurant(restaurant);
      setShowRestaurantForm(true);
    } catch (error) {
      console.error('Error loading restaurant:', error);
      alert('❌ Error loading restaurant: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;
    
    try {
      await api.delete(`/admin/restaurants/${restaurantId}`);
      alert('✅ Restaurant deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('❌ Error deleting restaurant: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePlaceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Auto-geocode if coordinates not provided
      let coords = { lat: parseFloat(placeForm.coordinates.lat), lng: parseFloat(placeForm.coordinates.lng) };
      if (!coords.lat || !coords.lng) {
        const address = `${placeForm.name}, ${placeForm.city}, ${placeForm.country}`;
        const geocoded = await geocodeAddress(address);
        if (geocoded) coords = geocoded;
      }

      // Process images
      const images = placeForm.images.split(',').map(img => img.trim()).filter(img => img);

      // Process famous locations
      const famousLocations = placeForm.famousLocations
        .filter(loc => loc.name.trim())
        .map(loc => ({
          name: loc.name.trim(),
          description: loc.description.trim() || '',
          image: loc.image.trim() || ''
        }));

      // Process famous food
      const famousFood = placeForm.famousFood
        .filter(food => food.name.trim())
        .map(food => ({
          name: food.name.trim(),
          icon: food.icon.trim() || '🍛',
          description: food.description.trim() || ''
        }));

      // Process famous things
      const famousThings = placeForm.famousThings
        .filter(thing => thing.name.trim())
        .map(thing => ({
          name: thing.name.trim(),
          icon: thing.icon.trim() || '🎁',
          description: thing.description.trim() || ''
        }));

      // Process famous for badges
      const famousFor = placeForm.famousFor
        .filter(item => item.trim())
        .map(item => item.trim());

      const placeData = {
        name: placeForm.name.trim(),
        city: placeForm.city.trim(),
        country: placeForm.country.trim(),
        description: placeForm.description.trim(),
        tagline: placeForm.tagline.trim(),
        category: placeForm.category,
        coordinates: coords,
        history: placeForm.history.trim() || undefined,
        culture: placeForm.culture.trim() || undefined,
        bestSeason: placeForm.bestSeason || undefined,
        isPopular: placeForm.isPopular,
        images: images.length > 0 ? images : undefined,
        famousLocations: famousLocations.length > 0 ? famousLocations : undefined,
        famousFood: famousFood.length > 0 ? famousFood : undefined,
        famousThings: famousThings.length > 0 ? famousThings : undefined,
        famousFor: famousFor.length > 0 ? famousFor : undefined
      };

      if (editingPlace) {
        // Update existing place
        await api.put(`/admin/destinations/${editingPlace._id}`, placeData);
        alert('✅ Place updated successfully!');
        setEditingPlace(null);
      } else {
        // Create new place
        await api.post('/admin/destinations', placeData);
        alert('✅ Place added successfully!');
      }
      
      setShowPlaceForm(false);
      resetPlaceForm();
      fetchData();
    } catch (error) {
      console.error('Error saving place:', error);
      alert('❌ Error saving place: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetPlaceForm = () => {
    setPlaceForm({
      name: '',
      city: '',
      country: 'Pakistan',
      description: '',
      tagline: '',
      category: '',
      coordinates: { lat: '', lng: '' },
      history: '',
      culture: '',
      bestSeason: '',
      isPopular: false,
      images: '',
      famousLocations: [{ name: '', description: '', image: '' }],
      famousFood: [{ name: '', icon: '🍛', description: '' }],
      famousThings: [{ name: '', icon: '🎁', description: '' }],
      famousFor: ['']
    });
  };

  const handleEditPlace = async (placeId) => {
    try {
      const response = await api.get(`/admin/destinations/${placeId}`);
      const place = response.data;
      
      setPlaceForm({
        name: place.name || '',
        city: place.city || '',
        country: place.country || 'Pakistan',
        description: place.description || '',
        tagline: place.tagline || '',
        category: place.category || '',
        coordinates: {
          lat: place.coordinates?.lat || '',
          lng: place.coordinates?.lng || ''
        },
        history: place.history || '',
        culture: place.culture || '',
        bestSeason: place.bestSeason || '',
        isPopular: place.isPopular || false,
        images: place.images?.join(', ') || '',
        famousLocations: place.famousLocations?.length > 0 
          ? place.famousLocations 
          : [{ name: '', description: '', image: '' }],
        famousFood: place.famousFood?.length > 0 
          ? place.famousFood 
          : [{ name: '', icon: '🍛', description: '' }],
        famousThings: place.famousThings?.length > 0 
          ? place.famousThings 
          : [{ name: '', icon: '🎁', description: '' }],
        famousFor: place.famousFor?.length > 0 
          ? place.famousFor 
          : ['']
      });
      
      setEditingPlace(place);
      setShowPlaceForm(true);
    } catch (error) {
      console.error('Error loading place:', error);
      alert('❌ Error loading place: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePlace = async (placeId) => {
    if (!window.confirm('Are you sure you want to delete this place?')) return;
    
    try {
      await api.delete(`/admin/destinations/${placeId}`);
      alert('✅ Place deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting place:', error);
      alert('❌ Error deleting place: ' + (error.response?.data?.message || error.message));
    }
  };

  const addFamousLocation = () => {
    setPlaceForm({
      ...placeForm,
      famousLocations: [...placeForm.famousLocations, { name: '', description: '', image: '' }]
    });
  };

  const removeFamousLocation = (index) => {
    setPlaceForm({
      ...placeForm,
      famousLocations: placeForm.famousLocations.filter((_, i) => i !== index)
    });
  };

  const updateFamousLocation = (index, field, value) => {
    const updated = [...placeForm.famousLocations];
    updated[index][field] = value;
    setPlaceForm({ ...placeForm, famousLocations: updated });
  };

  const addFamousFood = () => {
    setPlaceForm({
      ...placeForm,
      famousFood: [...placeForm.famousFood, { name: '', icon: '🍛', description: '' }]
    });
  };

  const removeFamousFood = (index) => {
    setPlaceForm({
      ...placeForm,
      famousFood: placeForm.famousFood.filter((_, i) => i !== index)
    });
  };

  const updateFamousFood = (index, field, value) => {
    const updated = [...placeForm.famousFood];
    updated[index][field] = value;
    setPlaceForm({ ...placeForm, famousFood: updated });
  };

  const addFamousThing = () => {
    setPlaceForm({
      ...placeForm,
      famousThings: [...placeForm.famousThings, { name: '', icon: '🎁', description: '' }]
    });
  };

  const removeFamousThing = (index) => {
    setPlaceForm({
      ...placeForm,
      famousThings: placeForm.famousThings.filter((_, i) => i !== index)
    });
  };

  const updateFamousThing = (index, field, value) => {
    const updated = [...placeForm.famousThings];
    updated[index][field] = value;
    setPlaceForm({ ...placeForm, famousThings: updated });
  };

  const addFamousFor = () => {
    setPlaceForm({
      ...placeForm,
      famousFor: [...placeForm.famousFor, '']
    });
  };

  const removeFamousFor = (index) => {
    setPlaceForm({
      ...placeForm,
      famousFor: placeForm.famousFor.filter((_, i) => i !== index)
    });
  };

  const updateFamousFor = (index, value) => {
    const updated = [...placeForm.famousFor];
    updated[index] = value;
    setPlaceForm({ ...placeForm, famousFor: updated });
  };

  // Calculate metrics
  const totalAccommodations = (hotels.length || 0) + (restaurants.length || 0);
  const totalBookings = analytics?.budgets?.total || 0; // Using budgets as bookings count
  const recentDestinations = destinations.slice(0, 5).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="admin-panel-new">
      {/* Sidebar Navigation */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <div className="admin-logo">
            <span className="logo-icon">🌍</span>
            <h2>TravelBuddy Admin</h2>
          </div>
          <div className="admin-user-info">
            <span className="user-icon">👤</span>
            <span>{user?.name || 'Admin User'}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'destinations' ? 'active' : ''}`}
            onClick={() => setActiveSection('destinations')}
          >
            <span className="nav-icon">📍</span>
            <span>Destinations</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'accommodations' ? 'active' : ''}`}
            onClick={() => setActiveSection('accommodations')}
          >
            <span className="nav-icon">🏨</span>
            <span>Accommodations</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            <span className="nav-icon">👥</span>
            <span>User Management</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'content' ? 'active' : ''}`}
            onClick={() => setActiveSection('content')}
          >
            <span className="nav-icon">📝</span>
            <span>Content Management</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span>System Settings</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveSection('reports')}
          >
            <span className="nav-icon">📈</span>
            <span>Reports & Analytics</span>
          </button>
          <button 
            className="nav-item logout-btn"
            onClick={logout}
          >
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content">
        {/* Top Header */}
        <div className="admin-top-header">
          <div className="header-left">
            <h1>Admin Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="search-box">
              <input type="text" placeholder="Search..." />
              <span className="search-icon">🔍</span>
            </div>
            <button className="notification-btn">
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">3</span>
            </button>
            <div className="user-profile">
              <span className="profile-icon">👤</span>
              <span>{user?.name || 'Admin'}</span>
            </div>
            <button onClick={logout} className="logout-header-btn">Logout</button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="admin-content-area">
          {activeSection === 'dashboard' && (
            <div className="dashboard-view">
              {/* Key Metrics Cards */}
              <div className="metrics-cards">
                <div className="metric-card">
                  <div className="metric-icon">📍</div>
                  <div className="metric-info">
                    <h3>{destinations.length || 0}</h3>
                    <p>Destinations</p>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🏨</div>
                  <div className="metric-info">
                    <h3>{totalAccommodations}</h3>
                    <p>Accommodations</p>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">👥</div>
                  <div className="metric-info">
                    <h3>{analytics?.users?.total || 0}</h3>
                    <p>Registered Users</p>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">📋</div>
                  <div className="metric-info">
                    <h3>{totalBookings}</h3>
                    <p>Bookings This Month</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveSection('destinations');
                      setShowPlaceForm(true);
                    }}
                  >
                    ➕ Add New Destination
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => setActiveSection('accommodations')}
                  >
                    🏨 Manage Accommodations
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => setActiveSection('users')}
                  >
                    👥 User Management
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => setActiveSection('reports')}
                  >
                    📊 View Reports
                  </button>
                </div>
              </div>

              {/* System Status */}
              <div className="system-status-section">
                <h2>System Status</h2>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>Website: Online</span>
                  </div>
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>Database: Connected</span>
                  </div>
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>API Services: Running</span>
                  </div>
                  <div className="status-item">
                    <span className="status-indicator pending"></span>
                    <span>Backup: Pending</span>
                  </div>
                </div>
              </div>

              {/* Recent Destinations */}
              <div className="recent-destinations-section">
                <h2>Recent Destinations</h2>
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Added Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDestinations.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                          No destinations added yet
                        </td>
                      </tr>
                    ) : (
                      recentDestinations.map((dest) => (
                        <tr key={dest._id}>
                          <td>{dest.name}</td>
                          <td>{dest.city || dest.region || 'N/A'}</td>
                          <td>{new Date(dest.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${dest.isPopular ? 'active' : 'inactive'}`}>
                              {dest.isPopular ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="action-btn-view"
                              onClick={() => {
                                setActiveSection('destinations');
                                handleEditPlace(dest._id);
                              }}
                            >
                              View
                            </button>
                            <button 
                              className="action-btn-edit"
                              onClick={() => {
                                setActiveSection('destinations');
                                handleEditPlace(dest._id);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="action-btn-delete"
                              onClick={() => handleDeletePlace(dest._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Destinations Section */}
          {activeSection === 'destinations' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>📍 Destinations Management</h2>
                <button 
                  onClick={() => {
                    if (showPlaceForm) {
                      setShowPlaceForm(false);
                      setEditingPlace(null);
                      resetPlaceForm();
                    } else {
                      setShowPlaceForm(true);
                      setEditingPlace(null);
                      resetPlaceForm();
                    }
                  }} 
                  className="btn btn-success"
                >
                  {showPlaceForm ? '❌ Cancel' : '➕ Add New Destination'}
                </button>
              </div>

              {!showPlaceForm && (
                <div className="items-list-section">
                  <h3>All Destinations ({destinations.length})</h3>
                  {destinations.length === 0 ? (
                    <div className="empty-message">No destinations added yet</div>
                  ) : (
                    <div className="items-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>City</th>
                            <th>Category</th>
                            <th>Popular</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {destinations.map((place) => (
                            <tr key={place._id}>
                              <td>{place.name}</td>
                              <td>{place.city}</td>
                              <td>{place.category || 'N/A'}</td>
                              <td>{place.isPopular ? '⭐ Yes' : 'No'}</td>
                              <td>
                                <button
                                  onClick={() => handleEditPlace(place._id)}
                                  className="btn-edit"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlace(place._id)}
                                  className="btn-delete"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {showPlaceForm && (
                <div className="form-section">
                  <h3>{editingPlace ? '✏️ Edit Destination' : '➕ Add New Destination'}</h3>
                  <form onSubmit={handlePlaceSubmit} className="admin-form">
                    {/* Basic Information */}
                    <div className="form-section-header">Basic Information</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Place Name *</label>
                        <input
                          type="text"
                          value={placeForm.name}
                          onChange={(e) => setPlaceForm({...placeForm, name: e.target.value})}
                          required
                          placeholder="e.g., Hunza Valley"
                        />
                      </div>
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          value={placeForm.city}
                          onChange={(e) => setPlaceForm({...placeForm, city: e.target.value})}
                          required
                          placeholder="e.g., Hunza"
                        />
                      </div>
                      <div className="form-group">
                        <label>Country *</label>
                        <input
                          type="text"
                          value={placeForm.country}
                          onChange={(e) => setPlaceForm({...placeForm, country: e.target.value})}
                          required
                          placeholder="Pakistan"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tagline</label>
                        <input
                          type="text"
                          value={placeForm.tagline}
                          onChange={(e) => setPlaceForm({...placeForm, tagline: e.target.value})}
                          placeholder="e.g., Land of Mountains"
                        />
                      </div>
                      <div className="form-group">
                        <label>Category *</label>
                        <select
                          value={placeForm.category}
                          onChange={(e) => setPlaceForm({...placeForm, category: e.target.value})}
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Mountains">🏔️ Mountains</option>
                          <option value="Beaches">🏖️ Beaches</option>
                          <option value="Historical">🕌 Historical</option>
                          <option value="Cities">🌆 Cities</option>
                          <option value="Northern Areas">🏔️ Northern Areas</option>
                          <option value="Hill Stations">🌄 Hill Stations</option>
                          <option value="Valleys">🌿 Valleys</option>
                          <option value="Lakes">🏞️ Lakes</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Best Season</label>
                        <select
                          value={placeForm.bestSeason}
                          onChange={(e) => setPlaceForm({...placeForm, bestSeason: e.target.value})}
                        >
                          <option value="">Select Season</option>
                          <option value="spring">🌸 Spring</option>
                          <option value="summer">☀️ Summer</option>
                          <option value="autumn">🍂 Autumn</option>
                          <option value="winter">❄️ Winter</option>
                          <option value="all">All Seasons</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea
                        value={placeForm.description}
                        onChange={(e) => setPlaceForm({...placeForm, description: e.target.value})}
                        required
                        rows="3"
                        placeholder="Describe this place..."
                      />
                    </div>
                    <div className="form-group">
                      <label>History</label>
                      <textarea
                        value={placeForm.history}
                        onChange={(e) => setPlaceForm({...placeForm, history: e.target.value})}
                        rows="3"
                        placeholder="Historical background..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Culture & Vibes</label>
                      <textarea
                        value={placeForm.culture}
                        onChange={(e) => setPlaceForm({...placeForm, culture: e.target.value})}
                        rows="2"
                        placeholder="Describe the culture and vibes..."
                      />
                    </div>

                    {/* Coordinates */}
                    <div className="form-section-header">Location</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude (Auto-filled if empty)</label>
                        <input
                          type="number"
                          step="any"
                          value={placeForm.coordinates.lat}
                          onChange={(e) => setPlaceForm({
                            ...placeForm, 
                            coordinates: {...placeForm.coordinates, lat: e.target.value}
                          })}
                          placeholder="36.3167"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={placeForm.coordinates.lng}
                          onChange={(e) => setPlaceForm({
                            ...placeForm, 
                            coordinates: {...placeForm.coordinates, lng: e.target.value}
                          })}
                          placeholder="74.6500"
                        />
                      </div>
                    </div>

                    {/* Images */}
                    <div className="form-section-header">Images</div>
                    <div className="form-group">
                      <label>Image URLs (comma-separated)</label>
                      <input
                        type="text"
                        value={placeForm.images}
                        onChange={(e) => setPlaceForm({...placeForm, images: e.target.value})}
                        placeholder="https://images.unsplash.com/photo-..., https://images.unsplash.com/photo-..."
                      />
                    </div>

                    {/* Famous Locations */}
                    <div className="form-section-header">🏞️ Famous Locations</div>
                    {placeForm.famousLocations.map((location, index) => (
                      <div key={index} className="dynamic-item">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Location Name</label>
                            <input
                              type="text"
                              value={location.name}
                              onChange={(e) => updateFamousLocation(index, 'name', e.target.value)}
                              placeholder="e.g., Baltit Fort"
                            />
                          </div>
                          <div className="form-group">
                            <label>Image URL</label>
                            <input
                              type="text"
                              value={location.image}
                              onChange={(e) => updateFamousLocation(index, 'image', e.target.value)}
                              placeholder="Image URL"
                            />
                          </div>
                          <div className="form-group">
                            <label>Action</label>
                            <button
                              type="button"
                              onClick={() => removeFamousLocation(index)}
                              className="btn btn-danger"
                              style={{ width: '100%' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={location.description}
                            onChange={(e) => updateFamousLocation(index, 'description', e.target.value)}
                            rows="2"
                            placeholder="Location description..."
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFamousLocation} className="btn btn-secondary">
                      ➕ Add Famous Location
                    </button>

                    {/* Famous Food */}
                    <div className="form-section-header">🍽️ Famous Food</div>
                    {placeForm.famousFood.map((food, index) => (
                      <div key={index} className="dynamic-item">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Food Name</label>
                            <input
                              type="text"
                              value={food.name}
                              onChange={(e) => updateFamousFood(index, 'name', e.target.value)}
                              placeholder="e.g., Chapshuro"
                            />
                          </div>
                          <div className="form-group">
                            <label>Icon (Emoji)</label>
                            <input
                              type="text"
                              value={food.icon}
                              onChange={(e) => updateFamousFood(index, 'icon', e.target.value)}
                              placeholder="🍛"
                              maxLength="2"
                            />
                          </div>
                          <div className="form-group">
                            <label>Action</label>
                            <button
                              type="button"
                              onClick={() => removeFamousFood(index)}
                              className="btn btn-danger"
                              style={{ width: '100%' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={food.description}
                            onChange={(e) => updateFamousFood(index, 'description', e.target.value)}
                            rows="2"
                            placeholder="Food description..."
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFamousFood} className="btn btn-secondary">
                      ➕ Add Famous Food
                    </button>

                    {/* Famous Things */}
                    <div className="form-section-header">🛍️ Famous Things & Specialities</div>
                    {placeForm.famousThings.map((thing, index) => (
                      <div key={index} className="dynamic-item">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Thing Name</label>
                            <input
                              type="text"
                              value={thing.name}
                              onChange={(e) => updateFamousThing(index, 'name', e.target.value)}
                              placeholder="e.g., Handicrafts"
                            />
                          </div>
                          <div className="form-group">
                            <label>Icon (Emoji)</label>
                            <input
                              type="text"
                              value={thing.icon}
                              onChange={(e) => updateFamousThing(index, 'icon', e.target.value)}
                              placeholder="🎁"
                              maxLength="2"
                            />
                          </div>
                          <div className="form-group">
                            <label>Action</label>
                            <button
                              type="button"
                              onClick={() => removeFamousThing(index)}
                              className="btn btn-danger"
                              style={{ width: '100%' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={thing.description}
                            onChange={(e) => updateFamousThing(index, 'description', e.target.value)}
                            rows="2"
                            placeholder="Thing description..."
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFamousThing} className="btn btn-secondary">
                      ➕ Add Famous Thing
                    </button>

                    {/* Famous For */}
                    <div className="form-section-header">🎉 Famous For (Badges)</div>
                    {placeForm.famousFor.map((item, index) => (
                      <div key={index} className="form-row">
                        <div className="form-group">
                          <label>Badge {index + 1}</label>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateFamousFor(index, e.target.value)}
                            placeholder="e.g., Mountains, Photography, Trekking"
                          />
                        </div>
                        <div className="form-group">
                          <label>Action</label>
                          <button
                            type="button"
                            onClick={() => removeFamousFor(index)}
                            className="btn btn-danger"
                            style={{ width: '100%' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFamousFor} className="btn btn-secondary">
                      ➕ Add Badge
                    </button>

                    {/* Popular Checkbox */}
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={placeForm.isPopular}
                          onChange={(e) => setPlaceForm({...placeForm, isPopular: e.target.checked})}
                        />
                        Mark as Popular Destination
                      </label>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        {editingPlace ? '✅ Update Place' : '✅ Add Place'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowPlaceForm(false);
                          setEditingPlace(null);
                          resetPlaceForm();
                        }}
                        className="btn btn-secondary"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Accommodations Section */}
          {activeSection === 'accommodations' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>🏨 Accommodations Management</h2>
                <div className="action-buttons">
                  <button 
                    onClick={() => {
                      if (showHotelForm) {
                        setShowHotelForm(false);
                        setEditingHotel(null);
                        resetHotelForm();
                      } else {
                        setShowHotelForm(true);
                        setEditingHotel(null);
                        resetHotelForm();
                      }
                    }} 
                    className="btn btn-primary"
                  >
                    {showHotelForm ? '❌ Cancel' : '➕ Add Hotel'}
                  </button>
                  <button 
                    onClick={() => {
                      if (showRestaurantForm) {
                        setShowRestaurantForm(false);
                        setEditingRestaurant(null);
                        resetRestaurantForm();
                      } else {
                        setShowRestaurantForm(true);
                        setEditingRestaurant(null);
                        resetRestaurantForm();
                      }
                    }} 
                    className="btn btn-secondary"
                  >
                    {showRestaurantForm ? '❌ Cancel' : '➕ Add Restaurant'}
                  </button>
                </div>
              </div>

              {/* Auto-Fetch Message */}
              {autoFetchMessage && (
                <div className={`auto-fetch-message ${autoFetchMessage.type}`}>
                  <div className="message-header">
                    <span className="message-icon">{autoFetchMessage.type === 'success' ? '✅' : '❌'}</span>
                    <h3>{autoFetchMessage.title}</h3>
                    <button 
                      className="close-message-btn"
                      onClick={() => setAutoFetchMessage(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="message-content">
                    <p className="message-text">{autoFetchMessage.message}</p>
                    {autoFetchMessage.details && (
                      <p className="message-details">{autoFetchMessage.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-Fetch Destination Selector */}
              <div className="auto-fetch-section" style={{ marginTop: 20, marginBottom: 20 }}>
                <h3>🤖 Auto-Fetch Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Destination (Optional)</label>
                    <select
                      value={autoFetchDestination}
                      onChange={(e) => setAutoFetchDestination(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #ddd' }}
                    >
                      <option value="">All Destinations (Auto-Fetch Everything)</option>
                      {destinations.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.city})
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                      {autoFetchDestination 
                        ? `Will fetch hotels only for "${destinations.find(d => d._id === autoFetchDestination)?.name || 'selected destination'}"`
                        : 'Will search for new destinations and fetch hotels for all'}
                    </small>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const confirmMessage = autoFetchDestination 
                      ? `Auto-fetch hotels for "${destinations.find(d => d._id === autoFetchDestination)?.name || 'selected destination'}"?`
                      : 'Auto-fetch locations and hotels?';
                    if (window.confirm(confirmMessage)) {
                      setFetchingAuto(true);
                      setAutoFetchMessage(null);
                      try {
                        const response = await api.post('/admin/auto-fetch-locations-hotels', {
                          destinationId: autoFetchDestination || null
                        });
                        setAutoFetchMessage({
                          type: 'success',
                          title: '✅ Success!',
                          message: response.data.message,
                          details: `Destinations: ${response.data.totalDestinationsAdded || 0} | Hotels: ${response.data.totalHotelsAdded || 0}`
                        });
                        fetchData();
                        setTimeout(() => setAutoFetchMessage(null), 10000);
                      } catch (error) {
                        setAutoFetchMessage({
                          type: 'error',
                          title: '❌ Error',
                          message: error.response?.data?.message || error.message
                        });
                        setTimeout(() => setAutoFetchMessage(null), 8000);
                      } finally {
                        setFetchingAuto(false);
                      }
                    }
                  }}
                  className="btn btn-success"
                  disabled={fetchingAuto}
                  style={{ marginTop: 15 }}
                >
                  {fetchingAuto ? '⏳ Fetching...' : '🤖 Auto-Fetch'}
                </button>
              </div>

              {/* Destination Filter */}
              <div className="items-list-section" style={{ marginTop: 20 }}>
                <h3>Filter by Destination</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Destination</label>
                    <select
                      value={selectedDestinationId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedDestinationId(id);
                        if (!editingHotel) setHotelForm((prev) => ({ ...prev, destination: id }));
                        if (!editingRestaurant) setRestaurantForm((prev) => ({ ...prev, destination: id }));
                      }}
                    >
                      <option value="">All Destinations</option>
                      {destinations.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.city})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quick Actions</label>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setSelectedDestinationId('');
                        setHotelForm((prev) => ({ ...prev, destination: '' }));
                        setRestaurantForm((prev) => ({ ...prev, destination: '' }));
                      }}
                    >
                      🔄 Clear Filter
                    </button>
                  </div>
                </div>
              </div>

              {/* Hotels List */}
              {!showHotelForm && (
                <div className="items-list-section">
                  <h3>
                    {selectedDestinationId
                      ? `Hotels for ${destinations.find((d) => d._id === selectedDestinationId)?.name || 'Selected Destination'}`
                      : `All Hotels (${hotels.length})`}
                  </h3>
                  {hotels.filter(h =>
                    selectedDestinationId ? (h.destination?._id || h.destination) === selectedDestinationId : true
                  ).length === 0 ? (
                    <div className="empty-message">No hotels added yet for this destination.</div>
                  ) : (
                    <div className="items-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Destination</th>
                            <th>Address</th>
                            <th>Rating</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hotels.filter(h =>
                            selectedDestinationId ? (h.destination?._id || h.destination) === selectedDestinationId : true
                          ).map((hotel) => (
                            <tr key={hotel._id}>
                              <td>{hotel.name}</td>
                              <td>{destinations.find(d => d._id === (hotel.destination?._id || hotel.destination))?.name || 'Not Linked'}</td>
                              <td>{hotel.address}</td>
                              <td>⭐ {hotel.rating || 'N/A'}/5</td>
                              <td>
                                <button
                                  onClick={() => handleEditHotel(hotel._id)}
                                  className="btn-edit"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteHotel(hotel._id)}
                                  className="btn-delete"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Add Hotel Form */}
              {showHotelForm && (
                <div className="form-section">
                  <h3>{editingHotel ? '✏️ Edit Hotel' : '➕ Add New Hotel'}</h3>
                  <form onSubmit={handleHotelSubmit} className="admin-form">
                    <div className="form-group">
                      <label>Destination *</label>
                      <select
                        value={hotelForm.destination}
                        onChange={(e) => setHotelForm({ ...hotelForm, destination: e.target.value })}
                        required
                      >
                        <option value="">Select Destination</option>
                        {destinations.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.city})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hotel Name *</label>
                        <input
                          type="text"
                          value={hotelForm.name}
                          onChange={(e) => setHotelForm({...hotelForm, name: e.target.value})}
                          required
                          placeholder="e.g., Marriott Hotel"
                        />
                      </div>
                      <div className="form-group">
                        <label>Address *</label>
                        <input
                          type="text"
                          value={hotelForm.address}
                          onChange={(e) => setHotelForm({...hotelForm, address: e.target.value})}
                          required
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude (Auto-filled from address if empty)</label>
                        <input
                          type="number"
                          step="any"
                          value={hotelForm.coordinates.lat}
                          onChange={(e) => setHotelForm({
                            ...hotelForm, 
                            coordinates: {...hotelForm.coordinates, lat: e.target.value}
                          })}
                          placeholder="24.8607"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={hotelForm.coordinates.lng}
                          onChange={(e) => setHotelForm({
                            ...hotelForm, 
                            coordinates: {...hotelForm.coordinates, lng: e.target.value}
                          })}
                          placeholder="67.0011"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Rating (0-5)</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={hotelForm.rating}
                          onChange={(e) => setHotelForm({...hotelForm, rating: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Price Range (Min)</label>
                        <input
                          type="number"
                          value={hotelForm.priceRange.min}
                          onChange={(e) => setHotelForm({
                            ...hotelForm, 
                            priceRange: {...hotelForm.priceRange, min: e.target.value}
                          })}
                          placeholder="100"
                        />
                      </div>
                      <div className="form-group">
                        <label>Price Range (Max)</label>
                        <input
                          type="number"
                          value={hotelForm.priceRange.max}
                          onChange={(e) => setHotelForm({
                            ...hotelForm, 
                            priceRange: {...hotelForm.priceRange, max: e.target.value}
                          })}
                          placeholder="300"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Amenities (comma-separated)</label>
                      <input
                        type="text"
                        value={hotelForm.amenities}
                        onChange={(e) => setHotelForm({...hotelForm, amenities: e.target.value})}
                        placeholder="WiFi, Pool, Gym, Spa"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Contact Number</label>
                        <input
                          type="text"
                          value={hotelForm.contactNumber}
                          onChange={(e) => setHotelForm({...hotelForm, contactNumber: e.target.value})}
                          placeholder="+92-21-12345678"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={hotelForm.email}
                          onChange={(e) => setHotelForm({...hotelForm, email: e.target.value})}
                          placeholder="info@hotel.com"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Booking Link</label>
                      <input
                        type="url"
                        value={hotelForm.bookingLink}
                        onChange={(e) => setHotelForm({...hotelForm, bookingLink: e.target.value})}
                        placeholder="https://www.hotel.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={hotelForm.description}
                        onChange={(e) => setHotelForm({...hotelForm, description: e.target.value})}
                        rows="3"
                        placeholder="Hotel description..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Images (Room Pictures & Hotel Photos)</label>
                      <textarea
                        value={hotelForm.images}
                        onChange={(e) => setHotelForm({...hotelForm, images: e.target.value})}
                        rows="4"
                        placeholder="Enter image URLs separated by commas&#10;Example:&#10;https://images.unsplash.com/photo-1566073771259-6a8506099945,&#10;https://images.unsplash.com/photo-1571896349842-33c89424de2d"
                      />
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                        💡 Tip: Use Unsplash or other image hosting services. Add multiple URLs separated by commas.
                      </small>
                      {hotelForm.images && hotelForm.images.split(',').filter(img => img.trim()).length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'block' }}>
                            Preview Images:
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                            {hotelForm.images.split(',').filter(img => img.trim()).map((imgUrl, idx) => (
                              <div key={idx} style={{ position: 'relative' }}>
                                <img
                                  src={imgUrl.trim()}
                                  alt={`Hotel ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '120px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: '2px solid #ddd'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingHotel ? '✅ Update Hotel' : '✅ Add Hotel'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowHotelForm(false);
                          setEditingHotel(null);
                          resetHotelForm();
                        }}
                        className="btn btn-secondary"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Restaurants List */}
              {!showRestaurantForm && (
                <div className="items-list-section" style={{ marginTop: 30 }}>
                  <h3>
                    {selectedDestinationId
                      ? `Restaurants for ${destinations.find((d) => d._id === selectedDestinationId)?.name || 'Selected Destination'}`
                      : `All Restaurants (${restaurants.length})`}
                  </h3>
                  {restaurants.filter(r =>
                    selectedDestinationId ? (r.destination?._id || r.destination) === selectedDestinationId : true
                  ).length === 0 ? (
                    <div className="empty-message">No restaurants added yet for this destination.</div>
                  ) : (
                    <div className="items-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Destination</th>
                            <th>Address</th>
                            <th>Rating</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {restaurants.filter(r =>
                            selectedDestinationId ? (r.destination?._id || r.destination) === selectedDestinationId : true
                          ).map((restaurant) => (
                            <tr key={restaurant._id}>
                              <td>{restaurant.name}</td>
                              <td>{destinations.find(d => d._id === (restaurant.destination?._id || restaurant.destination))?.name || 'Not Linked'}</td>
                              <td>{restaurant.address}</td>
                              <td>⭐ {restaurant.rating || 'N/A'}/5</td>
                              <td>
                                <button
                                  onClick={() => handleEditRestaurant(restaurant._id)}
                                  className="btn-edit"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRestaurant(restaurant._id)}
                                  className="btn-delete"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Add Restaurant Form */}
              {showRestaurantForm && (
                <div className="form-section">
                  <h3>{editingRestaurant ? '✏️ Edit Restaurant' : '➕ Add New Restaurant'}</h3>
                  <form onSubmit={handleRestaurantSubmit} className="admin-form">
                    <div className="form-group">
                      <label>Destination *</label>
                      <select
                        value={restaurantForm.destination}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, destination: e.target.value })}
                        required
                      >
                        <option value="">Select Destination</option>
                        {destinations.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.city})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Restaurant Name *</label>
                        <input
                          type="text"
                          value={restaurantForm.name}
                          onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                          required
                          placeholder="e.g., Kolachi Restaurant"
                        />
                      </div>
                      <div className="form-group">
                        <label>Address *</label>
                        <input
                          type="text"
                          value={restaurantForm.address}
                          onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})}
                          required
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude (Auto-filled from address if empty)</label>
                        <input
                          type="number"
                          step="any"
                          value={restaurantForm.coordinates.lat}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm, 
                            coordinates: {...restaurantForm.coordinates, lat: e.target.value}
                          })}
                          placeholder="24.8000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={restaurantForm.coordinates.lng}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm, 
                            coordinates: {...restaurantForm.coordinates, lng: e.target.value}
                          })}
                          placeholder="67.0500"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Rating (0-5)</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={restaurantForm.rating}
                          onChange={(e) => setRestaurantForm({...restaurantForm, rating: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Cuisine (comma-separated)</label>
                        <input
                          type="text"
                          value={restaurantForm.cuisine}
                          onChange={(e) => setRestaurantForm({...restaurantForm, cuisine: e.target.value})}
                          placeholder="Pakistani, BBQ, Seafood"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Price Range (Min)</label>
                        <input
                          type="number"
                          value={restaurantForm.priceRange.min}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm, 
                            priceRange: {...restaurantForm.priceRange, min: e.target.value}
                          })}
                          placeholder="20"
                        />
                      </div>
                      <div className="form-group">
                        <label>Price Range (Max)</label>
                        <input
                          type="number"
                          value={restaurantForm.priceRange.max}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm, 
                            priceRange: {...restaurantForm.priceRange, max: e.target.value}
                          })}
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input
                        type="text"
                        value={restaurantForm.contactNumber}
                        onChange={(e) => setRestaurantForm({...restaurantForm, contactNumber: e.target.value})}
                        placeholder="+92-21-33333333"
                      />
                    </div>
                    <div className="form-group">
                      <label>Booking Link</label>
                      <input
                        type="url"
                        value={restaurantForm.bookingLink}
                        onChange={(e) => setRestaurantForm({...restaurantForm, bookingLink: e.target.value})}
                        placeholder="https://www.restaurant.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={restaurantForm.description}
                        onChange={(e) => setRestaurantForm({...restaurantForm, description: e.target.value})}
                        rows="3"
                        placeholder="Restaurant description..."
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-secondary">
                        {editingRestaurant ? '✅ Update Restaurant' : '✅ Add Restaurant'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowRestaurantForm(false);
                          setEditingRestaurant(null);
                          resetRestaurantForm();
                        }}
                        className="btn btn-primary"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>👥 User Management</h2>
              </div>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <button
                            onClick={() => toggleUserStatus(u._id)}
                            className={u.isActive ? 'btn-danger' : 'btn-success'}
                          >
                            {u.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Content Management Section */}
          {activeSection === 'content' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>📝 Content Management</h2>
              </div>
              <div className="content-management-grid">
                <div className="content-card">
                  <h3>Destinations</h3>
                  <p>Manage all destination content</p>
                  <button onClick={() => setActiveSection('destinations')} className="btn btn-primary">
                    Manage
                  </button>
                </div>
                <div className="content-card">
                  <h3>Hotels & Restaurants</h3>
                  <p>Manage accommodations content</p>
                  <button onClick={() => setActiveSection('accommodations')} className="btn btn-primary">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>⚙️ System Settings</h2>
              </div>
              <div className="settings-grid">
                <div className="setting-card">
                  <h3>API Configuration</h3>
                  <p>Configure Google Maps, Weather, and AI APIs</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowApiConfig(!showApiConfig);
                      if (!showApiConfig) {
                        fetchApiKeys();
                      }
                    }}
                  >
                    {showApiConfig ? 'Hide Configuration' : 'Configure'}
                  </button>
                </div>
                <div className="setting-card">
                  <h3>Auto-Fetch Settings</h3>
                  <p>Configure automatic data fetching</p>
                  <div className="auto-fetch-section" style={{ marginTop: 20 }}>
                    <div className="form-group">
                      <label>Select Destination (Optional)</label>
                      <select
                        value={autoFetchDestination}
                        onChange={(e) => setAutoFetchDestination(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #ddd' }}
                      >
                        <option value="">All Destinations</option>
                        {destinations.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.city})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={async () => {
                        const confirmMessage = autoFetchDestination 
                          ? `Auto-fetch hotels for selected destination?`
                          : 'Auto-fetch locations and hotels?';
                        if (window.confirm(confirmMessage)) {
                          setFetchingAuto(true);
                          setAutoFetchMessage(null);
                          try {
                            const response = await api.post('/admin/auto-fetch-locations-hotels', {
                              destinationId: autoFetchDestination || null
                            });
                            setAutoFetchMessage({
                              type: 'success',
                              title: '✅ Success!',
                              message: response.data.message,
                              details: `Destinations: ${response.data.totalDestinationsAdded || 0} | Hotels: ${response.data.totalHotelsAdded || 0}`
                            });
                            fetchData();
                            setTimeout(() => setAutoFetchMessage(null), 10000);
                          } catch (error) {
                            setAutoFetchMessage({
                              type: 'error',
                              title: '❌ Error',
                              message: error.response?.data?.message || error.message
                            });
                            setTimeout(() => setAutoFetchMessage(null), 8000);
                          } finally {
                            setFetchingAuto(false);
                          }
                        }
                      }}
                      className="btn btn-success"
                      disabled={fetchingAuto}
                    >
                      {fetchingAuto ? '⏳ Fetching...' : '🤖 Auto-Fetch'}
                    </button>
                    {autoFetchMessage && (
                      <div className={`auto-fetch-message ${autoFetchMessage.type}`} style={{ marginTop: 15 }}>
                        <div className="message-header">
                          <span>{autoFetchMessage.type === 'success' ? '✅' : '❌'}</span>
                          <h4>{autoFetchMessage.title}</h4>
                          <button onClick={() => setAutoFetchMessage(null)}>✕</button>
                        </div>
                        <p>{autoFetchMessage.message}</p>
                        {autoFetchMessage.details && <p className="message-details">{autoFetchMessage.details}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* API Configuration Form */}
              {showApiConfig && (
                <div className="form-section" style={{ marginTop: '30px', background: 'white', padding: '30px', borderRadius: '12px' }}>
                  <div className="section-header-new" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>🔑 API Keys Management</h2>
                    <button 
                      onClick={() => {
                        resetApiKeyForm();
                        setShowApiConfig(false);
                      }}
                      className="btn btn-secondary"
                    >
                      Close
                    </button>
                  </div>

                  {/* Add/Edit API Key Form */}
                  <form onSubmit={handleApiKeySubmit} className="admin-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>API Key Name *</label>
                        <input
                          type="text"
                          value={apiKeyForm.name}
                          onChange={(e) => setApiKeyForm({...apiKeyForm, name: e.target.value})}
                          required
                          placeholder="e.g., Google Maps API Key"
                        />
                      </div>
                      <div className="form-group">
                        <label>Service Type *</label>
                        <select
                          value={apiKeyForm.service}
                          onChange={(e) => setApiKeyForm({...apiKeyForm, service: e.target.value})}
                          required
                        >
                          <option value="Google Maps">Google Maps</option>
                          <option value="OpenWeatherMap">OpenWeatherMap</option>
                          <option value="Gemini AI">Gemini AI</option>
                          <option value="OpenTripMap">OpenTripMap</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>API Key *</label>
                      <input
                        type="password"
                        value={apiKeyForm.apiKey}
                        onChange={(e) => setApiKeyForm({...apiKeyForm, apiKey: e.target.value})}
                        required={!editingApiKey}
                        placeholder={editingApiKey ? "Leave empty to keep current key" : "Enter API key"}
                      />
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                        {editingApiKey ? '💡 Leave empty to keep the current API key unchanged' : '💡 Your API key will be securely stored'}
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Description (Optional)</label>
                      <textarea
                        value={apiKeyForm.description}
                        onChange={(e) => setApiKeyForm({...apiKeyForm, description: e.target.value})}
                        rows="2"
                        placeholder="Add a description for this API key..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Used In Modules (Select all that apply)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                        {['Travel Map', 'Travel Hub', 'Weather', 'Money Map', 'Buddy Bot', 'Places to Stay', 'Auto-Fetch', 'Other'].map((module) => (
                          <label key={module} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={apiKeyForm.usedIn?.includes(module) || false}
                              onChange={(e) => {
                                const currentUsedIn = apiKeyForm.usedIn || [];
                                if (e.target.checked) {
                                  setApiKeyForm({...apiKeyForm, usedIn: [...currentUsedIn, module]});
                                } else {
                                  setApiKeyForm({...apiKeyForm, usedIn: currentUsedIn.filter(m => m !== module)});
                                }
                              }}
                              style={{ marginRight: '5px' }}
                            />
                            <span style={{ fontSize: '14px' }}>{module}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        {editingApiKey ? '✅ Update API Key' : '✅ Add API Key'}
                      </button>
                      {editingApiKey && (
                        <button 
                          type="button" 
                          onClick={resetApiKeyForm}
                          className="btn btn-secondary"
                        >
                          ❌ Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {/* API Keys List */}
                  <div className="items-list-section" style={{ marginTop: '30px' }}>
                    <h3>📋 Saved API Keys</h3>
                    {apiKeys.length === 0 ? (
                      <div className="empty-message">No API keys configured yet. Add one above to get started.</div>
                    ) : (
                      <div className="items-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Service</th>
                              <th>API Key</th>
                              <th>Used In</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiKeys.map((key) => (
                              <tr key={key._id}>
                                <td>{key.name}</td>
                                <td>
                                  <span className="status-badge" style={{
                                    background: key.service === 'Google Maps' ? '#4285F4' :
                                                key.service === 'OpenWeatherMap' ? '#FF6B6B' :
                                                key.service === 'Gemini AI' ? '#8E75B2' :
                                                key.service === 'OpenTripMap' ? '#4ECDC4' : '#95A5A6',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600
                                  }}>
                                    {key.service}
                                  </span>
                                </td>
                                <td>
                                  <code style={{ 
                                    background: '#f5f5f5', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                  }}>
                                    {key.apiKey}
                                  </code>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {(key.usedIn && key.usedIn.length > 0) ? (
                                      key.usedIn.map((module, idx) => (
                                        <span
                                          key={idx}
                                          style={{
                                            background: '#3498db',
                                            color: 'white',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            display: 'inline-block'
                                          }}
                                        >
                                          {module}
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ color: '#95a5a6', fontSize: '12px' }}>Not specified</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-badge ${key.isActive ? 'active' : 'inactive'}`}>
                                    {key.isActive ? '✅ Active' : '❌ Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    onClick={() => handleEditApiKey(key)}
                                    className="btn-edit"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApiKey(key._id)}
                                    className="btn-delete"
                                  >
                                    🗑️ Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports & Analytics Section */}
          {activeSection === 'reports' && (
            <div className="section-view">
              <div className="section-header-new">
                <h2>📈 Reports & Analytics</h2>
              </div>
              {analytics && (
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h3>User Statistics</h3>
                    <div className="stat-item">
                      <span>Total Users:</span>
                      <strong>{analytics.users.total}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Active Users:</span>
                      <strong>{analytics.users.active}</strong>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h3>Destination Statistics</h3>
                    <div className="stat-item">
                      <span>Total Destinations:</span>
                      <strong>{analytics.destinations.total}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Popular Destinations:</span>
                      <strong>{analytics.destinations.popular}</strong>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h3>Booking Statistics</h3>
                    <div className="stat-item">
                      <span>Total Budgets:</span>
                      <strong>{analytics.budgets.total}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Conversations:</span>
                      <strong>{analytics.conversations.total}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close admin-content-area */}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 
