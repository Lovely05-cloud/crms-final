import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import toastService from '../../services/toastService';
import AdminSidebar from '../shared/AdminSidebar';
import Staff2Sidebar from '../shared/Staff2Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import benefitService from '../../services/benefitService';
import pwdMemberService from '../../services/pwdMemberService';

const BenefitTracking = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalClaims: 0,
    claimed: 0,
    unclaimed: 0,
    claimsByBenefit: {},
    claimsByClaimantType: {},
    recentClaims: []
  });





  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };







  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all claims
      const claimsResponse = await api.get('/benefit-claims');
      let claims = [];
      
      if (Array.isArray(claimsResponse)) {
        claims = claimsResponse;
      } else if (claimsResponse?.data && Array.isArray(claimsResponse.data)) {
        claims = claimsResponse.data;
      } else if (claimsResponse?.data?.data && Array.isArray(claimsResponse.data.data)) {
        claims = claimsResponse.data.data;
      }

      // Fetch all benefits
      const benefits = await benefitService.getAll();
      const allBenefits = Array.isArray(benefits) ? benefits : [];

      // Calculate analytics
      const totalClaims = claims.length;
      const claimed = claims.filter(c => c.status === 'Claimed' || c.status === 'claimed').length;
      const unclaimed = totalClaims - claimed;

      // Claims by benefit
      const claimsByBenefit = {};
      claims.forEach(claim => {
        const benefitId = claim.benefitID || claim.benefitId;
        if (benefitId) {
          const benefit = allBenefits.find(b => (b.id || b.benefitID) === benefitId);
          const benefitName = benefit ? (benefit.title || benefit.type || 'Unknown') : 'Unknown';
          if (!claimsByBenefit[benefitName]) {
            claimsByBenefit[benefitName] = { total: 0, claimed: 0, unclaimed: 0 };
          }
          claimsByBenefit[benefitName].total++;
          if (claim.status === 'Claimed' || claim.status === 'claimed') {
            claimsByBenefit[benefitName].claimed++;
          } else {
            claimsByBenefit[benefitName].unclaimed++;
          }
        }
      });

      // Claims by claimant type
      const claimsByClaimantType = {
        Member: 0,
        Guardian: 0,
        Others: 0,
        'N/A': 0
      };
      claims.forEach(claim => {
        const claimantType = claim.claimantType || 'N/A';
        if (claimsByClaimantType.hasOwnProperty(claimantType)) {
          claimsByClaimantType[claimantType]++;
        } else {
          claimsByClaimantType['N/A']++;
        }
      });

      // Recent claims (last 10)
      const recentClaims = claims
        .filter(c => c.claimDate || c.created_at || c.updated_at)
        .sort((a, b) => {
          const dateA = new Date(a.claimDate || a.created_at || a.updated_at);
          const dateB = new Date(b.claimDate || b.created_at || b.updated_at);
          return dateB - dateA;
        })
        .slice(0, 10);

      // Enrich recent claims with member and benefit details
      const membersResponse = await pwdMemberService.getAll();
      const candidates = [
        membersResponse?.data?.members,
        membersResponse?.members,
        membersResponse?.data,
        membersResponse
      ];
      const allMembers = candidates.find((v) => Array.isArray(v)) || [];

      const enrichedRecentClaims = recentClaims.map(claim => {
        const memberId = claim.pwdID || claim.pwdId || claim.userID;
        const member = allMembers.find(m => (m.userID || m.id) === memberId);
        const benefitId = claim.benefitID || claim.benefitId;
        const benefit = allBenefits.find(b => (b.id || b.benefitID) === benefitId);
        
        return {
          ...claim,
          memberName: member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : 'N/A',
          benefitName: benefit ? (benefit.title || benefit.type || 'N/A') : 'N/A'
        };
      });

      setAnalytics({
        totalClaims,
        claimed,
        unclaimed,
        claimsByBenefit,
        claimsByClaimantType,
        recentClaims: enrichedRecentClaims
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics. Please try again.');
      toastService.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 4, 
        minHeight: '100vh',
        bgcolor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Box sx={{ 
          textAlign: 'center',
          p: 4,
          bgcolor: 'white',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <CircularProgress size={60} sx={{ color: '#2C3E50', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading analytics...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        p: 4, 
        minHeight: '100vh',
        bgcolor: 'white'
      }}>
        <Alert 
          severity="error"
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            '& .MuiAlert-message': {
              fontSize: '1.1rem'
            }
          }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'white' }}>
      {/* Role-based Sidebar with Toggle */}
      {currentUser?.role === 'Staff2' ? (
        <Staff2Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      ) : (
        <AdminSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      )}
      
      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1,
        p: { xs: 1, sm: 2, md: 3 },
        ml: { xs: 0, md: '280px' }, // Hide sidebar margin on mobile
        width: { xs: '100%', md: 'calc(100% - 280px)' },
        minHeight: '100vh',
        bgcolor: 'white',
        transition: 'margin-left 0.3s ease-in-out'
      }}>
        <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 1 } }}>
          {/* Mobile Menu Button */}
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            mb: 2,
            p: 1
          }}>
            <Button
              variant="outlined"
              startIcon={<MenuIcon />}
              onClick={handleSidebarToggle}
              sx={{
                color: '#566573',
                borderColor: '#D5DBDB',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#253D90',
                  background: '#F4F7FC',
                  color: '#253D90'
                }
              }}
            >
              Menu
            </Button>
          </Box>
          {/* Header */}
          <Box sx={{ 
            mb: { xs: 2, md: 4 },
            textAlign: 'center',
            p: { xs: 2, md: 3 },
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e0e0e0'
          }}>
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2C3E50',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
              }}
            >
              Benefit Tracking
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 400,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Use the QR scanner to claim benefits for PWD members
            </Typography>
          </Box>

        {/* Analytics Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                  borderRadius: 3
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      Total Claims
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                      {analytics.totalClaims}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
                  borderRadius: 3
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      Claimed
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                      {analytics.claimed}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(240, 147, 251, 0.3)',
                  borderRadius: 3
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      Unclaimed
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                      {analytics.unclaimed}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  color: '#2C3E50',
                  boxShadow: '0 8px 32px rgba(250, 112, 154, 0.3)',
                  borderRadius: 3
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      Claim Rate
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                      {analytics.totalClaims > 0 ? Math.round((analytics.claimed / analytics.totalClaims) * 100) : 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Claims by Benefit Type */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2C3E50' }}>
                    Claims by Benefit Type
                  </Typography>
                  {Object.keys(analytics.claimsByBenefit).length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                      No claims data available
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#0b87ac' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Benefit</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Total</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Claimed</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Unclaimed</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(analytics.claimsByBenefit)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([benefitName, stats]) => (
                              <TableRow key={benefitName} hover>
                                <TableCell>{benefitName}</TableCell>
                                <TableCell align="right">{stats.total}</TableCell>
                                <TableCell align="right">
                                  <Chip label={stats.claimed} color="success" size="small" />
                                </TableCell>
                                <TableCell align="right">
                                  <Chip label={stats.unclaimed} color="default" size="small" />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Claims by Claimant Type */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2C3E50' }}>
                    Claims by Claimant Type
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#0b87ac' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 700 }}>Claimant Type</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Count</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analytics.claimsByClaimantType)
                          .filter(([_, count]) => count > 0)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <TableRow key={type} hover>
                              <TableCell>{type}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                              <TableCell align="right">
                                {analytics.totalClaims > 0 ? Math.round((count / analytics.totalClaims) * 100) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Recent Claims */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2C3E50' }}>
                Recent Claims
              </Typography>
              {analytics.recentClaims.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                  No recent claims found
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#0b87ac' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>PWD Member</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Benefit</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Claimant Type</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.recentClaims.map((claim, index) => (
                        <TableRow key={claim.id || index} hover>
                          <TableCell>
                            {claim.claimDate ? new Date(claim.claimDate).toLocaleDateString() : 
                             claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 
                             claim.updated_at ? new Date(claim.updated_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>{claim.memberName || 'N/A'}</TableCell>
                          <TableCell>{claim.benefitName || 'N/A'}</TableCell>
                          <TableCell>{claim.claimantType || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              label={claim.status === 'Claimed' || claim.status === 'claimed' ? 'Claimed' : 'Unclaimed'}
                              color={claim.status === 'Claimed' || claim.status === 'claimed' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
        </Container>
      </Box>
      


    </Box>
  );
};

export default BenefitTracking;
