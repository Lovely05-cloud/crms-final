import { api } from './api';

const staff2NotificationService = {
  /**
   * Get all notifications for Staff2
   */
  async getAllNotifications() {
    try {
      const [
        benefitClaims,
        ayudaApplications
      ] = await Promise.all([
        api.get('/benefit-claims?status=Claimed').catch(() => []),
        api.get('/ayuda/applications?status=pending').catch(() => [])
      ]);

      const notifications = [];

      // Benefit claims
      const claims = Array.isArray(benefitClaims) ? benefitClaims : [];
      if (claims.length > 0) {
        notifications.push({
          id: 'benefit_claims',
          type: 'benefit_claim',
          title: `${claims.length} Benefit Claim${claims.length > 1 ? 's' : ''}`,
          message: `${claims.length} benefit claim${claims.length > 1 ? 's' : ''} need processing`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: claims.length }
        });
      }

      // Ayuda applications
      const ayuda = Array.isArray(ayudaApplications) ? ayudaApplications : [];
      if (ayuda.length > 0) {
        notifications.push({
          id: 'ayuda_applications',
          type: 'ayuda_application',
          title: `${ayuda.length} Ayuda Application${ayuda.length > 1 ? 's' : ''}`,
          message: `${ayuda.length} ayuda application${ayuda.length > 1 ? 's' : ''} pending review`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: ayuda.length }
        });
      }

      return notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching staff2 notifications:', error);
      return [];
    }
  },

  getNotificationIcon(type) {
    const icons = {
      'benefit_claim': 'CardGiftcard',
      'ayuda_application': 'Favorite',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  getNotificationColor(type) {
    const colors = {
      'benefit_claim': '#9C27B0',
      'ayuda_application': '#E91E63',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default staff2NotificationService;

