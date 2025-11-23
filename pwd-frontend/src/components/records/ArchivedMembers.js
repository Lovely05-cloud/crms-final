import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Container
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AdminSidebar from '../shared/AdminSidebar';
import Staff1Sidebar from '../shared/Staff1Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import MobileHeader from '../shared/MobileHeader';
import { api } from '../../services/api';
import toastService from '../../services/toastService';
import {
  mainContainerStyles,
  contentAreaStyles,
  headerStyles,
  titleStyles,
  cardStyles
} from '../../utils/themeStyles';

function ArchivedMembers() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [archivedMembers, setArchivedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchivedMembers();
  }, []);

  const fetchArchivedMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pwd-members-archived');
      
      // Handle different response structures
      if (response && response.data) {
        if (response.data.success !== false) {
          // Success case - data might be directly in response.data or response.data.data
          const members = response.data.data || response.data || [];
          setArchivedMembers(Array.isArray(members) ? members : []);
        } else {
          // API returned success: false
          const errorMsg = response.data.error || response.data.message || 'Failed to fetch archived members';
          toastService.error(errorMsg);
          setArchivedMembers([]);
        }
      } else {
        // Unexpected response structure
        console.warn('Unexpected response structure:', response);
        setArchivedMembers([]);
      }
    } catch (error) {
      console.error('Error fetching archived members:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch archived members';
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Error in request setup
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toastService.error(errorMessage);
      setArchivedMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredMembers = archivedMembers.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''} ${member.suffix || ''}`.toLowerCase();
    const pwdId = (member.pwd_id || '').toLowerCase();
    const barangay = (member.barangay || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           pwdId.includes(searchLower) || 
           barangay.includes(searchLower);
  });

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={mainContainerStyles}>
      {/* Role-based Sidebar with Toggle */}
      {currentUser?.role === 'Staff1' ? (
        <Staff1Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      ) : (
        <AdminSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      )}
      <MobileHeader onMenuClick={handleSidebarToggle} />
      
      <Box sx={contentAreaStyles}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={headerStyles}>
            <Typography variant="h4" sx={titleStyles}>
              Archived Members
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Members whose PWD ID cards have expired
            </Typography>
          </Box>

          <Paper sx={cardStyles}>
            <Box sx={{ p: 2, borderBottom: '1px solid #E0E0E0' }}>
              <TextField
                fullWidth
                placeholder="Search by name, PWD ID, or barangay..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: 400 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        PWD ID NO.
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Name
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Age
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Barangay
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Disability Type
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Card Expiration Date
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>
                        Archived Date
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {searchTerm ? 'No archived members found matching your search.' : 'No archived members found.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member, index) => (
                        <TableRow
                          key={member.id}
                          sx={{
                            bgcolor: index % 2 ? '#F8FAFC' : '#FFFFFF',
                            '&:hover': {
                              bgcolor: '#E8F4FD'
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500, color: '#2C3E50', fontSize: '0.8rem' }}>
                            {member.pwd_id || (member.userID ? `PWD-${member.userID}` : 'Not assigned')}
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            {(() => {
                              const parts = [];
                              if (member.firstName) parts.push(member.firstName);
                              if (member.middleName && member.middleName.trim().toUpperCase() !== 'N/A') parts.push(member.middleName);
                              if (member.lastName) parts.push(member.lastName);
                              if (member.suffix) parts.push(member.suffix);
                              return parts.join(' ').trim() || 'Name not provided';
                            })()}
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            {getAge(member.birthDate)}
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            {member.barangay || 'Not specified'}
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            {member.disabilityType || 'Not specified'}
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            <Chip
                              label={formatDate(member.cardExpirationDate)}
                              size="small"
                              color="error"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                            {formatDate(member.archived_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default ArchivedMembers;

