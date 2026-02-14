import api from './api';

const notificationAPI = {
  // Get user notifications
  getNotifications: (params = {}) => {
    return api.get('/notifications', { params });
  },

  // Get single notification
  getNotification: (notificationId) => {
    return api.get(`/notifications/${notificationId}`);
  },

  // Mark notification as read
  markAsRead: (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`);
  },

  // Mark notification as unread
  markAsUnread: (notificationId) => {
    return api.put(`/notifications/${notificationId}/unread`);
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    return api.put('/notifications/mark-all-read');
  },

  // Delete notification
  deleteNotification: (notificationId) => {
    return api.delete(`/notifications/${notificationId}`);
  },

  // Delete all notifications
  deleteAllNotifications: () => {
    return api.delete('/notifications/delete-all');
  },

  // Get unread notifications count
  getUnreadCount: () => {
    return api.get('/notifications/unread-count');
  },

  // Get notifications by type
  getNotificationsByType: (type, params = {}) => {
    return api.get(`/notifications/type/${type}`, { params });
  },

  // Create notification (admin only)
  createNotification: (notificationData) => {
    return api.post('/notifications', notificationData);
  },

  // Update notification (admin only)
  updateNotification: (notificationId, notificationData) => {
    return api.put(`/notifications/${notificationId}`, notificationData);
  }
};

export default notificationAPI;
