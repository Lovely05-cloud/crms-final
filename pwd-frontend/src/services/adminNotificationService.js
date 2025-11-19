import { api } from './api';
import { supportService } from './supportService';

const adminNotificationService = {
  /**
   * Get all notifications for Admin/SuperAdmin
   */
  async getAllNotifications() {
    try {
      const [
        supportTickets,
        pendingApplications,
        pendingDocumentReviews,
        pendingIDRenewals,
        generalNotifications
      ] = await Promise.all([
        supportService.getTickets().catch(() => []),
        api.get('/applications?status=Pending Admin Approval').catch(() => []),
        api.get('/documents/pending-reviews').catch(() => ({ success: false, documents: [] })),
        api.get('/id-renewals?status=pending').catch(() => ({ success: false, renewals: [] })),
        api.get('/notifications').catch(() => ({ success: false, notifications: [] }))
      ]);

      const notifications = [];

      // Support tickets (open)
      const openTickets = Array.isArray(supportTickets) 
        ? supportTickets.filter(t => t.status === 'open')
        : [];
      openTickets.forEach(ticket => {
        notifications.push({
          id: `support_${ticket.id}`,
          type: 'support_ticket',
          title: 'New Support Ticket',
          message: `Ticket #${ticket.ticket_number}: ${ticket.subject || 'No subject'}`,
          is_read: false,
          created_at: ticket.created_at,
          data: { 
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number
          }
        });
      });

      // Pending applications - create individual notifications for each
      const applications = Array.isArray(pendingApplications) ? pendingApplications : [];
      applications.forEach((app, index) => {
        notifications.push({
          id: `pending_app_${app.applicationID || index}`,
          type: 'pending_application',
          title: `Pending Application: ${app.firstName} ${app.lastName}`,
          message: `Application from ${app.firstName} ${app.lastName} is waiting for admin approval`,
          is_read: false,
          created_at: app.submissionDate || app.created_at || new Date().toISOString(),
          data: { 
            applicationID: app.applicationID,
            count: applications.length
          }
        });
      });

      // Pending document reviews - create individual notifications
      const documents = Array.isArray(pendingDocumentReviews?.documents) 
        ? pendingDocumentReviews.documents 
        : (Array.isArray(pendingDocumentReviews) ? pendingDocumentReviews : []);
      documents.forEach((doc, index) => {
        notifications.push({
          id: `pending_doc_${doc.id || index}`,
          type: 'document_review',
          title: `Document Pending Review`,
          message: `Document from ${doc.member?.firstName || 'Member'} ${doc.member?.lastName || ''} needs review`,
          is_read: false,
          created_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
          data: { 
            document_id: doc.id,
            member_id: doc.member_id,
            count: documents.length
          }
        });
      });

      // Pending ID renewals - create individual notifications
      const renewals = Array.isArray(pendingIDRenewals?.renewals)
        ? pendingIDRenewals.renewals
        : (Array.isArray(pendingIDRenewals) ? pendingIDRenewals : []);
      renewals.forEach((renewal, index) => {
        notifications.push({
          id: `pending_renewal_${renewal.id || index}`,
          type: 'id_renewal',
          title: `ID Renewal Pending: ${renewal.member?.firstName || 'Member'} ${renewal.member?.lastName || ''}`,
          message: `ID renewal request from ${renewal.member?.firstName || 'Member'} ${renewal.member?.lastName || ''} needs approval`,
          is_read: false,
          created_at: renewal.submitted_at || renewal.created_at || new Date().toISOString(),
          data: { 
            renewal_id: renewal.id,
            member_id: renewal.member_id,
            count: renewals.length
          }
        });
      });

      // General notifications
      const general = Array.isArray(generalNotifications)
        ? generalNotifications
        : (generalNotifications?.notifications || []);
      notifications.push(...general);

      // Sort by date (newest first)
      return notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      return [];
    }
  },

  getNotificationIcon(type) {
    const icons = {
      'support_ticket': 'SupportAgent',
      'pending_application': 'Assignment',
      'document_review': 'Description',
      'id_renewal': 'CreditCard',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  getNotificationColor(type) {
    const colors = {
      'support_ticket': '#2196F3',
      'pending_application': '#F39C12',
      'document_review': '#FF9800',
      'id_renewal': '#9C27B0',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default adminNotificationService;

