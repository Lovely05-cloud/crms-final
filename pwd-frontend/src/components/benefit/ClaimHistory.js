import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActionArea
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import benefitService from '../../services/benefitService';
import pwdMemberService from '../../services/pwdMemberService';
import api from '../../services/api';
import { API_CONFIG } from '../../config/production';
import AdminSidebar from '../shared/AdminSidebar';
import Staff2Sidebar from '../shared/Staff2Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import toastService from '../../services/toastService';
import FloatingQRScannerButton from '../qr/FloatingQRScannerButton';

const ClaimHistory = () => {
  const { currentUser } = useAuth();
  const [activeBenefits, setActiveBenefits] = useState([]);
  const [benefitStats, setBenefitStats] = useState({});
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorizationLetterOpen, setAuthorizationLetterOpen] = useState(false);
  const [selectedAuthorizationLetter, setSelectedAuthorizationLetter] = useState(null);
  const [authorizationLetterError, setAuthorizationLetterError] = useState(false);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loadingRecentClaims, setLoadingRecentClaims] = useState(false);

  useEffect(() => {
    loadActiveBenefits();
    loadRecentClaims();
  }, []);

  const loadRecentClaims = async () => {
    try {
      setLoadingRecentClaims(true);
      const response = await api.get('/benefit-claims');
      let claims = [];
      
      if (Array.isArray(response)) {
        claims = response;
      } else if (response?.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        claims = response.data.data;
      }

      // Fetch member and benefit details for each claim
      const claimsWithDetails = await Promise.all(
        claims.map(async (claim) => {
          try {
            // Get member details
            const memberId = claim.pwdID || claim.pwdId || claim.userID;
            let member = null;
            if (memberId) {
              try {
                const membersResponse = await pwdMemberService.getAll();
                const candidates = [
                  membersResponse?.data?.members,
                  membersResponse?.members,
                  membersResponse?.data,
                  membersResponse
                ];
                const allMembers = candidates.find((v) => Array.isArray(v)) || [];
                member = allMembers.find(m => (m.userID || m.id) === memberId);
              } catch (err) {
                console.warn('Error fetching member:', err);
              }
            }

            // Get benefit details
            const benefitId = claim.benefitID || claim.benefitId;
            let benefit = null;
            if (benefitId) {
              try {
                const benefits = await benefitService.getAll();
                const allBenefits = Array.isArray(benefits) ? benefits : [];
                benefit = allBenefits.find(b => (b.id || b.benefitID) === benefitId);
              } catch (err) {
                console.warn('Error fetching benefit:', err);
              }
            }

            return {
              ...claim,
              member,
              benefit,
              claimDate: claim.claimDate || claim.created_at || claim.updated_at
            };
          } catch (err) {
            console.warn('Error processing claim:', err);
            return { ...claim, member: null, benefit: null };
          }
        })
      );

      // Sort by date (most recent first) and limit to 50
      const sortedClaims = claimsWithDetails
        .filter(claim => claim.claimDate)
        .sort((a, b) => new Date(b.claimDate) - new Date(a.claimDate))
        .slice(0, 50);

      setRecentClaims(sortedClaims);
    } catch (err) {
      console.error('Error loading recent claims:', err);
    } finally {
      setLoadingRecentClaims(false);
    }
  };

  const handleQRScanSuccess = (qrData) => {
    console.log('QR Code scanned successfully:', qrData);
    toastService.success('QR Code scanned successfully');
    // Reload recent claims after a successful scan
    setTimeout(() => {
      loadRecentClaims();
      loadActiveBenefits();
    }, 1000);
  };

  const handleQRScanError = (error) => {
    console.error('QR scan error:', error);
    toastService.error('Failed to scan QR code. Please try again.');
  };

  const loadActiveBenefits = async () => {
    try {
      setLoading(true);
      setError(null);
      const benefits = await benefitService.getAll();
      
      if (Array.isArray(benefits)) {
        const active = benefits.filter(benefit => benefit.status === 'Active');
        setActiveBenefits(active);
        
        // Calculate statistics for each benefit
        await calculateBenefitStats(active);
      } else {
        setActiveBenefits([]);
      }
    } catch (err) {
      console.error('Error loading benefits:', err);
      setError('Failed to load benefits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateBenefitStats = async (benefits) => {
    try {
      // Fetch all PWD members
      const membersResponse = await pwdMemberService.getAll();
      const candidates = [
        membersResponse?.data?.members,
        membersResponse?.members,
        membersResponse?.data,
        membersResponse
      ];
      const allMembers = candidates.find((v) => Array.isArray(v)) || [];

      // Fetch all claims
      let allClaims = [];
      try {
        const claimsResponse = await api.get('/benefit-claims');
        allClaims = Array.isArray(claimsResponse) ? claimsResponse : [];
      } catch (err) {
        console.warn('Error fetching all claims:', err);
        allClaims = [];
      }

      // Create a map of claims by benefit ID and member ID
      const claimsMap = {};
      allClaims.forEach(claim => {
        const benefitId = claim.benefitID || claim.benefitId;
        const memberId = claim.pwdID || claim.pwdId;
        if (benefitId && memberId) {
          if (!claimsMap[benefitId]) {
            claimsMap[benefitId] = {};
          }
          claimsMap[benefitId][memberId] = claim;
        }
      });

      // Calculate stats for each benefit
      const stats = {};
      benefits.forEach(benefit => {
        const benefitId = benefit.id || benefit.benefitID;
        
        // Get eligible beneficiaries based on benefit type
        let eligibleMembers = [];
        
        if (benefit.type === 'Birthday Cash Gift' && benefit.birthdayMonth) {
          const quarterMonths = {
            'Q1': [1, 2, 3],
            'Q2': [4, 5, 6],
            'Q3': [7, 8, 9],
            'Q4': [10, 11, 12]
          };
          
          let eligibleMonths = [];
          if (typeof benefit.birthdayMonth === 'string' && benefit.birthdayMonth.startsWith('Q')) {
            eligibleMonths = quarterMonths[benefit.birthdayMonth] || [];
          } else if (typeof benefit.birthdayMonth === 'string') {
            const monthIndex = [
              'January','February','March','April','May','June',
              'July','August','September','October','November','December'
            ].findIndex(m => m.toLowerCase() === benefit.birthdayMonth.toLowerCase());
            eligibleMonths = monthIndex >= 0 ? [monthIndex + 1] : [];
          }
          
          eligibleMembers = allMembers.filter(member => {
            if (!member.birthDate) return false;
            const birthDate = new Date(member.birthDate);
            const birthMonth = birthDate.getMonth() + 1;
            return eligibleMonths.includes(birthMonth);
          });
        } else {
          // For other benefit types, check barangay eligibility
          eligibleMembers = allMembers.filter(member => {
            if (benefit.barangays && Array.isArray(benefit.barangays) && benefit.barangays.length > 0) {
              return benefit.barangays.includes(member.barangay);
            }
            return true;
          });
        }

        // Count claims
        const benefitClaims = claimsMap[benefitId] || {};
        let claimedCount = 0;
        let unclaimedCount = 0;

        eligibleMembers.forEach(member => {
          const memberId = member.userID || member.id;
          const claim = benefitClaims[memberId];
          if (claim && (claim.status === 'Claimed' || claim.status === 'claimed')) {
            claimedCount++;
          } else {
            unclaimedCount++;
          }
        });

        stats[benefitId] = {
          total: eligibleMembers.length,
          claimed: claimedCount,
          unclaimed: unclaimedCount
        };
      });

      setBenefitStats(stats);
    } catch (err) {
      console.error('Error calculating benefit stats:', err);
    }
  };

  const handleBenefitClick = async (benefit) => {
    try {
      setLoading(true);
      setSelectedBenefit(benefit);
      setError(null);

      // Fetch all PWD members
      const membersResponse = await pwdMemberService.getAll();
      const candidates = [
        membersResponse?.data?.members,
        membersResponse?.members,
        membersResponse?.data,
        membersResponse
      ];
      const allMembers = candidates.find((v) => Array.isArray(v)) || [];

      // Fetch all claims for this benefit
      let claims = [];
      try {
        const claimsResponse = await api.get(`/benefit-claims/${benefit.id || benefit.benefitID}`);
        claims = Array.isArray(claimsResponse) ? claimsResponse : [];
      } catch (err) {
        console.warn('Error fetching claims:', err);
        claims = [];
      }

      // Create a map of claims by member ID
      const claimsMap = {};
      claims.forEach(claim => {
        const memberId = claim.pwdID || claim.pwdId;
        if (memberId) {
          claimsMap[memberId] = claim;
        }
      });

      // Get eligible beneficiaries based on benefit type
      let eligibleMembers = [];
      
      if (benefit.type === 'Birthday Cash Gift' && benefit.birthdayMonth) {
        const quarterMonths = {
          'Q1': [1, 2, 3],
          'Q2': [4, 5, 6],
          'Q3': [7, 8, 9],
          'Q4': [10, 11, 12]
        };
        
        let eligibleMonths = [];
        if (typeof benefit.birthdayMonth === 'string' && benefit.birthdayMonth.startsWith('Q')) {
          eligibleMonths = quarterMonths[benefit.birthdayMonth] || [];
        } else if (typeof benefit.birthdayMonth === 'string') {
          const monthIndex = [
            'January','February','March','April','May','June',
            'July','August','September','October','November','December'
          ].findIndex(m => m.toLowerCase() === benefit.birthdayMonth.toLowerCase());
          eligibleMonths = monthIndex >= 0 ? [monthIndex + 1] : [];
        }
        
        eligibleMembers = allMembers.filter(member => {
          if (!member.birthDate) return false;
          const birthDate = new Date(member.birthDate);
          const birthMonth = birthDate.getMonth() + 1;
          return eligibleMonths.includes(birthMonth);
        });
      } else {
        // For other benefit types, check barangay eligibility
        eligibleMembers = allMembers.filter(member => {
          if (benefit.barangays && Array.isArray(benefit.barangays) && benefit.barangays.length > 0) {
            return benefit.barangays.includes(member.barangay);
          }
          return true;
        });
      }

      // Combine members with their claim status
      const beneficiariesWithClaims = eligibleMembers.map(member => {
        const claim = claimsMap[member.userID || member.id];
        return {
          ...member,
          claim: claim || null,
          claimId: claim?.id || null, // Store claim ID for authorization letter API route
          claimed: !!claim && (claim.status === 'Claimed' || claim.status === 'claimed'),
          claimantType: claim?.claimantType || null,
          claimantName: claim?.claimantName || null,
          claimantRelation: claim?.claimantRelation || null,
          authorizationLetter: claim?.authorizationLetter || null
        };
      });

      setBeneficiaries(beneficiariesWithClaims);
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
      setError('Failed to load beneficiaries. Please try again.');
      toastService.error('Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAuthorizationLetter = (claimId) => {
    // Use the API route for authorization letters
    if (!claimId) {
      toastService.error('Authorization letter not found');
      return;
    }
    
    // Build the API URL for the authorization letter
    try {
      const apiBaseUrl = API_CONFIG?.API_BASE_URL || 'https://dealt-technician-beautiful-street.trycloudflare.com/api';
      let url = `${apiBaseUrl}/authorization-letter/${claimId}`;
      
      // Add authentication token if available
      const token = localStorage.getItem('auth.token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
          if (tokenValue) {
            url += `?token=${tokenValue}`;
          }
        } catch (error) {
          console.warn('Error parsing auth token:', error);
        }
      }
      
      setSelectedAuthorizationLetter(url);
      setAuthorizationLetterOpen(true);
    } catch (error) {
      console.error('Error constructing authorization letter URL:', error);
      toastService.error('Failed to load authorization letter');
    }
  };

  const handleCloseAuthorizationLetter = () => {
    setAuthorizationLetterOpen(false);
    setSelectedAuthorizationLetter(null);
    setAuthorizationLetterError(false);
  };

  const renderSidebar = () => {
    if (currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') {
      return <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />;
    } else if (currentUser?.role === 'Staff2') {
      return <Staff2Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />;
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F5F5' }}>
      {renderSidebar()}
      
      <Box sx={{ 
        flexGrow: 1, 
        ml: { xs: 0, md: sidebarOpen ? '280px' : '280px' },
        transition: 'margin-left 0.3s ease-in-out',
        p: 3
      }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50' }}>
              Claim History
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Recent Claims Audit Log */}
        <Paper sx={{ mb: 3, p: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2C3E50' }}>
            Recent Claims Audit Log
          </Typography>
          {loadingRecentClaims ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : recentClaims.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#7F8C8D', py: 2 }}>
              No recent claims found.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#0b87ac' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Date/Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>PWD Member</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Benefit</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Claimed By</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentClaims.map((claim, index) => (
                    <TableRow key={claim.id || index} hover>
                      <TableCell>
                        {claim.claimDate ? new Date(claim.claimDate).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {claim.member ? (
                          `${claim.member.firstName || ''} ${claim.member.lastName || ''}`.trim() || 'N/A'
                        ) : (
                          `PWD ID: ${claim.pwdID || claim.pwdId || 'N/A'}`
                        )}
                      </TableCell>
                      <TableCell>
                        {claim.benefit ? (
                          claim.benefit.title || claim.benefit.type || 'N/A'
                        ) : (
                          `Benefit ID: ${claim.benefitID || claim.benefitId || 'N/A'}`
                        )}
                      </TableCell>
                      <TableCell>
                        {claim.claimantType ? (
                          <>
                            <Typography variant="body2">{claim.claimantType}</Typography>
                            {claim.claimantType === 'Others' && claim.claimantName && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#7F8C8D' }}>
                                {claim.claimantName} {claim.claimantRelation ? `(${claim.claimantRelation})` : ''}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#7F8C8D' }}>N/A</Typography>
                        )}
                      </TableCell>
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

        {loading && !selectedBenefit ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : !selectedBenefit ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: '#2C3E50' }}>
              Select a benefit to view claim history:
            </Typography>
            <Grid container spacing={3}>
              {activeBenefits.map((benefit) => (
                <Grid item xs={12} sm={6} md={4} key={benefit.id || benefit.benefitID}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardActionArea onClick={() => handleBenefitClick(benefit)}>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#2C3E50' }}>
                          {benefit.title || benefit.type || 'Benefit'}
                        </Typography>
                        {benefit.amount && (
                          <Typography variant="body2" sx={{ color: '#7F8C8D', mb: 1 }}>
                            Amount: ₱{benefit.amount.toLocaleString()}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ color: '#7F8C8D', mb: 2 }}>
                          Type: {benefit.type || 'N/A'}
                        </Typography>
                        
                        {/* Statistics */}
                        {(() => {
                          const benefitId = benefit.id || benefit.benefitID;
                          const stats = benefitStats[benefitId] || { total: 0, claimed: 0, unclaimed: 0 };
                          return (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E0E0E0' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#2C3E50' }}>
                                Beneficiaries
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ color: '#34495E' }}>
                                  Total: <strong>{stats.total}</strong>
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#27AE60' }}>
                                  Claimed: <strong>{stats.claimed}</strong>
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#E74C3C' }}>
                                  Unclaimed: <strong>{stats.unclaimed}</strong>
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })()}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedBenefit(null);
                  setBeneficiaries([]);
                }}
              >
                Back to Benefits
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                {selectedBenefit.title || selectedBenefit.type || 'Benefit'} - Claim History
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#0b87ac' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>PWD ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Full Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Claimed By</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {beneficiaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                            No eligible beneficiaries found for this benefit.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      beneficiaries.map((beneficiary) => (
                        <TableRow key={beneficiary.id || beneficiary.userID} hover>
                          <TableCell>{beneficiary.pwd_id || beneficiary.userID || 'N/A'}</TableCell>
                          <TableCell>
                            {beneficiary.firstName} {beneficiary.lastName} {beneficiary.suffix || ''}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={beneficiary.claimed ? 'Claimed' : 'Not Claimed'}
                              color={beneficiary.claimed ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {beneficiary.claimed ? (
                              beneficiary.claimantType || 'N/A'
                            ) : (
                              <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                                -
                              </Typography>
                            )}
                            {beneficiary.claimantType === 'Others' && beneficiary.claimantName && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#7F8C8D' }}>
                                {beneficiary.claimantName} ({beneficiary.claimantRelation || 'N/A'})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {beneficiary.claimantType === 'Others' && beneficiary.authorizationLetter && beneficiary.claimId ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewAuthorizationLetter(beneficiary.claimId)}
                              >
                                View Letter
                              </Button>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Authorization Letter Dialog */}
        <Dialog
          open={authorizationLetterOpen}
          onClose={handleCloseAuthorizationLetter}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Authorization Letter
            <IconButton onClick={handleCloseAuthorizationLetter}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedAuthorizationLetter && (
              <Box sx={{ textAlign: 'center' }}>
                {authorizationLetterError ? (
                  <Box sx={{ py: 4 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Failed to load authorization letter. The file may not exist or may have been deleted.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                      File path: {selectedAuthorizationLetter}
                    </Typography>
                  </Box>
                ) : (
                  <img
                    src={selectedAuthorizationLetter}
                    alt="Authorization Letter"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      console.error('Error loading authorization letter:', selectedAuthorizationLetter);
                      setAuthorizationLetterError(true);
                      e.target.style.display = 'none';
                    }}
                    onLoad={() => {
                      setAuthorizationLetterError(false);
                    }}
                  />
                )}
              </Box>
            )}
            {!selectedAuthorizationLetter && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Alert severity="warning">
                  No authorization letter available.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAuthorizationLetter}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Floating QR Scanner Button */}
        <FloatingQRScannerButton
          onScanSuccess={handleQRScanSuccess}
          onScanError={handleQRScanError}
        />
      </Box>
    </Box>
  );
};

export default ClaimHistory;

