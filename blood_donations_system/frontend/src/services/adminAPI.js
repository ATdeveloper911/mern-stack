import api from './api';

const adminAPI = {
  // Dashboard
  getDashboard: (params = {}) => {
    return api.get('/admin/dashboard', { params });
  },

  // System Health
  getSystemHealth: () => {
    return api.get('/admin/health');
  },

  // Users
  getUsers: (params = {}) => {
    return api.get('/admin/users', { params });
  },

  getUser: (userId) => {
    return api.get(`/admin/users/${userId}`);
  },

  updateUser: (userId, userData) => {
    return api.put(`/admin/users/${userId}`, userData);
  },

  deleteUser: (userId) => {
    return api.delete(`/admin/users/${userId}`);
  },

  // System Settings
  getSystemSettings: () => {
    return api.get('/admin/settings');
  },

  updateSystemSetting: (key, value) => {
    return api.put(`/admin/settings/${key}`, { value });
  },

  deleteSystemSetting: (key) => {
    return api.delete(`/admin/settings/${key}`);
  },

  // Audit Trail
  getAuditTrail: (params = {}) => {
    return api.get('/admin/audit-trail', { params });
  },

  getAuditLog: (logId) => {
    return api.get(`/admin/audit-trail/${logId}`);
  },

  // Data Export
  exportData: (exportData) => {
    return api.post('/admin/export', exportData);
  },

  // Analytics
  getAnalytics: (params = {}) => {
    return api.get('/admin/analytics', { params });
  },

  // Notifications
  getNotifications: (params = {}) => {
    return api.get('/admin/notifications', { params });
  },

  sendNotification: (notificationData) => {
    return api.post('/admin/notifications', notificationData);
  },

  // System Maintenance
  runMaintenance: (maintenanceData) => {
    return api.post('/admin/maintenance', maintenanceData);
  },

  getMaintenanceStatus: () => {
    return api.get('/admin/maintenance/status');
  },

  // Backup
  createBackup: (backupData) => {
    return api.post('/admin/backup', backupData);
  },

  getBackups: () => {
    return api.get('/admin/backups');
  },

  restoreBackup: (backupId) => {
    return api.post(`/admin/backups/${backupId}/restore`);
  },

  deleteBackup: (backupId) => {
    return api.delete(`/admin/backups/${backupId}`);
  },

  // Logs
  getLogs: (params = {}) => {
    return api.get('/admin/logs', { params });
  },

  downloadLogs: (params = {}) => {
    return api.get('/admin/logs/download', { 
      params,
      responseType: 'blob'
    });
  },

  // Security
  getSecurityEvents: (params = {}) => {
    return api.get('/admin/security/events', { params });
  },

  getSecuritySettings: () => {
    return api.get('/admin/security/settings');
  },

  updateSecuritySettings: (settings) => {
    return api.put('/admin/security/settings', settings);
  },

  // Performance
  getPerformanceMetrics: (params = {}) => {
    return api.get('/admin/performance', { params });
  },

  // Database
  getDatabaseStats: () => {
    return api.get('/admin/database/stats');
  },

  runDatabaseQuery: (query) => {
    return api.post('/admin/database/query', { query });
  },

  // Cache
  clearCache: () => {
    return api.post('/admin/cache/clear');
  },

  getCacheStats: () => {
    return api.get('/admin/cache/stats');
  }
};

export default adminAPI;
