// src/services/passwordService.js
import api from './api';
import toastService from './toastService';

const passwordService = {
  // Reset password without authentication (forgot password)
  async resetPassword(email, newPassword, confirmPassword) {
    try {
      const response = await api.post('/reset-password', {
        email,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      toastService.error('Password reset failed: ' + errorMessage);
      throw error.response?.data || { error: 'Failed to reset password' };
    }
  },

  // Change password (requires authentication)
  async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      const response = await api.post('/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password';
      toastService.error('Password change failed: ' + errorMessage);
      throw error.response?.data || { error: 'Failed to change password' };
    }
  },

  // Admin reset user password
  async adminResetUserPassword(email, newPassword) {
    try {
      // First, get all users to find the user by email
      const usersResponse = await api.get('/users');
      const users = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];
      
      // Find the user by email
      const user = users.find(u => u.email === email);
      if (!user) {
        toastService.error('User not found with the provided email');
        throw new Error('User not found with the provided email');
      }
      
      // Update the user's password using the standard REST API
      const response = await api.put(`/users/${user.userID}`, {
        password: newPassword
      });
      
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset user password';
      toastService.error('Admin password reset failed: ' + errorMessage);
      throw error.response?.data || { error: 'Failed to reset user password' };
    }
  }
};

export default passwordService;
