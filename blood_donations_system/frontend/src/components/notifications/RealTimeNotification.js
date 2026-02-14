import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../contexts/SocketContext';
import { 
  FaBell, 
  FaTimes, 
  FaHeart, 
  FaHandHoldingHeart, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaTint,
  FaUsers,
  FaUserMd,
  FaUserShield
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { notificationAPI } from '../../services/api';

const RealTimeNotification = () => {
  const { socket, isConnected, notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    if (notifications.length > 0) {
      setRecentNotifications(notifications.slice(0, 5));
    }
  }, [notifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type, priority) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (type) {
      case 'blood_request':
        return <FaHandHoldingHeart {...iconProps} />;
      case 'donation_update':
        return <FaHeart {...iconProps} />;
      case 'system_alert':
        return <FaExclamationTriangle {...iconProps} />;
      case 'emergency':
        return <FaExclamationTriangle {...iconProps} />;
      case 'user_activity':
        return <FaUsers {...iconProps} />;
      case 'location_update':
        return <FaMapMarkerAlt {...iconProps} />;
      case 'blood_type_match':
        return <FaTint {...iconProps} />;
      case 'admin_alert':
        return user?.role === 'system_admin' ? <FaUserShield {...iconProps} /> : <FaUserMd {...iconProps} />;
      default:
        return <FaInfoCircle {...iconProps} />;
    }
  };

  // Get notification color based on priority
  const getNotificationColor = (priority, type) => {
    if (type === 'emergency') {
      return 'bg-red-100 border-red-200 text-red-800';
    }
    
    switch (priority) {
      case 'critical':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'low':
        return 'bg-gray-100 border-gray-200 text-gray-800';
      default:
        return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    try {
      if (notification?._id) {
        await notificationAPI.markAsRead(notification._id);
        markNotificationAsRead(notification._id);
      }
    } catch (_) {}
    if (notification?.link) {
      window.location.href = notification.link;
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      markAllNotificationsAsRead();
    } catch (_) {}
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blood-500 focus:ring-offset-2 rounded-full transition-colors"
      >
        <FaBell className="w-6 h-6" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
        
        {/* Connection Status Indicator */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} title={isConnected ? 'Connected' : 'Disconnected'} />
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blood-600 hover:text-blood-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Connection Status */}
            <div className={`px-4 py-2 text-xs ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>
                  {isConnected ? 'Real-time updates active' : 'Connection lost - reconnecting...'}
                </span>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentNotifications.map((notification, index) => (
                    <motion.div
                      key={notification._id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.priority, notification.type)}`}>
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FaBell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll receive real-time updates here
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {recentNotifications.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/dashboard/notifications';
                  }}
                  className="w-full text-sm text-blood-600 hover:text-blood-800 font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeNotification;
