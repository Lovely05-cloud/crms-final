// src/components/dashboard/BarangayPresidentDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Dashboard,
  People,
  Assignment,
  Campaign,
  Support,
  TrendingUp,
  CheckCircle,
  Warning,
  Schedule,
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Notifications,
  BarChart
} from '@mui/icons-material';
import BarangayPresidentSidebar from '../shared/BarangayPresidentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import dashboardService from '../../services/dashboardService';
import { 
  mainContainerStyles, 
  contentAreaStyles, 
  headerStyles, 
  titleStyles,
  subtitleStyles,
  cardStyles,
  dialogStyles,
  dialogTitleStyles,
  dialogContentStyles,
  dialogActionsStyles,
  buttonStyles,
  textFieldStyles,
  tableStyles
} from '../../utils/themeStyles';

function BarangayPresidentDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPWDMembers: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    activeMembers: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Format date as MM/DD/YYYY
  const formatDateMMDDYYYY = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  };

  // Metric descriptions
  const metricDescriptions = {
    totalPWDMembers: {
      title: 'Total PWD Members',
      description: 'This metric represents the total number of Persons with Disabilities (PWD) who are registered members in your barangay. This includes all PWD members regardless of their application status, whether they have pending, approved, or completed applications.',
      details: [
        'Includes all registered PWD members in your barangay',
        'Counts members from all application statuses',
        'Updated in real-time as new members register',
        'Helps track the overall PWD community size in your area'
      ]
    },
    pendingApplications: {
      title: 'Pending Applications',
      description: 'This metric shows the number of PWD registration applications that are currently awaiting your review and approval. These are applications that have been submitted by applicants but have not yet been processed by the barangay president.',
      details: [
        'Applications waiting for barangay president review',
        'Requires your action to approve or reject',
        'Applications are sorted by submission date (newest first)',
        'Click "View All" to see detailed application information'
      ]
    },
    approvedApplications: {
      title: 'Approved Applications',
      description: 'This metric displays the total number of PWD registration applications that have been successfully approved by the barangay president. These applications have passed the initial barangay-level review and may be forwarded to the next approval stage.',
      details: [
        'Applications that have been approved by you',
        'May be forwarded to admin/staff for final processing',
        'Represents successful PWD registrations in your barangay',
        'Contributes to the total PWD members count'
      ]
    },
    activeMembers: {
      title: 'Active Members',
      description: 'This metric indicates the number of PWD members who are currently active in the system. Active members are those who have completed their registration, have valid PWD ID cards, and are actively participating in PWD programs and benefits.',
      details: [
        'Members with completed registrations and valid PWD IDs',
        'Eligible for PWD benefits and programs',
        'Members who are actively engaged in PWD services',
        'Updated based on member status and card validity'
      ]
    }
  };

  const handleMetricClick = (metricKey) => {
    setSelectedMetric(metricKey);
    setMetricModalOpen(true);
  };

  const handleCloseMetricModal = () => {
    setMetricModalOpen(false);
    setSelectedMetric(null);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch PWD members statistics
        const pwdResponse = await api.get('/pwd-members');
        const pwdMembers = pwdResponse.data || [];
        
        // Fetch applications directly from API for recent applications
        const applicationsResponse = await api.get('/applications');
        const applications = (applicationsResponse || []).sort((a,b)=>{
          const aTime = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          const bTime = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
          return bTime - aTime;
        });
        
        // Filter by barangay - use user's barangay or fallback
        const targetBarangay = currentUser?.barangay || 'Unknown Barangay';
        const barangayMembers = pwdMembers.filter(member => member.barangay === targetBarangay);
        const barangayApplications = applications.filter(app => app.barangay === targetBarangay);
        
        // Fetch announcements filtered by barangay
        const announcementsResponse = await api.get('/announcements');
        const allAnnouncements = announcementsResponse.data || [];
        
        console.log('All announcements:', allAnnouncements);
        console.log('Target barangay:', targetBarangay);
        
        // Filter announcements for this barangay:
        // 1. Public announcements (targetAudience = 'All')
        // 2. Barangay-specific announcements (targetAudience matches user's barangay)
        const filteredAnnouncements = allAnnouncements.filter(announcement => {
          const targetAudience = announcement.targetAudience;
          
          console.log('Announcement:', announcement.title, 'Target:', targetAudience);
          
          // Show public announcements
          if (targetAudience === 'All') return true;
          
          // Show barangay-specific announcements
          if (targetBarangay && targetAudience === targetBarangay) return true;
          
          return false;
        });
        
        console.log('Filtered announcements:', filteredAnnouncements);
        
        setStats({
          totalPWDMembers: barangayMembers.length,
          pendingApplications: barangayApplications.filter(app => app.status === 'Pending Barangay Approval').length,
          approvedApplications: barangayApplications.filter(app => app.status === 'Approved').length,
          activeMembers: barangayMembers.filter(member => member.status === 'active').length
        });
        
        setRecentApplications(barangayApplications.slice(0, 5));
        setRecentAnnouncements(filteredAnnouncements.slice(0, 3));
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#27AE60';
      case 'Pending Barangay Approval': return '#F39C12';
      case 'Pending Admin Approval': return '#3498DB';
      case 'Rejected': return '#E74C3C';
      case 'active': return '#27AE60';
      case 'inactive': return '#000000';
      default: return '#000000';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={mainContainerStyles}>
      <BarangayPresidentSidebar />
      
      {/* Main content */}
      <Box sx={contentAreaStyles}>
        {/* Header */}
        <Box sx={headerStyles}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Dashboard sx={{ fontSize: 32, color: '#3498DB' }} />
            <Box>
              <Typography variant="h4" sx={titleStyles}>
                Barangay President Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                Welcome, {currentUser?.username || 'Barangay President'} • {currentUser?.barangay || 'Mamatid'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ color: '#000000', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: '#000000' }}>
              {formatDateMMDDYYYY(new Date().toISOString())}
            </Typography>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={3}>
            <Card 
              onClick={() => handleMetricClick('totalPWDMembers')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  borderColor: '#3498DB'
                }
              }}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 1.5, sm: 2, md: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <People sx={{ 
                  fontSize: { xs: 28, sm: 36, md: 44 }, 
                  color: '#3498DB', 
                  mb: { xs: 0.75, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem' }
                  }}
                >
                  {stats.totalPWDMembers}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                    lineHeight: 1.2
                  }}
                >
                  Total PWD Members
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card 
              onClick={() => handleMetricClick('pendingApplications')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  borderColor: '#F39C12'
                }
              }}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 1.5, sm: 2, md: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Schedule sx={{ 
                  fontSize: { xs: 28, sm: 36, md: 44 }, 
                  color: '#F39C12', 
                  mb: { xs: 0.75, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem' }
                  }}
                >
                  {stats.pendingApplications}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                    lineHeight: 1.2
                  }}
                >
                  Pending Applications
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card 
              onClick={() => handleMetricClick('approvedApplications')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  borderColor: '#27AE60'
                }
              }}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 1.5, sm: 2, md: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <CheckCircle sx={{ 
                  fontSize: { xs: 28, sm: 36, md: 44 }, 
                  color: '#27AE60', 
                  mb: { xs: 0.75, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem' }
                  }}
                >
                  {stats.approvedApplications}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                    lineHeight: 1.2
                  }}
                >
                  Approved Applications
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card 
              onClick={() => handleMetricClick('activeMembers')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  borderColor: '#E74C3C'
                }
              }}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 1.5, sm: 2, md: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <TrendingUp sx={{ 
                  fontSize: { xs: 28, sm: 36, md: 44 }, 
                  color: '#E74C3C', 
                  mb: { xs: 0.75, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem' }
                  }}
                >
                  {stats.activeMembers}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                    lineHeight: 1.2
                  }}
                >
                  Active Members
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Recent Applications */}
          <Grid item xs={12} md={8}>
            <Card sx={{ ...cardStyles, height: '100%' }}>
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Assignment sx={{ color: '#3498DB', fontSize: 28 }} />
                    <Typography sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '1.3rem' }}>
                      Recent Applications
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="medium"
                    onClick={() => navigate('/barangay-president-pwd-records')}
                    sx={{ 
                      borderColor: '#3498DB', 
                      color: '#3498DB',
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      py: 0.75,
                      px: 2.5,
                      '&:hover': { borderColor: '#2980B9', backgroundColor: '#3498DB15' }
                    }}
                  >
                    View All
                  </Button>
                </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Applicant</TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Status</TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Applied Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentApplications.map((application, index) => (
                      <TableRow key={`application-${index}`} sx={{ bgcolor: index % 2 ? '#F7FBFF' : 'white' }}>
                        <TableCell sx={{ py: 2, px: 2, fontSize: '0.8rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#3498DB', fontSize: '0.75rem' }}>
                              {application.firstName?.charAt(0) || 'A'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#0b87ac', fontSize: '0.8rem' }}>
                                {application.firstName} {application.lastName} {application.suffix || ''}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#000000', fontSize: '0.7rem' }}>
                                {application.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2, px: 2 }}>
                          <Chip
                            label={application.status?.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(application.status)}15`,
                              color: getStatusColor(application.status),
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 24
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#000000', fontSize: '0.8rem', py: 2, px: 2 }}>
                          {formatDateMMDDYYYY(application.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Announcements */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...cardStyles, height: '100%' }}>
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Campaign sx={{ color: '#3498DB', fontSize: 28 }} />
                  <Typography sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '1.3rem' }}>
                    Recent Announcements
                  </Typography>
                </Box>
                
                {recentAnnouncements.length > 0 ? (
                  <List sx={{ flex: 1 }}>
                    {recentAnnouncements.map((announcement, index) => (
                      <React.Fragment key={`announcement-${index}`}>
                        <ListItem sx={{ px: 0, py: 1.5 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Notifications sx={{ color: '#3498DB', fontSize: 24 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#2C3E50', fontSize: '1rem' }}>
                                {announcement.title}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: '#000000', fontSize: '0.9rem' }}>
                                {formatDateMMDDYYYY(announcement.created_at)}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < recentAnnouncements.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: 4
                  }}>
                    <Box>
                      <Campaign sx={{ fontSize: 48, color: '#BDC3C7', mb: 2 }} />
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontSize: '1rem' }}>
                        No announcements available
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#95A5A6', fontSize: '0.9rem' }}>
                        Check back later for updates
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Metric Description Modal */}
      <Dialog
        open={metricModalOpen}
        onClose={handleCloseMetricModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        {selectedMetric && metricDescriptions[selectedMetric] && (
          <>
            <DialogTitle sx={{ 
              bgcolor: '#F8F9FA',
              borderBottom: '2px solid #E0E0E0',
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                bgcolor: '#3498DB15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedMetric === 'totalPWDMembers' && <People sx={{ color: '#3498DB', fontSize: 28 }} />}
                {selectedMetric === 'pendingApplications' && <Schedule sx={{ color: '#F39C12', fontSize: 28 }} />}
                {selectedMetric === 'approvedApplications' && <CheckCircle sx={{ color: '#27AE60', fontSize: 28 }} />}
                {selectedMetric === 'activeMembers' && <TrendingUp sx={{ color: '#E74C3C', fontSize: 28 }} />}
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C3E50', mb: 0.5 }}>
                  {metricDescriptions[selectedMetric].title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600 }}>
                  Current Value: {stats[selectedMetric]}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ color: '#34495E', mb: 3, lineHeight: 1.8 }}>
                {metricDescriptions[selectedMetric].description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                Key Details:
              </Typography>
              <List sx={{ pl: 0 }}>
                {metricDescriptions[selectedMetric].details.map((detail, index) => (
                  <ListItem key={index} sx={{ pl: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: '#3498DB',
                        mt: 0.5
                      }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={detail}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: '#34495E',
                        sx: { lineHeight: 1.6 }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, bgcolor: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}>
              <Button
                onClick={handleCloseMetricModal}
                variant="contained"
                sx={{
                  bgcolor: '#3498DB',
                  color: 'white',
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  '&:hover': {
                    bgcolor: '#2980B9'
                  }
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default BarangayPresidentDashboard;