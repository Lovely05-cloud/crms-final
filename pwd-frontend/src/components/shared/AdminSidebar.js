import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, IconButton, Badge } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Menu from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supportService } from '../../services/supportService';
import toastService from '../../services/toastService';
import ChangePassword from '../auth/ChangePassword';
import AdminPasswordReset from '../admin/AdminPasswordReset';

function AdminSidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [supportNotifications, setSupportNotifications] = useState(0);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [adminPasswordResetOpen, setAdminPasswordResetOpen] = useState(false);

  useEffect(() => {
    const fetchSupportNotifications = async () => {
      try {
        const tickets = await supportService.getTickets();
        const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
        setSupportNotifications(openTickets);
      } catch (error) {
        console.error('Error fetching support notifications:', error);
        setSupportNotifications(0);
      }
    };

    fetchSupportNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchSupportNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const SidebarItem = ({ icon, label, path, active = false, badgeCount = 0 }) => {
    return (
      <Box 
        onClick={() => navigate(path)}
        sx={{
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, // Restored to comfortable size
          px: 1.5, // Restored to comfortable size
          py: 1, // Restored to comfortable size
          borderRadius: 2, 
          mb: 0.5, // Restored to comfortable size
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
      width: { xs: isOpen ? 280 : 0, md: 280 },
      bgcolor: '#FFFFFF', 
      color: '#333', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      left: 0,
      top: 0,
      borderRight: '1px solid #E0E0E0',
      zIndex: 1300,
      transition: 'width 0.3s ease-in-out',
      overflow: 'hidden', // No scrolling - all content should fit
      boxShadow: { xs: isOpen ? '2px 0 8px rgba(0,0,0,0.1)' : 'none', md: 'none' }
    }}>
      {/* Header with Logo and Toggle Button */}
      <Box sx={{ 
        p: 2, // Reduced padding
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        justifyContent: 'space-between',
        flexShrink: 0 // Prevent header from shrinking
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
              alt="PDAO Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }}
            />
          </Box>
          <Box sx={{ display: { xs: isOpen ? 'block' : 'none', md: 'block' } }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C3E50', lineHeight: 1.2 }}>
              CABUYAO PDAO
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C3E50', lineHeight: 1.2 }}>
              RMS
            </Typography>
          </Box>
        </Box>
        
        {/* Hamburger Menu Button - Hidden on mobile, show on desktop */}
        <IconButton
          onClick={onToggle}
          sx={{
            display: { xs: 'none', md: 'flex' }, // Hide on mobile, show on desktop
            color: '#566573',
            '&:hover': {
              backgroundColor: '#E8F0FE',
              color: '#0b87ac'
            }
          }}
        >
          {isOpen ? <CloseIcon /> : <Menu />}
        </IconButton>
      </Box>

      {/* User Info */}
      <Box sx={{ 
        p: 2, // Reduced padding
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        flexShrink: 0 // Prevent user info from shrinking
      }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: '#3498DB', color: 'white' }}>
          <PersonIcon />
        </Avatar>
        <Typography sx={{ 
          fontWeight: 600, 
          color: '#2C3E50',
          display: { xs: isOpen ? 'block' : 'none', md: 'block' }
        }}>
          Hello {currentUser?.role === 'SuperAdmin' ? 'SuperAdmin' : 'Admin'}
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ 
        p: 1.5, // Restored to comfortable size
        flex: 1, 
        mt: 1, // Restored to comfortable size
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        overflow: 'hidden', // No scrolling
        minHeight: 0 // Allow flex item to shrink
      }}>
        <SidebarItem 
          icon={<DashboardIcon />} 
          label="Dashboard" 
          path="/admin-dashboard"
          active={isActive('/admin-dashboard') || isActive('/dashboard')}
        />
        {/* Full SuperAdmin/Admin navigation */}
        <SidebarItem 
          icon={<PeopleIcon />} 
          label="PWD Masterlist" 
          path="/pwd-records"
          active={isActive('/pwd-records')}
        />
        <SidebarItem 
          icon={<CreditCardIcon />} 
          label="PWD Card" 
          path="/pwd-card"
          active={isActive('/pwd-card')}
        />
        <SidebarItem 
          icon={<BarChartIcon />} 
          label="Analytics" 
          path="/analytics"
          active={isActive('/analytics')}
        />
        <SidebarItem 
          icon={<FavoriteIcon />} 
          label="Ayuda" 
          path="/ayuda"
          active={isActive('/ayuda')}
        />
        <SidebarItem 
          icon={<TrackChangesIcon />} 
          label="Benefit Tracking" 
          path="/benefit-tracking"
          active={isActive('/benefit-tracking')}
        />
        <SidebarItem 
          icon={<DescriptionIcon />} 
          label="Claim History" 
          path="/claim-history"
          active={isActive('/claim-history')}
        />
        <SidebarItem 
          icon={<AnnouncementIcon />} 
          label="Announcement" 
          path="/announcement"
          active={isActive('/announcement')}
        />
        <SidebarItem 
          icon={<SupportAgentIcon />} 
          label="Support Desk" 
          path="/admin-support"
          active={isActive('/admin-support')}
          badgeCount={supportNotifications}
        />
        <SidebarItem 
          icon={<DescriptionIcon />} 
          label="Document Management" 
          path="/document-management"
          active={isActive('/document-management')}
        />
        {currentUser?.role === 'SuperAdmin' && (
          <>
            <SidebarItem 
              icon={<TrackChangesIcon />} 
              label="Audit Logs" 
              path="/audit-logs"
              active={isActive('/audit-logs')}
            />
            <SidebarItem 
              icon={<SecurityIcon />} 
              label="Security Monitoring" 
              path="/security-monitoring"
              active={isActive('/security-monitoring')}
            />
          </>
        )}
      </Box>

      {/* Password Management */}
      <Box sx={{ 
        p: 1, // Further reduced padding
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        display: { xs: isOpen ? 'block' : 'none', md: 'block' },
        flexShrink: 0, // Prevent this section from shrinking
        borderTop: '1px solid #E0E0E0' // Add visual separation
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
            py: 0.4, // Much smaller padding
            borderRadius: 2,
            mb: 0.3, // Smaller margin
            fontSize: '0.8rem', // Smaller font
            minHeight: '32px', // Smaller button height
            '&:hover': {
              borderColor: '#3498DB',
              background: '#F4F7FC',
              color: '#3498DB'
            }
          }}
        >
          Change Password
        </Button>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<SupportAgentIcon />}
          onClick={() => setAdminPasswordResetOpen(true)}
          size="small"
          sx={{
            color: '#566573',
            borderColor: '#D5DBDB',
            textTransform: 'none',
            fontWeight: 600,
            py: 0.4, // Much smaller padding
            borderRadius: 2,
            fontSize: '0.8rem', // Smaller font
            minHeight: '32px', // Smaller button height
            '&:hover': {
              borderColor: '#E74C3C',
              background: '#F4F7FC',
              color: '#E74C3C'
            }
          }}
        >
          Reset User Password
        </Button>
      </Box>

      {/* Logout Button */}
      <Box sx={{ 
        p: 1, // Further reduced padding
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        display: { xs: isOpen ? 'block' : 'none', md: 'block' },
        flexShrink: 0, // Prevent this section from shrinking
        borderTop: '1px solid #E0E0E0' // Add visual separation
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
            py: 0.4, // Much smaller padding
            borderRadius: 2,
            fontSize: '0.8rem', // Smaller font
            minHeight: '32px', // Smaller button height
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

      {/* Password Management Dialogs */}
      <ChangePassword 
        open={changePasswordOpen} 
        onClose={() => setChangePasswordOpen(false)} 
      />
      <AdminPasswordReset 
        open={adminPasswordResetOpen} 
        onClose={() => setAdminPasswordResetOpen(false)} 
      />
    </Box>
  );
}

export default AdminSidebar;
