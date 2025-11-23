import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, Badge, Collapse } from '@mui/material';
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toastService from '../../services/toastService';
import ChangePassword from '../auth/ChangePassword';
import AdminPasswordReset from '../admin/AdminPasswordReset';
import NotificationBell from './NotificationBell';
import adminNotificationService from '../../services/adminNotificationService';

function AdminSidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [adminPasswordResetOpen, setAdminPasswordResetOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    memberManagement: true,
    benefitTracking: true
  });

  // Navigation map for notification types
  const notificationNavigationMap = {
    'support_ticket': '/admin-support',
    'pending_application': '/pwd-records',
    'document_review': '/document-management',
    'id_renewal': '/pwd-card',
    'default': '/admin-dashboard'
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

  const SidebarItem = ({ icon, label, path, active = false, badgeCount = 0, indent = false }) => {
    return (
      <Box 
        onClick={() => navigate(path)}
        sx={{
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          px: indent ? 3.5 : 1.5,
          py: 1,
          borderRadius: 2, 
          mb: 0.5,
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

  const CollapsibleSection = ({ icon, label, children, sectionKey, defaultExpanded = true }) => {
    const isExpanded = expandedSections[sectionKey] ?? defaultExpanded;
    
    const toggleSection = () => {
      setExpandedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }));
    };

    return (
      <Box>
        <Box 
          onClick={toggleSection}
          sx={{
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 2, 
            mb: 0.5,
            cursor: 'pointer',
            color: '#566573',
            fontWeight: 600,
            '&:hover': {
              background: '#E8F0FE',
              color: '#0b87ac'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {isExpanded ? (
            <ExpandMoreIcon sx={{ fontSize: 20, color: '#566573' }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 20, color: '#566573' }} />
          )}
          {React.cloneElement(icon, { sx: { fontSize: 22, color: '#566573' } })}
          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#566573' }}>{label}</Typography>
        </Box>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 0 }}>
            {children}
          </Box>
        </Collapse>
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationBell 
            notificationService={adminNotificationService}
            navigationMap={notificationNavigationMap}
          />
        </Box>
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
        p: 1.5,
        flex: 1, 
        mt: 1,
        opacity: { xs: isOpen ? 1 : 0, md: 1 },
        transition: 'opacity 0.3s ease-in-out',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0
      }}>
        <SidebarItem 
          icon={<DashboardIcon />} 
          label="Dashboard" 
          path="/admin-dashboard"
          active={isActive('/admin-dashboard') || isActive('/dashboard')}
        />
        
        {/* Member Management Section */}
        <CollapsibleSection 
          icon={<PeopleIcon />}
          label="Member Management"
          sectionKey="memberManagement"
          defaultExpanded={true}
        >
          <SidebarItem 
            icon={<PeopleIcon />} 
            label="PWD Masterlist" 
            path="/pwd-records"
            active={isActive('/pwd-records')}
            indent={true}
          />
          <SidebarItem 
            icon={<CreditCardIcon />} 
            label="PWD Card" 
            path="/pwd-card"
            active={isActive('/pwd-card')}
            indent={true}
          />
          {currentUser?.role === 'SuperAdmin' && (
            <SidebarItem 
              icon={<PeopleIcon />} 
              label="Archived Members" 
              path="/archived-members"
              active={isActive('/archived-members')}
              indent={true}
            />
          )}
        </CollapsibleSection>

        {/* Benefit Tracking Section */}
        <CollapsibleSection 
          icon={<TrackChangesIcon />}
          label="Benefit Tracking"
          sectionKey="benefitTracking"
          defaultExpanded={true}
        >
          <SidebarItem 
            icon={<TrackChangesIcon />} 
            label="Benefit Tracking" 
            path="/benefit-tracking"
            active={isActive('/benefit-tracking')}
            indent={true}
          />
          <SidebarItem 
            icon={<FavoriteIcon />} 
            label="Ayuda" 
            path="/ayuda"
            active={isActive('/ayuda')}
            indent={true}
          />
          <SidebarItem 
            icon={<DescriptionIcon />} 
            label="Claim History" 
            path="/claim-history"
            active={isActive('/claim-history')}
            indent={true}
          />
        </CollapsibleSection>

        {/* Remaining Navigation Items */}
        <SidebarItem 
          icon={<BarChartIcon />} 
          label="Analytics" 
          path="/analytics"
          active={isActive('/analytics')}
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
