import { api } from './api';

const barangayPresidentNotificationService = {
  /**
   * Get all notifications for Barangay President
   */
  async getAllNotifications(currentUser) {
    try {
      const barangay = currentUser?.barangay;
      if (!barangay) return [];

      const pendingApplications = await api.get(
        `/applications/barangay/${encodeURIComponent(barangay)}/status/Pending%20Barangay%20Approval`
      ).catch(() => []);

      const notifications = [];

      // Pending applications for their barangay
      const applications = Array.isArray(pendingApplications) ? pendingApplications : [];
      if (applications.length > 0) {
        notifications.push({
          id: 'pending_applications',
          type: 'pending_application',
          title: `${applications.length} Pending Application${applications.length > 1 ? 's' : ''}`,
          message: `${applications.length} application${applications.length > 1 ? 's' : ''} from ${barangay} waiting for your approval`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: applications.length, barangay }
        });
      }

      return notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching barangay president notifications:', error);
      return [];
    }
  },

  getNotificationIcon(type) {
    const icons = {
      'pending_application': 'Assignment',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  getNotificationColor(type) {
    const colors = {
      'pending_application': '#F39C12',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default barangayPresidentNotificationService;

