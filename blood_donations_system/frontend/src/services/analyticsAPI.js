import api from './api';

const analyticsAPI = {
  // Dashboard Analytics
  getDashboard: (params = {}) => {
    return api.get('/analytics/dashboard', { params });
  },

  // General Analytics
  getGeneral: (params = {}) => {
    return api.get('/analytics/general', { params });
  },

  // Blood Demand Forecast
  getDemandForecast: (params = {}) => {
    return api.get('/analytics/demand-forecast', { params });
  },

  // Donor Availability
  getDonorAvailability: (params = {}) => {
    return api.get('/analytics/donor-availability', { params });
  },

  // Blood Type Distribution
  getBloodTypeDistribution: (params = {}) => {
    return api.get('/analytics/blood-type-distribution', { params });
  },

  // Geographic Analytics
  getGeographicData: (params = {}) => {
    return api.get('/analytics/geographic', { params });
  },

  // Time-based Analytics
  getTimeSeriesData: (params = {}) => {
    return api.get('/analytics/time-series', { params });
  },

  // User Analytics
  getUserAnalytics: (params = {}) => {
    return api.get('/analytics/users', { params });
  },

  // Donation Analytics
  getDonationAnalytics: (params = {}) => {
    return api.get('/analytics/donations', { params });
  },

  // Request Analytics
  getRequestAnalytics: (params = {}) => {
    return api.get('/analytics/requests', { params });
  },

  // Performance Metrics
  getPerformanceMetrics: (params = {}) => {
    return api.get('/analytics/performance', { params });
  },

  // Custom Reports
  generateReport: (reportData) => {
    return api.post('/analytics/reports', reportData);
  },

  getReports: (params = {}) => {
    return api.get('/analytics/reports', { params });
  },

  getReport: (reportId) => {
    return api.get(`/analytics/reports/${reportId}`);
  },

  deleteReport: (reportId) => {
    return api.delete(`/analytics/reports/${reportId}`);
  },

  // Predictive Analytics
  getPredictiveInsights: (params = {}) => {
    return api.get('/analytics/predictive', { params });
  },

  // Real-time Analytics
  getRealTimeData: (params = {}) => {
    return api.get('/analytics/real-time', { params });
  },

  // Export Analytics
  exportAnalytics: (exportData) => {
    return api.post('/analytics/export', exportData);
  }
};

export default analyticsAPI;
