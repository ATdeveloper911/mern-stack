import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Edit3, LayoutGrid, List, Plus, Search, Trash2, X, 
  MapPin, Star, DollarSign, Image as ImageIcon, Sparkles, Loader, Filter 
} from 'lucide-react';
import api from '../../utils/api';

const AdminAccommodations = () => {
  const location = useLocation();
  const [active, setActive] = useState('hotels'); // hotels | restaurants
  const [view, setView] = useState('grid');
  
  // Data State
  const [items, setItems] = useState([]);
  const [destinations, setDestinations] = useState([]); // Stores available destinations
  const [selectedDestId, setSelectedDestId] = useState(''); // Global Filter
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  // Auto-Fetch State
  const [autoFetchQuery, setAutoFetchQuery] = useState('');
  const [fetchingAuto, setFetchingAuto] = useState(false);

  const initialForm = {
    name: '', address: '', rating: '', description: '', 
    images: '', amenities: '', contactNumber: '', 
    email: '', bookingLink: '', priceMin: '', priceMax: '', cuisine: '',
    destination: '', coordinatesLat: '', coordinatesLng: ''
  };
  const [form, setForm] = useState(initialForm);

  // 1. Initial Load (Destinations + Items)
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch Destinations for Dropdown
        const destRes = await api.get('/admin/destinations').catch(() => ({ data: [] }));
        const destList = destRes.data || [];
        setDestinations(destList);
        
        // Default to first destination if available
        if (destList.length > 0 && !selectedDestId) {
          setSelectedDestId(destList[0]._id);
        }

        // Fetch Accommodations
        await loadItems();
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Reload items when Tab changes
  useEffect(() => {
    loadItems();
  }, [active]);

  const loadItems = async () => {
    try {
      const endpoint = active === 'hotels' ? '/admin/hotels' : '/admin/restaurants';
      const res = await api.get(endpoint).catch(() => ({ data: [] }));
      setItems(res.data || []);
    } catch (e) {
      setItems([]);
    }
  };

  // Filter Logic: Query + Selected Destination
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(query.toLowerCase()) || 
                            i.address.toLowerCase().includes(query.toLowerCase());
      
      // If a destination is selected globally, only show items for that destination
      // (Assuming item.destination is either an ID or an Object with _id)
      const itemDestId = typeof i.destination === 'object' ? i.destination._id : i.destination;
      const matchesDest = selectedDestId ? itemDestId === selectedDestId : true;

      return matchesSearch && matchesDest;
    });
  }, [items, query, selectedDestId]);

  // --- ACTIONS ---

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      const endpoint = active === 'hotels' ? `/admin/hotels/${id}` : `/admin/restaurants/${id}`;
      await api.delete(endpoint);
      loadItems();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const openModal = (item = null) => {
    setEditing(item);
    setAutoFetchQuery(''); 
    setError('');

    if (item) {
      // Edit Mode
      setForm({
        ...initialForm,
        ...item,
        images: item.images ? item.images.join(',') : '',
        amenities: item.amenities ? item.amenities.join(',') : '',
        cuisine: item.cuisine ? item.cuisine.join(',') : '',
        priceMin: item.priceRange?.min || '',
        priceMax: item.priceRange?.max || '',
        coordinatesLat: item.coordinates?.lat || '',
        coordinatesLng: item.coordinates?.lng || '',
        // Ensure we extract the ID if destination is an object
        destination: typeof item.destination === 'object' ? item.destination._id : item.destination
      });
    } else {
      // Add Mode: Pre-fill with Global Selected Destination
      setForm({
        ...initialForm,
        destination: selectedDestId || ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // --- SMART AUTO FETCH (Context Aware) ---
  const handleAutoFetch = async () => {
    if (!autoFetchQuery.trim()) return;
    
    // Find the name of the selected destination to help the search
    const activeDestName = destinations.find(d => d._id === form.destination)?.name || '';
    const fullSearchTerm = `${autoFetchQuery} in ${activeDestName}`;

    setFetchingAuto(true);
    
    try {
      // SIMULATION: Replace this with real API call
      // const res = await api.post('/places-to-stay/auto-fetch', { query: fullSearchTerm, type: active });
      
      await new Promise(r => setTimeout(r, 1000)); // Fake delay
      
      const mockData = {
        name: autoFetchQuery, // Keep user typing casing
        address: `Near Main Bazaar, ${activeDestName || 'City Center'}`,
        description: `Located in the heart of ${activeDestName}, ${autoFetchQuery} offers premium services and distinct ${active === 'hotels' ? 'comfort' : 'flavors'}.`,
        rating: 4.2,
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
        amenities: active === 'hotels' ? ['Free WiFi', 'Parking', 'Heater', 'Breakfast'] : [],
        cuisine: active === 'restaurants' ? ['Local', 'Chinese', 'BBQ'] : [],
        contactNumber: '+92 300 1234567',
        priceMin: 5000,
        priceMax: 15000,
        lat: 36.3167, // Dummy coords
        lng: 74.6500
      };
      
      setForm(prev => ({
        ...prev,
        name: mockData.name,
        address: mockData.address,
        description: mockData.description,
        rating: mockData.rating,
        images: mockData.images.join(','),
        amenities: mockData.amenities.join(','),
        cuisine: mockData.cuisine.join(','),
        contactNumber: mockData.contactNumber,
        priceMin: mockData.priceMin,
        priceMax: mockData.priceMax,
        coordinatesLat: mockData.lat,
        coordinatesLng: mockData.lng,
      }));

    } catch (err) {
      setError('Auto-fetch failed. Please enter details manually.');
    } finally {
      setFetchingAuto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!form.destination) {
        throw new Error('Destination is required.');
      }
      if (!form.name?.trim() || !form.address?.trim()) {
        throw new Error('Name and address are required.');
      }

      const images = (form.images || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const amenities = (form.amenities || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const cuisine = (form.cuisine || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const lat = form.coordinatesLat !== '' ? Number(form.coordinatesLat) : undefined;
      const lng = form.coordinatesLng !== '' ? Number(form.coordinatesLng) : undefined;
      const minPrice = form.priceMin !== '' ? Number(form.priceMin) : undefined;
      const maxPrice = form.priceMax !== '' ? Number(form.priceMax) : undefined;

      // Construct Payload (match backend models)
      const payload = {
        destination: form.destination,
        name: form.name.trim(),
        address: form.address.trim(),
        rating: form.rating !== '' ? Number(form.rating) : undefined,
        description: form.description?.trim() || undefined,
        bookingLink: form.bookingLink?.trim() || undefined,
        contactNumber: form.contactNumber?.trim() || undefined,
        email: form.email?.trim() || undefined,
        images: images.length ? images : undefined,
        coordinates: lat !== undefined || lng !== undefined ? { lat, lng } : undefined,
        priceRange: minPrice !== undefined || maxPrice !== undefined
          ? { min: minPrice, max: maxPrice, currency: 'PKR' }
          : undefined,
      };

      if (active === 'hotels') {
        payload.amenities = amenities.length ? amenities : undefined;
      } else {
        payload.cuisine = cuisine.length ? cuisine : undefined;
      }

      if (editing?._id) {
        const endpoint = active === 'hotels' ? `/admin/hotels/${editing._id}` : `/admin/restaurants/${editing._id}`;
        await api.put(endpoint, payload);
      } else {
        const endpoint = active === 'hotels' ? '/admin/hotels' : '/admin/restaurants';
        await api.post(endpoint, payload);
      }
      closeModal();
      loadItems();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ad-page-container">
      {/* 1. Header */}
      <div className="ad-page-head">
        <div>
          <div className="ad-page-title">
            <h2>Accommodations</h2>
          </div>
          <p className="ad-page-subtitle">Manage properties for your destinations.</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Add New {active === 'hotels' ? 'Hotel' : 'Restaurant'}
        </button>
      </div>

      {/* 2. Toolbar */}
      <div className="ad-toolbar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Type Toggle */}
          <div className="ad-toggle-group">
            <button className={`ad-toggle-btn ${active === 'hotels' ? 'active' : ''}`} onClick={() => setActive('hotels')}>Hotels</button>
            <button className={`ad-toggle-btn ${active === 'restaurants' ? 'active' : ''}`} onClick={() => setActive('restaurants')}>Restaurants</button>
          </div>

          {/* Destination Global Filter */}
          <div className="ad-filter-select-wrapper">
            <Filter size={16} className="ad-filter-icon"/>
            <select 
              className="ad-filter-select"
              value={selectedDestId} 
              onChange={(e) => setSelectedDestId(e.target.value)}
            >
              <option value="">All Destinations</option>
              {destinations.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ad-toolbar-right">
          <div className="ad-search-input">
            <Search size={18} />
            <input type="text" placeholder={`Search ${active}...`} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="ad-view-toggle">
            <button className={`ad-icon-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={18} /></button>
            <button className={`ad-icon-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><LayoutGrid size={18} /></button>
          </div>
        </div>
      </div>

      {/* 3. Content */}
      {loading ? (
        <div className="ad-loading">Loading properties...</div>
      ) : filteredItems.length === 0 ? (
        <div className="ad-empty">
          No {active} found for this destination. 
          <br/>Click "Add New" to create one.
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="ad-grid-view">
              {filteredItems.map(item => (
                <div key={item._id} className="ad-acc-card">
                  <div className="ad-acc-img-wrapper">
                    {item.images && item.images[0] ? <img src={item.images[0]} alt={item.name} /> : <div className="ad-acc-placeholder"><ImageIcon size={32} /></div>}
                    <span className="ad-acc-rating"><Star size={12} fill="currentColor" /> {item.rating || 'N/A'}</span>
                  </div>
                  <div className="ad-acc-body">
                    <h3 className="ad-acc-title">{item.name}</h3>
                    <p className="ad-acc-addr"><MapPin size={14} /> {item.address}</p>
                    <div className="ad-acc-meta">
                      <span><DollarSign size={14} /> {item.priceRange?.min} - {item.priceRange?.max}</span>
                    </div>
                    <div className="ad-acc-actions">
                      <button onClick={() => openModal(item)} className="ad-action-btn edit"><Edit3 size={16} /> Edit</button>
                      <button onClick={() => handleDelete(item._id)} className="ad-action-btn delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ad-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="ad-table">
                <thead>
                  <tr><th>Name</th><th>Destination</th><th>Rating</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div className="ad-user-cell">
                          <div className="ad-table-thumb">{item.images?.[0] ? <img src={item.images[0]} alt="" /> : <ImageIcon size={16}/>}</div>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                        </div>
                      </td>
                      {/* Handle destination object or string */}
                      <td>{typeof item.destination === 'object' ? item.destination?.name : 'Unknown'}</td>
                      <td><span className="ad-badge gold"><Star size={10} fill="currentColor" style={{ marginRight: 4 }}/>{item.rating}</span></td>
                      <td>
                        <div className="ad-actions-row">
                          <button onClick={() => openModal(item)} className="ad-icon-btn"><Edit3 size={16}/></button>
                          <button onClick={() => handleDelete(item._id)} className="ad-icon-btn"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 4. MODAL */}
      {isModalOpen && (
        <div className="ad-modal-overlay">
          <div className="ad-modal">
            {/* Header */}
            <div className="ad-modal-header">
              <h3>{editing ? 'Edit Property' : `Add New ${active === 'hotels' ? 'Hotel' : 'Restaurant'}`}</h3>
              <button onClick={closeModal} className="ad-icon-btn"><X size={20}/></button>
            </div>

            {/* Scrollable Body */}
            <div className="ad-modal-scroll">
              
              {/* Destination Dropdown (Crucial for linking) */}
              <div className="ad-field" style={{ marginBottom: 20 }}>
                <label>Destination (Required)</label>
                <select 
                  className="ad-select" 
                  value={form.destination} 
                  onChange={(e) => setForm({...form, destination: e.target.value})}
                  required
                >
                  <option value="">Select Destination...</option>
                  {destinations.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* MAGIC FILL */}
              {!editing && form.destination && (
                <div className="ad-magic-box">
                  <div className="ad-magic-header">
                    <Sparkles size={16} className="ad-magic-icon" />
                    <span>Auto-Fill Details</span>
                  </div>
                  <div className="ad-magic-input-group">
                    <input 
                      type="text" 
                      placeholder={`Name of ${active === 'hotels' ? 'Hotel' : 'Restaurant'}...`} 
                      value={autoFetchQuery}
                      onChange={(e) => setAutoFetchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAutoFetch()}
                    />
                    <button onClick={handleAutoFetch} disabled={fetchingAuto}>
                      {fetchingAuto ? <Loader size={16} className="ad-spin" /> : 'Fetch'}
                    </button>
                  </div>
                  <p className="ad-magic-hint">
                    Searching in <strong>{destinations.find(d => d._id === form.destination)?.name}</strong>
                  </p>
                </div>
              )}

              <form id="accForm" onSubmit={handleSubmit}>
                <div className="ad-form-grid-2">
                  <div className="ad-field">
                    <label>Property Name</label>
                    <input className="ad-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="ad-field">
                    <label>Rating (0-5)</label>
                    <input type="number" step="0.1" className="ad-input" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} />
                  </div>
                </div>

                <div className="ad-field" style={{ margin: '12px 0' }}>
                  <label>Full Address</label>
                  <input className="ad-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
                </div>

                <div className="ad-form-grid-2">
                  <div className="ad-field">
                    <label>Latitude</label>
                    <input type="number" step="any" className="ad-input" value={form.coordinatesLat} onChange={e => setForm({...form, coordinatesLat: e.target.value})} placeholder="34.1234" />
                  </div>
                  <div className="ad-field">
                    <label>Longitude</label>
                    <input type="number" step="any" className="ad-input" value={form.coordinatesLng} onChange={e => setForm({...form, coordinatesLng: e.target.value})} placeholder="72.1234" />
                  </div>
                </div>

                <div className="ad-form-grid-2">
                  <div className="ad-field">
                    <label>Min Price (PKR)</label>
                    <input type="number" className="ad-input" value={form.priceMin} onChange={e => setForm({...form, priceMin: e.target.value})} />
                  </div>
                  <div className="ad-field">
                    <label>Max Price (PKR)</label>
                    <input type="number" className="ad-input" value={form.priceMax} onChange={e => setForm({...form, priceMax: e.target.value})} />
                  </div>
                </div>

                <div className="ad-field" style={{ margin: '12px 0' }}>
                  <label>Images (Comma separated URLs)</label>
                  <input className="ad-input" value={form.images} onChange={e => setForm({...form, images: e.target.value})} placeholder="https://..." />
                </div>

                <div className="ad-form-grid-2">
                  <div className="ad-field">
                    <label>Contact Number</label>
                    <input className="ad-input" value={form.contactNumber} onChange={e => setForm({...form, contactNumber: e.target.value})} />
                  </div>
                  <div className="ad-field">
                    <label>{active === 'hotels' ? 'Amenities' : 'Cuisine'} (Comma separated)</label>
                    <input 
                      className="ad-input" 
                      value={active === 'hotels' ? form.amenities : form.cuisine} 
                      onChange={e => active === 'hotels' ? setForm({...form, amenities: e.target.value}) : setForm({...form, cuisine: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="ad-field" style={{ marginTop: 12 }}>
                  <label>Description</label>
                  <textarea className="ad-textarea" rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
                </div>

                {error && <div className="ad-error-msg">{error}</div>}
              </form>
            </div>

            {/* Footer */}
            <div className="ad-modal-footer">
              <button type="button" className="ad-btn" onClick={closeModal}>Cancel</button>
              <button type="submit" form="accForm" className="ad-btn ad-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccommodations;