import api from './api';

const donationAPI = {
  // Get all donations
  getDonations: (params = {}) => {
    return api.get('/donations', { params });
  },

  // Get user's donations
  getMyDonations: (params = {}) => {
    return api.get('/donations/my-donations', { params });
  },

  // Get single donation
  getDonation: (donationId) => {
    return api.get(`/donations/${donationId}`);
  },

  // Create new donation
  createDonation: (donationData) => {
    return api.post('/donations', donationData);
  },

  // Update donation
  updateDonation: (donationId, donationData) => {
    return api.put(`/donations/${donationId}`, donationData);
  },

  // Update donation status
  updateDonationStatus: (donationId, status) => {
    return api.put(`/donations/${donationId}/status`, { status });
  },

  // Delete donation
  deleteDonation: (donationId) => {
    return api.delete(`/donations/${donationId}`);
  },

  // Get donations by blood type
  getDonationsByBloodType: (bloodType, params = {}) => {
    return api.get(`/donations/blood-type/${bloodType}`, { params });
  },

  // Get donation statistics
  getDonationStats: (params = {}) => {
    return api.get('/donations/stats', { params });
  },

  // Get recent donations
  getRecentDonations: (params = {}) => {
    return api.get('/donations/recent', { params });
  },

  // Get verified donations
  getVerifiedDonations: (params = {}) => {
    return api.get('/donations/verified', { params });
  },

  // Get pending donations
  getPendingDonations: (params = {}) => {
    return api.get('/donations/pending', { params });
  }
};

export default donationAPI;
