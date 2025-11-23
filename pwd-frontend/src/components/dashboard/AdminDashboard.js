// src/components/dashboard/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import toastService from '../../services/toastService';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Announcement as AnnouncementIcon,
  Support as SupportIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PersonAdd as PersonAddIcon,
  CreditCard as CreditCardIcon,
  Report as ReportIcon,
  CardGiftcard as CardGiftcardIcon,
  VerifiedUser as VerifiedUserIcon,
  DoneAll as DoneAllIcon,
  CardMembership as CardMembershipIcon,
  Menu as MenuIcon,
  Campaign as CampaignIcon,
  History as HistoryIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  OpenInNew,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../shared/AdminSidebar';
import MobileHeader from '../shared/MobileHeader';
import dashboardService from '../../services/dashboardService';
import supportService from '../../services/supportService';
import pwdMemberService from '../../services/pwdMemberService';
import { api } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
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
  tableStyles,
  notificationBadgeStyles
} from '../../utils/themeStyles';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalPWDMembers: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    activeMembers: 0,
    supportTickets: 0,
    resolvedTickets: 0,
    claimedIDs: 0,
    renewedIDs: 0,
    claimedBenefits: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [barangayContacts, setBarangayContacts] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [disabilityDistribution, setDisabilityDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [disabilityLoading, setDisabilityLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cardDetailsData, setCardDetailsData] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [barangaySearchQuery, setBarangaySearchQuery] = useState('');

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileMenuToggle = (isOpen) => {
    setIsMobileMenuOpen(isOpen);
  };

  const handleCardClick = async (cardType) => {
    setSelectedCard(cardType);
    setModalOpen(true);
    setDetailsLoading(true);
    setCardDetailsData([]);
    
    // Fetch detailed data based on card type
    try {
      switch (cardType) {
        case 'resolvedTickets':
          const tickets = await supportService.getTickets();
          const resolvedTickets = Array.isArray(tickets) 
            ? tickets.filter(t => ['resolved', 'closed'].includes((t?.status || '').toLowerCase()))
            : [];
          setCardDetailsData(resolvedTickets);
          break;
          
        case 'claimedIDs':
          const members = await pwdMemberService.getAll();
          const claimedMembers = Array.isArray(members)
            ? members.filter(m => m?.cardClaimed || m?.pwd_id || m?.pwd_card_number || m?.card_number)
            : [];
          setCardDetailsData(claimedMembers);
          break;
          
        case 'renewedIDs':
          const allMembers = await pwdMemberService.getAll();
          const renewedMembers = Array.isArray(allMembers)
            ? allMembers.filter(m => {
                if (!m?.cardClaimed || !m?.cardIssueDate || !m?.cardExpirationDate) return false;
                const issueDate = new Date(m.cardIssueDate);
                const expDate = new Date(m.cardExpirationDate);
                return expDate > issueDate;
              })
            : [];
          setCardDetailsData(renewedMembers);
          break;
          
        case 'claimedBenefits':
          const benefits = await api.get('/benefit-claims');
          const claimedBenefits = Array.isArray(benefits)
            ? benefits.filter(b => b?.status === 'Claimed')
            : (benefits?.data || []).filter(b => b?.status === 'Claimed');
          setCardDetailsData(claimedBenefits);
          break;
          
        default:
          setCardDetailsData([]);
      }
    } catch (error) {
      console.error('Error fetching card details:', error);
      setCardDetailsData([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCard(null);
    setCardDetailsData([]);
    setDetailsLoading(false);
  };

  const getCardDetails = (cardType) => {
    switch (cardType) {
      case 'totalPWDs':
        return {
          title: 'Total Registered PWDs',
          icon: <CheckCircleIcon sx={{ fontSize: 48, color: '#27AE60' }} />,
          value: stats.totalPWDMembers,
          description: 'This represents the total number of Persons with Disabilities (PWDs) who have successfully registered in the system.',
          details: [
            `Current Count: ${stats.totalPWDMembers} registered PWD members`,
            `All registered members have completed their application process`,
            `These members are eligible for PWD card benefits and services`,
            `Registration includes verification and approval by administrators`
          ]
        };
      case 'pendingApproval':
        return {
          title: 'Pending Admin Approval',
          icon: <ScheduleIcon sx={{ fontSize: 48, color: '#F39C12' }} />,
          value: stats.pendingApplications,
          description: 'Applications that are currently awaiting administrative review and approval.',
          details: [
            `Pending Applications: ${stats.pendingApplications} applications`,
            `These applications have passed initial barangay review`,
            `Awaiting final administrative verification and approval`,
            `Administrators can review and process these applications`
          ]
        };
      case 'newlyRegistered':
        return {
          title: 'Newly Registered PWD',
          icon: <PersonAddIcon sx={{ fontSize: 48, color: '#3498DB' }} />,
          value: 0,
          description: 'PWD members who have registered within a recent time period (typically the last 24-48 hours).',
          details: [
            `Recent Registrations: 0 new registrations`,
            `This metric tracks registrations from the last 24-48 hours`,
            `Helps monitor daily registration activity`,
            `Newly registered members are highlighted for priority processing`
          ]
        };
      case 'unclaimedCard':
        return {
          title: 'Unclaimed PWD Card',
          icon: <CreditCardIcon sx={{ fontSize: 48, color: '#9B59B6' }} />,
          value: stats.totalPWDMembers,
          description: 'PWD identification cards that have been issued but not yet claimed by the registered members.',
          details: [
            `Unclaimed Cards: ${stats.totalPWDMembers} cards`,
            `These cards are ready for distribution to registered PWD members`,
            `Members need to collect their physical PWD identification cards`,
            `Cards provide access to various benefits and services`
          ]
        };
      case 'supportTickets':
        return {
          title: 'Support Tickets',
          icon: <ReportIcon sx={{ fontSize: 48, color: '#E74C3C' }} />,
          value: stats.supportTickets,
          description: 'Active support tickets and help requests from PWD members and system users.',
          details: [
            `Active Tickets: ${stats.supportTickets} support tickets`,
            `Tickets include inquiries, issues, and assistance requests`,
            `Requires administrative attention and response`,
            `Tickets are categorized by priority and type`
          ]
        };
      case 'resolvedTickets':
        return {
          title: 'Resolved Tickets',
          icon: <DoneAllIcon sx={{ fontSize: 48, color: '#27AE60' }} />,
          value: stats.resolvedTickets || 0,
          description: 'Support tickets that have been successfully resolved or closed.',
          details: [
            `Resolved Tickets: ${stats.resolvedTickets || 0} tickets`,
            `These tickets have been completed and closed`,
            `Includes both resolved and closed status tickets`,
            `Reflects successful resolution of member inquiries and issues`
          ],
          hasTable: true,
          tableHeaders: ['Ticket ID', 'Subject', 'Status', 'Created At', 'Resolved At'],
          getTableRows: (data) => data.map(ticket => ({
            id: ticket.ticketID || ticket.id,
            subject: ticket.subject || 'N/A',
            status: ticket.status || 'N/A',
            createdAt: ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A',
            resolvedAt: ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : 'N/A'
          }))
        };
      case 'claimedIDs':
        return {
          title: 'Claimed IDs',
          icon: <CardMembershipIcon sx={{ fontSize: 48, color: '#3498DB' }} />,
          value: stats.claimedIDs || 0,
          description: 'PWD identification cards that have been claimed by registered members.',
          details: [
            `Claimed IDs: ${stats.claimedIDs || 0} cards`,
            `Members have collected their physical PWD identification cards`,
            `Cards provide access to various benefits and services`,
            `Each claimed card is assigned a unique PWD ID number`
          ],
          hasTable: true,
          tableHeaders: ['PWD ID', 'Name', 'Barangay', 'Issue Date', 'Status'],
          getTableRows: (data) => data.map(member => ({
            id: member.pwd_id || member.pwd_card_number || member.card_number || 'N/A',
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'N/A',
            barangay: member.barangay || 'N/A',
            issueDate: member.cardIssueDate ? new Date(member.cardIssueDate).toLocaleDateString() : 'N/A',
            status: member.cardClaimed ? 'Claimed' : 'Pending'
          }))
        };
      case 'renewedIDs':
        return {
          title: 'Renewed IDs',
          icon: <VerifiedUserIcon sx={{ fontSize: 48, color: '#9B59B6' }} />,
          value: stats.renewedIDs || 0,
          description: 'PWD identification cards that have been renewed by members.',
          details: [
            `Renewed IDs: ${stats.renewedIDs || 0} cards`,
            `These cards have been renewed after their initial expiration`,
            `Renewal process ensures continued access to benefits`,
            `Members must renew their cards before expiration date`
          ],
          hasTable: true,
          tableHeaders: ['PWD ID', 'Name', 'Issue Date', 'Expiration Date', 'Status'],
          getTableRows: (data) => data.map(member => ({
            id: member.pwd_id || member.pwd_card_number || member.card_number || 'N/A',
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'N/A',
            issueDate: member.cardIssueDate ? new Date(member.cardIssueDate).toLocaleDateString() : 'N/A',
            expirationDate: member.cardExpirationDate ? new Date(member.cardExpirationDate).toLocaleDateString() : 'N/A',
            status: member.cardExpirationDate && new Date(member.cardExpirationDate) > new Date() ? 'Active' : 'Expired'
          }))
        };
      case 'claimedBenefits':
        return {
          title: 'Claimed Benefits',
          icon: <CardGiftcardIcon sx={{ fontSize: 48, color: '#F39C12' }} />,
          value: stats.claimedBenefits || 0,
          description: 'Benefits that have been successfully claimed by PWD members.',
          details: [
            `Claimed Benefits: ${stats.claimedBenefits || 0} claims`,
            `Benefits have been distributed to eligible PWD members`,
            `Each claim represents a benefit successfully received`,
            `Tracking helps monitor benefit distribution effectiveness`
          ],
          hasTable: true,
          tableHeaders: ['Claim ID', 'Benefit Type', 'Member', 'Claim Date', 'Status'],
          getTableRows: (data) => data.map(claim => ({
            id: claim.claimID || claim.id || 'N/A',
            benefitType: claim.benefit?.benefit_type || claim.benefit_type || 'N/A',
            member: claim.pwd_member ? `${claim.pwd_member.firstName || ''} ${claim.pwd_member.lastName || ''}`.trim() : 'N/A',
            claimDate: claim.claimed_at ? new Date(claim.claimed_at).toLocaleDateString() : 
                      (claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'),
            status: claim.status || 'N/A'
          }))
        };
      default:
        return null;
    }
  };

  const renderModal = () => {
    if (!selectedCard) return null;
    
    const cardDetails = getCardDetails(selectedCard);
    if (!cardDetails) return null;

    return (
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth={cardDetails.hasTable ? "lg" : "sm"}
        fullWidth
        sx={dialogStyles}
      >
        <DialogTitle sx={dialogTitleStyles}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {cardDetails.icon}
            <Typography variant="h6" sx={{ color: '#000000', fontWeight: 'bold' }}>
              {cardDetails.title}
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#000000',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#000000', mb: 2 }}>
              {cardDetails.value}
            </Typography>
            <Typography variant="body1" sx={{ color: '#000000', mb: 3 }}>
              {cardDetails.description}
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            {cardDetails.hasTable ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#000000', mb: 2 }}>
                  Detailed List:
                </Typography>
                {detailsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : cardDetailsData.length > 0 ? (
                  <TableContainer component={Paper} sx={{ maxHeight: 400, mt: 2 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {cardDetails.tableHeaders.map((header, index) => (
                            <TableCell 
                              key={index}
                              sx={{ 
                                fontWeight: 'bold', 
                                backgroundColor: '#F5F5F5',
                                color: '#000000'
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cardDetails.getTableRows(cardDetailsData).map((row, index) => (
                          <TableRow key={index} hover>
                            {Object.values(row).map((cell, cellIndex) => (
                              <TableCell key={cellIndex} sx={{ color: '#000000' }}>
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: '#7F8C8D', textAlign: 'center', py: 4 }}>
                    No data available
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#000000', mb: 2 }}>
                  Details:
                </Typography>
                <List>
                  {cardDetails.details.map((detail, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#3498DB'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ color: '#000000' }}>
                            {detail}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={dialogActionsStyles}>
          <Button onClick={handleCloseModal} sx={{ color: '#000000' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Document migration functions
  const fetchMigrationStatus = async () => {
    try {
      const response = await api.get('/admin/migration-status');
      if (response.success) {
        setMigrationStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching migration status:', error);
    }
  };

  const handleMigrateDocuments = async () => {
    const confirmed = await toastService.confirmAsync(
      'Confirm Document Migration',
      'This will migrate all application documents to the member documents system. Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      return;
    }

    setMigrating(true);
    try {
      const response = await api.post('/admin/migrate-documents');
      if (response.success) {
        toastService.success(`Migration completed successfully!\nMigrated ${response.data.migrated_documents} documents\nSkipped ${response.data.skipped_applications} applications`);
        await fetchMigrationStatus();
      } else {
        toastService.error('Migration failed: ' + response.message);
      }
    } catch (error) {
      console.error('Error migrating documents:', error);
      toastService.error('Migration failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setMigrating(false);
    }
  };


  const getActivityIcon = (iconType) => {
    switch (iconType) {
      case 'person_add':
        return <PersonAddIcon sx={{ fontSize: 20 }} />;
      case 'campaign':
        return <CampaignIcon sx={{ fontSize: 20 }} />;
      case 'support':
        return <SupportIcon sx={{ fontSize: 20 }} />;
      case 'history':
        return <HistoryIcon sx={{ fontSize: 20 }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 20 }} />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard stats from our working endpoint
        const statsResponse = await api.get('/dashboard-stats');
        console.log('Dashboard stats response:', statsResponse);
        // Support both shapes: {success:true, data:{...}} and direct {...}
        const normalizedStats = (statsResponse && statsResponse.data && statsResponse.data.data)
          ? statsResponse.data.data
          : (statsResponse && statsResponse.data)
            ? statsResponse.data
            : statsResponse;
        const statsData = normalizedStats || {
          totalPWDMembers: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          activeMembers: 0,
          supportTickets: 0,
          resolvedTickets: 0,
          claimedIDs: 0,
          renewedIDs: 0,
          claimedBenefits: 0
        };
        console.log('Dashboard stats data:', statsData);
        
        // Fallback: if supportTickets missing, compute via tickets endpoint
        let finalStats = { ...statsData };
        if (finalStats.supportTickets == null) {
          try {
            const tickets = await supportService.getTickets();
            finalStats.supportTickets = Array.isArray(tickets) ? tickets.length : (tickets?.length || 0);
          } catch (e) {
            console.warn('Could not fetch tickets for fallback count');
            finalStats.supportTickets = 0;
          }
        }
        setStats(finalStats);
        await fetchMigrationStatus();
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Keep default values if API fails
        setStats({
          totalPWDMembers: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          activeMembers: 0,
          supportTickets: 0,
          resolvedTickets: 0,
          claimedIDs: 0,
          renewedIDs: 0,
          claimedBenefits: 0
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentActivities = async () => {
      try {
        setActivitiesLoading(true);
        
        // Fetch recent activities from our working endpoint
        const activitiesResponse = await api.get('/dashboard-activities');
        const activities = activitiesResponse.data || [];
        
        setRecentActivities(activities);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        setRecentActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };

    const fetchBarangayContacts = async () => {
      try {
        setContactsLoading(true);
        
        // Fetch barangay coordination from our working endpoint
        const coordinationResponse = await api.get('/dashboard-coordination');
        const coordination = coordinationResponse.data || [];
        
        setBarangayContacts(coordination);
      } catch (error) {
        console.error('Error fetching barangay coordination:', error);
        setBarangayContacts([]);
      } finally {
        setContactsLoading(false);
      }
    };

    const fetchMonthlyStats = async () => {
      try {
        setMonthlyLoading(true);
        
        // Fetch monthly stats from our working endpoint
        const monthlyResponse = await api.get('/dashboard-monthly');
        const monthly = monthlyResponse.data || [];
        
        setMonthlyStats(monthly);
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
        setMonthlyStats([]);
      } finally {
        setMonthlyLoading(false);
      }
    };

    const fetchDisabilityDistribution = async () => {
      try {
        setDisabilityLoading(true);
        
        // Fetch PWD members data - use silent mode to avoid toast spam
        let members = [];
        try {
          const membersResponse = await pwdMemberService.getAll({}, { silent: true });
          members = membersResponse?.data?.members || membersResponse?.data || (Array.isArray(membersResponse) ? membersResponse : []) || [];
        } catch (memberError) {
          // Silently handle error - don't show toast for dashboard background fetches
          console.warn('Could not fetch members for disability distribution:', memberError);
          members = [];
        }
        
        // Calculate disability type distribution
        const disabilityCounts = {};
        if (Array.isArray(members)) {
          members.forEach(member => {
            if (member && typeof member === 'object') {
              const disability = member.disabilityType || member.disability_type || member.type_of_disability || member.disability || 'Not Specified';
              disabilityCounts[disability] = (disabilityCounts[disability] || 0) + 1;
            }
          });
        }
        
        // Convert to array format for chart, sort by count descending, limit to top 8
        const distribution = Object.entries(disabilityCounts)
          .map(([name, value]) => ({
            name: name.length > 25 ? name.substring(0, 22) + '...' : name,
            value: value,
            fullName: name
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        
        if (distribution.length === 0) {
          setDisabilityDistribution([
            { name: 'No data available', value: 0, fullName: 'No data available' }
          ]);
        } else {
          setDisabilityDistribution(distribution);
        }
      } catch (error) {
        console.error('Error processing disability distribution:', error);
        setDisabilityDistribution([
          { name: 'No data available', value: 0, fullName: 'No data available' }
        ]);
      } finally {
        setDisabilityLoading(false);
      }
    };

    fetchDashboardData();
    fetchRecentActivities();
    fetchBarangayContacts();
    fetchMonthlyStats();
    fetchDisabilityDistribution();
  }, []);

  const renderDisabilityDistributionChart = () => {
    return (
      <Card sx={{ ...cardStyles, height: { xs: '300px', sm: '340px' }, mb: 3 }}>
        <CardContent sx={{ height: '100%', p: { xs: 1, sm: 2 } }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold', 
              mb: 2,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              color: '#2C3E50'
            }}
          >
            DISABILITY TYPE DISTRIBUTION
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2,
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              color: '#7F8C8D'
            }}
          >
            Distribution of PWD members by disability type
          </Typography>
          
          {disabilityLoading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 'calc(100% - 70px)' 
            }}>
              <CircularProgress size={40} />
            </Box>
          ) : disabilityDistribution.length > 0 && disabilityDistribution[0].value > 0 ? (
            <Box sx={{ height: 'calc(100% - 70px)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={disabilityDistribution} 
                  margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#7F8C8D" 
                    fontSize={11} 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#7F8C8D" 
                    fontSize={11}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Count']}
                    labelFormatter={(label) => {
                      const item = disabilityDistribution.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3498DB" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 'calc(100% - 70px)',
              flexDirection: 'column'
            }}>
              <AssessmentIcon sx={{ fontSize: 48, color: '#BDC3C7', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#7F8C8D', textAlign: 'center' }}>
                No disability data available
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLineChart = () => {
    // Use fetched monthly data or fallback to empty data
    const monthlyData = monthlyStats.length > 0 ? monthlyStats.map(item => ({
      month: item.month,
      registered: item.registered || 0,
      pending: 0 // We don't have pending data in our endpoint yet
    })) : [
      { month: 'JAN', registered: 0, pending: 0 },
      { month: 'FEB', registered: 0, pending: 0 },
      { month: 'MAR', registered: 0, pending: 0 },
      { month: 'APR', registered: 0, pending: 0 },
      { month: 'MAY', registered: 0, pending: 0 },
      { month: 'JUN', registered: 0, pending: 0 },
      { month: 'JUL', registered: 0, pending: 0 },
      { month: 'AUG', registered: 0, pending: 0 },
      { month: 'SEP', registered: 0, pending: 0 },
      { month: 'OCT', registered: 0, pending: 0 },
      { month: 'NOV', registered: 0, pending: 0 },
      { month: 'DEC', registered: 0, pending: 0 }
    ];

    const maxValue = Math.max(...monthlyData.map(d => (d.registered || 0) + (d.pending || 0)), 1);
    const chartHeight = 180;
    const chartWidth = 400;

    return (
      <Card sx={{ ...cardStyles, height: { xs: '300px', sm: '340px' }, mb: 3 }}>
        <CardContent sx={{ height: '100%', p: { xs: 1, sm: 2 } }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold', 
              color: '#FFFFFF',
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
              mb: { xs: 1, sm: 2 }
            }}
          >
            TOTAL NEWLY REGISTERED PWD MEMBERS (2025) - Line Chart
          </Typography>
          <Box sx={{ 
            height: { xs: '200px', sm: '220px', md: '240px' }, 
            position: 'relative',
            px: { xs: 1, sm: 2 },
            border: '1px solid #E0E0E0',
            borderRadius: 1,
            background: 'linear-gradient(to top, #f8f9fa 0%, #ffffff 100%)',
            overflow: 'hidden'
          }}>
            {/* SVG Line Chart */}
            <svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <line
                  key={index}
                  x1="40"
                  y1={chartHeight * ratio}
                  x2={chartWidth - 20}
                  y2={chartHeight * ratio}
                  stroke="#E0E0E0"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              ))}

              {/* Registered line */}
              <polyline
                points={monthlyData.map((data, index) => {
                  const x = 40 + (index * (chartWidth - 60) / 11);
                  const registeredValue = data.registered || 0;
                  const y = chartHeight - 20 - ((registeredValue / maxValue) * (chartHeight - 40));
                  return `${x},${isNaN(y) ? chartHeight - 20 : y}`;
                }).join(' ')}
                fill="none"
                stroke="#3498DB"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pending line */}
              <polyline
                points={monthlyData.map((data, index) => {
                  const x = 40 + (index * (chartWidth - 60) / 11);
                  const pendingValue = data.pending || 0;
                  const y = chartHeight - 20 - ((pendingValue / maxValue) * (chartHeight - 40));
                  return `${x},${isNaN(y) ? chartHeight - 20 : y}`;
                }).join(' ')}
                fill="none"
                stroke="#E74C3C"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points for Registered */}
              {monthlyData.map((data, index) => {
                const x = 40 + (index * (chartWidth - 60) / 11);
                const registeredValue = data.registered || 0;
                const y = chartHeight - 20 - ((registeredValue / maxValue) * (chartHeight - 40));
                return (
                  <circle
                    key={`registered-${index}`}
                    cx={x}
                    cy={isNaN(y) ? chartHeight - 20 : y}
                    r="4"
                    fill="#3498DB"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Data points for Pending */}
              {monthlyData.map((data, index) => {
                const x = 40 + (index * (chartWidth - 60) / 11);
                const pendingValue = data.pending || 0;
                const y = chartHeight - 20 - ((pendingValue / maxValue) * (chartHeight - 40));
                return (
                  <circle
                    key={`pending-${index}`}
                    cx={x}
                    cy={isNaN(y) ? chartHeight - 20 : y}
                    r="4"
                    fill="#E74C3C"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Month labels */}
              {monthlyData.map((data, index) => {
                const x = 40 + (index * (chartWidth - 60) / 11);
                return (
                  <text
                    key={`label-${index}`}
                    x={x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                    fontFamily="Arial, sans-serif"
                  >
                    {data.month}
                  </text>
                );
              })}
            </svg>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 2, sm: 3 }, 
            mt: { xs: 1, sm: 2 },
            flexWrap: 'wrap'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: { xs: 8, sm: 10, md: 12 }, height: 2, backgroundColor: '#3498DB' }} />
              <Typography variant="caption" sx={{ color: '#FFFFFF', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                Registered
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: { xs: 8, sm: 10, md: 12 }, height: 2, backgroundColor: '#E74C3C' }} />
              <Typography variant="caption" sx={{ color: '#FFFFFF', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                Pending
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderOverview = () => (
    <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
      {/* Summary Cards Row */}
      <Grid item xs={12}>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('totalPWDs')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <CheckCircleIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#27AE60', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.totalPWDMembers}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Total Registered PWDs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('pendingApproval')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <ScheduleIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#F39C12', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.pendingApplications}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Pending Admin Approval
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('newlyRegistered')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <PersonAddIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#3498DB', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  0
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Newly Registered PWD
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('unclaimedCard')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  borderColor: '#9B59B6'
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
                <CreditCardIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#9B59B6', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.totalPWDMembers}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Unclaimed PWD Card
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('supportTickets')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <ReportIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#E74C3C', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.supportTickets}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Support Tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('resolvedTickets')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <DoneAllIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#27AE60', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.resolvedTickets || 0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Resolved Tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('claimedIDs')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <CardMembershipIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#3498DB', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.claimedIDs || 0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Claimed IDs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('renewedIDs')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  borderColor: '#9B59B6'
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
                <VerifiedUserIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#9B59B6', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.renewedIDs || 0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Renewed IDs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2.4}>
            <Card 
              onClick={() => handleCardClick('claimedBenefits')}
              sx={{ 
                ...cardStyles, 
                height: { xs: '120px', sm: '140px', md: '160px' },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
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
                <CardGiftcardIcon sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#F39C12', 
                  mb: { xs: 0.5, sm: 1 } 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: '#2C3E50', 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                  }}
                >
                  {stats.claimedBenefits || 0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#000000', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.2
                  }}
                >
                  Claimed Benefits
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>


      {/* Chart and Disability Distribution Row - equal width */}
      <Grid item xs={12} lg={6}>
        {renderLineChart()}
      </Grid>
      
      <Grid item xs={12} lg={6}>
        {renderDisabilityDistributionChart()}
      </Grid>

      {/* Recent Activity Panel */}
      <Grid item xs={12} lg={6}>
        <Card sx={{ ...cardStyles, height: { xs: '400px', sm: '450px' } }}>
          <CardContent sx={{ height: '100%', p: { xs: 1, sm: 2 } }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',   
                color: '#000000',
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
                mb: { xs: 1, sm: 2 }
              }}
            >
              RECENT ACTIVITY PANEL
            </Typography>
            <Box sx={{ 
              height: { xs: '320px', sm: '370px' }, 
              overflow: 'auto',
              border: '1px solid #E0E0E0',
              borderRadius: 1,
              backgroundColor: '#FFFFFF'
            }}>
              {activitiesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : recentActivities.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {recentActivities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: 2, py: 1.5 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            backgroundColor: activity.color,
                            color: '#FFFFFF'
                          }}>
                            {getActivityIcon(activity.icon)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#000000' }}>
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" sx={{ color: '#000000', display: 'block' }}>
                                {activity.description}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                                {activity.barangay} • {formatTimeAgo(activity.created_at)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={activity.status} 
                          size="small"
                          sx={{
                            backgroundColor: activity.color,
                            color: '#FFFFFF',
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column'
                }}>
                  <ScheduleIcon sx={{ fontSize: 48, color: '#BDC3C7', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#7F8C8D', textAlign: 'center' }}>
                    No recent activities
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Barangay Coordination Table */}
      <Grid item xs={12} lg={6}>
        <Card sx={{ ...cardStyles, height: { xs: '400px', sm: '450px' } }}>
          <CardContent sx={{ height: '100%', p: { xs: 1, sm: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1, sm: 2 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#000000',
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
                }}
              >
                BARANGAY COORDINATION TABLE
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by barangay, president, contact..."
              value={barangaySearchQuery}
              onChange={(e) => setBarangaySearchQuery(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.85rem',
                  backgroundColor: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#0b87ac',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0b87ac',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#7F8C8D' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ 
              height: { xs: '280px', sm: '330px' }, 
              overflow: 'auto',
              border: '1px solid #E0E0E0',
              borderRadius: 1,
              backgroundColor: '#FFFFFF'
            }}>
              {contactsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : (() => {
                const filteredContacts = barangayContacts.filter(contact => {
                  if (!barangaySearchQuery.trim()) {
                    return true; // Show all if search is empty
                  }
                  const query = barangaySearchQuery.toLowerCase();
                  return (
                    contact.barangay?.toLowerCase().includes(query) ||
                    contact.president_name?.toLowerCase().includes(query) ||
                    contact.email?.toLowerCase().includes(query) ||
                    contact.phone?.toLowerCase().includes(query) ||
                    contact.status?.toLowerCase().includes(query)
                  );
                });
                return filteredContacts.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Barangay</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>President</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Contact</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>PWD Count</TableCell>
                          <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredContacts.map((contact, index) => (
                        <TableRow key={contact.barangay} sx={{ bgcolor: index % 2 ? '#F7FBFF' : 'white' }}>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#000000', py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <HomeIcon sx={{ fontSize: 14, color: '#3498DB' }} />
                              {contact.barangay}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#000000', py: 2, px: 2 }}>
                            {contact.president_name}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhoneIcon sx={{ fontSize: 12, color: '#27AE60' }} />
                                <Typography variant="caption" sx={{ color: '#000000', fontSize: '0.7rem' }}>
                                  {contact.phone}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EmailIcon sx={{ fontSize: 12, color: '#3498DB' }} />
                                <Typography variant="caption" sx={{ color: '#000000', fontSize: '0.7rem' }}>
                                  {contact.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#000000', py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#000000', fontSize: '0.7rem' }}>
                                {contact.pwd_count} PWDs
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#F39C12', fontSize: '0.7rem' }}>
                                {contact.pending_applications} pending
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2, px: 2 }}>
                            <Chip 
                              label={contact.status} 
                              size="small"
                              sx={{
                                backgroundColor: contact.status === 'active' ? '#27AE60' : '#E74C3C',
                                color: '#FFFFFF',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                height: 22
                              }}
                            />
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : barangayContacts.length > 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    flexDirection: 'column'
                  }}>
                    <SearchIcon sx={{ fontSize: 48, color: '#BDC3C7', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#7F8C8D', textAlign: 'center' }}>
                      No results found for "{barangaySearchQuery}"
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    flexDirection: 'column'
                  }}>
                    <LocationIcon sx={{ fontSize: 48, color: '#BDC3C7', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#7F8C8D', textAlign: 'center' }}>
                      No barangay contacts available
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Document Migration Section */}
      <Grid item xs={12}>
        <Card sx={cardStyles}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon sx={{ color: '#E74C3C', fontSize: 24 }} />
              <Typography sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '1.2rem' }}>
                Document Migration
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ color: '#000000', mb: 3 }}>
              Migrate application documents to the member documents system. This will make documents submitted during the application process visible in the "My Documents" section.
            </Typography>

            {migrationStatus && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#F8F9FA', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#000000', mb: 1 }}>
                  <strong>Migration Status:</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  • Approved Applications: {migrationStatus.approved_applications}
                </Typography>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  • Total Member Documents: {migrationStatus.total_member_documents}
                </Typography>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  • Required Documents: {migrationStatus.required_documents}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              onClick={handleMigrateDocuments}
              disabled={migrating}
              startIcon={migrating ? <CircularProgress size={20} /> : <SettingsIcon />}
              sx={{
                bgcolor: '#E74C3C',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: '#C0392B' },
                '&:disabled': { bgcolor: '#BDC3C7' }
              }}
            >
              {migrating ? 'Migrating Documents...' : 'Migrate Application Documents'}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Debug logging
  console.log('Current stats state:', stats);
  
  return (
    <Box sx={mainContainerStyles}>
      {/* Mobile Header */}
      <MobileHeader 
        onMenuToggle={handleMobileMenuToggle}
        isMenuOpen={isMobileMenuOpen}
      />
      
      {/* Admin Sidebar with Toggle */}
      <AdminSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          ...contentAreaStyles,
          flexGrow: 1,
          ml: { xs: 0, md: '280px' }, // Hide sidebar margin on mobile
          width: { xs: '100%', md: 'calc(100% - 280px)' },
          transition: 'margin-left 0.3s ease-in-out',
          // Adjust for mobile header
          paddingTop: { xs: '56px', md: 0 }, // Mobile header height
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 1 } }}>

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
              Dashboard
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#000000',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Welcome back, {currentUser?.username || 'Admin'}. Here's what's happening with your PWD management system.
            </Typography>
          </Box>

          {/* Dashboard Content */}
          {renderOverview()}
        </Container>
      </Box>
      
      {/* Card Details Modal */}
      {renderModal()}
    </Box>
  );
}

export default AdminDashboard;
