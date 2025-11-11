import { api } from './api';
import toastService from './toastService';

export const announcementService = {
  // Get all announcements
  getAll: async () => {
    try {
      const response = await api.get('/announcements');
      return response;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toastService.error('Failed to fetch announcements: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get Admin announcements only (using client-side filtering)
  getAdminAnnouncements: async () => {
    try {
      const response = await api.get('/announcements');
      const announcementsData = response || [];
      
      // Filter announcements created by Admin users on the client side
      const adminAnnouncements = announcementsData.filter(announcement => 
        announcement.author?.role === 'Admin'
      );
      
      return adminAnnouncements;
    } catch (error) {
      console.error('Error fetching admin announcements:', error);
      toastService.error('Failed to fetch admin announcements: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Create new announcement
  create: async (announcementData) => {
    try {
      const response = await api.post('/announcements', announcementData);
      return response;
    } catch (error) {
      console.error('Error creating announcement:', error);
      toastService.error('Failed to create announcement: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Update announcement
  update: async (id, announcementData) => {
    try {
      const response = await api.put(`/announcements/${id}`, announcementData);
      return response;
    } catch (error) {
      console.error('Error updating announcement:', error);
      toastService.error('Failed to update announcement: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Delete announcement
  delete: async (id) => {
    try {
      const response = await api.delete(`/announcements/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toastService.error('Failed to delete announcement: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get announcement by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/announcements/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching announcement:', error);
      toastService.error('Failed to fetch announcement: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get announcements by audience (using client-side filtering since backend route has issues)
  getByAudience: async (audience) => {
    try {
      const response = await api.get('/announcements');
      const announcementsData = response || [];
      
      // Filter announcements by audience on the client side
      const filteredAnnouncements = announcementsData.filter(announcement => 
        announcement.targetAudience === audience
      );
      
      return filteredAnnouncements;
    } catch (error) {
      console.error('Error fetching announcements by audience:', error);
      toastService.error('Failed to fetch announcements by audience: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  // Get filtered announcements for PWD members based on their barangay
  getFilteredForPWDMember: async (userBarangay) => {
    try {
      const response = await api.get('/announcements');
      const announcementsData = response || [];
      
      // Filter announcements for PWD Members:
      // 1. Public announcements (targetAudience = 'All')
      // 2. PWD-specific announcements (targetAudience = 'PWD Members' or 'PWDMember')
      // 3. Barangay-specific announcements (targetAudience matches user's barangay)
      const filteredAnnouncements = announcementsData.filter(announcement => {
        const targetAudience = announcement.targetAudience;
        
        // Show public announcements
        if (targetAudience === 'All') return true;
        
        // Show PWD-specific announcements
        if (targetAudience === 'PWD Members' || targetAudience === 'PWDMember') return true;
        
        // Show barangay-specific announcements
        if (userBarangay && targetAudience === userBarangay) return true;
        
        return false;
      });
      
      return filteredAnnouncements;
    } catch (error) {
      console.error('Error fetching filtered announcements for PWD member:', error);
      toastService.error('Failed to fetch announcements: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }
};

export default announcementService;