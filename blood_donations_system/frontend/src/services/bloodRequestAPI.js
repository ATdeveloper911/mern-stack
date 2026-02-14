import api from './api';

const bloodRequestAPI = {
  // Get all blood requests
  getRequests: (params = {}) => {
    return api.get('/blood-requests', { params });
  },

  // Get user's blood requests
  getMyRequests: (params = {}) => {
    return api.get('/blood-requests/my-requests', { params });
  },

  // Get single blood request
  getRequest: (requestId) => {
    return api.get(`/blood-requests/${requestId}`);
  },

  // Create new blood request
  createRequest: (requestData) => {
    return api.post('/blood-requests', requestData);
  },

  // Update blood request
  updateRequest: (requestId, requestData) => {
    return api.put(`/blood-requests/${requestId}`, requestData);
  },

  // Update blood request status
  updateRequestStatus: (requestId, status) => {
    return api.put(`/blood-requests/${requestId}/status`, { status });
  },

  // Match donor to blood request
  matchDonor: (requestId, donorId) => {
    return api.put(`/blood-requests/${requestId}/match-donor`, { donorId });
  },

  // Delete blood request
  deleteRequest: (requestId) => {
    return api.delete(`/blood-requests/${requestId}`);
  },

  // Get nearby requests (for donors)
  getNearbyRequests: (params = {}) => {
    return api.get('/blood-requests/nearby', { params });
  },

  // Get urgent requests
  getUrgentRequests: (params = {}) => {
    return api.get('/blood-requests/urgent', { params });
  },

  // Get requests by blood type
  getRequestsByBloodType: (bloodType, params = {}) => {
    return api.get(`/blood-requests/blood-type/${bloodType}`, { params });
  },

  // Get request statistics
  getRequestStats: (params = {}) => {
    return api.get('/blood-requests/stats', { params });
  }
};

export default bloodRequestAPI;
