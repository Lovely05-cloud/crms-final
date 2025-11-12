import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Badge
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LogoutIcon from '@mui/icons-material/Logout';
import Menu from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { api } from '../../services/api';
import { supportService } from '../../services/supportService';
import toastService from '../../services/toastService';

function PWDMemberSidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  const menuItems = [
    { text: t('common.dashboard'), icon: <DashboardIcon />, path: '/dashboard', badgeCount: 0 },
    { text: 'Benefits', icon: <CardGiftcardIcon />, path: '/pwd-benefits', badgeCount: 0 },
    { text: t('common.documents'), icon: <DescriptionIcon />, path: '/pwd-documents', badgeCount: 0 },
    { text: t('support.title'), icon: <SupportAgentIcon />, path: '/pwd-support', badgeCount: unreadNotifications },
    { text: t('common.profile'), icon: <PersonIcon />, path: '/pwd-profile', badgeCount: 0 },
  ];

  const handleLogout = async () => {
    const confirmed = await toastService.confirmAsync(
      'Logout Confirmation',
      'Are you sure you want to logout? You will need to sign in again to access your account.'
    );
    
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Fetch support ticket notifications count (only open tickets)
  useEffect(() => {
    const fetchSupportNotifications = async () => {
      try {
        const tickets = await supportService.getTickets();
        const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
        setUnreadNotifications(openTickets);
      } catch (error) {
        console.error('Error fetching support notifications:', error);
        setUnreadNotifications(0);
      }
    };

    fetchSupportNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchSupportNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const sidebarContent = (
    <Box sx={{
      width: 280,
      height: '100%',
      bgcolor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden', // No scrolling - all content should fit
      borderRight: '1px solid #000000'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2.5, 
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src="/images/cropped_image.png" 
              alt="PWD Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C3E50', lineHeight: 1.2 }}>
              PWD MEMBER
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C3E50', lineHeight: 1.2 }}>
              DASHBOARD
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ 
              color: '#566573',
              '&:hover': {
                backgroundColor: '#E8F0FE',
                color: '#0b87ac'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* User Info */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 40,
          height: 40,
          bgcolor: '#3498DB',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <PersonIcon />
        </Box>
        <Typography sx={{ fontWeight: 600, color: '#2C3E50' }}>
          Hello PWD Member
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ p: 2, flex: 1, mt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Box 
              key={item.text}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
              sx={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                px: 2, 
                py: 1.5, 
                borderRadius: 2, 
                mb: 1,
                bgcolor: isActive ? '#0b87ac' : 'transparent',
                color: isActive ? '#FFFFFF' : '#566573',
                fontWeight: isActive ? 600 : 500,
                '&:hover': {
                  background: isActive ? '#0a6b8a' : '#E8F0FE',
                  cursor: 'pointer',
                  color: isActive ? '#FFFFFF' : '#0b87ac'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {item.badgeCount > 0 ? (
                <Badge badgeContent={item.badgeCount} color="error">
                  {React.cloneElement(item.icon, { sx: { fontSize: 22, color: isActive ? '#FFFFFF' : '#566573' } })}
                </Badge>
              ) : (
                React.cloneElement(item.icon, { sx: { fontSize: 22, color: isActive ? '#FFFFFF' : '#566573' } })
              )}
              <Typography sx={{ fontWeight: 'inherit', fontSize: '0.95rem', color: isActive ? '#FFFFFF' : '#566573' }}>
                {item.text}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Logout Section */}
      <Box sx={{ p: 3 }}>
        <Box
          onClick={handleLogout}
          sx={{
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            px: 2, 
            py: 1.5, 
            borderRadius: 2, 
            bgcolor: 'transparent',
            color: '#566573',
            fontWeight: 500,
            '&:hover': {
              background: '#E8F0FE',
              cursor: 'pointer',
              color: '#0b87ac'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <LogoutIcon sx={{ fontSize: 22, color: 'inherit' }} />
          <Typography sx={{ fontWeight: 'inherit', fontSize: '0.95rem', color: 'inherit' }}>
            Logout
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      </>
    );
  }

  return (
    <Box sx={{
      width: 280,
      height: '100vh',
      bgcolor: '#FFFFFF',
      position: 'fixed',
      left: 0,
      top: 0,
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      zIndex: 1000,
      borderRight: '1px solid #E0E0E0',
      boxShadow: 'none'
    }}>
      {sidebarContent}
    </Box>
  );
}

export default PWDMemberSidebar;