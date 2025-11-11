// src/services/supportService.js
import { api } from './api';
import { API_CONFIG } from '../config/production';
import toastService from './toastService';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

async function getStoredToken() {
  try {
    const raw = localStorage.getItem('auth.token');
    console.log('Raw token from localStorage:', raw);
    const token = raw ? JSON.parse(raw) : null;
    console.log('Parsed token:', token ? 'Token exists' : 'No token');
    return token;
  } catch (error) {
    console.error('Error parsing token:', error);
    localStorage.removeItem('auth.token');
    return null;
  }
}

export const supportService = {
  // Get all support tickets (role-based)
  getTickets: async () => {
    try {
      return await api.get('/support-tickets');
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toastService.error('Failed to fetch support tickets: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get archived support tickets (role-based)
  getArchivedTickets: async () => {
    try {
      return await api.get('/support-tickets/archived');
    } catch (error) {
      console.error('Error fetching archived tickets:', error);
      toastService.error('Failed to fetch archived tickets: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Get a specific ticket by ID
  getTicket: async (id) => {
    try {
      return await api.get(`/support-tickets/${id}`);
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      toastService.error('Failed to fetch support ticket: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Create a new support ticket (PWD members only)
  // Priority is automatically determined by the backend based on content analysis
  createTicket: async (ticketData, file = null) => {
    try {
      const formData = new FormData();
      formData.append('subject', ticketData.subject);
      formData.append('description', ticketData.description);
      // Priority is no longer sent - backend will determine it automatically
      formData.append('category', ticketData.category || 'General');
      
      if (file) {
        formData.append('attachment', file);
      }
      
      // Don't set Content-Type manually - browser will set it with boundary automatically
      return await api.post('/support-tickets', formData);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toastService.error('Failed to create support ticket: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Update a support ticket
  updateTicket: async (id, updateData) => {
    try {
      return await api.put(`/support-tickets/${id}`, updateData);
    } catch (error) {
      console.error('Error updating support ticket:', error);
      toastService.error('Failed to update support ticket: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Patch a support ticket (for status updates)
  patchTicket: async (id, updateData) => {
    try {
      return await api.patch(`/support-tickets/${id}`, updateData);
    } catch (error) {
      console.error('Error updating support ticket status:', error);
      toastService.error('Failed to update support ticket status: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Delete a support ticket (admin only)
  deleteTicket: async (id) => {
    try {
      return await api.delete(`/support-tickets/${id}`);
    } catch (error) {
      console.error('Error deleting support ticket:', error);
      toastService.error('Failed to delete support ticket: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Download attachment from a message
  downloadAttachment: async (messageId) => {
    try {
      console.log('Starting downloadAttachment for messageId:', messageId);
      
      // Use the main API service for consistent token handling
      const token = await getStoredToken();
      console.log('Token retrieved:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Making request to:', `${API_BASE_URL}/support-tickets/messages/${messageId}/download`);
      
      const response = await fetch(`${API_BASE_URL}/support-tickets/messages/${messageId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      // Return the blob for file preview with MIME type
      const blob = await response.blob();
      console.log('Blob created:', blob.type, blob.size);
      
      // Create a new blob with the correct MIME type from response headers
      const contentType = response.headers.get('Content-Type') || blob.type;
      const newBlob = new Blob([blob], { type: contentType });
      console.log('New blob with MIME type:', newBlob.type);
      
      return newBlob;
    } catch (error) {
      console.error('Error in downloadAttachment:', error);
      toastService.error('Failed to download attachment: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Force download attachment from a message
  forceDownloadAttachment: async (messageId) => {
    const token = await getStoredToken();
    const response = await fetch(`${API_BASE_URL}/support-tickets/messages/${messageId}/force-download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*',
      },
    });
    
    if (!response.ok) {
      const errorMessage = `HTTP error! status: ${response.status}`;
      toastService.error('Failed to force download attachment: ' + errorMessage);
      throw new Error(errorMessage);
    }
    
    return response;
  },

  // Add a message to a support ticket
  addMessage: async (id, message, file = null) => {
    try {
      const formData = new FormData();
      formData.append('message', message);
      
      if (file) {
        formData.append('attachment', file);
      }
      
      // Don't set Content-Type manually - browser will set it with boundary automatically
      return await api.post(`/support-tickets/${id}/messages`, formData);
    } catch (error) {
      console.error('Error adding message to support ticket:', error);
      toastService.error('Failed to send message: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },
  
  // Admin-specific methods
  admin: {
    // Update ticket status
    updateStatus: async (id, status) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status });
      } catch (error) {
        console.error('Error updating ticket status:', error);
        toastService.error('Failed to update ticket status: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    
    // Update ticket priority
    updatePriority: async (id, priority) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { priority });
      } catch (error) {
        console.error('Error updating ticket priority:', error);
        toastService.error('Failed to update ticket priority: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    
    // Mark ticket as resolved
    markResolved: async (id) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status: 'resolved' });
      } catch (error) {
        console.error('Error marking ticket as resolved:', error);
        toastService.error('Failed to mark ticket as resolved: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    
    // Mark ticket as closed
    markClosed: async (id) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status: 'closed' });
      } catch (error) {
        console.error('Error marking ticket as closed:', error);
        toastService.error('Failed to mark ticket as closed: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    
    // Mark ticket as in progress
    markInProgress: async (id) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status: 'in_progress' });
      } catch (error) {
        console.error('Error marking ticket as in progress:', error);
        toastService.error('Failed to mark ticket as in progress: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
  },
  
  // PWD Member-specific methods
  pwdMember: {
    // Mark own ticket as resolved
    markResolved: async (id) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status: 'resolved' });
      } catch (error) {
        console.error('Error marking ticket as resolved:', error);
        toastService.error('Failed to mark ticket as resolved: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    
    // Mark own ticket as closed
    markClosed: async (id) => {
      try {
        return await api.patch(`/support-tickets/${id}`, { status: 'closed' });
      } catch (error) {
        console.error('Error marking ticket as closed:', error);
        toastService.error('Failed to mark ticket as closed: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
  },
  
  // Utility methods
  utils: {
    // Get ticket statistics
    getStats: (tickets) => {
      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length,
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length,
      };
      return stats;
    },
    
    // Get status color
    getStatusColor: (status) => {
      const colors = {
        'open': '#E74C3C',
        'in_progress': '#F39C12',
        'resolved': '#27AE60',
        'closed': '#7F8C8D'
      };
      return colors[status] || '#7F8C8D';
    },
    
    // Get priority color
    getPriorityColor: (priority) => {
      const colors = {
        'urgent': '#E74C3C',
        'high': '#E67E22',
        'medium': '#F39C12',
        'low': '#27AE60'
      };
      return colors[priority] || '#7F8C8D';
    },
    
    // Get category color
    getCategoryColor: (category) => {
      const colors = {
        'PWD Card': '#3498DB',
        'Benefits': '#9B59B6',
        'Technical': '#E67E22',
        'General': '#1ABC9C',
        'Account': '#E74C3C',
        'Other': '#95A5A6'
      };
      return colors[category] || '#7F8C8D';
    },
    
    // Format ticket number
    formatTicketNumber: (ticketNumber) => {
      return ticketNumber ? `#${ticketNumber}` : 'N/A';
    },
    
    // Format date as MM/DD/YYYY
    formatDate: (date) => {
      if (!date) return null;
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      return `${month}/${day}/${year}`;
    },
    
    // Format datetime
    formatDateTime: (date) => {
      return new Date(date).toLocaleString();
    }
  }
};

export default supportService;
