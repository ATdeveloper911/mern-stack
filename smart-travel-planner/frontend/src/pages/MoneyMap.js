import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calculator, Calendar, Users, MapPin, 
  Sparkles, Edit3, Save, Wallet, PieChart, TrendingUp, 
  DollarSign, CheckCircle, BrainCircuit 
} from 'lucide-react';
import api from '../utils/api';
import './MoneyMap.css';

const MoneyMap = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [calculationMode, setCalculationMode] = useState('smart'); // 'smart', 'manual'
  const [formData, setFormData] = useState({
    destination: '',
    tripDuration: 5,
    numberOfTravelers: 2,
    travelSeason: 'peak'
  });
  const [manualBudget, setManualBudget] = useState({
    accommodation: '',
    transportation: '',
    food: '',
    activities: '',
    miscellaneous: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState('');

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/travel-hub');
      setDestinations(response.data);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualBudget({ ...manualBudget, [name]: value });
  };

  const calculateManualTotal = () => {
    const total = 
      (parseFloat(manualBudget.accommodation) || 0) +
      (parseFloat(manualBudget.transportation) || 0) +
      (parseFloat(manualBudget.food) || 0) +
      (parseFloat(manualBudget.activities) || 0) +
      (parseFloat(manualBudget.miscellaneous) || 0);
    return total;
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    if (calculationMode === 'manual') {
      const total = calculateManualTotal();
      setResult({
        breakdown: {
          accommodation: parseFloat(manualBudget.accommodation) || 0,
          transportation: parseFloat(manualBudget.transportation) || 0,
          food: parseFloat(manualBudget.food) || 0,
          activities: parseFloat(manualBudget.activities) || 0,
          miscellaneous: parseFloat(manualBudget.miscellaneous) || 0,
          total: total
        },
        isManual: true
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/money-map/calculate', {
        destination: formData.destination,
        numberOfMembers: parseInt(formData.numberOfTravelers),
        days: parseInt(formData.tripDuration),
        season: formData.travelSeason
      });
      setResult(response.data);
      setAiInsights(response.data.insights || '');
      
      if (response.data.breakdown) {
        setManualBudget({
          accommodation: response.data.breakdown.accommodation || '',
          transportation: response.data.breakdown.transportation || '',
          food: response.data.breakdown.food || '',
          activities: response.data.breakdown.activities || '',
          miscellaneous: response.data.breakdown.miscellaneous || ''
        });
      }
    } catch (error) {
      alert('Error calculating budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCalculated = () => {
    if (result && result.breakdown) {
      setManualBudget({
        accommodation: result.breakdown.accommodation || '',
        transportation: result.breakdown.transportation || '',
        food: result.breakdown.food || '',
        activities: result.breakdown.activities || '',
        miscellaneous: result.breakdown.miscellaneous || ''
      });
      setCalculationMode('manual');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    
    // Logic to prepare payload remains same...
    let breakdown, total;
    if (calculationMode === 'manual') {
      total = calculateManualTotal();
      breakdown = {
        accommodation: parseFloat(manualBudget.accommodation) || 0,
        transportation: parseFloat(manualBudget.transportation) || 0,
        food: parseFloat(manualBudget.food) || 0,
        activities: parseFloat(manualBudget.activities) || 0,
        miscellaneous: parseFloat(manualBudget.miscellaneous) || 0,
        total: total
      };
    } else {
      breakdown = {
        accommodation: Number(result.breakdown?.accommodation || 0),
        transportation: Number(result.breakdown?.transportation || 0),
        food: Number(result.breakdown?.food || 0),
        activities: Number(result.breakdown?.activities || 0),
        miscellaneous: Number(result.breakdown?.miscellaneous || 0)
      };
      total = Number(result.breakdown?.total || Object.values(breakdown).reduce((a, b) => a + b, 0));
    }

    try {
      const payload = {
        destination: formData.destination,
        numberOfMembers: parseInt(formData.numberOfTravelers),
        days: parseInt(formData.tripDuration),
        season: formData.travelSeason,
        breakdown: breakdown,
        total: total,
        currency: 'PKR',
        isManual: calculationMode === 'manual',
        calculationMethod: calculationMode === 'manual' ? 'Manual' : 'Hybrid'
      };

      await api.post('/money-map/save', payload);
      alert('Budget saved to Travel Fund!');
      navigate('/travel-fund');
    } catch (error) {
      alert('Error saving budget.');
    }
  };

  const calculateEstimatedCosts = () => {
    if (calculationMode === 'manual') {
      const total = calculateManualTotal();
      return {
        accommodation: parseFloat(manualBudget.accommodation) || 0,
        transportation: parseFloat(manualBudget.transportation) || 0,
        food: parseFloat(manualBudget.food) || 0,
        activities: parseFloat(manualBudget.activities) || 0,
        miscellaneous: parseFloat(manualBudget.miscellaneous) || 0,
        total: total
      };
    }
    if (!result) return null;
    return result.breakdown || {};
  };

  const estimatedCosts = calculateEstimatedCosts();

  return (
    <div className="money-map-page">
      <div className="mm-overlay" />
      <div className="mm-shell">
        
        {/* Header */}
        <header className="mm-header">
          <button onClick={() => navigate('/dashboard')} className="mm-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="mm-header-content">
            <h1>Money Map</h1>
            <p>Smart budgeting for smarter travel.</p>
          </div>
        </header>

        <div className="mm-grid">
          {/* LEFT: Configuration */}
          <div className="mm-card mm-config">
            
            {/* Mode Toggle */}
            <div className="mm-toggle-container">
              <button
                type="button"
                className={`mm-toggle-btn ${calculationMode === 'smart' ? 'active' : ''}`}
                onClick={() => setCalculationMode('smart')}
              >
                <Sparkles size={16} /> Smart AI
              </button>
              <button
                type="button"
                className={`mm-toggle-btn ${calculationMode === 'manual' ? 'active' : ''}`}
                onClick={() => setCalculationMode('manual')}
              >
                <Edit3 size={16} /> Manual
              </button>
            </div>

            <form onSubmit={handleCalculate} className="mm-form">
              
              {/* Trip Details Section */}
              <div className="mm-section-label">Trip Details</div>
              
              <div className="mm-input-group">
                <label>Destination</label>
                <div className="mm-input-wrapper">
                  <MapPin className="mm-input-icon" size={18} />
                  <select
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    className="mm-select"
                  >
                    <option value="">Select Destination</option>
                    {destinations.map((dest) => (
                      <option key={dest._id} value={dest.name}>{dest.name}, {dest.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mm-row-2">
                <div className="mm-input-group">
                  <label>Travelers</label>
                  <div className="mm-input-wrapper">
                    <Users className="mm-input-icon" size={18} />
                    <input
                      type="number"
                      name="numberOfTravelers"
                      value={formData.numberOfTravelers}
                      onChange={handleChange}
                      min="1"
                      required
                      className="mm-input"
                    />
                  </div>
                </div>
                <div className="mm-input-group">
                  <label>Days</label>
                  <div className="mm-input-wrapper">
                    <Calendar className="mm-input-icon" size={18} />
                    <input
                      type="number"
                      name="tripDuration"
                      value={formData.tripDuration}
                      onChange={handleChange}
                      min="1"
                      required
                      className="mm-input"
                    />
                  </div>
                </div>
              </div>

              <div className="mm-input-group">
                <label>Season</label>
                <div className="mm-input-wrapper">
                  <TrendingUp className="mm-input-icon" size={18} />
                  <select
                    name="travelSeason"
                    value={formData.travelSeason}
                    onChange={handleChange}
                    required
                    className="mm-select"
                  >
                    <option value="peak">Peak Season (Expensive)</option>
                    <option value="off-peak">Off-Peak (Cheaper)</option>
                    <option value="shoulder">Shoulder (Balanced)</option>
                  </select>
                </div>
              </div>

              {/* Manual Inputs (Only if Manual Mode) */}
              {calculationMode === 'manual' && (
                <div className="mm-manual-section">
                  <div className="mm-section-label">Cost Estimates (PKR)</div>
                  {['accommodation', 'transportation', 'food', 'activities', 'miscellaneous'].map(field => (
                    <div className="mm-input-group" key={field}>
                      <label style={{textTransform: 'capitalize'}}>{field}</label>
                      <div className="mm-input-wrapper">
                        <span className="mm-currency">Rs.</span>
                        <input
                          type="number"
                          name={field}
                          value={manualBudget[field]}
                          onChange={handleManualChange}
                          min="0"
                          placeholder="0"
                          className="mm-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={loading} className="mm-calc-btn">
                {loading ? 'Calculating...' : <><Calculator size={18} /> Calculate Budget</>}
              </button>
            </form>
          </div>

          {/* RIGHT: Projection / Results */}
          <div className="mm-card mm-projection">
            <div className="mm-card-header">
              <PieChart className="mm-icon-gold" size={24} />
              <h2>Financial Projection</h2>
            </div>

            <div className="mm-total-box">
              <span className="mm-total-label">Total Estimated Cost</span>
              <div className="mm-total-amount">
                <span className="mm-curr">PKR</span>
                {estimatedCosts?.total?.toLocaleString() || 0}
              </div>
            </div>

            <div className="mm-breakdown-list">
              {[
                { label: 'Accommodation', key: 'accommodation', icon: '🏨' },
                { label: 'Transportation', key: 'transportation', icon: '🚗' },
                { label: 'Food & Dining', key: 'food', icon: '🍽️' },
                { label: 'Activities', key: 'activities', icon: '🎟️' },
                { label: 'Miscellaneous', key: 'miscellaneous', icon: '🛒' }
              ].map(item => (
                <div className="mm-bd-item" key={item.key}>
                  <div className="mm-bd-left">
                    <span className="mm-bd-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="mm-bd-val">
                    {Number(estimatedCosts?.[item.key] || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* AI Insights Block */}
            {aiInsights && calculationMode !== 'manual' && (
              <div className="mm-ai-box">
                <div className="mm-ai-header">
                  <BrainCircuit size={16} /> 
                  <span>Smart Insights</span>
                </div>
                <p>{aiInsights}</p>
              </div>
            )}

            {/* Actions */}
            {result && calculationMode !== 'manual' && (
              <button onClick={handleEditCalculated} className="mm-link-btn">
                <Edit3 size={14} /> Adjust Values Manually
              </button>
            )}

            {(result || calculationMode === 'manual') && (
              <button onClick={handleSave} className="mm-save-btn">
                <Save size={18} /> Save to Travel Fund
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default MoneyMap;