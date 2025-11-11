// src/services/benefitService.js

import { api } from './api';
import toastService from './toastService';

const benefitService = {
  // Get all benefits
  getAll: async () => {
    try {
      const response = await api.get('/benefits-simple');
      return response;
    } catch (error) {
      console.error('Error fetching benefits:', error);
      toastService.error('Failed to fetch benefits: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get a specific benefit by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/benefits/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching benefit:', error);
      toastService.error('Failed to fetch benefit: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Create a new benefit
  create: async (benefitData) => {
    try {
      const response = await api.post('/benefits-simple', benefitData);
      return response;
    } catch (error) {
      console.error('Error creating benefit:', error);
      toastService.error('Failed to create benefit: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Update a benefit
  update: async (id, benefitData) => {
    try {
      const response = await api.put(`/benefits-simple/${id}`, benefitData);
      return response;
    } catch (error) {
      console.error('Error updating benefit:', error);
      toastService.error('Failed to update benefit: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Delete a benefit
  delete: async (id) => {
    try {
      const response = await api.delete(`/benefits-simple/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting benefit:', error);
      toastService.error('Failed to delete benefit: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get benefit claims for a specific benefit
  getClaims: async (id) => {
    try {
      const response = await api.get(`/benefits/${id}/claims`);
      return response;
    } catch (error) {
      console.error('Error fetching benefit claims:', error);
      toastService.error('Failed to fetch benefit claims: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }
};

export default benefitService;
