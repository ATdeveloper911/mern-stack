import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const titleFromPath = (pathname) => {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/accommodations')) return 'Accommodations';
  if (pathname.startsWith('/admin/content')) return 'Content';
  if (pathname.startsWith('/admin/reports')) return 'Reports';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  if (pathname.startsWith('/admin/profile')) return 'Profile';
  return 'Admin';
};

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [searchValue, setSearchValue] = useState('');

  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname]);
  const name = user?.name || 'Admin';
  const initial = name.charAt(0).toUpperCase();

  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    return base.replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }, []);

  const profilePictureUrl = user?.profilePicture ? `${apiOrigin}${user.profilePicture}` : '';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('q') || '');
  }, [location.pathname, location.search]);

  const submitSearch = () => {
    const params = new URLSearchParams(location.search);
    const next = searchValue.trim();
    if (next) params.set('q', next);
    else params.delete('q');
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="ad-header">
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <h1>Smart Travel Planner</h1>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ad-muted)' }}>{title}</span>
      </div>

      <div className="ad-header-right">
        <div className="ad-search" aria-label="Admin search">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch();
            }}
          />
        </div>

        <button type="button" className="ad-profile-btn" onClick={() => navigate('/admin/profile')}>
          <span className="ad-profile-avatar" aria-hidden="true">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt={name}
                style={{ width: '100%', height: '100%', borderRadius: '999px', objectFit: 'cover' }}
              />
            ) : (
              initial
            )}
          </span>
          <span className="ad-profile-meta">
            <strong>{name}</strong>
            <span>Administrator</span>
          </span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
