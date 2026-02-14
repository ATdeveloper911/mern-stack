import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Filter, Briefcase, Map, 
  Calendar, DollarSign, Star, Trash2, Edit3, 
  Share2, X, MapPin, CheckCircle, AlertCircle, Clock, Check
} from 'lucide-react';
import api from '../utils/api';
import './TravelHistory.css';

const TravelHistory = () => {
  const navigate = useNavigate();
  
  // Data State
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [filters, setFilters] = useState({ status: 'all', timePeriod: 'all', destination: 'all' });
  const [stats, setStats] = useState({ totalTrips: 0, destinationsVisited: 0, daysTraveled: 0, totalSpent: 0 });
  const [toast, setToast] = useState(null); // Notification State

  // Edit Modal State
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '', startDate: '', endDate: '', accommodation: '', rating: '', notes: ''
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, trips]);

  // --- HELPERS ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await api.get('/travel-fund');
      const allTrips = response.data || [];
      const actualTrips = allTrips.filter(trip => !trip.isBucketList);
      setTrips(actualTrips);
      calculateStats(actualTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tripsData) => {
    const totalTrips = tripsData.length;
    const uniqueDestinations = new Set(tripsData.map(t => t.destination)).size;
    const daysTraveled = tripsData.reduce((sum, t) => sum + (t.days || 0), 0);
    const totalSpent = tripsData.reduce((sum, t) => sum + (t.total || 0), 0);
    setStats({ totalTrips, destinationsVisited: uniqueDestinations, daysTraveled, totalSpent });
  };

  const applyFilters = () => {
    let filtered = [...trips];
    if (filters.status !== 'all') filtered = filtered.filter(trip => trip.status === filters.status);
    if (filters.destination !== 'all') filtered = filtered.filter(trip => trip.destination === filters.destination);
    
    if (filters.timePeriod !== 'all') {
      const now = new Date();
      filtered = filtered.filter(trip => {
        if (!trip.startDate) return false;
        const startDate = new Date(trip.startDate);
        const diffTime = now - startDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        switch (filters.timePeriod) {
          case 'last-month': return diffDays <= 30;
          case 'last-3-months': return diffDays <= 90;
          case 'last-year': return diffDays <= 365;
          default: return true;
        }
      });
    }
    setFilteredTrips(filtered);
  };

  // --- ACTIONS ---

  const handleShare = async (trip) => {
    const shareData = {
      title: `Trip to ${trip.destination}`,
      text: `I'm planning a trip to ${trip.destination}! ${trip.days} days, Budget: PKR ${trip.total?.toLocaleString()}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully!');
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard(shareData.text);
      }
    } else {
      copyToClipboard(shareData.text);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Trip details copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleModify = (trip) => {
    setSelectedTrip(trip);
    let endDate = trip.endDate;
    // Calculate end date if missing
    if (!endDate && trip.startDate && trip.days) {
      const start = new Date(trip.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + trip.days);
      endDate = end.toISOString().split('T')[0];
    }
    
    setEditForm({
      status: trip.status || 'planned',
      startDate: trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : '',
      endDate: endDate || '',
      accommodation: trip.accommodation || '',
      rating: trip.rating || '',
      notes: trip.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTrip) return;
    try {
      await api.put(`/travel-fund/${selectedTrip._id}`, editForm);
      showToast('Trip updated successfully!');
      setShowEditModal(false);
      setSelectedTrip(null);
      fetchTrips();
    } catch (error) {
      showToast('Failed to update trip.', 'error');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip record?')) {
      try {
        await api.delete(`/travel-fund/${tripId}`);
        showToast('Trip deleted.');
        fetchTrips();
      } catch (error) {
        showToast('Failed to delete trip.', 'error');
      }
    }
  };

  const handleExportHistory = () => {
    const csvContent = [
      ['Destination', 'Start Date', 'Total Cost', 'Status'],
      ...filteredTrips.map(trip => [
        trip.destination,
        trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'N/A',
        trip.total || 0,
        trip.status || 'planned'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Export started!');
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'completed': return { label: 'Completed', icon: CheckCircle, style: 'status-completed' };
      case 'confirmed': return { label: 'Confirmed', icon: CheckCircle, style: 'status-confirmed' };
      case 'cancelled': return { label: 'Cancelled', icon: AlertCircle, style: 'status-cancelled' };
      default: return { label: 'Planned', icon: Clock, style: 'status-planned' };
    }
  };

  const formatDateRange = (startDate, days) => {
    if (!startDate) return `${days} Days Trip`;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const uniqueDestinations = [...new Set(trips.map(t => t.destination))];

  return (
    <div className="th-page">
      <div className="th-overlay" />
      <div className="th-shell">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`th-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <header className="th-header">
          <div className="th-header-top">
            <button onClick={() => navigate('/dashboard')} className="th-back-btn">
              <ArrowLeft size={18} /> Dashboard
            </button>
            <button onClick={handleExportHistory} className="th-export-btn">
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="th-header-content">
            <h1>Travel History</h1>
            <p>Your journey logs and past adventures.</p>
          </div>
        </header>

        {/* Stats Row - COLOR CODED */}
        <div className="th-stats-row">
          <div className="th-stat-card">
            <div className="th-stat-icon icon-blue"><Briefcase size={22} /></div>
            <div>
              <div className="th-stat-val">{stats.totalTrips}</div>
              <div className="th-stat-label">Total Trips</div>
            </div>
          </div>
          <div className="th-stat-card">
            <div className="th-stat-icon icon-emerald"><Map size={22} /></div>
            <div>
              <div className="th-stat-val">{stats.destinationsVisited}</div>
              <div className="th-stat-label">Destinations</div>
            </div>
          </div>
          <div className="th-stat-card">
            <div className="th-stat-icon icon-purple"><Calendar size={22} /></div>
            <div>
              <div className="th-stat-val">{stats.daysTraveled}</div>
              <div className="th-stat-label">Days Traveled</div>
            </div>
          </div>
          <div className="th-stat-card">
            <div className="th-stat-icon icon-gold"><DollarSign size={22} /></div>
            <div>
              <div className="th-stat-val">
                {stats.totalSpent > 100000 
                  ? `${Math.round(stats.totalSpent / 1000)}k` 
                  : stats.totalSpent.toLocaleString()}
              </div>
              <div className="th-stat-label">Total Spent (PKR)</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="th-filters">
          <div className="th-filter-group">
            <Filter size={16} className="th-filter-icon"/>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="th-filter-group">
            <Calendar size={16} className="th-filter-icon"/>
            <select value={filters.timePeriod} onChange={(e) => setFilters({...filters, timePeriod: e.target.value})}>
              <option value="all">Any Time</option>
              <option value="last-month">Last Month</option>
              <option value="last-year">Last Year</option>
            </select>
          </div>
          <div className="th-filter-group">
            <MapPin size={16} className="th-filter-icon"/>
            <select value={filters.destination} onChange={(e) => setFilters({...filters, destination: e.target.value})}>
              <option value="all">All Destinations</option>
              {uniqueDestinations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Trips List - COLORFUL CARDS */}
        <div className="th-list">
          {loading ? (
            <div className="th-loading">Loading history...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="th-empty">
              <h3>No trips found</h3>
              <p>Start your journey by planning a new trip in the Money Map.</p>
              <button onClick={() => navigate('/money-map')} className="th-cta-btn">Plan a Trip</button>
            </div>
          ) : (
            filteredTrips.map(trip => {
              const status = getStatusConfig(trip.status || 'planned');
              const StatusIcon = status.icon;
              
              return (
                <div key={trip._id} className="th-trip-card">
                  {/* Left Color Strip */}
                  <div className={`th-status-strip ${status.style}`}></div>
                  
                  <div className="th-trip-main">
                    <div className="th-trip-header">
                      <h3>{trip.destination}</h3>
                      <span className={`th-status-badge ${status.style}`}>
                        <StatusIcon size={12} /> {status.label}
                      </span>
                    </div>
                    
                    <div className="th-trip-meta">
                      <div className="th-meta-item">
                        <Calendar size={14} className="th-meta-icon icon-blue" />
                        <span>{formatDateRange(trip.startDate, trip.days)}</span>
                      </div>
                      <div className="th-meta-item">
                        <DollarSign size={14} className="th-meta-icon icon-emerald" />
                        <span>PKR {trip.total?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {trip.rating && (
                      <div className="th-trip-rating">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < Math.floor(trip.rating) ? 'fill-star' : 'empty-star'} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="th-trip-actions">
                    <button onClick={() => handleModify(trip)} className="th-icon-btn btn-edit" title="Edit Trip">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleShare(trip)} className="th-icon-btn btn-share" title="Share Trip">
                      <Share2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteTrip(trip._id)} className="th-icon-btn btn-delete" title="Delete Trip">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit Modal (Scrollable) */}
        {showEditModal && selectedTrip && (
          <div className="th-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="th-modal" onClick={e => e.stopPropagation()}>
              <div className="th-modal-header">
                <h2>Edit Trip Details</h2>
                <button onClick={() => setShowEditModal(false)} className="th-close-modal"><X size={20}/></button>
              </div>
              
              <div className="th-modal-body">
                <div className="th-form-group">
                  <label>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                    <option value="planned">Planned</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="th-row-2">
                  <div className="th-form-group">
                    <label>Start Date</label>
                    <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} />
                  </div>
                  <div className="th-form-group">
                    <label>End Date</label>
                    <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} />
                  </div>
                </div>
                
                <div className="th-form-group">
                  <label>Accommodation Name</label>
                  <input 
                    type="text" 
                    value={editForm.accommodation} 
                    onChange={(e) => setEditForm({...editForm, accommodation: e.target.value})}
                    placeholder="Where are you staying?"
                  />
                </div>

                <div className="th-form-group">
                  <label>Your Rating (1-5)</label>
                  <input type="number" min="1" max="5" value={editForm.rating} onChange={(e) => setEditForm({...editForm, rating: e.target.value})} />
                </div>
                
                <div className="th-form-group">
                  <label>Personal Notes</label>
                  <textarea 
                    rows="5" 
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})} 
                    placeholder="What did you love about this trip?"
                  ></textarea>
                </div>
              </div>
              
              <div className="th-modal-footer">
                <button onClick={handleSaveEdit} className="th-save-btn">Save Changes</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TravelHistory;