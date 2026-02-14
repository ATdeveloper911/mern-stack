import api from './api';

const userAPI = {
  // Get user profile
  getProfile: () => {
    return api.get('/users/profile');
  },

  // Update user profile
  updateProfile: (profileData) => {
    return api.put('/users/profile', profileData);
  },

  // Change password
  changePassword: (passwordData) => {
    return api.put('/users/change-password', passwordData);
  },

  // Delete account
  deleteAccount: () => {
    return api.delete('/users/account');
  },

  // Upload profile picture
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post('/users/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get user statistics
  getUserStats: () => {
    return api.get('/users/stats');
  },

  // Get user activity
  getUserActivity: (params = {}) => {
    return api.get('/users/activity', { params });
  },

  // Update user preferences
  updatePreferences: (preferences) => {
    return api.put('/users/preferences', preferences);
  },

  // Get user preferences
  getPreferences: () => {
    return api.get('/users/preferences');
  },

  // Verify email
  verifyEmail: (token) => {
    return api.post('/users/verify-email', { token });
  },

  // Resend verification email
  resendVerificationEmail: () => {
    return api.post('/users/resend-verification');
  },

  // Update location
  updateLocation: (locationData) => {
    return api.put('/users/location', locationData);
  },

  // Get nearby users
  getNearbyUsers: (params = {}) => {
    return api.get('/users/nearby', { params });
  }
};

export default userAPI;
