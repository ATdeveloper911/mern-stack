import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import RealTimeNotification from '../components/notifications/RealTimeNotification';
import { 
  FaHeart, 
  FaBars, 
  FaTimes, 
  FaUser, 
  FaBell,
  FaCog, 
  FaSignOutAlt,
  FaTachometerAlt,
  FaUsers,
  FaHandHoldingHeart,
  FaChartLine,
  FaShieldAlt,
  FaFileAlt,
  FaCog as FaSettings,
  FaHome,
  FaUserMd,
  FaDatabase,
  FaExclamationTriangle,
  FaDownload,
  FaTimes as FaClose
} from 'react-icons/fa';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const { unreadCount, markAllNotificationsAsRead } = useSocket();
  const { toggleTheme, theme, getBloodTypeThemeClasses } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: FaTachometerAlt,
        roles: ['donor', 'recipient', 'medical_admin', 'system_admin']
      },
      {
        name: 'Profile',
        href: '/dashboard/profile',
        icon: FaUser,
        roles: ['donor', 'recipient', 'medical_admin', 'system_admin']
      }
    ];

    if (hasRole(['donor', 'recipient'])) {
      baseItems.push(
        {
          name: 'Blood Requests',
          href: '/dashboard/blood-requests',
          icon: FaHandHoldingHeart,
          roles: ['donor', 'recipient']
        },
        {
          name: 'Donations',
          href: '/dashboard/donations',
          icon: FaHeart,
          roles: ['donor', 'recipient']
        }
      );
    }

    // Medical Admin specific navigation items
    if (hasRole(['medical_admin'])) {
      baseItems.push(
        {
          name: 'Blood Requests',
          href: '/dashboard/blood-requests',
          icon: FaHandHoldingHeart,
          roles: ['medical_admin']
        },
        {
          name: 'Donations',
          href: '/dashboard/donations',
          icon: FaHeart,
          roles: ['medical_admin']
        },
        {
          name: 'Medical Verification',
          href: '/medical/verifications',
          icon: FaUserMd,
          roles: ['medical_admin']
        },
        {
          name: 'Users (View Only)',
          href: '/medical/users',
          icon: FaUsers,
          roles: ['medical_admin']
        },
        {
          name: 'Medical Reports',
          href: '/medical/reports',
          icon: FaFileAlt,
          roles: ['medical_admin']
        }
      );
    }

    // System Admin specific navigation items
    if (hasRole(['system_admin'])) {
      baseItems.push(
        {
          name: 'User Management',
          href: '/admin/users',
          icon: FaUsers,
          roles: ['system_admin']
        },
        {
          name: 'Audit Trail',
          href: '/admin/audit',
          icon: FaShieldAlt,
          roles: ['system_admin']
        },
        {
          name: 'System Reports',
          href: '/admin/reports',
          icon: FaFileAlt,
          roles: ['system_admin']
        },
        {
          name: 'System Settings',
          href: '/admin/settings',
          icon: FaSettings,
          roles: ['system_admin']
        }
      );
    }

    baseItems.push(
      {
        name: 'Notifications',
        href: '/dashboard/notifications',
        icon: FaBell,
        roles: ['donor', 'recipient', 'medical_admin', 'system_admin'],
        badge: unreadCount > 0 ? unreadCount : null
      },
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: FaCog,
        roles: ['donor', 'recipient', 'medical_admin', 'system_admin']
      }
    );

    return baseItems.filter(item => item.roles.includes(user?.role));
  };

  const navigationItems = getNavigationItems();

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Profile picture handlers
  const handleProfilePictureClick = () => {
    if (user?.profilePicture) {
      setShowProfilePictureModal(true);
    }
  };

  const handleDownloadProfilePicture = () => {
    if (user?.profilePicture) {
      const link = document.createElement('a');
      link.href = user.profilePicture;
      link.download = `profile-picture-${user.firstName}-${user.lastName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Get user role display
  const getRoleDisplay = () => {
    const roleMap = {
      donor: { name: 'Blood Donor', icon: FaHeart, color: 'text-blood-600' },
      recipient: { name: 'Recipient', icon: FaHandHoldingHeart, color: 'text-blue-600' },
      medical_admin: { name: 'Medical Admin', icon: FaUserMd, color: 'text-green-600' },
      system_admin: { name: 'System Admin', icon: FaShieldAlt, color: 'text-purple-600' }
    };
    return roleMap[user?.role] || { name: 'User', icon: FaUser, color: 'text-neutral-600' };
  };

  const roleDisplay = getRoleDisplay();

  // Check if current path is active
  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-screen bg-neutral-50 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0 lg:h-screen ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full lg:h-screen">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-200">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blood-600 rounded-full flex items-center justify-center">
                <FaHeart className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-neutral-900">BloodLink</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <FaTimes className="text-neutral-600" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleProfilePictureClick}
              >
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.firstName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <FaUser className="text-blood-600 text-xl" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center space-x-1">
                  <roleDisplay.icon className={`text-xs ${roleDisplay.color}`} />
                  <p className="text-xs text-neutral-500 truncate">
                    {roleDisplay.name}
                  </p>
                </div>
                {user?.bloodType && (
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBloodTypeThemeClasses().secondary}`}>
                      {user.bloodType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-blood-100 text-blood-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="text-lg" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="bg-blood-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors duration-200"
            >
              {theme === 'light' ? '🌙' : '☀️'}
              <span>Toggle Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top bar - Fixed at top */}
        <header className="bg-white shadow-sm border-b border-neutral-200 fixed top-0 right-0 left-0 lg:left-64 z-30" style={{ height: '4rem' }}>
          <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6" style={{ height: '100%' }}>
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars className="text-neutral-600" />
            </button>

            {/* Page title */}
            <div className="flex-1 min-w-0 flex items-center justify-start px-2 sm:px-4" style={{ height: '100%', overflow: 'hidden' }}>
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-neutral-900" style={{ lineHeight: '1.5', paddingTop: '0.5rem', paddingBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {navigationItems.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Real-time Notifications */}
              <RealTimeNotification />

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                  <div 
                    className="w-8 h-8 bg-blood-100 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleProfilePictureClick}
                  >
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.firstName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-blood-600 text-sm" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-700">
                    {user?.firstName}
                  </span>
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
                title="Logout"
              >
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </header>

        {/* Main content area - Scrollable */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ paddingTop: '4.5rem' }}>
          {children}
        </main>
      </div>

      {/* Profile Picture Modal */}
      <Modal
        isOpen={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        title="Profile Picture"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={user?.profilePicture}
              alt={`${user?.firstName} ${user?.lastName}`}
              className="max-w-full max-h-96 rounded-lg shadow-lg"
            />
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleDownloadProfilePicture}
              className="flex items-center space-x-2 px-4 py-2 bg-blood-600 text-white rounded-lg hover:bg-blood-700 transition-colors"
            >
              <FaDownload />
              <span>Download</span>
            </button>
            
            <button
              onClick={() => setShowProfilePictureModal(false)}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <FaClose />
              <span>Close</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardLayout;
