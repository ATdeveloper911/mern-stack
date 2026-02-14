import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  BadgeDollarSign,
  Bot,
  ChevronDown,
  CloudSun,
  Crown,
  Globe,
  History,
  Hotel,
  Landmark,
  LogOut,
  MapPinned,
  PiggyBank,
  Plane,
  Route,
  Search,
  Sparkles,
  User,
  Wallet,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const apiOriginFromBaseUrl = (baseUrl) => {
  if (!baseUrl) return 'http://localhost:5000';
  return baseUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
};

const QUOTES = [
  'Collect moments, not things.',
  'Adventure begins the moment you decide to go.',
  'Travel is the only thing you buy that makes you richer.',
  'Find your next favorite place on the map.',
  'Your journey deserves a plan as smart as you are.',
];

const formatMoney = (value) => {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [popularDestinations, setPopularDestinations] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Profile Menu State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedImage]);

  const fetchDashboardData = async () => {
    try {
      const [destinationsRes, budgetsRes] = await Promise.all([
        api.get('/dashboard/popular-destinations'),
        api.get('/travel-fund').catch(() => ({ data: [] })),
      ]);

      setPopularDestinations(destinationsRes.data);
      setBudgets(budgetsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/travel-hub?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + (b.total || 0), 0);
  const activeTrips = budgets.length;
  const name = user?.name || 'Traveler';
  const initial = name.charAt(0).toUpperCase();

  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    return apiOriginFromBaseUrl(base);
  }, []);

  const profilePictureUrl = user?.profilePicture ? `${apiOrigin}${user.profilePicture}` : '';

  const sectionVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  };

  const FeatureCard = ({ title, subtitle, icon: Icon, onClick, color = 'blue' }) => (
    <motion.button
      type="button"
      className={`stp-card stp-feature-card stp-tint-${color}`}
      onClick={onClick}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="stp-feature-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="stp-feature-body">
        <span className="stp-feature-title">{title}</span>
        {subtitle ? <span className="stp-feature-subtitle">{subtitle}</span> : null}
      </span>
    </motion.button>
  );

  return (
    <div className="stp-dashboard">
      <header className="stp-nav">
        <div className="stp-nav-inner">
          <button type="button" className="stp-brand" onClick={() => navigate('/dashboard')}>
            <img className="stp-brand-logo" src="/logo/main_logo.jpeg" alt="Smart Travel Planner" />
            <span className="stp-brand-text">Smart Travel Planner</span>
          </button>

          {/* Profile Dropdown Section */}
          <div className="stp-profile-wrapper" ref={menuRef}>
            <button 
              className={`stp-profile-trigger ${isProfileOpen ? 'active' : ''}`}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              {profilePictureUrl ? (
                <img className="stp-nav-avatar" src={profilePictureUrl} alt={name} />
              ) : (
                <div className="stp-avatar">{initial}</div>
              )}
              <span className="stp-profile-name">{name}</span>
              <ChevronDown size={16} className={`stp-chevron ${isProfileOpen ? 'rotate' : ''}`} />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  className="stp-dropdown-menu"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="stp-dropdown-header">
                    <p className="stp-dd-user">{user?.name}</p>
                    <p className="stp-dd-email">{user?.email}</p>
                  </div>
                  <div className="stp-dropdown-links">
                    <button onClick={() => navigate('/profile')} className="stp-dd-item">
                      <User size={16} /> Profile
                    </button>
                    <div className="stp-dd-divider" />
                    <button
                      onClick={() => {
                        logout();
                        navigate('/', { replace: true });
                      }}
                      className="stp-dd-item stp-dd-logout"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="stp-shell">
        <motion.section
          className="stp-hero stp-card"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="stp-hero-top">
            <div className="stp-hero-avatar-col">
              <button
                type="button"
                className="stp-hero-avatar-btn"
                onClick={() => {
                  if (profilePictureUrl) setSelectedImage(profilePictureUrl);
                }}
              >
                {profilePictureUrl ? (
                  <img className="stp-hero-avatar" src={profilePictureUrl} alt={name} />
                ) : (
                  <div className="stp-hero-avatar-fallback" aria-hidden="true">{initial}</div>
                )}
              </button>
            </div>
            <div>
              <p className="stp-kicker">
                <Sparkles className="stp-kicker-icon" />
                Welcome back
              </p>
              <h1 className="stp-hero-title">{name}</h1>
              <p className="stp-hero-subtitle">{quote}</p>
            </div>

            <form className="stp-search" onSubmit={handleSearch}>
              <Search className="stp-search-icon" />
              <input
                className="stp-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations, cities, experiences…"
                aria-label="Search destinations"
              />
              <button className="stp-search-btn" type="submit">
                Search
              </button>
            </form>
          </div>

          <div className="stp-stats-row">
            <div className="stp-stat stp-card stp-tint-emerald">
              <div className="stp-stat-icon">
                <Wallet />
              </div>
              <div>
                <div className="stp-stat-label">Total Budget</div>
                <div className="stp-stat-value">{formatMoney(totalBudget)}</div>
              </div>
            </div>

            <div className="stp-stat stp-card stp-tint-blue">
              <div className="stp-stat-icon">
                <Route />
              </div>
              <div>
                <div className="stp-stat-label">Active Trips</div>
                <div className="stp-stat-value">{activeTrips}</div>
              </div>
            </div>

            <div className="stp-stat stp-card stp-tint-amber">
              <div className="stp-stat-icon">
                <PiggyBank />
              </div>
              <div>
                <div className="stp-stat-label">Budget Saved</div>
                <div className="stp-stat-value">{formatMoney(totalBudget * 0.18)}</div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="stp-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="stp-section-head">
            <h2 className="stp-section-title">Quick Actions</h2>
            <p className="stp-section-subtitle">Everything you need—organized, beautiful, fast.</p>
          </div>

          <div className="stp-groups">
            <div className="stp-group">
              <div className="stp-group-title">Plan</div>
              <div className="stp-grid">
                <FeatureCard title="Travel Hub" subtitle="Discover & plan" icon={Globe} color="blue" onClick={() => navigate('/travel-hub')} />
                <FeatureCard title="Buddy Bot" subtitle="AI travel help" icon={Bot} color="purple" onClick={() => navigate('/buddy-bot')} />
                <FeatureCard title="Weather" subtitle="Conditions & forecasts" icon={CloudSun} color="sky" onClick={() => navigate('/weather')} />
              </div>
            </div>

            <div className="stp-group">
              <div className="stp-group-title">Manage</div>
              <div className="stp-grid">
                <FeatureCard title="Money Map" subtitle="Spending insights" icon={BadgeDollarSign} color="green" onClick={() => navigate('/money-map')} />
                <FeatureCard title="Travel Fund" subtitle="Budgets & savings" icon={Wallet} color="emerald" onClick={() => navigate('/travel-fund')} />
                <FeatureCard title="Bucket List" subtitle="Dream destinations" icon={Plane} color="orange" onClick={() => navigate('/bucket-list')} />
              </div>
            </div>

            <div className="stp-group">
              <div className="stp-group-title">Explore</div>
              <div className="stp-grid">
                <FeatureCard title="Places to Stay" subtitle="Hotels & stays" icon={Hotel} color="rose" onClick={() => navigate('/places-to-stay')} />
                <FeatureCard title="Travel Map" subtitle="Pins & routes" icon={MapPinned} color="amber" onClick={() => navigate('/travel-map')} />
                <FeatureCard title="Travel History" subtitle="Memories & logs" icon={History} color="indigo" onClick={() => navigate('/travel-history')} />
                {user?.role === 'admin' ? (
                  <FeatureCard
                    title="Admin Panel"
                    subtitle="Manage platform"
                    icon={Crown}
                    color="gold"
                    onClick={() => navigate('/admin')}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="stp-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.16 }}
        >
          <div className="stp-section-head">
            <h2 className="stp-section-title">Popular Destinations</h2>
            <p className="stp-section-subtitle">Curated picks based on what travelers love right now.</p>
          </div>

          <div className="stp-destinations">
            {loading ? (
              <div className="stp-loading">Loading…</div>
            ) : popularDestinations.length ? (
              popularDestinations.map((dest) => {
                const hasImage = dest.images && dest.images.length > 0;
                return (
                  <motion.button
                    key={dest._id}
                    type="button"
                    className={`stp-card stp-destination-card ${hasImage ? 'stp-has-img' : ''}`}
                    onClick={() => navigate(`/travel-hub?id=${dest._id}`)}
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {hasImage ? (
                      <div 
                        className="stp-dest-bg" 
                        style={{ backgroundImage: `url(${dest.images[0]})` }} 
                      />
                    ) : (
                      <div className="stp-dest-placeholder">
                         <Landmark size={32} />
                      </div>
                    )}
                    
                    <div className="stp-dest-content">
                      {!hasImage && <span className="stp-dest-category">{dest.category || 'Destination'}</span>}
                      <span className="stp-dest-name">{dest.name}</span>
                      <span className="stp-dest-location">
                        <MapPinned size={12} style={{marginRight: 4}}/>
                        {dest.city}, {dest.country}
                      </span>
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className="stp-loading">No destinations yet.</div>
            )}
          </div>
        </motion.section>
      </main>

      <AnimatePresence>
        {selectedImage ? (
          <motion.div
            className="stp-lightbox"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className="stp-lightbox-inner"
              initial={{ scale: 0.95, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 14 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="stp-lightbox-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close image preview"
              >
                <X size={18} />
              </button>
              <img className="stp-lightbox-img" src={selectedImage} alt="Profile" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;