import { api } from './api';

const staff1NotificationService = {
  /**
   * Get all notifications for Staff1
   */
  async getAllNotifications() {
    try {
      const [
        pendingApplications,
        pendingDocumentReviews,
        pendingIDRenewals
      ] = await Promise.all([
        api.get('/applications?status=Pending Admin Approval').catch(() => []),
        api.get('/documents/pending-reviews').catch(() => ({ success: false, documents: [] })),
        api.get('/id-renewals?status=pending').catch(() => ({ success: false, renewals: [] }))
      ]);

      const notifications = [];

      // Pending applications
      const applications = Array.isArray(pendingApplications) ? pendingApplications : [];
      if (applications.length > 0) {
        notifications.push({
          id: 'pending_applications',
          type: 'pending_application',
          title: `${applications.length} Pending Application${applications.length > 1 ? 's' : ''}`,
          message: `${applications.length} application${applications.length > 1 ? 's' : ''} waiting for approval`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: applications.length }
        });
      }

      // Pending document reviews
      const documents = Array.isArray(pendingDocumentReviews?.documents) 
        ? pendingDocumentReviews.documents 
        : (Array.isArray(pendingDocumentReviews) ? pendingDocumentReviews : []);
      if (documents.length > 0) {
        notifications.push({
          id: 'pending_document_reviews',
          type: 'document_review',
          title: `${documents.length} Document${documents.length > 1 ? 's' : ''} Pending Review`,
          message: `${documents.length} uploaded document${documents.length > 1 ? 's' : ''} need review`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: documents.length }
        });
      }

      // Pending ID renewals
      const renewals = Array.isArray(pendingIDRenewals?.renewals)
        ? pendingIDRenewals.renewals
        : (Array.isArray(pendingIDRenewals) ? pendingIDRenewals : []);
      if (renewals.length > 0) {
        notifications.push({
          id: 'pending_id_renewals',
          type: 'id_renewal',
          title: `${renewals.length} ID Renewal${renewals.length > 1 ? 's' : ''} Pending`,
          message: `${renewals.length} ID renewal request${renewals.length > 1 ? 's' : ''} waiting for approval`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: renewals.length }
        });
      }

      return notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching staff1 notifications:', error);
      return [];
    }
  },

  getNotificationIcon(type) {
    const icons = {
      'pending_application': 'Assignment',
      'document_review': 'Description',
      'id_renewal': 'CreditCard',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  getNotificationColor(type) {
    const colors = {
      'pending_application': '#F39C12',
      'document_review': '#FF9800',
      'id_renewal': '#9C27B0',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default staff1NotificationService;

