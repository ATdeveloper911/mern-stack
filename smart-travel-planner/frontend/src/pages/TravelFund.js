import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Wallet, Calendar, Users, 
  MapPin, PlusCircle, Loader, TrendingUp 
} from 'lucide-react';
import api from '../utils/api';
import './TravelFund.css';

const formatMoney = (amount) => {
  return Number(amount).toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  });
};

const TravelFund = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await api.get('/travel-fund');
      // Filter out bucket list items - only show actual budgets
      // If you want to show everything, remove the filter
      const activeBudgets = response.data.filter(b => !b.isBucketList); 
      setBudgets(activeBudgets);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent card click
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.delete(`/travel-fund/${id}`);
        setBudgets(budgets.filter(b => b._id !== id));
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  return (
    <div className="travel-fund-page">
      <div className="tf-overlay" />
      <div className="tf-shell">
        
        {/* Header */}
        <header className="tf-header">
          <button onClick={() => navigate('/dashboard')} className="tf-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="tf-header-content">
            <h1>Travel Fund</h1>
            <p>Your saved trips and financial goals.</p>
          </div>
        </header>

        {/* Content */}
        <div className="tf-content">
          {loading ? (
            <div className="tf-loading">
              <Loader className="tf-spin" size={32} />
              <p>Loading your portfolio...</p>
            </div>
          ) : (
            <>
              {/* Stats / Summary Row (Optional Polish) */}
              {budgets.length > 0 && (
                <div className="tf-stats-bar">
                  <div className="tf-stat-item">
                    <span className="tf-stat-label">Total Projected Cost</span>
                    <span className="tf-stat-value">
                      {formatMoney(budgets.reduce((acc, curr) => acc + (curr.total || 0), 0))}
                    </span>
                  </div>
                  <div className="tf-stat-item">
                    <span className="tf-stat-label">Planned Trips</span>
                    <span className="tf-stat-value">{budgets.length}</span>
                  </div>
                </div>
              )}

              <div className="tf-grid">
                {/* Create New Card */}
                <button onClick={() => navigate('/money-map')} className="tf-create-card">
                  <div className="tf-create-icon">
                    <PlusCircle size={40} strokeWidth={1.5} />
                  </div>
                  <h3>Plan New Trip</h3>
                  <p>Calculate a new budget</p>
                </button>

                {/* Budget Cards */}
                {budgets.map((budget) => (
                  <div key={budget._id} className="tf-card">
                    <div className="tf-card-header">
                      <div className="tf-dest-icon">
                        <MapPin size={20} />
                      </div>
                      <div className="tf-dest-info">
                        <h3>{budget.destination}</h3>
                        <span className="tf-season-badge">{budget.season} Season</span>
                      </div>
                    </div>

                    <div className="tf-card-details">
                      <div className="tf-detail-row">
                        <Users size={16} className="tf-icon-muted" />
                        <span>{budget.numberOfMembers} Travelers</span>
                      </div>
                      <div className="tf-detail-row">
                        <Calendar size={16} className="tf-icon-muted" />
                        <span>{budget.days} Days</span>
                      </div>
                    </div>

                    <div className="tf-divider" />

                    <div className="tf-card-total">
                      <span className="tf-total-label">Estimated Cost</span>
                      <span className="tf-total-amount">{formatMoney(budget.total)}</span>
                    </div>

                    <div className="tf-card-actions">
                      <button 
                        className="tf-action-btn delete"
                        onClick={(e) => handleDelete(budget._id, e)}
                        title="Delete Budget"
                      >
                        <Trash2 size={18} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State (if no budgets and not loading) */}
              {budgets.length === 0 && (
                <div className="tf-empty-state">
                  <Wallet size={48} className="tf-empty-icon" />
                  <h3>No Savings Goals Yet</h3>
                  <p>Use the Money Map to calculate and save your first trip budget.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelFund;