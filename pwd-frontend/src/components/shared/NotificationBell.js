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
  NotificationsActive,
  Assignment,
  Description,
  CreditCard,
  SupportAgent,
  CardGiftcard,
  Favorite
} from '@mui/icons-material';
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

// Icon mapping
const iconMap = {
  'Assignment': Assignment,
  'Description': Description,
  'CreditCard': CreditCard,
  'SupportAgent': SupportAgent,
  'CardGiftcard': CardGiftcard,
  'Favorite': Favorite,
  'Notifications': NotificationsIcon
};

function NotificationBell({ notificationService, navigationMap = {} }) {
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

  const handleNotificationClick = (notification) => {
    handleClose();

    // Get base navigation path
    const basePath = navigationMap[notification.type] || navigationMap.default || '/dashboard';
    
    // Check if notification has specific item data to navigate to
    const data = notification.data || {};
    
    // Navigate with state to pass item information
    navigate(basePath, {
      state: {
        notificationItem: {
          type: notification.type,
          id: data.applicationID || data.ticket_id || data.announcement_id || data.document_id || data.renewal_id,
          applicationID: data.applicationID,
          ticket_id: data.ticket_id,
          announcement_id: data.announcement_id,
          document_id: data.document_id,
          renewal_id: data.renewal_id,
          ...data
        }
      }
    });
  };

  const getNotificationIcon = (type) => {
    const iconName = notificationService.getNotificationIcon(type);
    const IconComponent = iconMap[iconName] || NotificationsIcon;
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

export default NotificationBell;

