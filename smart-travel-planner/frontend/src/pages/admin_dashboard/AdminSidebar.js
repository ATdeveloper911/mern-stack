import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Hotel,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Compass,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const navLinkClass = ({ isActive }) => `ad-nav-link${isActive ? ' active' : ''}`;

  return (
    <aside className="ad-sidebar">
      <div className="ad-sidebar-brand">
        <div className="ad-sidebar-logo" aria-hidden="true">
          <Compass size={18} />
        </div>
        <div className="ad-sidebar-title">
          <strong>Smart Travel Planner</strong>
          <span>{user?.name || 'Administrator'}</span>
        </div>
      </div>

      <nav className="ad-nav">
        <NavLink to="/admin" end className={navLinkClass}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={navLinkClass}>
          <Users size={18} />
          Users
        </NavLink>
        <NavLink to="/admin/accommodations" className={navLinkClass}>
          <Hotel size={18} />
          Accommodations
        </NavLink>
        <NavLink to="/admin/content" className={navLinkClass}>
          <FileText size={18} />
          Content
        </NavLink>
        <NavLink to="/admin/reports" className={navLinkClass}>
          <BarChart3 size={18} />
          Reports
        </NavLink>
        <NavLink to="/admin/settings" className={navLinkClass}>
          <Settings size={18} />
          Settings
        </NavLink>
      </nav>

      <div className="ad-nav-footer">
        <button type="button" className="ad-logout" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
