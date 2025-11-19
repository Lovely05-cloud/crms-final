import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, Badge } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toastService from '../../services/toastService';
import NotificationBell from './NotificationBell';
import barangayPresidentNotificationService from '../../services/barangayPresidentNotificationService';

function BarangayPresidentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();

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

  // Navigation map for notification types
  const notificationNavigationMap = {
    'pending_application': '/barangay-president-pwd-records',
    'default': '/barangay-president-dashboard'
  };

  // Create a wrapper service that includes currentUser
  const notificationService = {
    getAllNotifications: () => barangayPresidentNotificationService.getAllNotifications(currentUser),
    getNotificationIcon: (type) => barangayPresidentNotificationService.getNotificationIcon(type),
    getNotificationColor: (type) => barangayPresidentNotificationService.getNotificationColor(type)
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const SidebarItem = ({ icon, label, path, active = false, badgeCount = 0 }) => {
    console.log(`SidebarItem ${label}: badgeCount = ${badgeCount}, active = ${active}`);
    return (
      <Box 
        onClick={() => navigate(path)}
        sx={{
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, // Reduced gap
          px: 1.5, // Reduced padding
          py: 1, // Reduced padding
          borderRadius: 2, 
          mb: 0.5, // Reduced margin
          bgcolor: active ? '#0b87ac' : 'transparent',
          color: active ? '#FFFFFF' : '#566573',
          fontWeight: active ? 600 : 500,
          '&:hover': {
            background: active ? '#0a6b8a' : '#E8F0FE',
            cursor: 'pointer',
            color: active ? '#FFFFFF' : '#0b87ac'
          },
          transition: 'all 0.2s ease-in-out'
        }}
      >
        {badgeCount > 0 ? (
          <Badge badgeContent={badgeCount} color="error">
            {React.cloneElement(icon, { sx: { fontSize: 22, color: active ? '#FFFFFF' : '#566573' } })}
          </Badge>
        ) : (
          React.cloneElement(icon, { sx: { fontSize: 22, color: active ? '#FFFFFF' : '#566573' } })
        )}
        <Typography sx={{ fontWeight: 'inherit', fontSize: '0.95rem', color: active ? '#FFFFFF' : '#566573' }}>{label}</Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      width: 280,
      bgcolor: '#FFFFFF', 
      color: '#333', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      left: 0,
      top: 0,
      borderRight: '1px solid #E0E0E0',
      overflow: 'hidden' // No scrolling - all content should fit
    }}>
      {/* Header with Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
            alt="PDAO Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain' 
            }}
          />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#0b87ac' }}>CABUYAO PDAO RMS</Typography>
        <NotificationBell 
          notificationService={notificationService}
          navigationMap={notificationNavigationMap}
        />
      </Box>

      {/* User Info */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: '#E8F0FE', color: '#1976D2' }}>
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 600, color: '#333' }}>Hello Barangay President</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#7F8C8D' }}>
            {currentUser?.barangay || 'Barangay Poblacion'}
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ p: 2, flex: 1, mt: 2 }}>
        <SidebarItem 
          icon={<DashboardIcon />} 
          label="Dashboard" 
          path="/barangay-president-dashboard"
          active={isActive('/barangay-president-dashboard') || isActive('/dashboard')}
        />
        <SidebarItem 
          icon={<PeopleIcon />} 
          label="PWD Records" 
          path="/barangay-president-pwd-records"
          active={isActive('/barangay-president-pwd-records')}
        />
        <SidebarItem 
          icon={<CreditCardIcon />} 
          label="PWD Card" 
          path="/barangay-president-pwd-card"
          active={isActive('/barangay-president-pwd-card')}
        />
        <SidebarItem 
          icon={<BarChartIcon />} 
          label="Reports" 
          path="/barangay-president-reports"
          active={isActive('/barangay-president-reports')}
        />
        <SidebarItem 
          icon={<FavoriteIcon />} 
          label="Ayuda" 
          path="/barangay-president-ayuda"
          active={isActive('/barangay-president-ayuda')}
        />
        <SidebarItem 
          icon={<AnnouncementIcon />} 
          label="Announcement" 
          path="/barangay-president-announcement"
          active={isActive('/barangay-president-announcement')}
        />
      </Box>

      {/* Logout Button */}
      <Box sx={{ 
        p: 1.5, // Reduced padding
        flexShrink: 0, // Prevent this section from shrinking
        borderTop: '1px solid #E0E0E0' // Add visual separation
      }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: '#566573',
            borderColor: '#D5DBDB',
            textTransform: 'none',
            fontWeight: 600,
            py: 0.8, // Reduced padding
            borderRadius: 2,
            '&:hover': {
              borderColor: '#0b87ac',
              background: '#F4F7FC',
              color: '#0b87ac'
            }
          }}
        >
          Log Out
        </Button>
      </Box>
    </Box>
  );
}

export default BarangayPresidentSidebar;
