import React, { useState, useEffect, useRef } from 'react';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Badge,
  Avatar,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Input
} from '@mui/material';
import {
  SupportAgent,
  Add,
  Reply,
  Visibility,
  CheckCircle,
  Schedule,
  Warning,
  Person,
  Email,
  Phone,
  Message,
  Close,
  Send,
  AttachFile,
  Download,
  Delete,
  Headset
} from '@mui/icons-material';
import PWDMemberSidebar from '../shared/PWDMemberSidebar';
import AccessibilitySettings from '../shared/AccessibilitySettings';
import HelpGuide from '../shared/HelpGuide';
import { supportService } from '../../services/supportService';
import { filePreviewService } from '../../services/filePreviewService';
import { api } from '../../services/api';
import websocketService from '../../services/websocketService';
import { useTranslation } from '../../contexts/TranslationContext';
import { useScreenReader } from '../../hooks/useScreenReader';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

const PWDMemberSupportDesk = () => {
  console.log('PWDMemberSupportDesk component is rendering');
  
  const { t } = useTranslation();
  const { announcePageChange } = useScreenReader();
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [replyText, setReplyText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Ref for auto-scrolling chat messages
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Update message status
  const updateMessageStatus = (messageId, status) => {
    setMessageStatuses(prev => ({
      ...prev,
      [messageId]: status
    }));
  };

  // Get message status
  const getMessageStatus = (messageId) => {
    return messageStatuses[messageId] || 'sent';
  };

  // Initialize WebSocket connection
  const initializeWebSocket = async () => {
    try {
      await websocketService.connect();
      
      // Set up event listeners
      websocketService.on('new_message', handleNewMessage);
      websocketService.on('message_status_update', handleMessageStatusUpdate);
      websocketService.on('typing_indicator', handleTypingIndicator);
      websocketService.on('connection', handleConnectionStatus);
      
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  };

  // Handle new message from WebSocket
  const handleNewMessage = (data) => {
    console.log('New message received:', data);
    
    if (data.ticket_id === selectedTicketId) {
      // Update the selected ticket with the new message
      setSelectedTicket(prevTicket => {
        if (prevTicket && prevTicket.id === data.ticket_id) {
          return {
            ...prevTicket,
            messages: [...(prevTicket.messages || []), data.message]
          };
        }
        return prevTicket;
      });
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    
    // Update tickets list
    fetchTickets();
  };

  // Handle message status updates
  const handleMessageStatusUpdate = (data) => {
    console.log('Message status update:', data);
    updateMessageStatus(data.message_id, data.status);
  };

  // Handle typing indicators
  const handleTypingIndicator = (data) => {
    console.log('Typing indicator:', data);
    
    if (data.ticket_id === selectedTicketId) {
      if (data.is_typing) {
        setTypingUsers(prev => {
          if (!prev.includes(data.user_name)) {
            return [...prev, data.user_name];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(user => user !== data.user_name));
      }
    }
  };

  // Handle connection status changes
  const handleConnectionStatus = (data) => {
    // Silent status update - no console logs
    setConnectionStatus(data.status);
  };

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

  // Format status for display
  const formatStatus = (status) => {
    switch (status) {
      case 'open':
        return 'NEW';
      case 'waiting_for_reply':
        return 'WAITING FOR REPLY';
      case 'in_progress':
        return 'IN PROGRESS';
      case 'resolved':
        return 'RESOLVED';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };
  const [selectedReplyFile, setSelectedReplyFile] = useState(null);
  
  // Form states for creating new ticket
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: ''
  });

  useEffect(() => {
    console.log('PWDMemberSupportDesk useEffect running');
    // Announce page load
    announcePageChange(t('support.title'));
    
    fetchTickets();
    
    // Initialize WebSocket connection - DISABLED
    // initializeWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (selectedTicketId) {
        websocketService.leaveTicketRoom(selectedTicketId);
      }
      websocketService.off('new_message', handleNewMessage);
      websocketService.off('message_status_update', handleMessageStatusUpdate);
      websocketService.off('typing_indicator', handleTypingIndicator);
      websocketService.off('connection', handleConnectionStatus);
    };
  }, [announcePageChange, t]);

  // Auto-scroll when selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      console.log('fetchTickets: Starting to fetch tickets');
      setLoading(true);
      const response = await supportService.getTickets();
      console.log('fetchTickets: Response received:', response);
      const sorted = [...(response || [])].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || a.createdAt || 0).getTime() || (a.id || 0);
        const bTime = new Date(b.updated_at || b.created_at || b.createdAt || 0).getTime() || (b.id || 0);
        return bTime - aTime;
      });
      setTickets(sorted);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedTickets = async () => {
    try {
      console.log('fetchArchivedTickets: Starting to fetch archived tickets');
      setLoading(true);
      const response = await supportService.getArchivedTickets();
      console.log('fetchArchivedTickets: Response received:', response);
      const sortedArchived = [...(response || [])].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || a.createdAt || 0).getTime() || (a.id || 0);
        const bTime = new Date(b.updated_at || b.created_at || b.createdAt || 0).getTime() || (b.id || 0);
        return bTime - aTime;
      });
      setArchivedTickets(sortedArchived);
    } catch (error) {
      console.error('Error fetching archived tickets:', error);
      setError('Failed to load archived tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      subject: '',
      description: '',
      category: ''
    });
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
    
    // Join WebSocket room for this ticket
    if (websocketService.isConnected()) {
      websocketService.joinTicketRoom(ticket.id);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialog(false);
    setSelectedTicket(null);
    setReplyText('');
    setSelectedReplyFile(null);
  };

  const handleReplyTicket = (ticket) => {
    setSelectedTicket(ticket);
    setViewDialog(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 2MB. Please select a smaller file.`);
        setSelectedFile(null);
        return;
      }
      
      // Check file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError(t('support.fileFormats'));
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleReplyFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 2MB. Please select a smaller file.`);
        setSelectedFile(null);
        return;
      }
      
      // Check file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError(t('support.fileFormats'));
        return;
      }
      
      setSelectedReplyFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleRemoveReplyFile = () => {
    setSelectedReplyFile(null);
  };

  const handleDownloadAttachment = async (messageId, fileName) => {
    try {
      const response = await supportService.forceDownloadAttachment(messageId);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download attachment');
    }
  };

  const handlePreviewFile = async (message) => {
    try {
      console.log('Starting file preview for message:', message.id);
      setError(null); // Clear any previous errors
      
      // Use the file preview service
      await filePreviewService.openPreview('support-ticket', message.id);
      
      console.log('File preview initiated');
      
    } catch (error) {
      console.error('Error previewing file:', error);
      setError(`Failed to preview file: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitTicket = async () => {
    try {
      setSubmittingTicket(true);
      setError(null);
      const response = await supportService.createTicket(formData, selectedFile);
      setSuccess('Support ticket created successfully!');
      setOpenDialog(false);
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: ''
      });
      setSelectedFile(null);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleReply = async () => {
    if (replyText.trim() || selectedFile) {
      try {
        setLoading(true);
        
        // Create a temporary message ID for status tracking
        const tempMessageId = `temp_${Date.now()}`;
        
        // Set status to sending
        updateMessageStatus(tempMessageId, 'sending');
        
        await supportService.addMessage(selectedTicket.id, replyText, selectedFile);
        
        // Set status to sent
        updateMessageStatus(tempMessageId, 'sent');
        
        setReplyText('');
        setSelectedFile(null);
        
        // Clear preview
        setPreviewFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        
        // Refresh tickets to get updated data
        fetchTickets();
        
        // Refresh the selected ticket
        const updatedTicket = await supportService.getTicket(selectedTicket.id);
        setSelectedTicket(updatedTicket);
        
        // Auto-scroll to bottom after sending message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // Mark message as seen after a delay (simulated)
        setTimeout(() => {
          updateMessageStatus(tempMessageId, 'seen');
        }, 2000);
        
      } catch (error) {
        console.error('Error sending reply:', error);
        setError('Failed to send reply');
      } finally {
        setLoading(false);
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Check file size (2MB limit)
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 2MB. Please select a smaller file.`);
        setSelectedFile(null);
        return;
      }
      
      // Check file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError(t('support.fileFormats'));
        return;
      }
      
      setSelectedFile(file);
      setPreviewFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
      
      setError(null);
    }
  };

  const handleRemovePreview = () => {
    setSelectedFile(null);
    setPreviewFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleMarkResolved = async (ticketId) => {
    try {
      setLoading(true);
      await supportService.pwdMember.markResolved(ticketId);
      setSuccess('Ticket marked as resolved and archived!');
      fetchTickets();
      // Also refresh archived tickets if archive view is open
      if (showArchive) {
        fetchArchivedTickets();
      }
    } catch (error) {
      console.error('Error marking ticket as resolved:', error);
      setError('Failed to mark ticket as resolved');
    } finally {
      setLoading(false);
    }
  };

  const handleShowActiveTickets = () => {
    setShowArchive(false);
    fetchTickets();
  };

  const handleShowArchivedTickets = () => {
    setShowArchive(true);
    fetchArchivedTickets();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Schedule />;
      case 'in_progress': return <Warning />;
      case 'resolved': return <CheckCircle />;
      case 'closed': return <Close />;
      default: return <Schedule />;
    }
  };

  console.log('PWDMemberSupportDesk: About to render, loading:', loading, 'tickets:', tickets.length);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <PWDMemberSidebar />
      
      <Box sx={{ 
        flex: 1, 
        marginLeft: '280px', // Account for fixed sidebar width
        p: 3,
        minHeight: '100vh',
        backgroundColor: '#FFFFFF'
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600, mb: 1 }}>
            {t('support.title')}
          </Typography>
          <Typography variant="body1" sx={{ color: '#000000' }}>
            {t('support.createAndManage')}
          </Typography>
        </Box>

        {/* Help Guide for Support Desk */}
        <HelpGuide
          title={t('guide.support.title')}
          type="info"
          steps={[
            {
              title: t('guide.support.steps.creating.title'),
              description: t('guide.support.steps.creating.description')
            },
            {
              title: t('guide.support.steps.viewing.title'),
              description: t('guide.support.steps.viewing.description')
            },
            {
              title: t('guide.support.steps.replying.title'),
              description: t('guide.support.steps.replying.description')
            },
            {
              title: t('guide.support.steps.status.title'),
              description: t('guide.support.steps.status.description')
            },
            {
              title: t('guide.support.steps.attaching.title'),
              description: t('guide.support.steps.attaching.description')
            },
            {
              title: t('guide.support.steps.gettingHelp.title'),
              description: t('guide.support.steps.gettingHelp.description')
            }
          ]}
        />

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Schedule sx={{ color: '#E74C3C', mr: 1 }} />
                  <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
                    {showArchive ? 0 : tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'waiting_for_reply').length}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  {t('support.waitingForReply')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Warning sx={{ color: '#F39C12', mr: 1 }} />
                  <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
                    {showArchive ? 0 : tickets.filter(ticket => ticket.status === 'in_progress').length}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  {t('support.inProgress')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <CheckCircle sx={{ color: '#27AE60', mr: 1 }} />
                  <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
                    {archivedTickets.length}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  {t('support.resolved')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <SupportAgent sx={{ color: '#3498DB', mr: 1 }} />
                  <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
                    {tickets.length + archivedTickets.length}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#000000' }}>
                  {t('support.totalTickets')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
            sx={{
              backgroundColor: '#3498DB',
              '&:hover': { backgroundColor: '#2980B9' },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
{t('support.createTicket')}
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Content - Two Column Layout */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          height: 'calc(100vh - 380px)',
          minHeight: '500px',
          maxHeight: 'calc(100vh - 380px)',
          overflow: 'hidden'
        }}>
          {/* Left Column - Tickets List */}
          <Paper elevation={0} sx={{
            flex: selectedTicketId ? '0 0 35%' : '1',
            p: { xs: 2, sm: 3 },
            border: '1px solid #E0E0E0',
            borderRadius: 4,
            bgcolor: '#FFFFFF',
            height: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'flex 0.3s ease',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: { xs: 2, sm: 3 }
            }}>
              <Typography sx={{ 
                fontWeight: 700, 
                color: '#2C3E50', 
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' }
              }}>
                {t('support.myTickets')}
              </Typography>
              
              {/* Archive Toggle Buttons - Top Right */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1
              }}>
                <Button
                  variant={!showArchive ? "contained" : "outlined"}
                  onClick={handleShowActiveTickets}
                  sx={{
                    backgroundColor: !showArchive ? '#0b87ac' : 'transparent',
                    color: !showArchive ? '#FFFFFF' : '#0b87ac',
                    borderColor: '#0b87ac',
                    '&:hover': { 
                      backgroundColor: !showArchive ? '#0a6b8a' : 'rgba(11, 135, 172, 0.1)' 
                    },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                  }}
                >
                  {t('support.activeTickets')}
                </Button>
                <Button
                  variant={showArchive ? "contained" : "outlined"}
                  onClick={handleShowArchivedTickets}
                  sx={{
                    backgroundColor: showArchive ? '#0b87ac' : 'transparent',
                    color: showArchive ? '#FFFFFF' : '#0b87ac',
                    borderColor: '#0b87ac',
                    '&:hover': { 
                      backgroundColor: showArchive ? '#0a6b8a' : 'rgba(11, 135, 172, 0.1)' 
                    },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                  }}
                >
                  {t('support.archive')}
                </Button>
              </Box>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{
                flex: 1,
                minHeight: 0,
                maxHeight: '100%',
                overflowX: 'auto',
                overflowY: 'auto'
              }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.ticketNumber')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.subject')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.status')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.priority')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.category')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('support.createdAt')}</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>{t('documents.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (showArchive ? archivedTickets : tickets).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#000000' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <SupportAgent sx={{ fontSize: 48, color: '#BDC3C7', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                          {showArchive ? 'No archived tickets found' : 'No support tickets found'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666666' }}>
                          {showArchive ? 'Resolved tickets will appear here' : 'Create your first ticket to get started!'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  (showArchive ? archivedTickets : tickets).map((ticket, idx) => (
                    <TableRow 
                      key={ticket.id} 
                      hover 
                      onClick={() => handleViewTicket(ticket)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: idx % 2 ? '#F7FBFF' : 'white',
                        backgroundColor: selectedTicketId === ticket.id ? '#E3F2FD' : (idx % 2 ? '#F7FBFF' : 'white'),
                        '&:hover': {
                          backgroundColor: selectedTicketId === ticket.id ? '#E3F2FD' : '#F5F5F5'
                        }
                      }}
                    >
                      <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        {ticket.subject}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        <Chip
                          label={formatStatus(ticket.status)}
                          size="small"
                          sx={{
                            backgroundColor: '#E8F5E8',
                            color: '#27AE60',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22,
                            '& .MuiChip-label': {
                              color: '#27AE60'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        <Chip
                          label={ticket.priority.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: '#FFF3E0',
                            color: '#F39C12',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22,
                            '& .MuiChip-label': {
                              color: '#F39C12'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        <Chip
                          label={ticket.category || 'General'}
                          size="small"
                          sx={{
                            backgroundColor: '#E8F4FD',
                            color: '#3498DB',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22,
                            '& .MuiChip-label': {
                              color: '#3498DB'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        {formatDateMMDDYYYY(ticket.created_at)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={selectedTicketId === ticket.id ? 'Selected' : 'Click to view'}
                            size="small"
                            sx={{
                              backgroundColor: selectedTicketId === ticket.id ? '#3498DB' : '#F5F5F5',
                              color: selectedTicketId === ticket.id ? '#FFFFFF' : '#7F8C8D',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22
                            }}
                          />
                          {!showArchive && ticket.status !== 'resolved' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircle />}
                              onClick={() => handleMarkResolved(ticket.id)}
                              sx={{ 
                                color: '#27AE60',
                                borderColor: '#27AE60',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                py: 0.5,
                                px: 1,
                                '&:hover': {
                                  backgroundColor: '#27AE60',
                                  color: '#FFFFFF',
                                  borderColor: '#27AE60'
                                }
                              }}
                            >
                              Resolve
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </TableContainer>
            )}
          </Paper>

          {/* Right Column - Chat Interface */}
          {selectedTicketId && (
            <Paper sx={{
              flex: '0 0 65%',
              borderRadius: 3, 
              overflow: 'hidden', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
              bgcolor: '#FFFFFF',
              transition: 'flex 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              maxHeight: '100%'
            }}>
              {/* Chat Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                borderBottom: '1px solid #E0E0E0',
                bgcolor: '#F8F9FA'
              }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                    {selectedTicket?.subject}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                    Ticket #{selectedTicket?.ticket_number}
                  </Typography>
                  {/* Connection Status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: connectionStatus === 'connected' ? '#27AE60' : 
                                     connectionStatus === 'connecting' ? '#F39C12' : '#95A5A6'
                    }} />
                    <Typography variant="caption" sx={{ 
                      color: connectionStatus === 'connected' ? '#27AE60' : 
                             connectionStatus === 'connecting' ? '#F39C12' : '#95A5A6',
                      fontSize: '0.7rem',
                      textTransform: 'capitalize'
                    }}>
                      {connectionStatus === 'connected' ? 'Live' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Standard Mode'}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={selectedTicket?.status?.toUpperCase()} 
                  size="small"
                  sx={{
                    backgroundColor: selectedTicket?.status === 'resolved' ? '#E8F5E8' : '#FFECEC',
                    color: selectedTicket?.status === 'resolved' ? '#27AE60' : '#C0392B',
                    fontWeight: 600
                  }}
                />
              </Box>

              {/* Chat Messages */}
              <Box 
                ref={chatContainerRef}
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  minHeight: 0,
                  maxHeight: '100%', 
                  p: 2,
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                  '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '3px' }
                }}>
                {selectedTicket?.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((message, index) => (
                    <Box key={index} sx={{ 
                      display: 'flex', 
                      justifyContent: message.is_admin ? 'flex-start' : 'flex-end',
                      mb: 2
                    }}>
                      <Box sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: message.is_admin ? 'row' : 'row-reverse',
                        alignItems: 'flex-end',
                        gap: 1
                      }}>
                        {/* Avatar */}
                        <Avatar sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: message.is_admin ? '#3498DB' : '#95A5A6',
                          fontSize: '0.8rem'
                        }}>
                          {message.is_admin ? 'A' : 'U'}
                        </Avatar>
                        
                        {/* Message bubble */}
                        <Box sx={{
                          bgcolor: message.is_admin ? '#E3F2FD' : '#F5F5F5',
                          borderRadius: message.is_admin ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          p: 2,
                          position: 'relative'
                        }}>
                          {/* Sender name */}
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: '#2C3E50',
                            mb: 0.5,
                            fontSize: '0.8rem'
                          }}>
                            {message.sender_name || (message.is_admin ? 'Admin' : 'You')}
                          </Typography>
                          
                          {/* Message content */}
                          <Typography variant="body2" sx={{ 
                            color: '#2C3E50',
                            mb: 1,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {message.message}
                          </Typography>
                          
                          {/* Attachment */}
                          {message.attachment_path && (
                            <Box sx={{ mt: 1 }}>
                              {/* Image Preview */}
                              {message.attachment_type && message.attachment_type.startsWith('image/') ? (
                                <Box sx={{ 
                                  mt: 1,
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  border: '1px solid #E0E0E0'
                                }}>
                                  <img
                                    src={`${api.getBaseUrl()}/support-tickets/messages/${message.id}/image`}
                                    alt={message.attachment_name}
                                    style={{
                                      maxWidth: '250px',
                                      maxHeight: '180px',
                                      width: '100%',
                                      height: 'auto',
                                      objectFit: 'cover',
                                      cursor: 'pointer',
                                      display: 'block'
                                    }}
                                    onClick={() => handlePreviewFile(message)}
                                    onError={(e) => {
                                      console.error('Image failed to load:', `${api.getBaseUrl()}/support-tickets/messages/${message.id}/image`);
                                      console.error('Message data:', message);
                                      e.target.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('Image loaded successfully:', `${api.getBaseUrl()}/support-tickets/messages/${message.id}/image`);
                                    }}
                                  />
                                  <Box sx={{ 
                                    p: 1, 
                                    backgroundColor: '#F5F5F5',
                                    borderTop: '1px solid #E0E0E0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                  }}>
                                    <AttachFile sx={{ color: '#0b87ac', fontSize: 14 }} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: '#000000',
                                        flex: 1,
                                        fontWeight: 500,
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      {message.attachment_name}
                                    </Typography>
                                    <Button
                                      size="small"
                                      startIcon={<Download />}
                                      onClick={() => handleDownloadAttachment(message.id, message.attachment_name)}
                                      sx={{
                                        color: '#3498DB',
                                        textTransform: 'none',
                                        fontSize: '0.65rem',
                                        minWidth: 'auto',
                                        px: 1,
                                        py: 0.5,
                                        '&:hover': {
                                          backgroundColor: '#3498DB',
                                          color: '#FFFFFF'
                                        }
                                      }}
                                    >
                                      Download
                                    </Button>
                                  </Box>
                                </Box>
                              ) : (
                                /* File Info for Non-Images */
                                <Box sx={{ 
                                  mt: 1,
                                  p: 1.5, 
                                  backgroundColor: '#F5F5F5',
                                  borderRadius: 2,
                                  border: '1px solid #E0E0E0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5
                                }}>
                                  <AttachFile sx={{ color: '#0b87ac', fontSize: 18 }} />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: '#000000',
                                      flex: 1,
                                      fontWeight: 500,
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    {message.attachment_name}
                                  </Typography>
                                  <Button
                                    size="small"
                                    startIcon={<Visibility />}
                                    onClick={() => handlePreviewFile(message)}
                                    sx={{
                                      color: '#3498DB',
                                      textTransform: 'none',
                                      fontSize: '0.7rem',
                                      mr: 1,
                                      '&:hover': {
                                        backgroundColor: '#3498DB',
                                        color: '#FFFFFF'
                                      }
                                    }}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    size="small"
                                    startIcon={<Download />}
                                    onClick={() => handleDownloadAttachment(message.id, message.attachment_name)}
                                    sx={{
                                      color: '#3498DB',
                                      textTransform: 'none',
                                      fontSize: '0.7rem',
                                      '&:hover': {
                                        backgroundColor: '#3498DB',
                                        color: '#FFFFFF'
                                      }
                                    }}
                                  >
                                    Download
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          )}
                          
                          {/* Timestamp */}
                          <Typography variant="caption" sx={{ 
                            color: '#7F8C8D',
                            fontSize: '0.7rem'
                          }}>
                            {formatDateMMDDYYYY(message.created_at)}
                          </Typography>
                          
                          {/* Message Status */}
                          {!message.is_admin && (
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'flex-end',
                              mt: 0.5
                            }}>
                              <Typography variant="caption" sx={{ 
                                color: getMessageStatus(message.id) === 'sending' ? '#F39C12' : 
                                       getMessageStatus(message.id) === 'sent' ? '#3498DB' : '#27AE60',
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                textTransform: 'uppercase'
                              }}>
                                {getMessageStatus(message.id) === 'sending' ? 'Sending...' :
                                 getMessageStatus(message.id) === 'sent' ? 'Sent' : 'Seen'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    color: '#7F8C8D'
                  }}>
                    <Message sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">
                      No messages yet. Start the conversation below.
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <Box sx={{ 
                  px: 2, 
                  py: 1, 
                  borderTop: '1px solid #E0E0E0',
                  bgcolor: '#F8F9FA'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#7F8C8D',
                    fontStyle: 'italic',
                    fontSize: '0.7rem'
                  }}>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}

              {/* Reply Input */}
              {selectedTicket?.status !== 'resolved' && (
                <Box sx={{ 
                  borderTop: '1px solid #E0E0E0',
                  p: 2,
                  bgcolor: '#F8F9FA'
                }}>
                  {/* File Preview */}
                  {previewFile && (
                    <Box sx={{ mb: 2 }}>
                      {previewUrl ? (
                        // Image preview
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            style={{
                              maxWidth: '200px',
                              maxHeight: '150px',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                          />
                          <IconButton
                            onClick={handleRemovePreview}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: '#FF4444',
                              color: 'white',
                              width: 24,
                              height: 24,
                              '&:hover': { backgroundColor: '#CC0000' }
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        // File info for non-images
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 1,
                          border: '1px solid #E0E0E0'
                        }}>
                          <AttachFile sx={{ color: '#3498DB' }} />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {previewFile.name}
                          </Typography>
                          <IconButton
                            onClick={handleRemovePreview}
                            size="small"
                            sx={{ color: '#FF4444' }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Text Input with Drag and Drop */}
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder={dragOver ? "Drop file here..." : "Type your reply..."}
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      
                      // Send typing indicator
                      if (selectedTicketId && websocketService.isConnected()) {
                        if (e.target.value.trim() && !isTyping) {
                          setIsTyping(true);
                          websocketService.sendTypingIndicator(selectedTicketId, true);
                        } else if (!e.target.value.trim() && isTyping) {
                          setIsTyping(false);
                          websocketService.sendTypingIndicator(selectedTicketId, false);
                        }
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim() || selectedFile) {
                          handleReply();
                        }
                      }
                    }}
                    sx={{ 
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: dragOver ? '#FFFFFF' : 'transparent',
                        borderColor: dragOver ? '#3498DB' : undefined,
                        transition: 'all 0.2s ease'
                      }
                    }}
                  />
                  
                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={<Reply />}
                      onClick={handleReply}
                      disabled={!replyText.trim() && !selectedFile}
                      sx={{
                        bgcolor: '#3498DB',
                        '&:hover': { bgcolor: '#2980B9' }
                      }}
                    >
                      {t('support.reply')}
                    </Button>
                    
                    <input
                      type="file"
                      id="file-upload-member"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Check file size (10MB limit)
                          if (file.size > MAX_FILE_SIZE) {
                            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 10MB. Please select a smaller file.`);
                            return;
                          }
                          
                          // Check file type
                          const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
                          const fileExtension = file.name.split('.').pop().toLowerCase();
                          
                          if (!allowedTypes.includes(fileExtension)) {
                            setError(t('support.fileFormats'));
                            return;
                          }
                          
                          setSelectedFile(file);
                          setPreviewFile(file);
                          
                          // Create preview URL for images
                          if (file.type.startsWith('image/')) {
                            const url = URL.createObjectURL(file);
                            setPreviewUrl(url);
                          } else {
                            setPreviewUrl(null);
                          }
                          
                          setError(null);
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AttachFile />}
                      onClick={() => document.getElementById('file-upload-member').click()}
                      sx={{ borderColor: '#3498DB', color: '#3498DB' }}
                    >
                      {t('support.attachFile')}
                    </Button>
                    
                    {previewFile && (
                      <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                        {previewFile.name} {t('support.readyToSend')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          )}
        </Box>

        {/* Create Ticket Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ color: '#000000', fontWeight: 600, backgroundColor: '#FFFFFF' }}>
{t('support.createTicket')}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
{t('support.subject')} *
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#000000',
                        '& fieldset': {
                          borderColor: '#E0E0E0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#3498DB',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3498DB',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                      {t('support.category')}
                    </Typography>
                  </Box>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #e9ecef',
                          borderRadius: 3,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          '& .MuiMenuItem-root': {
                            backgroundColor: '#FFFFFF',
                            color: '#2C3E50',
                            fontSize: '0.95rem',
                            '&:hover': {
                              backgroundColor: '#f8f9fa',
                            },
                            '&.Mui-selected': {
                              backgroundColor: '#f8f9fa',
                              color: '#2C3E50',
                              '&:hover': {
                                backgroundColor: '#e9ecef',
                              },
                            },
                          },
                        }
                      }
                    }}
                    sx={{
                      color: '#000000',
                      width: '100%',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E0E0E0',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3498DB',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3498DB',
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#666666',
                      },
                    }}
                  >
                    <MenuItem value="Technical">Technical</MenuItem>
                    <MenuItem value="Benefits">Benefits</MenuItem>
                    <MenuItem value="PWD Card">PWD Card</MenuItem>
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Account">Account</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                      {t('common.description')} *
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    placeholder={t('support.addMessage')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#000000',
                        '& fieldset': {
                          borderColor: '#E0E0E0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#3498DB',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3498DB',
                        },
                      },
                    }}
                  />
                </Grid>
                
                {/* File Upload Section */}
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                      {t('support.attachFile')} ({t('common.optional') || 'Optional'})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      sx={{ display: 'none' }}
                      id="create-file-upload"
                    />
                    <label htmlFor="create-file-upload">
                      <Button
                        component="span"
                        variant="outlined"
                        startIcon={<AttachFile />}
                        sx={{
                          color: '#3498DB',
                          borderColor: '#3498DB',
                          '&:hover': {
                            backgroundColor: '#3498DB',
                            color: '#FFFFFF',
                            borderColor: '#3498DB'
                          }
                        }}
                      >
                        {t('support.chooseFile')}
                      </Button>
                    </label>
                    
                    {selectedFile && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ color: '#000000' }}
                        >
                          {selectedFile.name}
                        </Typography>
                        <IconButton
                          onClick={handleRemoveFile}
                          size="small"
                          sx={{ color: '#E74C3C' }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                  
                  <Typography 
                    variant="caption" 
                    sx={{ color: '#666666', mt: 1, display: 'block' }}
                  >
                    {t('support.fileFormats')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, backgroundColor: '#FFFFFF' }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ color: '#000000' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitTicket}
              variant="contained"
              disabled={!formData.subject.trim() || !formData.description.trim() || submittingTicket}
              sx={{
                backgroundColor: submittingTicket ? '#7F8C8D' : '#3498DB',
                '&:hover': { backgroundColor: submittingTicket ? '#7F8C8D' : '#2980B9' },
                '&:disabled': { backgroundColor: '#7F8C8D' }
              }}
            >
              {submittingTicket ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1, color: '#FFFFFF' }} />
                  {t('common.submitting') || 'Submitting...'}
                </>
              ) : (
                t('support.createTicket')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Ticket Dialog */}
        <Dialog open={viewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#FFFFFF', color: '#000000', fontWeight: 600 }}>
            Ticket Details - {selectedTicket?.ticket_number}
          </DialogTitle>
          <DialogContent 
            sx={{ 
              backgroundColor: '#FFFFFF !important',
              color: '#000000 !important',
              '& *': { 
                color: '#000000 !important',
                '& .MuiTypography-root': { color: '#000000 !important' },
                '& .MuiChip-root': { color: '#000000 !important' },
                '& .MuiChip-label': { color: '#000000 !important' },
                '& .MuiAvatar-root': { color: '#000000 !important' },
                '& .MuiListItem-root': { color: '#000000 !important' },
                '& .MuiBox-root': { color: '#000000 !important' },
                '& .MuiGrid-root': { color: '#000000 !important' },
                '& p': { color: '#000000 !important' },
                '& span': { color: '#000000 !important' },
                '& div': { color: '#000000 !important' }
              }
            }}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              '--text-color': '#000000'
            }}
          >
            {selectedTicket && (
              <Box sx={{ pt: 1, color: '#000000' }}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ color: '#666666 !important', fontWeight: 500 }}
                      style={{ color: '#666666' }}
                    >
                      Subject
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ fontWeight: 500, color: '#000000 !important', backgroundColor: '#E8F0FE', p: 1, borderRadius: 1 }}
                      style={{ color: '#000000' }}
                    >
                      {selectedTicket.subject}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ color: '#666666 !important', fontWeight: 500 }}
                      style={{ color: '#666666' }}
                    >
                      Status
                    </Typography>
                    <Chip
                      icon={getStatusIcon(selectedTicket.status)}
                      label={selectedTicket.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      sx={{ 
                        backgroundColor: '#E8F0FE',
                        color: '#0b87ac',
                        fontWeight: 600,
                        '& .MuiChip-label': { 
                          color: '#0b87ac' 
                        },
                        '& .MuiChip-icon': {
                          color: '#0b87ac'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ color: '#666666 !important', fontWeight: 500 }}
                      style={{ color: '#666666' }}
                    >
                      Priority
                    </Typography>
                    <Chip
                      label={selectedTicket.priority.toUpperCase()}
                      size="small"
                      sx={{ 
                        backgroundColor: '#E8F0FE',
                        color: '#0b87ac',
                        fontWeight: 600,
                        '& .MuiChip-label': { 
                          color: '#0b87ac' 
                        }
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: '#E0E0E0' }} />

                <Typography 
                  variant="subtitle2" 
                  sx={{ color: '#000000 !important', backgroundColor: '#E8F0FE', p: 1, borderRadius: 1, mb: 1, fontWeight: 500 }}
                  style={{ color: '#000000' }}
                >
                  Requester Information
                </Typography>
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#000000 !important', mb: 1 }}
                    style={{ color: '#000000' }}
                  >
                    <strong>Name:</strong> {selectedTicket.pwd_member?.firstName} {selectedTicket.pwd_member?.lastName} {selectedTicket.pwd_member?.suffix || ''}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#000000 !important', mb: 1 }}
                    style={{ color: '#000000' }}
                  >
                    <strong>Email:</strong> {selectedTicket.pwd_member?.email || 'Not provided'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#000000 !important' }}
                    style={{ color: '#000000' }}
                  >
                    <strong>Phone:</strong> {selectedTicket.pwd_member?.contactNumber || 'Not provided'}
                  </Typography>
                </Box>


                <Typography 
                  variant="subtitle2" 
                  sx={{ color: '#000000 !important', backgroundColor: '#E8F0FE', p: 1, borderRadius: 1, mb: 1, fontWeight: 500 }}
                  style={{ color: '#000000' }}
                >
                  Messages ({selectedTicket.messages?.length || 0})
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto', color: '#000000 !important' }} style={{ color: '#000000' }}>
                  {selectedTicket.messages?.map((message, index) => (
                    <ListItem 
                      key={index} 
                      sx={{ flexDirection: 'column', alignItems: 'flex-start', color: '#000000 !important' }}
                      style={{ color: '#000000' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar 
                          sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', backgroundColor: '#0b87ac', color: 'white !important' }}
                          style={{ color: 'white' }}
                        >
                          {message.sender_type === 'admin' ? 'A' : 'P'}
                        </Avatar>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ fontWeight: 500, color: '#000000 !important' }}
                          style={{ color: '#000000' }}
                        >
                          {message.sender_type === 'admin' ? 'Admin' : 'You'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ ml: 2, color: '#666666 !important' }}
                          style={{ color: '#666666' }}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ ml: 4, backgroundColor: '#F5F5F5', p: 1, borderRadius: 1, color: '#000000 !important' }}
                        style={{ color: '#000000' }}
                      >
                        {message.message}
                      </Typography>
                      
                      {/* Attachment Display */}
                      {message.attachment_path && (
                        <Box sx={{ ml: 4, mt: 1, p: 1, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
                          {/* Image Preview */}
                          {message.attachment_type && message.attachment_type.startsWith('image/') ? (
                            <Box>
                              <img
                                src={api.getStorageUrl(message.attachment_path)}
                                alt={message.attachment_name}
                                style={{
                                  maxWidth: '300px',
                                  maxHeight: '200px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handlePreviewFile(message)}
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <AttachFile sx={{ color: '#0b87ac', fontSize: 14 }} />
                                <Typography 
                                  variant="body2" 
                                  sx={{ color: '#000000', flex: 1, fontSize: '0.8rem' }}
                                >
                                  {message.attachment_name}
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<Visibility />}
                                  onClick={() => handlePreviewFile(message)}
                                  sx={{
                                    color: '#3498DB',
                                    textTransform: 'none',
                                    fontSize: '0.7rem',
                                    mr: 1,
                                    '&:hover': {
                                      backgroundColor: '#3498DB',
                                      color: '#FFFFFF'
                                    }
                                  }}
                                >
                                  Full View
                                </Button>
                                <Button
                                  size="small"
                                  startIcon={<Download />}
                                  onClick={() => handleDownloadAttachment(message.id, message.attachment_name)}
                                  sx={{
                                    color: '#3498DB',
                                    textTransform: 'none',
                                    fontSize: '0.7rem',
                                    '&:hover': {
                                      backgroundColor: '#3498DB',
                                      color: '#FFFFFF'
                                    }
                                  }}
                                >
                                  Download
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            /* File Info for Non-Images */
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachFile sx={{ color: '#0b87ac', fontSize: 16 }} />
                              <Typography 
                                variant="body2" 
                                sx={{ color: '#000000', flex: 1 }}
                              >
                                {message.attachment_name}
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => handlePreviewFile(message)}
                                sx={{
                                  color: '#3498DB',
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  mr: 1,
                                  '&:hover': {
                                    backgroundColor: '#3498DB',
                                    color: '#FFFFFF'
                                  }
                                }}
                              >
                                Preview
                              </Button>
                              <Button
                                size="small"
                                startIcon={<Download />}
                                onClick={() => handleDownloadAttachment(message.id, message.attachment_name)}
                                sx={{
                                  color: '#3498DB',
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: '#3498DB',
                                    color: '#FFFFFF'
                                  }
                                }}
                              >
                                Download
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          {/* Reply Section */}
          {selectedTicket?.status === 'resolved' && (
            <Box sx={{ p: 3, backgroundColor: '#E8F5E8', borderTop: '1px solid #E0E0E0' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#27AE60', fontWeight: 600, textAlign: 'center' }}>
                ✓ Ticket Resolved
              </Typography>
              <Typography variant="body2" sx={{ color: '#2E7D32', textAlign: 'center' }}>
                This ticket has been resolved and archived. No further replies are allowed.
              </Typography>
            </Box>
          )}
          {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'resolved' && (
            <Box sx={{ p: 3, backgroundColor: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2C3E50', fontWeight: 600 }}>
                Reply to Ticket
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Input
                  type="file"
                  onChange={handleReplyFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  sx={{ display: 'none' }}
                  id="reply-file-upload"
                />
                <label htmlFor="reply-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<AttachFile />}
                    sx={{ textTransform: 'none' }}
                  >
                    Attach File (Optional)
                  </Button>
                </label>
                {selectedReplyFile && (
                  <Typography variant="body2" sx={{ color: '#27AE60' }}>
                    {selectedReplyFile.name}
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  onClick={handleCloseViewDialog}
                  sx={{ color: '#000000' }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReply}
                  variant="contained"
                  disabled={!replyText.trim()}
                  startIcon={<Send />}
                  sx={{ 
                    backgroundColor: '#27AE60',
                    '&:hover': { backgroundColor: '#219A52' }
                  }}
                >
                  Send Reply
                </Button>
              </Box>
            </Box>
          )}
          
          <DialogActions sx={{ p: 2, backgroundColor: '#FFFFFF' }}>
            <Button onClick={handleCloseViewDialog} sx={{ color: '#000000' }}>Close</Button>
          </DialogActions>
        </Dialog>

        
      </Box>
      
      {/* Accessibility Settings Floating Button */}
      <AccessibilitySettings />
    </Box>
  );
};

export default PWDMemberSupportDesk;
