import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Description,
  CreditCard,
  CheckCircle,
  Schedule,
  Cancel,
  CardGiftcard,
  Warning,
  Campaign,
  NotificationsActive,
  ErrorOutline
} from '@mui/icons-material';
import notificationService from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'Just now';
  }
};

const iconMap = {
  'document_required': Description,
  'document_correction_request': ErrorOutline,
  'card_renewal_due': CreditCard,
  'card_claimed': CheckCircle,
  'renewal_submitted': Schedule,
  'renewal_approved': CheckCircle,
  'renewal_rejected': Cancel,
  'benefit_available': CardGiftcard,
  'benefit_expiring': Warning,
  'announcement': Campaign,
  'default': NotificationsIcon
};

function MemberNotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const open = Boolean(anchorEl);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications = await notificationService.getAllNotifications();
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds for new notifications
    intervalRef.current = setInterval(fetchNotifications, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    handleClose();

    // Get notification data
    const data = notification.data || {};
    
    // Navigate with state to pass item information
    const navigationState = {
      notificationItem: {
        type: notification.type,
        id: data.announcement_id || data.ticket_id || data.applicationID || data.document_id || data.benefit_id || data.renewal_id,
        announcement_id: data.announcement_id,
        ticket_id: data.ticket_id,
        applicationID: data.applicationID,
        document_id: data.document_id,
        benefit_id: data.benefit_id,
        renewal_id: data.renewal_id,
        ...data
      }
    };

    // Navigate based on notification type
    switch (notification.type) {
      case 'document_required':
        navigate('/pwd-documents', navigationState);
        break;
      case 'document_correction_request':
        // Document correction requires a token - extract from notification data
        const correctionToken = data.correction_token || data.token;
        if (correctionToken) {
          navigate(`/document-correction/${correctionToken}`, navigationState);
        } else {
          // Fallback to documents page if token is missing
          console.warn('Document correction notification missing token, navigating to documents page');
          navigate('/pwd-documents', navigationState);
        }
        break;
      case 'card_renewal_due':
      case 'renewal_submitted':
      case 'renewal_approved':
      case 'renewal_rejected':
        navigate('/pwd-profile', navigationState);
        break;
      case 'benefit_available':
      case 'benefit_expiring':
        navigate('/pwd-benefits', navigationState);
        break;
      case 'announcement':
        navigate('/pwd-announcements', navigationState);
        break;
      default:
        navigate('/dashboard', navigationState);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    const IconComponent = iconMap[type] || iconMap.default;
    return <IconComponent sx={{ fontSize: 20, color: notificationService.getNotificationColor(type) }} />;
  };

  const formatNotificationTime = (dateString) => {
    return formatTimeAgo(dateString);
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: '#566573',
          '&:hover': {
            backgroundColor: '#E8F0FE',
            color: '#0b87ac'
          }
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: '90vw',
            maxHeight: '80vh',
            mt: 1
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Mark all as read
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationsActive sx={{ fontSize: 48, color: '#BDC3C7', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                No notifications
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {unreadNotifications.length > 0 && (
                <>
                  <Typography variant="caption" sx={{ color: '#7F8C8D', px: 1, fontWeight: 600 }}>
                    NEW
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {unreadNotifications.map((notification) => (
                      <ListItem
                        key={notification.id}
                        disablePadding
                        sx={{
                          bgcolor: '#E3F2FD',
                          mb: 0.5,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: '#BBDEFB'
                          }
                        }}
                      >
                        <ListItemButton
                          onClick={() => handleNotificationClick(notification)}
                          sx={{ py: 1.5, px: 2 }}
                        >
                          <Box sx={{ mr: 2 }}>
                            {getNotificationIcon(notification.type)}
                          </Box>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                  {notification.title}
                                </Typography>
                                <Chip
                                  label="New"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.65rem',
                                    bgcolor: '#F44336',
                                    color: 'white'
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" sx={{ color: '#566573', display: 'block' }}>
                                  {notification.message}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#95A5A6', fontSize: '0.7rem' }}>
                                  {formatNotificationTime(notification.created_at)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                  {readNotifications.length > 0 && <Divider sx={{ my: 2 }} />}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#7F8C8D', px: 1, fontWeight: 600 }}>
                      EARLIER
                    </Typography>
                  )}
                  <List sx={{ p: 0 }}>
                    {readNotifications.slice(0, 10).map((notification) => (
                      <ListItem
                        key={notification.id}
                        disablePadding
                        sx={{
                          mb: 0.5,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: '#F5F5F5'
                          }
                        }}
                      >
                        <ListItemButton
                          onClick={() => handleNotificationClick(notification)}
                          sx={{ py: 1.5, px: 2 }}
                        >
                          <Box sx={{ mr: 2 }}>
                            {getNotificationIcon(notification.type)}
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#7F8C8D' }}>
                                {notification.title}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" sx={{ color: '#95A5A6', display: 'block' }}>
                                  {notification.message}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#BDC3C7', fontSize: '0.7rem' }}>
                                  {formatNotificationTime(notification.created_at)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default MemberNotificationBell;

