import { api } from './api';
import { supportService } from './supportService';

const frontDeskNotificationService = {
  /**
   * Get all notifications for FrontDesk
   */
  async getAllNotifications() {
    try {
      const [
        supportTickets,
        pendingCardClaims,
        generalNotifications
      ] = await Promise.all([
        supportService.getTickets().catch(() => []),
        api.get('/pwd-members?cardClaimed=false').catch(() => []),
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
          data: { ticket_id: ticket.id }
        });
      });

      // Pending card claims
      const unclaimedCards = Array.isArray(pendingCardClaims) ? pendingCardClaims : [];
      if (unclaimedCards.length > 0) {
        notifications.push({
          id: 'pending_card_claims',
          type: 'card_claim',
          title: `${unclaimedCards.length} Unclaimed Card${unclaimedCards.length > 1 ? 's' : ''}`,
          message: `${unclaimedCards.length} PWD card${unclaimedCards.length > 1 ? 's' : ''} ready for claim`,
          is_read: false,
          created_at: new Date().toISOString(),
          data: { count: unclaimedCards.length }
        });
      }

      // General notifications
      const general = Array.isArray(generalNotifications)
        ? generalNotifications
        : (generalNotifications?.notifications || []);
      notifications.push(...general);

      return notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching frontdesk notifications:', error);
      return [];
    }
  },

  getNotificationIcon(type) {
    const icons = {
      'support_ticket': 'SupportAgent',
      'card_claim': 'CreditCard',
      'default': 'Notifications'
    };
    return icons[type] || icons.default;
  },

  getNotificationColor(type) {
    const colors = {
      'support_ticket': '#2196F3',
      'card_claim': '#4CAF50',
      'default': '#757575'
    };
    return colors[type] || colors.default;
  }
};

export default frontDeskNotificationService;

