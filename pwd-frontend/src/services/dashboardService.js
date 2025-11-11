// src/services/dashboardService.js
import { api } from './api';
import toastService from './toastService';

const dashboardService = {
  async getStats() {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toastService.error('Failed to fetch dashboard statistics: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  async getApplications() {
    try {
      const response = await api.get('/applications');
      return response;
    } catch (error) {
      console.error('Error fetching applications:', error);
      toastService.error('Failed to fetch applications: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  async getRecentActivities() {
    try {
      const response = await api.get('/dashboard/recent-activities');
      return response;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toastService.error('Failed to fetch recent activities: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  async getBarangayContacts() {
    try {
      const response = await api.get('/dashboard/barangay-contacts');
      return response;
    } catch (error) {
      console.error('Error fetching barangay contacts:', error);
      toastService.error('Failed to fetch barangay contacts: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }
};

export default dashboardService;
