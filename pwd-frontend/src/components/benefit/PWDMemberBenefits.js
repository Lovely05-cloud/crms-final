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
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CardGiftcard as CardGiftcardIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
  EventAvailable as EventIcon
} from '@mui/icons-material';
import PWDMemberSidebar from '../shared/PWDMemberSidebar';
import { useAuth } from '../../contexts/AuthContext';
import benefitService from '../../services/benefitService';
import api from '../../services/api';
import { API_CONFIG } from '../../config/production';
import toastService from '../../services/toastService';

const PWDMemberBenefits = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [benefits, setBenefits] = useState([]);
  const [claims, setClaims] = useState([]);
  const [availableBenefits, setAvailableBenefits] = useState([]);
  const [claimedBenefits, setClaimedBenefits] = useState([]);
  const [expiredBenefits, setExpiredBenefits] = useState([]);
  
  // Late claim dialog state
  const [lateClaimDialogOpen, setLateClaimDialogOpen] = useState(false);
  const [selectedLateClaim, setSelectedLateClaim] = useState(null);
  const [signedLetterFile, setSignedLetterFile] = useState(null);
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [letterPreview, setLetterPreview] = useState(null);

  useEffect(() => {
    loadBenefits();
  }, [currentUser]);

  const loadBenefits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all benefits
      const allBenefits = await benefitService.getAll();
      const activeBenefits = allBenefits.filter(b => b.status === 'Active');
      setBenefits(activeBenefits);

      // Fetch user's claims
      const userClaims = await api.get('/benefit-claims');
      let claimsArray = [];
      if (Array.isArray(userClaims)) {
        claimsArray = userClaims;
      } else if (userClaims?.data && Array.isArray(userClaims.data)) {
        claimsArray = userClaims.data;
      }

      // Filter claims for current user
      const userId = currentUser?.userID || currentUser?.id;
      const userClaimsFiltered = claimsArray.filter(
        claim => (claim.pwdID || claim.pwdId) === userId
      );
      setClaims(userClaimsFiltered);

      // Categorize benefits
      const now = new Date();
      const available = [];
      const claimed = [];
      const expired = [];

      activeBenefits.forEach(benefit => {
        const benefitId = benefit.id || benefit.benefitID;
        const claim = userClaimsFiltered.find(c => (c.benefitID || c.benefitId) === benefitId);
        const isExpired = benefit.expiryDate && new Date(benefit.expiryDate) < now;
        const isClaimed = claim && (claim.status === 'Claimed' || claim.status === 'claimed');

        // Check eligibility
        const isEligible = checkEligibility(benefit);

        if (isClaimed) {
          claimed.push({ ...benefit, claim });
        } else if (isExpired && claim) {
          // Expired but has a claim (late claim)
          expired.push({ ...benefit, claim });
        } else if (!isExpired && isEligible && !claim) {
          // Available to claim
          available.push(benefit);
        }
      });

      setAvailableBenefits(available);
      setClaimedBenefits(claimed);
      setExpiredBenefits(expired);
    } catch (err) {
      console.error('Error loading benefits:', err);
      setError('Failed to load benefits. Please try again.');
      toastService.error('Failed to load benefits');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = (benefit) => {
    const userBarangay = currentUser?.barangay || currentUser?.pwdMember?.barangay;
    
    // Check barangay eligibility
    if (benefit.selectedBarangays) {
      const barangays = typeof benefit.selectedBarangays === 'string' 
        ? JSON.parse(benefit.selectedBarangays) 
        : benefit.selectedBarangays;
      if (Array.isArray(barangays) && barangays.length > 0) {
        if (!barangays.includes(userBarangay)) {
          return false;
        }
      }
    }

    // Check birthday eligibility for Birthday Cash Gift
    if (benefit.type === 'Birthday Cash Gift' && benefit.birthdayMonth) {
      const birthDate = currentUser?.pwdMember?.birthDate || currentUser?.birthDate;
      if (!birthDate) return false;
      
      const birthMonth = new Date(birthDate).getMonth() + 1;
      const quarterMonths = {
        'Q1': [1, 2, 3],
        'Q2': [4, 5, 6],
        'Q3': [7, 8, 9],
        'Q4': [10, 11, 12]
      };
      
      if (benefit.birthdayMonth.startsWith('Q')) {
        const eligibleMonths = quarterMonths[benefit.birthdayMonth] || [];
        return eligibleMonths.includes(birthMonth);
      } else {
        const monthIndex = [
          'January','February','March','April','May','June',
          'July','August','September','October','November','December'
        ].findIndex(m => m.toLowerCase() === benefit.birthdayMonth.toLowerCase());
        return monthIndex >= 0 && (monthIndex + 1) === birthMonth;
      }
    }

    return true;
  };

  const handleDownloadLetter = async (benefit, claim) => {
    try {
      const claimId = claim.id || claim.claimID;
      if (!claimId) {
        toastService.error('Claim ID not found');
        return;
      }

      // Get the API base URL
      const apiBaseUrl = API_CONFIG?.API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('auth.token');
      let tokenValue = '';
      
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
        } catch (e) {
          console.warn('Error parsing auth token:', e);
        }
      }

      // Build URL with token
      const url = `${apiBaseUrl}/benefit-claims/${claimId}/treasury-letter${tokenValue ? `?token=${tokenValue}` : ''}`;
      
      // Open in new window for download (works for both PDF and HTML)
      window.open(url, '_blank');
      
      toastService.success('Letter download started');
    } catch (err) {
      console.error('Error downloading letter:', err);
      toastService.error('Failed to download letter. Please try again.');
    }
  };

  const handleOpenUploadDialog = (benefit, claim) => {
    setSelectedLateClaim({ benefit, claim });
    setSignedLetterFile(null);
    setLetterPreview(null);
    setLateClaimDialogOpen(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSignedLetterFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLetterPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        toastService.error('Please select an image file');
      }
    }
  };

  const handleUploadSignedLetter = async () => {
    if (!signedLetterFile || !selectedLateClaim) {
      toastService.error('Please select a signed letter image');
      return;
    }

    try {
      setUploadingLetter(true);
      const claimId = selectedLateClaim.claim.id || selectedLateClaim.claim.claimID;
      
      const formData = new FormData();
      formData.append('signed_letter', signedLetterFile);
      formData.append('claim_id', claimId);

      await api.post(`/benefit-claims/${claimId}/upload-signed-letter`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toastService.success('Signed letter uploaded successfully. Your claim will be processed.');
      setLateClaimDialogOpen(false);
      setSelectedLateClaim(null);
      setSignedLetterFile(null);
      setLetterPreview(null);
      loadBenefits(); // Reload to update status
    } catch (err) {
      console.error('Error uploading signed letter:', err);
      toastService.error('Failed to upload signed letter. Please try again.');
    } finally {
      setUploadingLetter(false);
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F5F5' }}>
      <PWDMemberSidebar isOpen={true} onToggle={() => {}} />
      
      <Box sx={{ 
        flexGrow: 1, 
        ml: { xs: 0, md: '280px' },
        p: 3
      }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
            My Benefits
          </Typography>
          <Typography variant="body1" sx={{ color: '#7F8C8D' }}>
            View and manage your available, claimed, and expired benefits
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Paper sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    minHeight: 64
                  },
                  '& .Mui-selected': {
                    color: '#0b87ac'
                  }
                }}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CardGiftcardIcon sx={{ fontSize: 20 }} />
                      <span>Available ({availableBenefits.length})</span>
                    </Box>
                  } 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                      <span>Claimed ({claimedBenefits.length})</span>
                    </Box>
                  } 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon sx={{ fontSize: 20 }} />
                      <span>Expired/Unclaimed ({expiredBenefits.length})</span>
                    </Box>
                  } 
                />
              </Tabs>
            </Paper>

            {/* Available Benefits Tab */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {availableBenefits.length === 0 ? (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                      <CardGiftcardIcon sx={{ fontSize: 80, color: '#BDC3C7', mb: 2, opacity: 0.5 }} />
                      <Typography variant="h5" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                        No Available Benefits
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#95A5A6' }}>
                        There are currently no benefits available for you to claim.
                      </Typography>
                    </Paper>
                  </Grid>
                ) : (
                  availableBenefits.map((benefit) => (
                    <Grid item xs={12} sm={6} md={4} key={benefit.id || benefit.benefitID}>
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          borderRadius: 3,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease-in-out',
                          border: '1px solid #E0E0E0',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                            borderColor: '#0b87ac'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            background: 'linear-gradient(135deg, #0b87ac 0%, #0a6b8a 100%)',
                            color: 'white',
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                          }}
                        >
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '12px',
                              bgcolor: 'rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <CardGiftcardIcon sx={{ fontSize: 32, color: 'white' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                              {benefit.title || benefit.type}
                            </Typography>
                            <Chip 
                              label={benefit.type} 
                              size="small" 
                              sx={{ 
                                bgcolor: 'rgba(255, 255, 255, 0.25)',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        </Box>
                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#5A6C7D', 
                              mb: 3,
                              minHeight: '48px',
                              lineHeight: 1.6
                            }}
                          >
                            {benefit.description || 'No description available'}
                          </Typography>
                          
                          {benefit.amount && (
                            <Box 
                              sx={{ 
                                bgcolor: '#E8F5E9',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              <MoneyIcon sx={{ color: '#27AE60', fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                                  Benefit Amount
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#27AE60', fontWeight: 700 }}>
                                  ₱{parseFloat(benefit.amount).toLocaleString()}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #E0E0E0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                              <TimeIcon sx={{ fontSize: 18, color: '#7F8C8D' }} />
                              <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                                <strong>Expires:</strong> {formatDate(benefit.expiryDate)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon sx={{ fontSize: 18, color: '#7F8C8D' }} />
                              <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                                <strong>Distribution:</strong> {formatDate(benefit.distributionDate)}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            )}

            {/* Claimed Benefits Tab */}
            {activeTab === 1 && (
              <Grid container spacing={3}>
                {claimedBenefits.length === 0 ? (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                      <CheckCircleIcon sx={{ fontSize: 80, color: '#BDC3C7', mb: 2, opacity: 0.5 }} />
                      <Typography variant="h5" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                        No Claimed Benefits
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#95A5A6' }}>
                        You haven't claimed any benefits yet.
                      </Typography>
                    </Paper>
                  </Grid>
                ) : (
                  claimedBenefits.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id || item.benefitID}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          borderRadius: 3,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          border: '2px solid #27AE60',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '100px',
                            height: '100px',
                            background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(39, 174, 96, 0.05) 100%)',
                            borderRadius: '0 0 0 100px'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3, position: 'relative' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                                {item.title || item.type}
                              </Typography>
                              <Chip 
                                label="Claimed" 
                                color="success" 
                                size="small"
                                icon={<CheckCircleIcon />}
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '12px',
                                bgcolor: '#E8F5E9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 28, color: '#27AE60' }} />
                            </Box>
                          </Box>
                          
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#5A6C7D', 
                              mb: 3,
                              minHeight: '48px',
                              lineHeight: 1.6
                            }}
                          >
                            {item.description || 'No description available'}
                          </Typography>
                          
                          {item.amount && (
                            <Box 
                              sx={{ 
                                bgcolor: '#E8F5E9',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              <MoneyIcon sx={{ color: '#27AE60', fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                                  Amount Received
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#27AE60', fontWeight: 700 }}>
                                  ₱{parseFloat(item.amount).toLocaleString()}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #E0E0E0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CalendarIcon sx={{ fontSize: 18, color: '#7F8C8D' }} />
                              <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                                <strong>Claimed on:</strong> {formatDate(item.claim?.claimDate || item.claim?.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            )}

            {/* Expired/Unclaimed Benefits Tab */}
            {activeTab === 2 && (
              <Box>
                {expiredBenefits.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <WarningIcon sx={{ fontSize: 80, color: '#BDC3C7', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h5" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                      No Expired Benefits
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#95A5A6' }}>
                      You don't have any expired unclaimed benefits.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        mb: 3, 
                        borderRadius: 2,
                        '& .MuiAlert-icon': {
                          fontSize: 28
                        }
                      }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Late Claim Process Required
                      </Typography>
                      <Typography variant="body2">
                        These benefits have expired. To claim them, you need to download a letter, get it signed by the Treasury Office of Cabuyao, and upload the signed letter.
                      </Typography>
                    </Alert>
                    <Grid container spacing={3}>
                      {expiredBenefits.map((item) => {
                        const hasSignedLetter = item.claim?.signedTreasuryLetter;
                        return (
                          <Grid item xs={12} key={item.id || item.benefitID}>
                            <Card 
                              sx={{ 
                                borderRadius: 3,
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                border: hasSignedLetter ? '2px solid #FF9800' : '2px solid #E74C3C',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                                  transform: 'translateY(-4px)'
                                }
                              }}
                            >
                              <Box
                                sx={{
                                  background: hasSignedLetter 
                                    ? 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
                                    : 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                                  color: 'white',
                                  p: 2.5
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Box
                                    sx={{
                                      width: 56,
                                      height: 56,
                                      borderRadius: '12px',
                                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <WarningIcon sx={{ fontSize: 32, color: 'white' }} />
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                                      {item.title || item.type}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1 }}>
                                      {item.description}
                                    </Typography>
                                    {hasSignedLetter ? (
                                      <Chip 
                                        label="Pending Approval" 
                                        sx={{ 
                                          bgcolor: 'rgba(255, 255, 255, 0.25)',
                                          color: 'white',
                                          fontWeight: 600
                                        }}
                                        size="small"
                                      />
                                    ) : (
                                      <Chip 
                                        label="Letter Required" 
                                        sx={{ 
                                          bgcolor: 'rgba(255, 255, 255, 0.25)',
                                          color: 'white',
                                          fontWeight: 600
                                        }}
                                        size="small"
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                              <CardContent sx={{ p: 3 }}>
                                <Grid container spacing={3} alignItems="center">
                                  <Grid item xs={12} md={3}>
                                    <Box 
                                      sx={{ 
                                        bgcolor: '#FFEBEE',
                                        borderRadius: 2,
                                        p: 2,
                                        textAlign: 'center'
                                      }}
                                    >
                                      <MoneyIcon sx={{ color: '#E74C3C', fontSize: 32, mb: 1 }} />
                                      <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mb: 0.5 }}>
                                        Benefit Amount
                                      </Typography>
                                      <Typography variant="h6" sx={{ color: '#E74C3C', fontWeight: 700 }}>
                                        ₱{parseFloat(item.amount || 0).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} md={3}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <TimeIcon sx={{ fontSize: 24, color: '#E74C3C' }} />
                                      <Box>
                                        <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                                          Expired Date
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#E74C3C', fontWeight: 600 }}>
                                          {formatDate(item.expiryDate)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                      <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => handleDownloadLetter(item, item.claim)}
                                        sx={{
                                          flex: { xs: '1 1 100%', sm: '0 1 auto' },
                                          minWidth: { xs: '100%', sm: 'auto' }
                                        }}
                                      >
                                        Download Letter
                                      </Button>
                                      <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<UploadIcon />}
                                        onClick={() => handleOpenUploadDialog(item, item.claim)}
                                        disabled={hasSignedLetter}
                                        sx={{
                                          flex: { xs: '1 1 100%', sm: '0 1 auto' },
                                          minWidth: { xs: '100%', sm: 'auto' }
                                        }}
                                      >
                                        {hasSignedLetter ? 'Letter Uploaded' : 'Upload Signed Letter'}
                                      </Button>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
              </Box>
            )}
          </>
        )}

        {/* Late Claim Upload Dialog */}
        <Dialog
          open={lateClaimDialogOpen}
          onClose={() => !uploadingLetter && setLateClaimDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Upload Signed Treasury Letter
            <IconButton 
              onClick={() => setLateClaimDialogOpen(false)} 
              disabled={uploadingLetter}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedLateClaim && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Please upload a clear photo of the signed letter from the Treasury Office of Cabuyao.
                </Alert>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Benefit:</strong> {selectedLateClaim.benefit.title || selectedLateClaim.benefit.type}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  <strong>Amount:</strong> ₱{parseFloat(selectedLateClaim.benefit.amount || 0).toLocaleString()}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="signed-letter-upload"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploadingLetter}
                  />
                  <label htmlFor="signed-letter-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCameraIcon />}
                      disabled={uploadingLetter}
                      fullWidth
                      sx={{ mb: 2 }}
                    >
                      Select Signed Letter Image
                    </Button>
                  </label>
                </Box>

                {letterPreview && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      Preview:
                    </Typography>
                    <img
                      src={letterPreview}
                      alt="Signed letter preview"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        border: '1px solid #E0E0E0'
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setLateClaimDialogOpen(false)} 
              disabled={uploadingLetter}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadSignedLetter}
              variant="contained"
              disabled={!signedLetterFile || uploadingLetter}
              startIcon={uploadingLetter ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {uploadingLetter ? 'Uploading...' : 'Upload Letter'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PWDMemberBenefits;

