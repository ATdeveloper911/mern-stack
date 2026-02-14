import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
            { refreshToken }
          );

          const { token, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 403) {
      toast.error('Action failed. Please try again.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.');
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  changePassword: (passwords) => api.post('/auth/change-password', passwords),
};

export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  systemAdminExists: () => api.get('/users/system-admin-exists'),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  updateProfilePicture: (id, file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post(`/users/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMedicalHistory: (id, data) => api.put(`/users/${id}/medical-history`, data),
  updateAvailability: (id, data) => api.put(`/users/${id}/availability`, data),
  getUserStatistics: (id) => api.get(`/users/${id}/statistics`),
  getDonorDashboard: (params) => api.get('/users/dashboard/donor', { params }),
  getRecipientDashboard: (params) => api.get('/users/dashboard/recipient', { params }),
  getAdminDashboard: (params) => api.get('/users/dashboard/admin', { params }),
  blockUser: (id, data) => api.put(`/users/${id}/block`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const bloodRequestAPI = {
  getBloodRequests: (params) => api.get('/blood-requests', { params }),
  getBloodRequest: (id) => api.get(`/blood-requests/${id}`),
  createBloodRequest: (data) => api.post('/blood-requests', data),
  updateBloodRequest: (id, data) => api.put(`/blood-requests/${id}`, data),
  respondToBloodRequest: (id, data) => api.post(`/blood-requests/${id}/respond`, data),
  confirmDonor: (id, data) => api.post(`/blood-requests/${id}/confirm-donor`, data),
  completeBloodRequest: (id, data) => api.post(`/blood-requests/${id}/complete`, data),
  cancelBloodRequest: (id, data) => api.post(`/blood-requests/${id}/cancel`, data),
  getBloodRequestStatistics: () => api.get('/blood-requests/statistics'),
};

export const donationAPI = {
  getDonations: (params) => api.get('/donations', { params }),
  getDonation: (id) => api.get(`/donations/${id}`),
  scheduleDonation: (data) => api.post('/donations', data),
  startDonation: (id, data) => api.post(`/donations/${id}/start`, data),
  completeDonation: (id, data) => api.post(`/donations/${id}/complete`, data),
  updateTestResults: (id, data) => api.post(`/donations/${id}/test`, data),
  storeBlood: (id, data) => api.post(`/donations/${id}/store`, data),
  distributeBlood: (id, data) => api.post(`/donations/${id}/distribute`, data),
  addFeedback: (id, data) => api.post(`/donations/${id}/feedback`, data),
  getDonationStatistics: () => api.get('/donations/statistics'),
  getDonorStatistics: (donorId) => api.get(`/donations/donor/${donorId}/statistics`),
  respondToDonation: (id, data) => api.post(`/donations/${id}/respond`, data),
  getDonationResponses: (id) => api.get(`/donations/${id}/responses`),
  setRecipientReview: (id, data) => api.put(`/donations/${id}/recipient-review`, data),
  updateDonationStatus: (id, data) => api.put(`/donations/${id}/status`, data),
};

export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getNotification: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAsUnread: (id) => api.put(`/notifications/${id}/unread`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getNotificationsByType: (type, params) => api.get(`/notifications/type/${type}`, { params }),
  sendNotification: (data) => api.post('/notifications/send', data),
  sendAnnouncement: (data) => api.post('/notifications/announcement', data),
  getNotificationStatistics: (params) => api.get('/notifications/statistics', { params }),
  cleanupNotifications: () => api.delete('/notifications/cleanup'),
};

export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getUserActivity: (params) => api.get('/analytics/user-activity', { params }),
  getBloodRequestTrends: (params) => api.get('/analytics/blood-request-trends', { params }),
  getGeographicDistribution: (params) => api.get('/analytics/geographic-distribution', { params }),
  getPredictiveAnalysis: () => api.get('/analytics/predictive'),
  getAnalyticsSummary: (params) => api.get('/analytics/summary', { params }),
  getPerformanceMetrics: (params) => api.get('/analytics/performance', { params }),
  getComplianceMetrics: (params) => api.get('/analytics/compliance', { params }),
  getUserEngagement: (params) => api.get('/analytics/engagement', { params }),
  generateCustomReport: (data) => api.post('/analytics/custom-report', data),
};

export const auditAPI = {
  getAuditTrail: (params) => api.get('/audit', { params }),
  getAuditEntry: (id) => api.get(`/audit/${id}`),
  getUserActivity: (userId, params) => api.get(`/audit/user/${userId}`, { params }),
  getSuspiciousActivities: (params) => api.get('/audit/suspicious', { params }),
  getSecurityAlerts: (params) => api.get('/audit/security-alerts', { params }),
  getComplianceReport: (params) => api.get('/audit/compliance-report', { params }),
  markAsSuspicious: (id, data) => api.put(`/audit/${id}/mark-suspicious`, data),
  updateRiskLevel: (id, data) => api.put(`/audit/${id}/risk-level`, data),
  cleanupAuditTrail: () => api.delete('/audit/cleanup'),
  getAuditStatistics: (params) => api.get('/audit/statistics', { params }),
};

export const exportAPI = {
  exportUsers: (data) => api.post('/export/users', data, { responseType: 'blob' }),
  exportBloodRequests: (data) => api.post('/export/blood-requests', data, { responseType: 'blob' }),
  exportDonations: (data) => api.post('/export/donations', data, { responseType: 'blob' }),
  exportAuditTrail: (data) => api.post('/export/audit-trail', data, { responseType: 'blob' }),
  exportAnalytics: (data) => api.post('/export/analytics', data, { responseType: 'blob' }),
};

export const adminAPI = {
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  getMedicalReport: (params) => api.get('/admin/medical-report', { params }),
  getStatistics: (params) => api.get('/admin/statistics', { params }),
  getSystemHealth: () => api.get('/admin/system-health'),
  updateConfig: (data) => api.put('/admin/config', data),
  createBackup: () => api.post('/admin/backup'),
  cleanupSystem: (data) => api.delete('/admin/cleanup', { data }),
  getSystemLogs: (params) => api.get('/admin/logs', { params }),
  sendAnnouncement: (data) => api.post('/admin/announcement', data),
  
  // User Management
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  blockUser: (id, data) => api.put(`/users/${id}/block`, data),
  unblockUser: (id) => api.put(`/users/${id}/block`, { isBlocked: false }),
  resetUserPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  changeUserRole: (id, data) => api.put(`/users/${id}/role`, data),
  getUserActivity: (id, params) => api.get(`/users/${id}/activity`, { params }),
  exportUsers: (data) => api.post('/export/users', data, { responseType: 'blob' }),
  
  // Audit Trail
  getAuditTrail: (params) => api.get('/audit', { params }),
  getAuditEntry: (id) => api.get(`/audit/${id}`),
  getUserActivity: (userId, params) => api.get(`/audit/user/${userId}`, { params }),
  getSuspiciousActivities: (params) => api.get('/audit/suspicious', { params }),
  getSecurityAlerts: (params) => api.get('/audit/security-alerts', { params }),
  getComplianceReport: (params) => api.get('/audit/compliance-report', { params }),
  markSuspicious: (id, data) => api.put(`/audit/${id}/mark-suspicious`, data),
  updateRiskLevel: (id, data) => api.put(`/audit/${id}/risk-level`, data),
  cleanupAuditTrail: () => api.delete('/audit/cleanup'),
  getAuditStatistics: (params) => api.get('/audit/statistics', { params }),
  
  // System Reports
  getReports: (params) => api.get('/admin/reports', { params }),
  generateReport: (data) => api.post('/admin/reports/generate', data, { responseType: 'blob' }),
};

// Utility function to download file
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Utility function to handle file uploads
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

// Utility function to handle pagination
export const createPaginationParams = (page, limit, filters = {}) => {
  return {
    page: page || 1,
    limit: limit || 10,
    ...filters,
  };
};

// Utility function to handle search
export const createSearchParams = (search, filters = {}) => {
  return {
    search: search || '',
    ...filters,
  };
};

// Utility function to handle date range
export const createDateRangeParams = (startDate, endDate, filters = {}) => {
  return {
    startDate: startDate || '',
    endDate: endDate || '',
    ...filters,
  };
};

export default api;
