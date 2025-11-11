// src/services/pwdMemberService.js
import { api } from './api';
import toastService from './toastService';

const pwdMemberService = {
  // Get all PWD members
  async getAll() {
    // Use the proper PWD members API endpoint
    try {
      const response = await api.get('/pwd-members');
      return response;
    } catch (error) {
      console.error('Error fetching PWD members:', error);
      toastService.error('Failed to fetch PWD members: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get all PWD members (alias for getAll)
  async getAllMembers() {
    return this.getAll();
  },

  // Get PWD member by ID
  async getById(id) {
    try {
      const response = await api.get(`/pwd-members/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching PWD member:', error);
      toastService.error('Failed to fetch PWD member: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Create new PWD member
  async create(memberData) {
    try {
      const response = await api.post('/pwd-members', memberData);
      return response;
    } catch (error) {
      console.error('Error creating PWD member:', error);
      toastService.error('Failed to create PWD member: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Update PWD member
  async update(id, memberData) {
    try {
      const response = await api.put(`/pwd-members/${id}`, memberData);
      return response;
    } catch (error) {
      console.error('Error updating PWD member:', error);
      toastService.error('Failed to update PWD member: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Delete PWD member
  async delete(id) {
    try {
      const response = await api.delete(`/pwd-members/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting PWD member:', error);
      toastService.error('Failed to delete PWD member: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get PWD member applications
  async getApplications(id) {
    try {
      const response = await api.get(`/pwd-members/${id}/applications`);
      return response;
    } catch (error) {
      console.error('Error fetching PWD member applications:', error);
      toastService.error('Failed to fetch PWD member applications: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get PWD member complaints
  async getComplaints(id) {
    try {
      const response = await api.get(`/pwd-members/${id}/complaints`);
      return response;
    } catch (error) {
      console.error('Error fetching PWD member complaints:', error);
      toastService.error('Failed to fetch PWD member complaints: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get PWD member benefit claims
  async getBenefitClaims(id) {
    try {
      const response = await api.get(`/pwd-members/${id}/benefit-claims`);
      return response;
    } catch (error) {
      console.error('Error fetching PWD member benefit claims:', error);
      toastService.error('Failed to fetch PWD member benefit claims: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get PWD members with filters
  async getFiltered(filters = {}) {
    try {
      // For now, use the mock endpoint and apply filters on the frontend
      const response = await api.get('/pwd-members');
      return response;
    } catch (error) {
      console.error('Error fetching filtered PWD members:', error);
      toastService.error('Failed to fetch filtered PWD members: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Claim PWD card
  async claimCard(id) {
    try {
      const response = await api.post(`/pwd-members/${id}/claim-card`);
      return response;
    } catch (error) {
      console.error('Error claiming card:', error);
      toastService.error('Failed to claim PWD card: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Renew PWD card
  async renewCard(id) {
    try {
      const response = await api.post(`/pwd-members/${id}/renew-card`);
      return response;
    } catch (error) {
      console.error('Error renewing card:', error);
      toastService.error('Failed to renew PWD card: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }
};

export default pwdMemberService;
