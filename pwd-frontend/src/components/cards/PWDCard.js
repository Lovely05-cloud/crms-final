// src/components/cards/PWDCard.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import AdminSidebar from '../shared/AdminSidebar';
import FrontDeskSidebar from '../shared/FrontDeskSidebar';
import { useAuth } from '../../contexts/AuthContext';
import pwdMemberService from '../../services/pwdMemberService';
import QRCodeService from '../../services/qrCodeService';
import SuccessModal from '../shared/SuccessModal';
import { useModal } from '../../hooks/useModal';

function PWDCard() {
  const { currentUser } = useAuth();
  const [pwdMembers, setPwdMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  
  // Success modal
  const { modalOpen, modalConfig, showModal, hideModal } = useModal();
  
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    disability: '',
    ageRange: '',
    status: '',
    cardStatus: ''
  });
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

  // Confirmation dialog states
  const [claimConfirmOpen, setClaimConfirmOpen] = useState(false);
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [pendingMember, setPendingMember] = useState(null);

  // Calculate card status based on claimed status and expiration date
  const calculateCardStatus = (cardClaimed, cardExpirationDate) => {
    // If card is not claimed, return "to claim"
    if (!cardClaimed) {
      return 'to claim';
    }
    
    // If card is claimed, check expiration date
    if (!cardExpirationDate) {
      // If no expiration date available but card is claimed, assume it's claimed
      return 'claimed';
    }
    
    const today = new Date();
    const expirationDate = new Date(cardExpirationDate);
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    // Reset time for accurate comparison
    today.setHours(0, 0, 0, 0);
    expirationDate.setHours(0, 0, 0, 0);
    oneMonthFromNow.setHours(0, 0, 0, 0);
    
    // If card is expiring within 1 month (from today to 1 month from now)
    if (expirationDate >= today && expirationDate <= oneMonthFromNow) {
      return 'for renewal';
    }
    
    // If card is claimed and not yet in renewal window
    return 'claimed';
  };

  // Fetch PWD members from API
  const fetchPwdMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pwdMemberService.getAll();
      const members = response.data || response.members || [];
      
      // Debug: Log the raw API response
      console.log('=== API Response Debug ===');
      console.log('Raw API response:', response);
      console.log('Members from API:', members);
      console.log('First member with ID pictures:', members.find(m => m.idPictures));
      
      // Transform the data to match our expected format
      const transformedMembers = members.map((member, index) => {
        // Calculate card status
        const cardClaimed = member.cardClaimed || member.card_claimed || false;
        const cardIssueDate = member.cardIssueDate || member.card_issue_date || member.pwd_id_generated_at || null;
        // Assume 3 years validity if expiration date not provided
        const cardExpirationDate = member.cardExpirationDate || member.card_expiration_date || 
          (cardIssueDate ? new Date(new Date(cardIssueDate).setFullYear(new Date(cardIssueDate).getFullYear() + 3)) : null);
        
        const cardStatus = calculateCardStatus(cardClaimed, cardExpirationDate);
        
        return {
          id: member.pwd_id || `PWD-2025-${String(index + 1).padStart(6, '0')}`,
          memberId: member.id || member.userID, // Database ID for API calls
          name: (() => {
          const parts = [];
          if (member.firstName) parts.push(member.firstName);
          if (member.middleName && member.middleName.trim().toUpperCase() !== 'N/A') parts.push(member.middleName);
          if (member.lastName) parts.push(member.lastName);
          if (member.suffix) parts.push(member.suffix);
          return parts.join(' ').trim() || 'Unknown Member';
        })(),
          age: member.birthDate ? new Date().getFullYear() - new Date(member.birthDate).getFullYear() : 'N/A',
          barangay: member.barangay || 'N/A',
          status: 'Active',
          disabilityType: member.disabilityType || 'Not specified',
          birthDate: member.birthDate,
          firstName: member.firstName,
          lastName: member.lastName,
          middleName: member.middleName,
          suffix: member.suffix,
          address: member.address,
          contactNumber: member.contactNumber || member.phone,
          gender: member.gender || member.sex,
          bloodType: member.bloodType,
          idPictures: member.idPictures, // Add ID pictures to the transformation
          cardClaimed: cardClaimed,
          cardIssueDate: cardIssueDate,
          cardExpirationDate: cardExpirationDate,
          cardStatus: cardStatus
        };
      });
      
      // Set the members from API (no fallback to mock data)
      setPwdMembers(transformedMembers);
      
      // Set first member as selected if none selected and members exist
      if (!selectedMember && transformedMembers.length > 0) {
        setSelectedMember(transformedMembers[0].id);
      }
    } catch (err) {
      console.error('Error fetching PWD members:', err);
      
      // Check if it's an authentication error
      if (err.status === 401 || err.status === 403) {
        console.error('Authentication error in PWDCard:', err);
        setError('Authentication error. Please refresh the page and try again.');
        // Don't throw the error to prevent it from affecting the parent component
        return;
      }
      
      setError('Failed to fetch PWD members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load PWD members on component mount
  useEffect(() => {
    fetchPwdMembers();
  }, []);

  // Generate QR code for selected member
  useEffect(() => {
    if (!selectedMember || pwdMembers.length === 0) return;
    
    const generateQRCode = async () => {
      try {
        const member = pwdMembers.find(m => m.id === selectedMember);
        if (!member) return;
        
        const qrDataURL = await QRCodeService.generateMemberQRCode(member);
        setQrCodeDataURL(qrDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    
    generateQRCode();
  }, [selectedMember, pwdMembers]);


  const handleDownloadPDF = () => {
    console.log('Download PDF clicked');
  };

  // Handle card claim - show confirmation first
  const handleClaimCard = (event, member) => {
    event.stopPropagation(); // Prevent row selection
    
    if (!member.memberId) {
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Member ID not found. Cannot claim card.',
        buttonText: 'OK'
      });
      return;
    }

    // Set pending member and show confirmation dialog
    setPendingMember(member);
    setClaimConfirmOpen(true);
  };

  // Confirm card claim
  const handleClaimConfirm = async () => {
    if (!pendingMember) return;

    setClaimConfirmOpen(false);
    const member = pendingMember;
    setPendingMember(null);

    try {
      setLoading(true);
      const response = await pwdMemberService.claimCard(member.memberId);
      
      if (response?.success) {
        showModal({
          type: 'success',
          title: 'Card Claimed Successfully',
          message: `The PWD card for ${member.name} has been successfully claimed. Card expires on ${new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
          buttonText: 'OK'
        });
        
        // Refresh the members list to update card status
        await fetchPwdMembers();
      } else {
        throw new Error(response?.message || 'Failed to claim card');
      }
    } catch (error) {
      console.error('Error claiming card:', error);
      showModal({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to claim card. Please try again.',
        buttonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle card renewal - show confirmation first
  const handleRenewCard = (event, member) => {
    event.stopPropagation(); // Prevent row selection
    
    if (!member.memberId) {
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Member ID not found. Cannot renew card.',
        buttonText: 'OK'
      });
      return;
    }

    // Set pending member and show confirmation dialog
    setPendingMember(member);
    setRenewConfirmOpen(true);
  };

  // Confirm card renewal
  const handleRenewConfirm = async () => {
    if (!pendingMember) return;

    setRenewConfirmOpen(false);
    const member = pendingMember;
    setPendingMember(null);

    try {
      setLoading(true);
      const response = await pwdMemberService.renewCard(member.memberId);
      
      if (response.data?.success) {
        showModal({
          type: 'success',
          title: 'Card Renewed Successfully',
          message: `The PWD card for ${member.name} has been successfully renewed. New expiration date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
          buttonText: 'OK'
        });
        
        // Refresh the members list to update card status
        await fetchPwdMembers();
      } else {
        throw new Error(response.data?.message || 'Failed to renew card');
      }
    } catch (error) {
      console.error('Error renewing card:', error);
      showModal({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to renew card. Please try again.',
        buttonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cancel confirmation dialogs
  const handleClaimCancel = () => {
    setClaimConfirmOpen(false);
    setPendingMember(null);
  };

  const handleRenewCancel = () => {
    setRenewConfirmOpen(false);
    setPendingMember(null);
  };

  const handlePrintCard = () => {
    if (!selectedMemberData) {
      showModal({
        type: 'warning',
        title: 'No Member Selected',
        message: 'Please select a PWD member to print their card.',
        buttonText: 'OK'
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PWD ID Card - ${selectedMemberData.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .id-card {
              width: 2in;
              height: 3in;
              border: 2px solid #000;
              background: white;
              position: relative;
              margin: 0 auto;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              padding: 3px 0;
              border-bottom: 1px solid #000;
              font-size: 6px;
              font-weight: bold;
              line-height: 1.1;
            }
            .content {
              display: flex;
              height: calc(100% - 20px);
            }
            .left-section {
              flex: 1;
              padding: 4px;
              font-size: 5px;
              line-height: 1.1;
            }
            .right-section {
              width: 40px;
              padding: 3px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              border-left: 1px solid #000;
            }
            .photo-placeholder {
              width: 30px;
              height: 30px;
              border: 1px dashed #000;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 4px;
              margin-bottom: 3px;
            }
            .qr-code {
              width: 30px;
              height: 30px;
              border: 1px solid #000;
              margin-top: 3px;
            }
            }
            .footer {
              position: absolute;
              bottom: 3px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 4px;
              font-weight: bold;
            }
            .pdao-button {
              background: #000;
              color: white;
              padding: 1px 4px;
              font-size: 5px;
              font-weight: bold;
              margin: 1px 0;
              border: none;
            }
            @media print {
              body { margin: 0; }
              .id-card { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              REPUBLIC OF THE PHILIPPINES<br>
              PROVINCE OF LAGUNA<br>
              CITY OF CABUYAO<br>
              (P.D.A.O)
            </div>
            
            <div class="content">
              <div class="left-section">
                <div class="pdao-button">CABUYAO PDAO</div>
                <br>
                <strong>NAME:</strong> ${selectedMemberData.name}<br>
                <strong>ID NO.:</strong> ${selectedMemberData.id}<br>
                <strong>TYPE OF DISABILITY:</strong> ${selectedMemberData.disabilityType}<br>
                <br>
                <strong>SIGNATURE:</strong> ________________
              </div>
              
              <div class="right-section">
                <div class="photo-placeholder">PHOTO</div>
                <div class="qr-code">
                  ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" style="width: 100%; height: 100%;" />` : 'QR CODE'}
                </div>
              </div>
            </div>
            
            <div class="footer">
              VALID ANYWHERE IN THE PHILIPPINES
            </div>
          </div>
          <script>window.onload = function(){ window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePrint = () => {
    try {
      const table = document.getElementById('pwd-card-masterlist');
      if (!table) {
        console.error('Masterlist table not found');
        window.print();
        return;
      }
      const printWindow = window.open('', '_blank');
      const appliedFilters = `Barangay: ${filters.barangay || 'All'} | Disability: ${filters.disability || 'All'} | Age: ${filters.ageRange || 'All'} | Status: ${filters.status || 'All'}`;
      printWindow.document.write(`
        <html>
          <head>
            <title>PWD Members Master List</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; }
              h1 { font-size: 18px; margin: 0 0 8px; }
              .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
              th { background: #f5f5f5; text-align: left; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>Cabuyao PDAO RMS - PWD Members Master List</h1>
            <div class="meta">${appliedFilters} | Total Records: ${filteredMembers.length} | Generated: ${new Date().toLocaleString()}</div>
            ${document.getElementById('pwd-card-table-wrapper')?.innerHTML || table.outerHTML}
            <script>window.onload = function(){ window.print(); window.close(); }<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error('Print failed, fallback to window.print()', e);
      window.print();
    }
  };

  // Filter options
  const barangays = [
    'Bigaa', 'Butong', 'Marinig', 'Gulod', 'Pob. Uno', 'Pob. Dos', 'Pob. Tres',
    'Sala', 'Niugan', 'Banaybanay', 'Pulo', 'Diezmo', 'Pittland', 'San Isidro',
    'Mamatid', 'Baclaran', 'Casile', 'Banlic'
  ];

  const disabilityTypes = [
    'Visual Impairment',
    'Hearing Impairment',
    'Physical Disability',
    'Speech and Language Impairment',
    'Intellectual Disability',
    'Mental Health Condition',
    'Learning Disability',
    'Psychosocial Disability',
    'Autism Spectrum Disorder',
    'ADHD',
    'Orthopedic/Physical Disability',
    'Chronic Illness',
    'Multiple Disabilities'
  ];

  const ageRanges = [
    'Under 18', '18-25', '26-35', '36-45', '46-55', '56-65', 'Over 65'
  ];

  const statuses = [
    'Active', 'Inactive', 'Pending', 'Suspended'
  ];

  // Filter functions
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      barangay: '',
      disability: '',
      ageRange: '',
      status: '',
      cardStatus: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filter the members based on current filters
  const filteredMembers = useMemo(() => {
    const filtered = pwdMembers.filter(member => {
      // Search filter
      const matchesSearch = !filters.search || 
        (member.name && member.name.toLowerCase().includes(filters.search.toLowerCase())) ||
        (member.id && member.id.toLowerCase().includes(filters.search.toLowerCase()));

      // Barangay filter
      const matchesBarangay = !filters.barangay || 
        (member.barangay && member.barangay === filters.barangay);

      // Disability filter
      const matchesDisability = !filters.disability || 
        (member.disabilityType && member.disabilityType === filters.disability);

      // Status filter
      const matchesStatus = !filters.status || 
        (member.status && member.status === filters.status);

      // Card Status filter
      const matchesCardStatus = !filters.cardStatus || 
        (member.cardStatus && member.cardStatus === filters.cardStatus);

      // Age range filter
      let matchesAgeRange = true;
      if (filters.ageRange && member.age !== 'N/A') {
        const age = parseInt(member.age);
        if (filters.ageRange === 'Under 18') {
          matchesAgeRange = age < 18;
        } else if (filters.ageRange === 'Over 65') {
          matchesAgeRange = age > 65;
        } else {
          const [min, max] = filters.ageRange.split('-').map(Number);
          matchesAgeRange = age >= min && age <= max;
        }
      }

      return matchesSearch && matchesBarangay && matchesDisability && matchesAgeRange && matchesStatus && matchesCardStatus;
    });

    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue = a[orderBy];
        let bValue = b[orderBy];
        
        if (orderBy === 'name') {
          aValue = a.name || '';
          bValue = b.name || '';
        } else if (orderBy === 'age') {
          aValue = parseInt(a.age) || 0;
          bValue = parseInt(b.age) || 0;
        }
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort: prioritize card status - "to claim" first, then "for renewal", then "claimed"
      filtered.sort((a, b) => {
        const statusOrder = { 'to claim': 0, 'for renewal': 1, 'claimed': 2 };
        const aStatus = statusOrder[a.cardStatus] ?? 3;
        const bStatus = statusOrder[b.cardStatus] ?? 3;
        
        if (aStatus !== bStatus) {
          return aStatus - bStatus;
        }
        
        // If same status, sort by name alphabetically
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
    }
    
    return filtered;
  }, [pwdMembers, filters, orderBy, order]);

  const selectedMemberData = pwdMembers.find(member => member.id === selectedMember) || pwdMembers[0];
  
  // Debug member selection
  console.log('=== Member Selection Debug ===');
  console.log('Selected Member ID:', selectedMember);
  console.log('Available Members:', pwdMembers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, hasIdPictures: !!m.idPictures })));
  console.log('Selected Member Data:', selectedMemberData);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
        {currentUser?.role === 'FrontDesk' ? <FrontDeskSidebar /> : <AdminSidebar />}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3, 
          ml: '280px',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ color: '#0b87ac', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Loading PWD members...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
        {currentUser?.role === 'FrontDesk' ? <FrontDeskSidebar /> : <AdminSidebar />}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3, 
          ml: '280px'
        }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={fetchPwdMembers}
                sx={{ fontWeight: 'bold' }}
              >
                Retry
              </Button>
            }
            sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  // Show empty state
  if (!loading && pwdMembers.length === 0) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
        {currentUser?.role === 'FrontDesk' ? <FrontDeskSidebar /> : <AdminSidebar />}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3, 
          ml: '280px',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CreditCardIcon sx={{ fontSize: 60, color: '#BDC3C7', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No PWD Members Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              No PWD members are available to generate cards for.
            </Typography>
            <Button
              variant="contained"
              onClick={fetchPwdMembers}
              sx={{ 
                bgcolor: '#0b87ac', 
                '&:hover': { bgcolor: '#0a6b8a' },
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      {currentUser?.role === 'FrontDesk' ? <FrontDeskSidebar /> : <AdminSidebar />}

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        p: 3, 
        ml: '280px'
      }}>
        <Container maxWidth="xl">
          {/* Page Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              color: '#0b87ac', 
              mb: 1
            }}>
              PWD Card
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#7F8C8D'
            }}>
              View and manage PWD ID cards for members.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Left Panel - PWD Masterlist */}
            <Grid item xs={12} md={8}>
              <Card elevation={3} sx={{ height: '700px', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }} id="pwd-card-table-wrapper">
                <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'white' }}>

                  {/* Header with tabs and controls */}
                  <Box sx={{ 
                    backgroundColor: '#0b87ac', 
                    color: 'white', 
                    p: 2, 
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        PWD MASTERLIST
                      </Typography>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        px: 2, 
                        py: 0.5, 
                        borderRadius: 1 
                      }}>
                        <Typography variant="body2">
                          PWD Members Master List ({filteredMembers.length} records)
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Search members..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        sx={{ 
                          width: { xs: 150, sm: 180, md: 200 },
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: 'white' },
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                            fontSize: '0.9rem',
                            '&::placeholder': {
                              color: 'rgba(255,255,255,0.7)',
                              opacity: 1
                            }
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                            </InputAdornment>
                          )
                        }}
                      />
                      <IconButton 
                        sx={{ 
                          color: 'white',
                          backgroundColor: showFilters ? 'rgba(255,255,255,0.2)' : 'transparent',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                        }} 
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <FilterListIcon />
                      </IconButton>
                      <IconButton sx={{ color: 'white' }} onClick={fetchPwdMembers}>
                        <RefreshIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                          color: 'white',
                          textTransform: 'none'
                        }}
                        onClick={handlePrint}
                      >
                        Print List
                      </Button>
                    </Box>
                  </Box>


                  {/* Filter Section */}
                  <Collapse in={showFilters}>
                    <Box sx={{ 
                      p: 3, 
                      backgroundColor: '#F8FAFC', 
                      borderBottom: '1px solid #E0E0E0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0b87ac' }}>
                          Search Filters
                        </Typography>
                        {hasActiveFilters && (
                          <Button
                            startIcon={<ClearIcon />}
                            onClick={clearFilters}
                            size="small"
                            sx={{ 
                              textTransform: 'none', 
                              color: '#E74C3C',
                              '&:hover': {
                                backgroundColor: '#FDF2F2',
                                color: '#C0392B'
                              }
                            }}
                          >
                            Clear All
                          </Button>
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Barangay</InputLabel>
                            <Select
                              value={filters.barangay}
                              onChange={(e) => handleFilterChange('barangay', e.target.value)}
                              label="Barangay"
                              sx={{
                                backgroundColor: '#FFFFFF',
                                '& .MuiSelect-select': {
                                  color: '#0b87ac',
                                  fontWeight: 600,
                                  fontSize: '0.9rem'
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#E0E0E0'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                }
                              }}
                            >
                              <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Barangays</MenuItem>
                              {barangays.map(barangay => (
                                <MenuItem key={barangay} value={barangay} sx={{ color: '#0b87ac', fontWeight: 600 }}>
                                  {barangay}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Disability Type</InputLabel>
                            <Select
                              value={filters.disability}
                              onChange={(e) => handleFilterChange('disability', e.target.value)}
                              label="Disability Type"
                              sx={{
                                backgroundColor: '#FFFFFF',
                                '& .MuiSelect-select': {
                                  color: '#0b87ac',
                                  fontWeight: 600,
                                  fontSize: '0.9rem'
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#E0E0E0'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                }
                              }}
                            >
                              <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Disabilities</MenuItem>
                              {disabilityTypes.map(disability => (
                                <MenuItem key={disability} value={disability} sx={{ color: '#0b87ac', fontWeight: 600 }}>
                                  {disability}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Age Range</InputLabel>
                            <Select
                              value={filters.ageRange}
                              onChange={(e) => handleFilterChange('ageRange', e.target.value)}
                              label="Age Range"
                              sx={{
                                backgroundColor: '#FFFFFF',
                                '& .MuiSelect-select': {
                                  color: '#0b87ac',
                                  fontWeight: 600,
                                  fontSize: '0.9rem'
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#E0E0E0'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                }
                              }}
                            >
                              <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Ages</MenuItem>
                              {ageRanges.map(range => (
                                <MenuItem key={range} value={range} sx={{ color: '#0b87ac', fontWeight: 600 }}>
                                  {range}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Status</InputLabel>
                            <Select
                              value={filters.status}
                              onChange={(e) => handleFilterChange('status', e.target.value)}
                              label="Status"
                              sx={{
                                backgroundColor: '#FFFFFF',
                                '& .MuiSelect-select': {
                                  color: '#0b87ac',
                                  fontWeight: 600,
                                  fontSize: '0.9rem'
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#E0E0E0'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                }
                              }}
                            >
                              <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Statuses</MenuItem>
                              {statuses.map(status => (
                                <MenuItem key={status} value={status} sx={{ color: '#0b87ac', fontWeight: 600 }}>
                                  {status}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Card Status</InputLabel>
                            <Select
                              value={filters.cardStatus}
                              onChange={(e) => handleFilterChange('cardStatus', e.target.value)}
                              label="Card Status"
                              sx={{
                                backgroundColor: '#FFFFFF',
                                '& .MuiSelect-select': {
                                  color: '#0b87ac',
                                  fontWeight: 600,
                                  fontSize: '0.9rem'
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#E0E0E0'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac'
                                }
                              }}
                            >
                              <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Card Statuses</MenuItem>
                              <MenuItem value="to claim" sx={{ color: '#F39C12', fontWeight: 600 }}>To Claim</MenuItem>
                              <MenuItem value="for renewal" sx={{ color: '#E74C3C', fontWeight: 600 }}>For Renewal</MenuItem>
                              <MenuItem value="claimed" sx={{ color: '#27AE60', fontWeight: 600 }}>Claimed</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* Active Filters Display */}
                      {hasActiveFilters && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ color: '#0b87ac', mb: 1, fontWeight: 600 }}>
                            Active Filters:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {Object.entries(filters).map(([key, value]) => {
                              if (value && key !== 'search') {
                                // Format filter labels
                                let displayLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                                let displayValue = value;
                                
                                // Format card status values
                                if (key === 'cardStatus') {
                                  const statusLabels = {
                                    'to claim': 'To Claim',
                                    'for renewal': 'For Renewal',
                                    'claimed': 'Claimed'
                                  };
                                  displayValue = statusLabels[value] || value;
                                }
                                
                                return (
                                  <Chip
                                    key={key}
                                    label={`${displayLabel}: ${displayValue}`}
                                    onDelete={() => handleFilterChange(key, '')}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: '#0b87ac', 
                                      color: '#FFFFFF',
                                      fontWeight: 600,
                                      '& .MuiChip-deleteIcon': {
                                        color: '#FFFFFF',
                                        '&:hover': {
                                          color: '#E8F4FD'
                                        }
                                      }
                                    }}
                                  />
                                );
                              }
                              return null;
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>

                  {/* Data Table */}
                  <TableContainer 
                    component={Paper} 
                    elevation={0} 
                    sx={{ 
                      border: 'none',
                      borderRadius: '0px',
                      flex: 1,
                      overflow: 'auto',
                      boxShadow: 'none',
                      minHeight: 0,
                      backgroundColor: 'white',
                      overflowX: 'auto'
                    }}
                  >
                    <Table size="small" stickyHeader id="pwd-card-masterlist">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>PWD ID NO.</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>NAME</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>AGE</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>BARANGAY</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>STATUS</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>CARD STATUS</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>ACTIONS</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredMembers.map((member, index) => (
                          <TableRow 
                            key={member.id}
                            sx={{ 
                              bgcolor: selectedMember === member.id ? '#E8F4FD' : (index % 2 ? '#F7FBFF' : 'white'),
                              cursor: 'pointer',
                              borderLeft: selectedMember === member.id ? '4px solid #0b87ac' : 'none',
                              borderBottom: '1px solid #E0E0E0',
                              '&:hover': {
                                backgroundColor: selectedMember === member.id ? '#E8F4FD' : '#F0F8FF',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 2px 4px rgba(11, 135, 172, 0.1)'
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => setSelectedMember(member.id)}
                          >
                            <TableCell sx={{ 
                              fontSize: '0.8rem', 
                              py: 2,
                              px: 2
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Radio
                                  checked={selectedMember === member.id}
                                  onChange={() => setSelectedMember(member.id)}
                                  size="small"
                                  sx={{ 
                                    color: '#0b87ac',
                                    '&.Mui-checked': {
                                      color: '#0b87ac'
                                    }
                                  }}
                                />
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  color: selectedMember === member.id ? '#0b87ac' : '#1976D2'
                                }}>
                                {member.id}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ 
                              fontWeight: 500, 
                              fontSize: '0.8rem',
                              py: 2,
                              px: 2,
                              color: selectedMember === member.id ? '#0b87ac' : '#0b87ac'
                            }}>{member.name}</TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.8rem',
                              py: 2,
                              px: 2,
                              color: selectedMember === member.id ? '#0b87ac' : '#34495E',
                              fontWeight: 600
                            }}>{member.age}</TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.8rem',
                              py: 2,
                              px: 2,
                              color: selectedMember === member.id ? '#0b87ac' : '#0b87ac',
                              fontWeight: 500
                            }}>{member.barangay}</TableCell>
                            <TableCell sx={{ 
                              py: 2,
                              px: 2
                            }}>
                              <Chip 
                                label={member.status} 
                                color="success"
                                size="small"
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: '11px',
                                  height: '24px',
                                  backgroundColor: '#27AE60',
                                  color: 'white',
                                  '&:hover': {
                                    backgroundColor: '#229954'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              py: 2
                            }}>
                              {(() => {
                                const status = member.cardStatus || 'to claim';
                                const statusConfig = {
                                  'to claim': {
                                    label: 'To Claim',
                                    color: '#F39C12',
                                    bgColor: '#FEF5E7',
                                    textColor: '#B7791F'
                                  },
                                  'for renewal': {
                                    label: 'For Renewal',
                                    color: '#E74C3C',
                                    bgColor: '#FDEDEC',
                                    textColor: '#C0392B'
                                  },
                                  'claimed': {
                                    label: 'Claimed',
                                    color: '#27AE60',
                                    bgColor: '#EAFAF1',
                                    textColor: '#196F3D'
                                  }
                                };
                                
                                const config = statusConfig[status] || statusConfig['to claim'];
                                
                                return (
                                  <Chip 
                                    label={config.label} 
                                    size="small"
                                    sx={{ 
                                      fontWeight: 'bold',
                                      fontSize: '11px',
                                      height: '24px',
                                      backgroundColor: config.bgColor,
                                      color: config.textColor,
                                      border: `1px solid ${config.color}`,
                                      '&:hover': {
                                        backgroundColor: config.bgColor,
                                        opacity: 0.9
                                      }
                                    }}
                                  />
                                );
                              })()}
                            </TableCell>
                            <TableCell sx={{ 
                              py: 2,
                              px: 2
                            }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {member.cardStatus === 'to claim' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => handleClaimCard(e, member)}
                                    disabled={loading || !member.memberId}
                                    sx={{
                                      bgcolor: '#F39C12',
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      py: 0.5,
                                      px: 1.5,
                                      textTransform: 'none',
                                      fontWeight: 'bold',
                                      '&:hover': {
                                        bgcolor: '#E67E22'
                                      },
                                      '&:disabled': {
                                        bgcolor: '#BDC3C7'
                                      }
                                    }}
                                  >
                                    Claim
                                  </Button>
                                )}
                                {member.cardStatus === 'for renewal' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => handleRenewCard(e, member)}
                                    disabled={loading || !member.memberId}
                                    sx={{
                                      bgcolor: '#E74C3C',
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      py: 0.5,
                                      px: 1.5,
                                      textTransform: 'none',
                                      fontWeight: 'bold',
                                      '&:hover': {
                                        bgcolor: '#C0392B'
                                      },
                                      '&:disabled': {
                                        bgcolor: '#BDC3C7'
                                      }
                                    }}
                                  >
                                    Renew
                                  </Button>
                                )}
                                {member.cardStatus === 'claimed' && (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.7rem',
                                      color: '#7F8C8D',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    -
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel - PWD Card Preview */}
            <Grid item xs={12} md={4}>
              {/* Print Card Button */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintCard}
                  disabled={!selectedMemberData}
                  sx={{
                    bgcolor: '#0b87ac',
                    '&:hover': { bgcolor: '#0a6b8a' },
                    '&:disabled': { bgcolor: '#BDC3C7' },
                    textTransform: 'none',
                    fontWeight: 'bold',
                    px: 3,
                    py: 1
                  }}
                >
                  Print PWD Card (2x3)
                </Button>
              </Box>
              
              <Card elevation={0} sx={{ height: '50%', backgroundColor: 'transparent', mb: 2 }}>
                <CardContent sx={{ p: 0, height: '100%' }}>
                  <Box sx={{
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#2C3E50',
                    position: 'relative',
                    borderRadius: 2,
                    border: '2px solid #E0E0E0',
                    p: 2,
                    height: '100%',
                    width: '100%',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                  }}>
                    {/* Left Side - Header and Member Details */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      flex: 1,
                      pr: 2
                  }}>
                    {/* Card Header */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold', 
                          mb: 0.2, 
                          fontSize: '10px', 
                          color: '#2C3E50',
                          letterSpacing: '0.3px',
                          lineHeight: 1.2
                        }}>
                        REPUBLIC OF THE PHILIPPINES
                      </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold', 
                          mb: 0.2, 
                          fontSize: '10px', 
                          color: '#2C3E50',
                          letterSpacing: '0.3px',
                          lineHeight: 1.2
                        }}>
                        PROVINCE OF LAGUNA
                      </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold', 
                          mb: 0.2, 
                          fontSize: '10px', 
                          color: '#2C3E50',
                          letterSpacing: '0.3px',
                          lineHeight: 1.2
                        }}>
                        CITY OF CABUYAO
                      </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold', 
                          fontSize: '10px', 
                          color: '#2C3E50',
                          letterSpacing: '0.3px',
                          lineHeight: 1.2
                        }}>
                        (P.D.A.O)
                      </Typography>
                    </Box>

                      {/* Logo Section */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                      }}>
                        <Box sx={{
                          backgroundColor: '#000000',
                          borderRadius: 0.5,
                          px: 1.5,
                          py: 0.5,
                          border: '1px solid #E0E0E0'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#FFFFFF !important', 
                            fontSize: '9px', 
                            fontWeight: 'bold',
                            letterSpacing: '0.3px',
                            textAlign: 'center',
                            display: 'block'
                          }}>
                            CABUYAO PDAO
                        </Typography>
                        </Box>
                      </Box>

                      {/* Member Details */}
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            mb: 0.8, 
                            fontSize: '9px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            lineHeight: 1.3
                          }}>
                            NAME: {selectedMemberData?.name || 'Unknown Member'}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            mb: 0.8, 
                            fontSize: '9px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            lineHeight: 1.3
                          }}>
                            ID No.: {selectedMemberData?.id || 'N/A'}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            mb: 0.8, 
                            fontSize: '9px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            lineHeight: 1.3
                          }}>
                            TYPE OF DISABILITY: {selectedMemberData?.disabilityType || 'Not specified'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ 
                          fontSize: '9px', 
                          color: '#2C3E50', 
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          lineHeight: 1.3,
                          mt: 1
                        }}>
                          SIGNATURE: _________
                        </Typography>
                    </Box>

                      {/* Card Footer */}
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'bold', 
                        fontSize: '8px', 
                        color: '#2C3E50',
                        textAlign: 'center',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        mt: 2
                      }}>
                        VALID ANYWHERE IN THE PHILIPPINES
                      </Typography>
                    </Box>

                    {/* Right Side - Photo */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexShrink: 0,
                      height: '100%',
                      py: 1
                    }}>
                        {/* ID Picture */}
                        <Box sx={{
                          width: 70,
                          height: 70,
                          backgroundColor: '#F8F9FA',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #BDC3C7',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {(() => {
                            // Debug logging
                            console.log('=== ID Picture Debug ===');
                            console.log('Selected Member:', selectedMemberData?.firstName, selectedMemberData?.lastName);
                            console.log('ID Pictures raw:', selectedMemberData?.idPictures);
                            
                            if (!selectedMemberData?.idPictures) {
                              console.log('No ID pictures found');
                              return null;
                            }
                            
                            let imagePath = null;
                            
                            // Handle different data formats
                            if (Array.isArray(selectedMemberData.idPictures)) {
                              imagePath = selectedMemberData.idPictures[0];
                              console.log('Array format - first image:', imagePath);
                            } else if (typeof selectedMemberData.idPictures === 'string') {
                              try {
                                const parsed = JSON.parse(selectedMemberData.idPictures);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  imagePath = parsed[0];
                                  console.log('String format - parsed first image:', imagePath);
                                }
                              } catch (e) {
                                console.error('Failed to parse idPictures string:', e);
                                return null;
                              }
                            }
                            
                            if (imagePath) {
                              const fullUrl = `http://127.0.0.1:8000/storage/${imagePath}`;
                              console.log('Final image URL:', fullUrl);
                              
                              return (
                                <img
                                  src={fullUrl}
                                  alt="ID Picture"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                  }}
                                  onError={(e) => {
                                    console.error('Image load error for:', fullUrl);
                                    e.target.style.display = 'none';
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', fullUrl);
                                  }}
                                />
                              );
                            }
                            
                            console.log('No valid image path found');
                            return null;
                          })()}
                          
                          {/* Empty placeholder - no text */}
                        </Box>

                        {/* QR Code */}
                        {qrCodeDataURL && (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 1,
                            p: 1,
                            border: '1px solid #E0E0E0'
                          }}>
                            <img 
                              src={qrCodeDataURL} 
                              alt="QR Code" 
                              style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '2px'
                              }}
                            />
                          </Box>
                        )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* PWD Information Section */}
              <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ 
                    background: '#FFFFFF',
                    borderRadius: 2,
                    border: '2px solid #E0E0E0',
                    p: 1.5,
                    width: '100%',
                    aspectRatio: '85.6 / 54',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                      <Box sx={{ 
                        position: 'relative',
                        mr: 2
                      }}>
                        <Avatar sx={{ 
                          width: 28, 
                          height: 28, 
                          backgroundColor: '#0b87ac',
                          border: '2px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <PersonIcon />
                        </Avatar>
                        <Box sx={{
                          position: 'absolute',
                          bottom: -1,
                          right: -1,
                          width: 12,
                          height: 12,
                          backgroundColor: '#27AE60',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid white'
                        }}>
                          <EditIcon sx={{ fontSize: 7, color: 'white' }} />
                        </Box>
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>
                        PWD Information
                      </Typography>
                    </Box>
                  
                  {selectedMemberData ? (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 1, 
                      flex: 1,
                      overflow: 'auto',
                      pr: 0.5, // Add padding for scrollbar
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: '#a8a8a8',
                      }
                    }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 0.5, fontSize: '12px' }}>
                          Name:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>
                            {selectedMemberData.lastName || ''},
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>
                            {selectedMemberData.firstName || ''},
                          </Typography>
                          {selectedMemberData.middleName && selectedMemberData.middleName.trim().toUpperCase() !== 'N/A' && (
                            <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>
                              {selectedMemberData.middleName},
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>
                            {selectedMemberData.suffix || ''}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 0.5, fontSize: '12px' }}>
                          Address:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px' }}>
                          {(() => {
                            const addressParts = [];
                            
                            // Add complete address if available
                            if (selectedMemberData.address) {
                              addressParts.push(selectedMemberData.address);
                            }
                            
                            // Add barangay if available
                            if (selectedMemberData.barangay && selectedMemberData.barangay !== 'N/A') {
                              addressParts.push(selectedMemberData.barangay);
                            }
                            
                            // Add city (default to Cabuyao if not specified)
                            const city = selectedMemberData.city && selectedMemberData.city !== 'N/A' 
                              ? selectedMemberData.city 
                              : 'Cabuyao';
                            addressParts.push(city);
                            
                            // Add province (default to Laguna if not specified)
                            const province = selectedMemberData.province && selectedMemberData.province !== 'N/A' 
                              ? selectedMemberData.province 
                              : 'Laguna';
                            addressParts.push(province);
                            
                            // Join all parts with commas and return
                            return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                          })()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 3 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 0.5, fontSize: '12px' }}>
                            Contact #:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px' }}>
                            {selectedMemberData.contactNumber || '+63 987 654 3210'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 0.5, fontSize: '12px' }}>
                            Sex:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px' }}>
                            {selectedMemberData.gender || 'Male'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 0.5, fontSize: '12px' }}>
                            Blood Type:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '14px' }}>
                            {selectedMemberData.bloodType || 'O+'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      py: 4,
                      flexDirection: 'column'
                    }}>
                      <PersonIcon sx={{ fontSize: 48, color: '#FFFFFF', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#FFFFFF', textAlign: 'center' }}>
                        Select a PWD member to view information
                      </Typography>
                    </Box>
                  )}
                  </Box>
                </CardContent>
              </Card>

            </Grid>
          </Grid>
        </Container>
      </Box>
      
      {/* Success Modal */}
      <SuccessModal
        open={modalOpen}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttonText={modalConfig.buttonText}
      />

      {/* Claim Card Confirmation Dialog */}
      <Dialog
        open={claimConfirmOpen}
        onClose={handleClaimCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#F39C12', 
          color: '#FFFFFF', 
          fontWeight: 'bold',
          fontSize: '1.1rem',
          py: 2
        }}>
          Confirm Card Claim
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#2C3E50', lineHeight: 1.6 }}>
            Are you sure you want to claim the PWD card for <strong>{pendingMember?.name}</strong>?
          </Typography>
          <Box sx={{ 
            bgcolor: '#FEF5E7', 
            p: 2, 
            borderRadius: 1,
            border: '1px solid #F39C12'
          }}>
            <Typography variant="body2" sx={{ color: '#B7791F', fontWeight: 600, mb: 1 }}>
              Card Details:
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50' }}>
              • PWD ID: <strong>{pendingMember?.id}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50' }}>
              • Validity: 3 years from claim date
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50', mt: 1, fontStyle: 'italic' }}>
              A notification will be sent to the member.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={handleClaimCancel}
            variant="outlined"
            sx={{
              borderColor: '#95A5A6',
              color: '#7F8C8D',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#7F8C8D',
                bgcolor: '#ECF0F1'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClaimConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#F39C12',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#E67E22'
              },
              '&:disabled': {
                bgcolor: '#BDC3C7',
                color: '#FFFFFF'
              }
            }}
          >
            {loading ? 'Processing...' : 'Confirm Claim'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Card Confirmation Dialog */}
      <Dialog
        open={renewConfirmOpen}
        onClose={handleRenewCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#E74C3C', 
          color: '#FFFFFF', 
          fontWeight: 'bold',
          fontSize: '1.1rem',
          py: 2
        }}>
          Confirm Card Renewal
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#2C3E50', lineHeight: 1.6 }}>
            Are you sure you want to renew the PWD card for <strong>{pendingMember?.name}</strong>?
          </Typography>
          <Box sx={{ 
            bgcolor: '#FDEDEC', 
            p: 2, 
            borderRadius: 1,
            border: '1px solid #E74C3C'
          }}>
            <Typography variant="body2" sx={{ color: '#C0392B', fontWeight: 600, mb: 1 }}>
              Renewal Details:
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50' }}>
              • PWD ID: <strong>{pendingMember?.id}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50' }}>
              • Current Expiration: {pendingMember?.cardExpirationDate ? new Date(pendingMember.cardExpirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50' }}>
              • New Expiration: {new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography variant="body2" sx={{ color: '#2C3E50', mt: 1, fontStyle: 'italic' }}>
              A notification will be sent to the member.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={handleRenewCancel}
            variant="outlined"
            sx={{
              borderColor: '#95A5A6',
              color: '#7F8C8D',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#7F8C8D',
                bgcolor: '#ECF0F1'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenewConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#E74C3C',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#C0392B'
              },
              '&:disabled': {
                bgcolor: '#BDC3C7',
                color: '#FFFFFF'
              }
            }}
          >
            {loading ? 'Processing...' : 'Confirm Renewal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PWDCard;