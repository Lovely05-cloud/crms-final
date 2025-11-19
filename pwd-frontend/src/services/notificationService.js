import { api } from './api';

const notificationService = {
  /**
   * Get all notifications for the current user
   * Combines general notifications and document notifications
   */
  async getAllNotifications() {
    try {
      const [generalResponse, documentResponse] = await Promise.all([
        api.get('/notifications').catch(() => ({ success: false, notifications: [] })),
        api.get('/documents/notifications').catch(() => ({ success: false, notifications: [] }))
      ]);

      // Extract notifications from responses
      const general = Array.isArray(generalResponse)
        ? generalResponse
        : (generalResponse?.notifications || []);
      
      const document = Array.isArray(documentResponse)
        ? documentResponse
        : (documentResponse?.notifications || []);

      // Transform document notifications to match general notification format
      const transformedDocument = document.map(notif => ({
        id: `doc_${notif.id}`,
        type: 'document_required',
        title: notif.title || 'New Required Document',
        message: notif.message || 'A new required document has been added',
        is_read: notif.is_read || false,
        read_at: notif.read_at,
        created_at: notif.sent_at || notif.created_at,
        data: {
          document_id: notif.required_document_id,
          notification_id: notif.id
        }
      }));

      // Ensure general notifications have proper data structure
      const transformedGeneral = general.map(notif => ({
        ...notif,
        data: {
          ...(notif.data || {}),
          announcement_id: notif.announcement_id || notif.data?.announcement_id,
          ticket_id: notif.ticket_id || notif.data?.ticket_id,
          applicationID: notif.applicationID || notif.data?.applicationID,
          benefit_id: notif.benefit_id || notif.data?.benefit_id,
          renewal_id: notif.renewal_id || notif.data?.renewal_id,
        }
      }));

      // Combine and sort by date (newest first)
      const allNotifications = [...transformedGeneral, ...transformedDocument].sort((a, b) => {
        const dateA = new Date(a.created_at || a.sent_at || 0);
        const dateB = new Date(b.created_at || b.sent_at || 0);
        return dateB - dateA;
      });

      return allNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const notifications = await this.getAllNotifications();
      return notifications.filter(n => !n.is_read).length;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    try {
      // Check if it's a document notification
      if (notificationId.startsWith('doc_')) {
        const docId = notificationId.replace('doc_', '');
        await api.post(`/documents/notifications/${docId}/read`);
      } else {
        await api.post(`/notifications/${notificationId}/mark-read`);
      }
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      await api.post('/notifications/mark-all-read');
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    const icons = {
      'document_required': 'Description',
      'document_correction_request': 'ErrorOutline',
      'card_renewal_due': 'CreditCard',
      'card_claimed': 'CheckCircle',
      'renewal_submitted': 'Schedule',
      'renewal_approved': 'CheckCircle',
      'renewal_rejected': 'Cancel',
      'benefit_available': 'CardGiftcard',
      'benefit_expiring': 'Warning',
      'announcement': 'Campaign',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  /**
   * Get notification color based on type
   */
  getNotificationColor(type) {
    const colors = {
      'document_required': '#FF9800',
      'document_correction_request': '#F44336',
      'card_renewal_due': '#F44336',
      'card_claimed': '#4CAF50',
      'renewal_submitted': '#2196F3',
      'renewal_approved': '#4CAF50',
      'renewal_rejected': '#F44336',
      'benefit_available': '#9C27B0',
      'benefit_expiring': '#FF9800',
      'announcement': '#2196F3',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default notificationService;

