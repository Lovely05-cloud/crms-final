// src/components/dashboard/PWDMemberDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  useMediaQuery,
  useTheme,
  Container,
  Chip
} from '@mui/material';
import {
  Dashboard,
  Campaign,
  Support,
  Person,
  CheckCircle,
  Schedule,
  Phone,
  Email,
  AccessTime,
  ErrorOutline,
  Menu,
  VolumeUp,
  CardGiftcard
} from '@mui/icons-material';
import PWDMemberSidebar from '../shared/PWDMemberSidebar';
import AccessibilitySettings from '../shared/AccessibilitySettings';
import HelpGuide, { InfoCard } from '../shared/HelpGuide';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useScreenReader } from '../../hooks/useScreenReader';
import { useReadAloud } from '../../hooks/useReadAloud';
import announcementService from '../../services/announcementService';
import { api } from '../../services/api';
import { 
  mainContainerStyles, 
  contentAreaStyles, 
  headerStyles, 
  titleStyles,
  subtitleStyles,
  cardStyles
} from '../../utils/themeStyles';
import { useNavigate } from 'react-router-dom';

function PWDMemberDashboard() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { announcePageChange } = useScreenReader();
  const { readAloud, isReading } = useReadAloud();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [announcements, setAnnouncements] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [claimedBenefits, setClaimedBenefits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memberSinceDate, setMemberSinceDate] = useState(null);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Navigation handlers
  const handleCreateSupportTicket = () => {
    announcePageChange(t('support.title'));
    navigate('/pwd-support');
  };

  const handleViewMyTickets = () => {
    announcePageChange(t('support.title'));
    navigate('/pwd-support');
  };




  useEffect(() => {
    // Announce page load
    announcePageChange(t('dashboard.title'));
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user's barangay from currentUser
        const userBarangay = currentUser?.barangay || currentUser?.pwd_member?.barangay;
        console.log('Dashboard - Current User:', currentUser);
        console.log('Dashboard - User Barangay:', userBarangay);
        
        // Use announcementService to get filtered announcements
        const filteredAnnouncements = await announcementService.getFilteredForPWDMember(userBarangay);
        
        console.log('Dashboard - Filtered announcements count:', filteredAnnouncements.length);
        console.log('Dashboard - Filtered announcements:', filteredAnnouncements.map(a => ({ 
          id: a.id, 
          title: a.title, 
          status: a.status, 
          targetAudience: a.targetAudience 
        })));
        
        // Fetch support tickets for this user
        const ticketsResponse = await api.get('/support-tickets');
        const ticketsData = ticketsResponse || [];
        const userTickets = ticketsData.filter(ticket => 
          ticket.pwd_member?.user?.id === currentUser?.id
        );
        
        // Fetch claimed benefits for this user
        try {
          const benefitClaimsResponse = await api.get('/benefit-claims');
          const benefitClaimsData = Array.isArray(benefitClaimsResponse) ? benefitClaimsResponse : (benefitClaimsResponse?.data || []);
          const userClaimedBenefits = benefitClaimsData.filter(claim => 
            claim.pwdID === currentUser?.pwd_member?.userID || 
            claim.pwdID === currentUser?.id ||
            (claim.pwd_member && claim.pwd_member.userID === currentUser?.pwd_member?.userID)
          ).filter(claim => claim.status === 'Claimed');
          setClaimedBenefits(userClaimedBenefits.length);
        } catch (benefitError) {
          console.error('Error fetching claimed benefits:', benefitError);
          setClaimedBenefits(0);
        }
        
        // Fetch PWD member profile to get approval date
        try {
          const profileResponse = await api.get('/pwd-member/profile');
          const profileData = profileResponse;
          
          // Get the approval date from created_at or pwd_id_generated_at
          const approvalDate = profileData?.created_at || profileData?.pwd_id_generated_at;
          setMemberSinceDate(approvalDate);
        } catch (profileError) {
          console.log('Could not fetch PWD member profile, using fallback date');
          // Fallback: use current user's created_at if available
          setMemberSinceDate(currentUser?.created_at);
        }
        
        console.log('Dashboard - Setting announcements state with count:', filteredAnnouncements.length);
        setAnnouncements(filteredAnnouncements);
        setSupportTickets(userTickets);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Real-time updates - refresh data every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        // Get user's barangay from currentUser
        const userBarangay = currentUser?.barangay || currentUser?.pwd_member?.barangay;
        
        // Use announcementService to get filtered announcements
        const filteredAnnouncements = await announcementService.getFilteredForPWDMember(userBarangay);
        
        // Fetch support tickets for this user
        const ticketsResponse = await api.get('/support-tickets');
        const ticketsData = ticketsResponse || [];
        const userTickets = ticketsData.filter(ticket => 
          ticket.pwd_member?.user?.id === currentUser?.id
        );
        
        // Fetch claimed benefits for this user
        try {
          const benefitClaimsResponse = await api.get('/benefit-claims');
          const benefitClaimsData = Array.isArray(benefitClaimsResponse) ? benefitClaimsResponse : (benefitClaimsResponse?.data || []);
          const userClaimedBenefits = benefitClaimsData.filter(claim => 
            claim.pwdID === currentUser?.pwd_member?.userID || 
            claim.pwdID === currentUser?.id ||
            (claim.pwd_member && claim.pwd_member.userID === currentUser?.pwd_member?.userID)
          ).filter(claim => claim.status === 'Claimed');
          setClaimedBenefits(userClaimedBenefits.length);
        } catch (benefitError) {
          console.error('Error fetching claimed benefits:', benefitError);
          setClaimedBenefits(0);
        }
        
        console.log('Dashboard Refresh - Filtered announcements count:', filteredAnnouncements.length);
        setAnnouncements(filteredAnnouncements);
        setSupportTickets(userTickets);
        
        console.log('Dashboard data refreshed automatically');
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  // Debug: Log when announcements state changes
  useEffect(() => {
    console.log('Dashboard - Announcements state changed. Count:', announcements.length);
    console.log('Dashboard - Announcements:', announcements.map(a => ({ 
      id: a.id, 
      title: a.title, 
      status: a.status 
    })));
  }, [announcements]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={mainContainerStyles}>
      <PWDMemberSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          ...contentAreaStyles,
          flexGrow: 1,
          ml: { xs: 0, md: '280px' },
          width: { xs: '100%', md: 'calc(100% - 280px)' },
          transition: 'margin-left 0.3s ease-in-out'
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Mobile Menu Button */}
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' }, 
            alignItems: 'center', 
            mb: 2,
            p: 1
          }}>
            <IconButton
              onClick={handleSidebarToggle}
              sx={{
                color: '#566573',
                border: '1px solid #D5DBDB',
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#0b87ac',
                  background: '#F4F7FC',
                  color: '#0b87ac'
                }
              }}
            >
              <Menu />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 2, color: '#000000', fontWeight: 600 }}>
              {t('common.dashboard')}
            </Typography>
          </Box>

          {/* Page Header */}
          <Box sx={{ mb: { xs: 2, md: 4 } }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#000000', 
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
              }}
            >
              {t('dashboard.title')}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#000000',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {t('dashboard.welcome', { 
                name: currentUser?.pwd_member?.firstName && currentUser?.pwd_member?.lastName 
                  ? `${currentUser.pwd_member.firstName} ${currentUser.pwd_member.lastName} ${currentUser.pwd_member.suffix || ''}`.trim()
                  : currentUser?.username || 'PWD Member'
              })}
            </Typography>
          </Box>

          {/* Help Guide for Dashboard */}
          <HelpGuide
            title={t('guide.dashboard.title')}
            type="info"
            steps={[
              {
                title: t('guide.dashboard.steps.understand.title'),
                description: t('guide.dashboard.steps.understand.description')
              },
              {
                title: t('guide.dashboard.steps.announcements.title'),
                description: t('guide.dashboard.steps.announcements.description')
              },
              {
                title: t('guide.dashboard.steps.tickets.title'),
                description: t('guide.dashboard.steps.tickets.description')
              },
              {
                title: t('guide.dashboard.steps.sections.title'),
                description: t('guide.dashboard.steps.sections.description')
              },
              {
                title: t('guide.dashboard.steps.help.title'),
                description: t('guide.dashboard.steps.help.description')
              }
            ]}
          />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorOutline />}>
            {error}
          </Alert>
        )}

          {/* Status Cards - Top Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ ...cardStyles, height: '100%', minHeight: 140 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircle sx={{ fontSize: 48, color: '#27AE60', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#27AE60', mb: 0.5 }}>
                        {t('common.approved')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>
                        {t('dashboard.applicationStatus')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ ...cardStyles, height: '100%', minHeight: 140 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Person sx={{ fontSize: 48, color: '#3498DB', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#3498DB', mb: 0.5 }}>
                        PWD
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000', mb: 0.5 }}>
                        {t('dashboard.memberSince')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#3498DB', fontWeight: 'bold' }}>
                        {formatDate(memberSinceDate)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ ...cardStyles, height: '100%', minHeight: 140 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Campaign sx={{ fontSize: 48, color: '#F39C12', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#F39C12', mb: 0.5 }}>
                        {announcements.length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>
                        {t('common.announcements')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ ...cardStyles, height: '100%', minHeight: 140 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Support sx={{ fontSize: 48, color: '#E74C3C', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#E74C3C', mb: 0.5 }}>
                        {supportTickets.length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>
                        {t('support.myTickets')}
                      </Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleViewMyTickets}
                        sx={{ 
                          color: '#E74C3C',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          p: 0,
                          mt: 0.5,
                          '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                        }}
                      >
                        {t('buttons.viewSupportTickets')}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ ...cardStyles, height: '100%', minHeight: 140 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CardGiftcard sx={{ fontSize: 48, color: '#F39C12', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#F39C12', mb: 0.5 }}>
                        {claimedBenefits}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>
                        Claimed Benefits
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontSize: '0.75rem', mt: 0.5 }}>
                        Total benefits claimed
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>


          {/* Announcements Section - Full Width */}
          <Card sx={{ ...cardStyles, minHeight: 600, maxHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexShrink: 0 }}>
                <Campaign sx={{ color: '#F39C12', fontSize: 24 }} />
                <Typography sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '1.2rem' }}>
                  {t('dashboard.announcements')} ({announcements.length})
                </Typography>
              </Box>
          
              {announcements.length > 0 ? (
                <Box sx={{ 
                  maxWidth: '800px', 
                  mx: 'auto', 
                  width: '100%',
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 2,
                  minHeight: 0,
                  '&::-webkit-scrollbar': {
                    width: '10px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f5f5f5',
                    borderRadius: '5px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#bdc3c7',
                    borderRadius: '5px',
                    '&:hover': {
                      backgroundColor: '#95a5a6',
                    },
                  },
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#bdc3c7 #f5f5f5',
                }}>
                  {announcements.map((announcement, index) => {
                    console.log('Rendering announcement:', index + 1, announcement.title);
                    // Use a unique key - combine id and index as fallback
                    const uniqueKey = announcement.id || `announcement-${index}-${announcement.title}`;
                    return (
                    <Paper
                      key={uniqueKey}
                      elevation={0}
                      sx={{
                        p: 4,
                        mb: 4,
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        backgroundColor: '#ffffff',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'box-shadow 0.3s ease'
                        }
                      }}
                    >
                      {/* Announcement Header */}
                      <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #f5f5f5' }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700, 
                            color: '#2c3e50', 
                            mb: 2,
                            lineHeight: 1.3,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                          }}
                        >
                          {announcement.title}
                        </Typography>
                        
                        {/* Meta Information */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                          <Chip
                            label={`Type: ${announcement.type || 'General'}`}
                            size="small"
                            sx={{
                              backgroundColor: '#E3F2FD',
                              color: '#1976D2',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip
                            label={`Priority: ${announcement.priority || 'Normal'}`}
                            size="small"
                            sx={{
                              backgroundColor: announcement.priority === 'High' ? '#FFEBEE' : '#F3E5F5',
                              color: announcement.priority === 'High' ? '#C62828' : '#7B1FA2',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                          {announcement.targetAudience !== 'All' && 
                           announcement.targetAudience !== 'PWD Members' && 
                           announcement.targetAudience !== 'PWDMember' && (
                            <Chip
                              label={`Target: ${announcement.targetAudience}`}
                              size="small"
                              sx={{
                                backgroundColor: '#E8F5E8',
                                color: '#2E7D32',
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            />
                          )}
                          <Chip
                            label={`Status: ${announcement.status || 'Active'}`}
                            size="small"
                            sx={{
                              backgroundColor: announcement.status === 'Active' ? '#E8F5E8' : '#FFF3E0',
                              color: announcement.status === 'Active' ? '#2E7D32' : '#F57C00',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>

                        {/* Dates */}
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
                            Published: {new Date(announcement.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Typography>
                          {announcement.expiryDate && (
                            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
                              Expires: {new Date(announcement.expiryDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Announcement Content */}
                      <Box sx={{ 
                        backgroundColor: '#fafafa', 
                        p: 3, 
                        borderRadius: 2, 
                        border: '1px solid #f0f0f0',
                        minHeight: 120
                      }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: '#2c3e50', 
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '1rem',
                            fontFamily: 'Arial, sans-serif'
                          }}
                        >
                          {announcement.content || 'No content available.'}
                        </Typography>
                      </Box>

                      {/* Read Aloud Button */}
                      <Box sx={{ mt: 3, textAlign: 'right' }}>
                        <Button
                          onClick={() => {
                            const fullText = `${announcement.title}. ${announcement.content || 'No content available.'}`;
                            readAloud(fullText);
                          }}
                          variant="outlined"
                          disabled={isReading}
                          startIcon={<VolumeUp />}
                          sx={{
                            borderColor: '#F39C12',
                            color: '#F39C12',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 2,
                            py: 1,
                            '&:hover': {
                              borderColor: '#E67E22',
                              backgroundColor: '#F39C1215'
                            }
                          }}
                        >
                          {isReading ? t('buttons.reading') : t('buttons.readAloud')}
                        </Button>
                      </Box>
                    </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ErrorOutline sx={{ fontSize: 64, color: '#bdc3c7', mb: 3 }} />
                  <Typography variant="h5" sx={{ color: '#7f8c8d', mb: 2, fontWeight: 500 }}>
                    {t('dashboard.noAnnouncements')}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#95a5a6' }}>
                    {t('dashboard.checkBackLater')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      {/* Accessibility Settings Floating Button */}
      <AccessibilitySettings />
    </Box>
  );
}

export default PWDMemberDashboard;