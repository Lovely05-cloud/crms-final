import api from './api';
import toastService from './toastService';

const analyticsService = {
  // Get automated suggestions based on system analysis
  getAutomatedSuggestions: async (params = {}) => {
    try {
      const response = await api.get('/analytics/suggestions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching automated suggestions:', error);
      toastService.error('Failed to fetch automated suggestions: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get suggestions for a specific category
  getCategorySuggestions: async (category, params = {}) => {
    try {
      const response = await api.get(`/analytics/suggestions/category/${category}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${category} suggestions:`, error);
      toastService.error(`Failed to fetch ${category} suggestions: ` + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get suggestion summary statistics
  getSuggestionSummary: async (params = {}) => {
    try {
      const response = await api.get('/analytics/suggestions/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching suggestion summary:', error);
      toastService.error('Failed to fetch suggestion summary: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get high priority suggestions only
  getHighPrioritySuggestions: async (params = {}) => {
    try {
      const response = await api.get('/analytics/suggestions/high-priority', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching high priority suggestions:', error);
      toastService.error('Failed to fetch high priority suggestions: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get all barangays (including those with no data)
  getAllBarangays: async () => {
    try {
      const response = await api.get('/reports/all-barangays');
      return response.data.barangays || [];
    } catch (error) {
      console.error('Error fetching all barangays:', error);
      // Return default barangays if API fails
      return [
        'Bigaa', 'Butong', 'Marinig', 'Gulod', 'Pob. Uno', 'Pob. Dos', 
        'Pob. Tres', 'Sala', 'Niugan', 'Banaybanay', 'Pulo', 'Diezmo', 
        'Pittland', 'San Isidro', 'Mamatid', 'Baclaran', 'Casile', 'Banlic'
      ];
    }
  },

  // Get transaction analysis data
  getTransactionAnalysis: async (params = {}) => {
    try {
      const response = await api.get('/analytics/transaction-analysis', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction analysis:', error);
      toastService.error('Failed to fetch transaction analysis: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Helper function to format suggestion priority for display
  formatPriority: (priority) => {
    const priorityMap = {
      high: { label: 'High', color: 'error' },
      medium: { label: 'Medium', color: 'warning' },
      low: { label: 'Low', color: 'info' }
    };
    return priorityMap[priority] || { label: 'Unknown', color: 'default' };
  },

  // Helper function to get priority icon
  getPriorityIcon: (priority) => {
    const iconMap = {
      high: 'priority_high',
      medium: 'flag',
      low: 'low_priority'
    };
    return iconMap[priority] || 'help';
  },

  // Helper function to format implementation timeframe
  formatTimeframe: (timeframe) => {
    return timeframe || 'Not specified';
  },

  // Helper function to format expected impact
  formatImpact: (impact) => {
    return impact || 'Impact assessment pending';
  },

  // Helper function to get category icon
  getCategoryIcon: (category) => {
    const iconMap = {
      'Application Processing': 'assignment',
      'Processing Speed': 'speed',
      'Processing Time': 'schedule',
      'Service Utilization': 'trending_up',
      'Benefit Utilization': 'card_giftcard',
      'Claim Processing': 'receipt',
      'Service Promotion': 'campaign',
      'Complaint Resolution': 'support_agent',
      'Issue Prevention': 'shield',
      'Support Quality': 'help_center',
      'Support Responsiveness': 'chat',
      'Registration Growth': 'person_add',
      'Service Inclusivity': 'accessibility',
      'Overall Performance': 'dashboard',
      'Service Integration': 'integration_instructions'
    };
    return iconMap[category] || 'lightbulb';
  },

  // Helper function to get suggestion type color
  getTypeColor: (type) => {
    const colorMap = {
      improvement: 'primary',
      efficiency: 'secondary',
      outreach: 'success',
      utilization: 'info',
      promotion: 'warning',
      service_quality: 'error',
      prevention: 'default',
      support_efficiency: 'primary',
      response_time: 'warning',
      diversity: 'success',
      system_optimization: 'secondary',
      integration: 'info'
    };
    return colorMap[type] || 'default';
  }
};

export default analyticsService;
