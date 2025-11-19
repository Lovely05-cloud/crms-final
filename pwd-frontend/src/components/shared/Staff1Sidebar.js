import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, IconButton, Badge } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Menu from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toastService from '../../services/toastService';
import ChangePassword from '../auth/ChangePassword';
import NotificationBell from './NotificationBell';
import staff1NotificationService from '../../services/staff1NotificationService';

function Staff1Sidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Navigation map for notification types
  const notificationNavigationMap = {
    'pending_application': '/pwd-records',
    'document_review': '/pwd-records',
    'id_renewal': '/pwd-records',
    'default': '/dashboard'
  };

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

  // Determine which menu item is active based on current path
  const isActive = (path) => {
    return location.pathname === path;
  };

  const SidebarItem = ({ icon, label, path, active = false, badgeCount = 0 }) => (
    <Button
      fullWidth
      startIcon={icon}
      onClick={() => navigate(path)}
      size="small"
      sx={{
        justifyContent: 'flex-start',
        color: active ? '#1976D2' : '#566573',
        backgroundColor: active ? '#E3F2FD' : 'transparent',
        textTransform: 'none',
        fontWeight: active ? 600 : 500,
        py: 1.2,
        px: 2,
        borderRadius: 2,
        mb: 0.5,
        '&:hover': {
          backgroundColor: active ? '#E3F2FD' : '#F5F5F5',
          color: active ? '#1976D2' : '#2C3E50'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Typography variant="body2" sx={{ flexGrow: 1, textAlign: 'left' }}>
          {label}
        </Typography>
        {badgeCount > 0 && (
          <Badge 
            badgeContent={badgeCount} 
            color="error" 
            sx={{ 
              '& .MuiBadge-badge': { 
                fontSize: '0.7rem',
                height: '18px',
                minWidth: '18px'
              } 
            }}
          />
        )}
      </Box>
    </Button>
  );

  return (
    <Box sx={{
      width: { xs: isOpen ? '280px' : '0', md: '280px' },
      height: '100vh',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E0E0E0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1200,
      transition: 'width 0.3s ease-in-out',
      overflow: 'hidden',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ 
            bgcolor: '#1976D2', 
            width: 32, 
            height: 32,
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            S1
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', lineHeight: 1.2 }}>
              Staff 1
            </Typography>
            <Typography variant="caption" sx={{ color: '#7F8C8D', fontSize: '0.7rem' }}>
              PWD Records & Masterlist
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationBell 
            notificationService={staff1NotificationService}
            navigationMap={notificationNavigationMap}
          />
          <IconButton
            onClick={onToggle}
            sx={{ 
              display: { xs: 'flex', md: 'none' },
              color: '#7F8C8D',
              p: 0.5
            }}
          >
            {isOpen ? <CloseIcon fontSize="small" /> : <Menu fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* User Info */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #E0E0E0',
        backgroundColor: '#F8F9FA'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ 
            bgcolor: '#4CAF50', 
            width: 40, 
            height: 40,
            fontSize: '1rem',
            fontWeight: 'bold'
          }}>
            {currentUser?.firstName?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 600, 
              color: '#2C3E50',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#7F8C8D',
              fontSize: '0.7rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}>
              {currentUser?.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ 
        flex: 1, 
        p: 1.5,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '2px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#a8a8a8',
        },
      }}>
        <SidebarItem
          icon={<DashboardIcon />}
          label="Dashboard"
          path="/dashboard"
          active={isActive('/dashboard')}
        />
        
        <SidebarItem
          icon={<PeopleIcon />}
          label="PWD Masterlist"
          path="/pwd-masterlist"
          active={isActive('/pwd-masterlist')}
        />
        
        <SidebarItem
          icon={<AssignmentIcon />}
          label="PWD Records"
          path="/pwd-records"
          active={isActive('/pwd-records')}
        />
      </Box>

      {/* User Management Section */}
      <Box sx={{ 
        p: 1.5,
        borderTop: '1px solid #E0E0E0',
        backgroundColor: '#F8F9FA'
      }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<PersonIcon />}
          onClick={() => setChangePasswordOpen(true)}
          size="small"
          sx={{
            color: '#566573',
            borderColor: '#D5DBDB',
            textTransform: 'none',
            fontWeight: 600,
            py: 0.4,
            borderRadius: 2,
            fontSize: '0.8rem',
            minHeight: '32px',
            '&:hover': {
              borderColor: '#1976D2',
              background: '#F4F7FC',
              color: '#1976D2'
            }
          }}
        >
          Change Password
        </Button>
      </Box>

      {/* Logout Button */}
      <Box sx={{ 
        p: 1,
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        display: { xs: isOpen ? 'block' : 'none', md: 'block' },
        flexShrink: 0,
        borderTop: '1px solid #E0E0E0'
      }}>
        <Button
          fullWidth
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={handleLogout}
          size="small"
          sx={{
            color: '#566573',
            borderColor: '#D5DBDB',
            textTransform: 'none',
            fontWeight: 600,
            py: 0.4,
            borderRadius: 2,
            fontSize: '0.8rem',
            minHeight: '32px',
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

      {/* Password Management Dialog */}
      <ChangePassword 
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Box>
  );
}

export default Staff1Sidebar;
