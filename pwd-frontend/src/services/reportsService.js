// src/services/reportsService.js
import { api } from './api';
import toastService from './toastService';

export const reportsService = {
  // Get all reports
  getAllReports: async () => {
    try {
      return await api.get('/reports');
    } catch (error) {
      console.error('Error fetching all reports:', error);
      toastService.error('Failed to fetch reports: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get report by ID
  getReport: async (id) => {
    try {
      return await api.get(`/reports/${id}`);
    } catch (error) {
      console.error('Error fetching report:', error);
      toastService.error('Failed to fetch report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Generate a specific type of report
  generateReport: async (type, params = {}) => {
    try {
      return await api.post(`/reports/generate/${type}`, params);
    } catch (error) {
      console.error('Error generating report:', error);
      toastService.error('Failed to generate report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get PWD statistics for barangay presidents
  getBarangayStats: async (barangay) => {
    try {
      return await api.get(`/reports/barangay-stats/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching barangay stats:', error);
      toastService.error('Failed to fetch barangay statistics: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get PWD masterlist for barangay
  getPWDMasterlist: async (barangay) => {
    try {
      return await api.get(`/reports/pwd-masterlist/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching PWD masterlist:', error);
      toastService.error('Failed to fetch PWD masterlist: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get application status report
  getApplicationStatusReport: async (barangay) => {
    try {
      return await api.get(`/reports/application-status/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching application status report:', error);
      toastService.error('Failed to fetch application status report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get disability distribution report
  getDisabilityDistribution: async (barangay) => {
    try {
      return await api.get(`/reports/disability-distribution/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching disability distribution:', error);
      toastService.error('Failed to fetch disability distribution: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get age group analysis
  getAgeGroupAnalysis: async (barangay) => {
    try {
      return await api.get(`/reports/age-group-analysis/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching age group analysis:', error);
      toastService.error('Failed to fetch age group analysis: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get benefit distribution report
  getBenefitDistribution: async (barangay) => {
    try {
      return await api.get(`/reports/benefit-distribution/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching benefit distribution:', error);
      toastService.error('Failed to fetch benefit distribution: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get monthly activity summary
  getMonthlyActivitySummary: async (barangay) => {
    try {
      return await api.get(`/reports/monthly-activity/${encodeURIComponent(barangay)}`);
    } catch (error) {
      console.error('Error fetching monthly activity summary:', error);
      toastService.error('Failed to fetch monthly activity summary: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get city-wide statistics for admin
  getCityWideStats: async () => {
    try {
      return await api.get('/reports/city-wide-stats');
    } catch (error) {
      console.error('Error fetching city-wide stats:', error);
      toastService.error('Failed to fetch city-wide statistics: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get barangay performance report
  getBarangayPerformance: async () => {
    try {
      return await api.get('/reports/barangay-performance');
    } catch (error) {
      console.error('Error fetching barangay performance:', error);
      toastService.error('Failed to fetch barangay performance: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Download report as PDF/Excel
  downloadReport: async (reportId, format = 'pdf') => {
    try {
      return await api.get(`/reports/${reportId}/download?format=${format}`, { 
        responseType: 'blob' 
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toastService.error('Failed to download report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Create new report
  createReport: async (reportData) => {
    try {
      return await api.post('/reports', reportData);
    } catch (error) {
      console.error('Error creating report:', error);
      toastService.error('Failed to create report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Update report
  updateReport: async (id, reportData) => {
    try {
      return await api.put(`/reports/${id}`, reportData);
    } catch (error) {
      console.error('Error updating report:', error);
      toastService.error('Failed to update report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Delete report
  deleteReport: async (id) => {
    try {
      return await api.delete(`/reports/${id}`);
    } catch (error) {
      console.error('Error deleting report:', error);
      toastService.error('Failed to delete report: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }
};

export default reportsService;
