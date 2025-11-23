import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  AttachFile,
  Download,
  Delete,
  Menu,
  Close as CloseIcon
} from '@mui/icons-material';
import AdminSidebar from '../shared/AdminSidebar';
import FrontDeskSidebar from '../shared/FrontDeskSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { supportService } from '../../services/supportService';
import { filePreviewService } from '../../services/filePreviewService';
import { api } from '../../services/api';
import websocketService from '../../services/websocketService';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

const AdminSupportDesk = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const [viewDialog, setViewDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [replyText, setReplyText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedReplyFile, setSelectedReplyFile] = useState(null);
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
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await supportService.getTickets();
        const sorted = [...(response || [])].sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || a.createdAt || 0).getTime() || (a.id || 0);
          const bTime = new Date(b.updated_at || b.created_at || b.createdAt || 0).getTime() || (b.id || 0);
          return bTime - aTime;
        });
        setTickets(sorted);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Failed to load support tickets');
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
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


  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await supportService.getTickets();
        const sorted = [...(response || [])].sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || a.createdAt || 0).getTime() || (a.id || 0);
          const bTime = new Date(b.updated_at || b.created_at || b.createdAt || 0).getTime() || (b.id || 0);
          return bTime - aTime;
        });
        setTickets(sorted);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Failed to load support tickets');
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

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
  }, []);

  // Handle notification navigation - auto-open specific ticket
  useEffect(() => {
    if (location.state?.notificationItem) {
      const notificationItem = location.state.notificationItem;
      
      // If it's a support ticket notification, open that ticket
      if (notificationItem.type === 'support_ticket' && notificationItem.ticket_id) {
        // Wait for tickets to load, then find and open the specific ticket
        const timer = setTimeout(() => {
          const ticket = tickets.find(t => t.id === notificationItem.ticket_id);
          if (ticket) {
            handleViewTicket(ticket);
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
          }
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [location.state, tickets]);

  // Auto-scroll when selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selectedTicket]);

  const fetchArchivedTickets = async () => {
    try {
      setLoading(true);
      const response = await supportService.getArchivedTickets();
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

  const handleShowActiveTickets = () => {
    setShowArchive(false);
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await supportService.getTickets();
        const sorted = [...(response || [])].sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || a.createdAt || 0).getTime() || (a.id || 0);
          const bTime = new Date(b.updated_at || b.created_at || b.createdAt || 0).getTime() || (b.id || 0);
          return bTime - aTime;
        });
        setTickets(sorted);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Failed to load support tickets');
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  };

  const handleShowArchivedTickets = () => {
    setShowArchive(true);
    fetchArchivedTickets();
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
    
    // Join WebSocket room for this ticket
    if (websocketService.isConnected()) {
      websocketService.joinTicketRoom(ticket.id);
    }
    
    // Scroll to bottom when viewing a ticket
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  const handleCloseChat = () => {
    // Leave WebSocket room if connected
    if (selectedTicketId && websocketService.isConnected()) {
      websocketService.leaveTicketRoom(selectedTicketId);
    }
    
    setSelectedTicketId(null);
    setSelectedTicket(null);
  };

  const handleReplyTicket = (ticket) => {
    setSelectedTicket(ticket);
    setViewDialog(true);
    setReplyText(''); // Clear any existing reply text
    setSelectedFile(null); // Clear any existing file selection
  };

  const handleCloseViewDialog = () => {
    setViewDialog(false);
    setSelectedTicket(null);
    setReplyText(''); // Clear reply text when closing dialog
    setSelectedFile(null); // Clear selected file when closing dialog
    setSelectedReplyFile(null); // Clear reply file when closing dialog
  };

  const [sendingMessage, setSendingMessage] = useState(false);

  const handleReply = async () => {
    if (replyText.trim() || selectedFile) {
      // Validate file size before sending
      if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
        setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 2MB. Please select a smaller file.`);
        return;
      }

      setSendingMessage(true);
      try {
        setLoading(true);
        
        // Create a temporary message ID for status tracking
        const tempMessageId = `temp_${Date.now()}`;
        
        // Set status to sending
        updateMessageStatus(tempMessageId, 'sending');
        
        await supportService.addMessage(selectedTicket.id, replyText, selectedFile);
        
        // Set status to sent
        updateMessageStatus(tempMessageId, 'sent');
        
        setReplyText(''); // Clear reply text after sending
        setSelectedFile(null); // Clear selected file after sending
        
        // Clear preview
        setPreviewFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        
        // Refresh tickets to get updated data
        const updatedTickets = await supportService.getTickets();
        setTickets(updatedTickets);
        
        // Update the selected ticket with the new message
        const updatedTicket = updatedTickets.find(t => t.id === selectedTicket.id);
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
        
        // Auto-scroll to bottom after sending message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // Simulate message being seen after a delay
        setTimeout(() => {
          updateMessageStatus(tempMessageId, 'seen');
        }, 2000);
        
      } catch (error) {
        console.error('Error sending reply:', error);
        setError('Failed to send reply. Please try again.');
        updateMessageStatus(tempMessageId, 'failed');
      } finally {
        setLoading(false);
        setSendingMessage(false);
      }
    } else {
      setSendingMessage(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }

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
      setError('File type not supported. Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF');
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
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
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
        return;
      }
      
      // Check file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('File type not supported. Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF');
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

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      setLoading(true);
      await supportService.admin.updateStatus(ticketId, status);
      setSuccess(`Ticket status updated to ${status}!`);
      
      // Refresh tickets
      const response = await supportService.getTickets();
      setTickets(response);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update ticket status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePriority = async (ticketId, priority) => {
    try {
      setLoading(true);
      await supportService.admin.updatePriority(ticketId, priority);
      setSuccess(`Ticket priority updated to ${priority}!`);
      
      // Refresh tickets
      const response = await supportService.getTickets();
      setTickets(response);
    } catch (error) {
      console.error('Error updating priority:', error);
      setError('Failed to update ticket priority');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics based on current view (active or archive)
  const currentTickets = showArchive ? archivedTickets : tickets;
  const openTickets = showArchive ? 0 : tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'waiting_for_reply').length;
  const inProgressTickets = showArchive ? 0 : tickets.filter(ticket => ticket.status === 'in_progress').length;
  const resolvedTickets = archivedTickets.length; // Always count all archived tickets
  const totalTickets = tickets.length + archivedTickets.length;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {currentUser?.role === 'FrontDesk' ? <FrontDeskSidebar /> : <AdminSidebar />}
      
      <Box sx={{ 
        flex: 1, 
        ml: '280px', 
        width: 'calc(100% - 280px)', 
        p: 3, 
        bgcolor: '#FFFFFF'
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: { xs: 2, sm: 3 },
          p: { xs: 1.5, sm: 2 },
          bgcolor: '#FFFFFF',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E0E0E0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <SupportAgent sx={{ fontSize: { xs: 28, sm: 32 }, color: '#3498DB' }} />
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              color: '#2C3E50',
              fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' }
            }}>
              Support Desk
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
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #E9ECEF',
              bgcolor: '#FFFFFF',
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
              }
            }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: { xs: 2, sm: 2.5 },
                bgcolor: '#FFFFFF',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Warning sx={{ 
                  fontSize: { xs: 36, sm: 40, md: 44 }, 
                  color: '#E53E3E', 
                  mb: 1.5 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#2D3748',
                  fontSize: { xs: '1.8rem', sm: '2.1rem', md: '2.3rem' },
                  mb: 0.5
                }}>
                  {openTickets}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#718096',
                  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
                  fontWeight: 500
                }}>
                  New Tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #E9ECEF',
              bgcolor: '#FFFFFF',
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
              }
            }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: { xs: 2, sm: 2.5 },
                bgcolor: '#FFFFFF',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Schedule sx={{ 
                  fontSize: { xs: 36, sm: 40, md: 44 }, 
                  color: '#F59E0B', 
                  mb: 1.5 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#2D3748',
                  fontSize: { xs: '1.8rem', sm: '2.1rem', md: '2.3rem' },
                  mb: 0.5
                }}>
                  {inProgressTickets}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#718096',
                  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
                  fontWeight: 500
                }}>
                  In Progress
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #E9ECEF',
              bgcolor: '#FFFFFF',
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
              }
            }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: { xs: 2, sm: 2.5 }, 
                bgcolor: '#FFFFFF',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center' 
              }}>
                <CheckCircle sx={{ fontSize: { xs: 32, sm: 36, md: 40 }, color: '#27AE60', mb: 1 }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: '#2C3E50',
                  fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' }
                }}>
                  {resolvedTickets}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#7F8C8D',
                  fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }
                }}>
                  Resolved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
              border: '1px solid #E9ECEF',
              bgcolor: '#FFFFFF',
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
              }
            }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: { xs: 2, sm: 2.5 }, 
                bgcolor: '#FFFFFF',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center' 
              }}>
                <SupportAgent sx={{ fontSize: { xs: 32, sm: 36, md: 40 }, color: '#3498DB', mb: 1 }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: '#2C3E50',
                  fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' }
                }}>
                  {totalTickets}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#7F8C8D',
                  fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }
                }}>
                  Total Tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
              Support Tickets
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
                Active Tickets
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
                Archive
              </Button>
            </Box>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ 
              overflowX: 'auto',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              maxHeight: '100%'
            }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Ticket #</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Subject</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Requester</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Category</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Priority</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Status</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Messages</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Created</TableCell>
                  <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(showArchive ? archivedTickets : tickets).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#2C3E50' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <SupportAgent sx={{ fontSize: 48, color: '#BDC3C7', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#2C3E50', mb: 1 }}>
                          {showArchive ? 'No archived tickets found' : 'No support tickets found'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                          {showArchive ? 'Resolved tickets will appear here' : 'Support tickets will appear here when created'}
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
                    <TableCell sx={{ 
                      color: '#000000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #E0E0E0',
                      py: 2,
                      px: 2
                    }}>
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#000000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #E0E0E0',
                      py: 2,
                      px: 2
                    }}>
                      {ticket.subject}
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#000000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #E0E0E0',
                      py: 2,
                      px: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ 
                          width: { xs: 20, sm: 24 }, 
                          height: { xs: 20, sm: 24 }, 
                          bgcolor: '#3498DB', 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' }
                        }}>
                          {ticket.pwd_member?.firstName?.charAt(0) || 'P'}
                        </Avatar>
                        <Typography variant="body2" sx={{ 
                          color: '#2C3E50',
                          fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }
                        }}>
                          {ticket.pwd_member ? `${ticket.pwd_member.firstName} ${ticket.pwd_member.lastName} ${ticket.pwd_member.suffix || ''}`.trim() : 'PWD Member'}
                        </Typography>
                      </Box>
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
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${ticket.messages?.length || 0} total`}
                            size="small"
                            sx={{
                              backgroundColor: '#E3F2FD',
                              color: '#3498DB',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </Box>
                        {ticket.messages && ticket.messages.filter(m => !m.is_admin).length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${ticket.messages.filter(m => !m.is_admin).length} from member`}
                              size="small"
                              sx={{
                                backgroundColor: '#FEF5E7',
                                color: '#F39C12',
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                height: 18
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#000000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #E0E0E0',
                      py: 2,
                      px: 2
                    }}>
                      {formatDateMMDDYYYY(ticket.created_at)}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2 }}>
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
            <Paper elevation={0} sx={{
              flex: '0 0 65%',
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
              {/* Chat Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 2,
                pb: 2,
                borderBottom: '1px solid #E0E0E0'
              }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                    {selectedTicket?.subject}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                    Ticket #{selectedTicket?.ticket_number}
                  </Typography>
                  {/* Message Summary */}
                  {selectedTicket?.messages && selectedTicket.messages.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                      <Typography variant="caption" sx={{ color: '#7F8C8D', fontSize: '0.75rem' }}>
                        Total Messages: <strong>{selectedTicket.messages.length}</strong>
                      </Typography>
                      <Box sx={{ width: '1px', height: '12px', bgcolor: '#E0E0E0' }} />
                      <Typography variant="caption" sx={{ color: '#F39C12', fontSize: '0.75rem' }}>
                        From Member: <strong>{selectedTicket.messages.filter(m => !m.is_admin).length}</strong>
                      </Typography>
                      <Box sx={{ width: '1px', height: '12px', bgcolor: '#E0E0E0' }} />
                      <Typography variant="caption" sx={{ color: '#3498DB', fontSize: '0.75rem' }}>
                        From Admin: <strong>{selectedTicket.messages.filter(m => m.is_admin).length}</strong>
                      </Typography>
                    </Box>
                  )}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={selectedTicket?.status?.toUpperCase()} 
                    size="small"
                    sx={{
                      backgroundColor: selectedTicket?.status === 'resolved' ? '#E8F5E8' : '#FFECEC',
                      color: selectedTicket?.status === 'resolved' ? '#27AE60' : '#C0392B',
                      fontWeight: 600
                    }}
                  />
                  <IconButton
                    onClick={handleCloseChat}
                    size="small"
                    sx={{
                      color: '#7F8C8D',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                        color: '#2C3E50'
                      }
                    }}
                    aria-label="Close chat"
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Chat Messages */}
              <Box 
                ref={chatContainerRef}
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  mb: 2,
                  pr: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                  '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '3px' }
                }}>
                {selectedTicket?.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((message, index) => (
                    <Box key={index} sx={{ 
                      display: 'flex', 
                      justifyContent: message.is_admin ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}>
                      <Box sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: message.is_admin ? 'row-reverse' : 'row',
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
                          borderRadius: message.is_admin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
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
                            {message.sender_name || (message.is_admin ? (currentUser?.role === 'FrontDesk' ? 'FrontDesk' : 'Admin') : selectedTicket?.pwd_member ? `${selectedTicket.pwd_member.firstName} ${selectedTicket.pwd_member.lastName}` : 'PWD Member')}
                            {!message.is_admin && (
                              <Chip
                                label="Member"
                                size="small"
                                sx={{
                                  ml: 1,
                                  height: 16,
                                  fontSize: '0.6rem',
                                  backgroundColor: '#FEF5E7',
                                  color: '#F39C12',
                                  fontWeight: 600,
                                  '& .MuiChip-label': {
                                    px: 0.5,
                                    py: 0
                                  }
                                }}
                              />
                            )}
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
                                    src={`http://127.0.0.1:8000/api/support-tickets/messages/${message.id}/image`}
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
                                      console.error('Image failed to load:', `http://127.0.0.1:8000/api/support-tickets/messages/${message.id}/image`);
                                      console.error('Message data:', message);
                                      console.error('Image element:', e.target);
                                      console.error('Error event:', e);
                                      e.target.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('Image loaded successfully:', `http://127.0.0.1:8000/api/support-tickets/messages/${message.id}/image`);
                                    }}
                                    onLoadStart={() => {
                                      console.log('Image loading started:', `http://127.0.0.1:8000/api/support-tickets/messages/${message.id}/image`);
                                    }}
                                  />
                                  <Box sx={{ 
                                    p: 1, 
                                    backgroundColor: '#F8F9FA',
                                    borderTop: '1px solid #E0E0E0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                  }}>
                                    <AttachFile sx={{ color: '#667eea', fontSize: 14 }} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: '#2C3E50',
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
                                        color: '#28a745',
                            textTransform: 'none',
                                        fontSize: '0.65rem',
                                        minWidth: 'auto',
                            px: 1,
                                        py: 0.5,
                                        border: '1px solid #28a745',
                            '&:hover': {
                                          backgroundColor: '#28a745',
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
                                  backgroundColor: '#F8F9FA',
                                  borderRadius: 2,
                                  border: '1px solid #E0E0E0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5
                                }}>
                                  <AttachFile sx={{ color: '#667eea', fontSize: 18 }} />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: '#2C3E50',
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
                                      color: '#667eea',
                                      textTransform: 'none',
                                      fontSize: '0.7rem',
                                      mr: 1,
                                      border: '1px solid #667eea',
                                      '&:hover': {
                                        backgroundColor: '#667eea',
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
                                      color: '#28a745',
                                      textTransform: 'none',
                                      fontSize: '0.7rem',
                                      border: '1px solid #28a745',
                                      '&:hover': {
                                        backgroundColor: '#28a745',
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
                          {message.is_admin && (
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
                  pt: 2
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
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        // File info for non-images
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          backgroundColor: '#F8F9FA',
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
                            <CloseIcon fontSize="small" />
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
                        backgroundColor: dragOver ? '#F8F9FA' : 'transparent',
                        borderColor: dragOver ? '#3498DB' : undefined,
                        transition: 'all 0.2s ease'
                      }
                    }}
                  />
                  
                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={sendingMessage ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Reply />}
                      onClick={handleReply}
                      disabled={(!replyText.trim() && !selectedFile) || sendingMessage}
                      sx={{
                        bgcolor: sendingMessage ? '#95a5a6' : '#3498DB',
                        '&:hover': { bgcolor: sendingMessage ? '#95a5a6' : '#2980B9' }
                      }}
                    >
                      {sendingMessage ? 'Sending...' : 'Reply'}
                    </Button>
                    
                    <input
                      type="file"
                      id="file-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e)}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AttachFile />}
                      onClick={() => document.getElementById('file-upload').click()}
                      sx={{ borderColor: '#3498DB', color: '#3498DB' }}
                    >
                      Attach File
                    </Button>
                    
                    {previewFile && (
                      <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                        {previewFile.name} ready to send
                      </Typography>
                    )}
                  </Box>
                </Box>
          )}
        </Paper>
          )}
        </Box>

        {/* View Ticket Dialog */}
        <Dialog 
          open={viewDialog} 
          onClose={handleCloseViewDialog} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              m: { xs: 1, sm: 2 },
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
              color: '#2C3E50'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#FFFFFF',
            color: '#2C3E50',
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.3rem' },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2.5,
            px: 3,
            borderBottom: '1px solid #E0E0E0'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SupportAgent sx={{ 
                color: '#0b87ac',
                fontSize: { xs: 24, sm: 28 }
              }} />
              <Typography variant="h6" sx={{ 
                color: '#2C3E50',
                fontWeight: 'bold',
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' }
              }}>
                Ticket Details
              </Typography>
            </Box>
            <IconButton 
              onClick={handleCloseViewDialog} 
              sx={{ 
                color: '#2C3E50',
                backgroundColor: '#F2F4F6',
                '&:hover': {
                  backgroundColor: '#E9EDF1'
                },
                borderRadius: 2,
                p: 1
              }}
            >
              ×
            </IconButton>
          </DialogTitle>
          <DialogContent 
            sx={{ 
              backgroundColor: '#FFFFFF',
              p: { xs: 3, sm: 4 }
            }}
          >
            {selectedTicket && (
              <Box sx={{ mt: { xs: 0.5, sm: 1 } }}>
                {/* Ticket Header */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                  <Box sx={{ 
                    background: '#FFFFFF',
                    p: 3,
                    color: '#2C3E50',
                    borderBottom: '1px solid #E0E0E0'
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 2,
                        fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {selectedTicket.subject}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1.5, 
                      flexWrap: 'wrap'
                    }}>
                      <Chip label={selectedTicket.category || 'General'} sx={{ backgroundColor: '#F2F4F6', color: '#2C3E50', fontWeight: 600, px: 1, py: 0.25 }} />
                      <Chip label={(selectedTicket.priority || 'medium').toUpperCase()} sx={{ backgroundColor: '#F2F4F6', color: '#2C3E50', fontWeight: 600, px: 1, py: 0.25 }} />
                      <Chip label={(selectedTicket.status || 'open').toUpperCase()} sx={{ backgroundColor: '#FFECEC', color: '#C0392B', fontWeight: 600, px: 1, py: 0.25 }} />
                    </Box>
                  </Box>
                </Card>

                <Divider sx={{ mb: 3, borderColor: '#BDC3C7' }} />

                {/* Requester Info */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E9ECEF'
                }}>
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#2C3E50',
                        mb: 2,
                        fontSize: '1.1rem'
                      }}
                    >
                      Requester Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 2,
                          backgroundColor: '#F8F9FA',
                          borderRadius: 2,
                          border: '1px solid #E9ECEF'
                        }}>
                          <Person sx={{ 
                            color: '#667eea', 
                            fontSize: 22 
                          }} />
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#6C757D',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            >
                              Name
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: '#2C3E50',
                                fontWeight: 600
                              }}
                            >
                              {selectedTicket.pwd_member ? `${selectedTicket.pwd_member.firstName} ${selectedTicket.pwd_member.lastName} ${selectedTicket.pwd_member.suffix || ''}`.trim() : 'PWD Member'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 2,
                          backgroundColor: '#F8F9FA',
                          borderRadius: 2,
                          border: '1px solid #E9ECEF'
                        }}>
                          <Email sx={{ 
                            color: '#667eea', 
                            fontSize: 22 
                          }} />
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#6C757D',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            >
                              Email
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: '#2C3E50',
                                fontWeight: 600,
                                fontSize: '0.85rem'
                              }}
                            >
                              {selectedTicket.pwd_member?.user?.email || 'Not provided'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 2,
                          backgroundColor: '#F8F9FA',
                          borderRadius: 2,
                          border: '1px solid #E9ECEF'
                        }}>
                          <Phone sx={{ 
                            color: '#667eea', 
                            fontSize: 22 
                          }} />
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#6C757D',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            >
                              Phone
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: '#2C3E50',
                                fontWeight: 600
                              }}
                            >
                              {selectedTicket.pwd_member?.contactNumber || 'Not provided'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>


                 {/* Messages */}
                 {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                  <Card sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E9ECEF'
                  }}>
                     <Box sx={{ p: 3 }}>
                       <Typography 
                         variant="h6" 
                         sx={{ 
                           fontWeight: 600, 
                           color: '#2C3E50',
                           mb: 3,
                           fontSize: '1.1rem'
                         }}
                       >
                         Messages ({selectedTicket.messages.length})
                       </Typography>
                       {selectedTicket.messages.map((message, index) => (
                         <Card key={index} sx={{ 
                           mb: 2, 
                           border: '1px solid #E9ECEF',
                           borderRadius: 2,
                           backgroundColor: message.sender_type === 'admin' ? '#F0F8FF' : '#F8F9FA'
                         }}>
                           <Box sx={{ p: 3 }}>
                             <Box sx={{ 
                               display: 'flex', 
                               justifyContent: 'space-between', 
                               alignItems: 'center',
                               mb: 2,
                               pb: 2,
                               borderBottom: '1px solid #E9ECEF'
                             }}>
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <Avatar sx={{
                                   width: 32,
                                   height: 32,
                                   backgroundColor: message.sender_type === 'admin' ? '#667eea' : '#6C757D',
                                   fontSize: '0.8rem'
                                 }}>
                                   {message.sender_type === 'admin' ? 'A' : 'M'}
                                 </Avatar>
                                 <Box>
                                   <Typography 
                                     variant="body2" 
                                     sx={{ 
                                       fontWeight: 600, 
                                       color: '#2C3E50',
                                       fontSize: '0.95rem'
                                     }}
                                   >
                                     {message.sender_type === 'admin' ? 'Admin' : 'PWD Member'}
                                   </Typography>
                                   <Typography 
                                     variant="caption" 
                                     sx={{ color: '#6C757D' }}
                                   >
                                     {new Date(message.created_at).toLocaleString()}
                                   </Typography>
                                 </Box>
                               </Box>
                             </Box>
                             <Typography 
                               variant="body2" 
                               sx={{ 
                                 color: '#495057',
                                 lineHeight: 1.6,
                                 whiteSpace: 'pre-wrap'
                               }}
                             >
                               {message.message}
                             </Typography>
                             
                             {/* Attachment Display */}
                             {message.attachment_path && (
                               <Box sx={{ 
                                 mt: 2, 
                                 p: 2, 
                                 backgroundColor: '#FFFFFF',
                                 borderRadius: 2,
                                 border: '1px solid #E9ECEF'
                               }}>
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
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                                       <AttachFile sx={{ color: '#667eea', fontSize: 16 }} />
                                       <Typography 
                                         variant="body2" 
                                         sx={{ 
                                           color: '#2C3E50',
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
                                           color: '#667eea',
                                           textTransform: 'none',
                                           fontSize: '0.7rem',
                                           mr: 1,
                                           border: '1px solid #667eea',
                                           '&:hover': {
                                             backgroundColor: '#667eea',
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
                                           color: '#28a745',
                                           textTransform: 'none',
                                           fontSize: '0.7rem',
                                           border: '1px solid #28a745',
                                           '&:hover': {
                                             backgroundColor: '#28a745',
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
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                   <AttachFile sx={{ color: '#667eea', fontSize: 20 }} />
                                   <Typography 
                                     variant="body2" 
                                     sx={{ 
                                       color: '#2C3E50',
                                       flex: 1,
                                       fontWeight: 500
                                     }}
                                   >
                                     {message.attachment_name}
                                   </Typography>
                                   <Button
                                     size="small"
                                     startIcon={<Visibility />}
                                     onClick={() => handlePreviewFile(message)}
                                     sx={{
                                       color: '#667eea',
                                       textTransform: 'none',
                                       fontSize: '0.75rem',
                                       mr: 1,
                                       border: '1px solid #667eea',
                                       '&:hover': {
                                         backgroundColor: '#667eea',
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
                                       color: '#28a745',
                                       textTransform: 'none',
                                       fontSize: '0.75rem',
                                       border: '1px solid #28a745',
                                       '&:hover': {
                                         backgroundColor: '#28a745',
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
                           </Box>
                         </Card>
                       ))}
                     </Box>
                   </Card>
                 )}

                <Divider sx={{ mb: 3, borderColor: '#BDC3C7' }} />

                {/* Reply Section - Only show if ticket is not resolved */}
                {selectedTicket?.status !== 'resolved' && (
                  <Card sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E9ECEF'
                  }}>
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#2C3E50',
                        mb: 3,
                        fontSize: '1.1rem'
                      }}
                    >
                      Reply to Ticket
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#FFFFFF',
                          '& fieldset': {
                            borderColor: '#DDE0E1',
                            borderWidth: 2
                          },
                          '&:hover fieldset': {
                            borderColor: '#667eea',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#667eea',
                          },
                        },
                        '& .MuiOutlinedInput-input': {
                          color: '#2C3E50',
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#6C757D',
                          opacity: 0.8,
                        },
                      }}
                    />
                    
                    {/* File Upload Section */}
                    <Box sx={{ mt: 3 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#6C757D', 
                          mb: 2,
                          fontWeight: 500
                        }}
                      >
                        Attach File (Optional)
                      </Typography>
                    
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                          sx={{ display: 'none' }}
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
                          <Button
                            component="span"
                            variant="outlined"
                            startIcon={<AttachFile />}
                            sx={{
                              color: '#667eea',
                              borderColor: '#667eea',
                              fontWeight: 500,
                              textTransform: 'none',
                              '&:hover': {
                                backgroundColor: '#667eea',
                                color: '#FFFFFF',
                                borderColor: '#667eea'
                              }
                            }}
                          >
                            Choose File
                          </Button>
                        </label>
                        
                        {selectedFile && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            p: 1,
                            backgroundColor: '#F8F9FA',
                            borderRadius: 1,
                            border: '1px solid #E9ECEF'
                          }}>
                            <AttachFile sx={{ color: '#667eea', fontSize: 16 }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#2C3E50',
                                fontWeight: 500
                              }}
                            >
                              {selectedFile.name}
                            </Typography>
                            <IconButton
                              onClick={handleRemoveFile}
                              size="small"
                              sx={{ 
                                color: '#DC3545',
                                '&:hover': {
                                  backgroundColor: '#DC3545',
                                  color: '#FFFFFF'
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6C757D', 
                          mt: 2, 
                          display: 'block',
                          fontSize: '0.75rem'
                        }}
                      >
                        Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF (Max 10MB)
                      </Typography>
                    </Box>
                  </Box>
                </Card>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            p: { xs: 2, sm: 3 }, 
            backgroundColor: selectedTicket?.status === 'resolved' ? '#E8F5E8' : '#FAFBFC',
            borderTop: '1px solid #E9ECEF',
            borderRadius: '0 0 12px 12px',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: { xs: 1, sm: 2 },
            justifyContent: 'flex-end'
          }}>
            {selectedTicket?.status === 'resolved' ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                width: '100%',
                justifyContent: 'center',
                py: 2
              }}>
                <CheckCircle sx={{ color: '#27AE60', fontSize: 24 }} />
                <Typography variant="h6" sx={{ color: '#27AE60', fontWeight: 600 }}>
                  Ticket Resolved
                </Typography>
                <Typography variant="body2" sx={{ color: '#2E7D32' }}>
                  This ticket has been resolved and archived. No further replies are allowed.
                </Typography>
              </Box>
            ) : (
              <>
                <Button 
                  onClick={handleCloseViewDialog} 
                  sx={{ 
                    color: '#6C757D',
                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                    py: { xs: 1.5, sm: 1.25 },
                    px: { xs: 2, sm: 3 },
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: 2,
                    border: '1px solid #E9ECEF',
                    backgroundColor: '#FFFFFF',
                    '&:hover': {
                      backgroundColor: '#F8F9FA',
                      borderColor: '#DDE0E1'
                    }
                  }}
                >
                  Close
                </Button>
                <Button 
                  onClick={handleReply}
                  variant="contained"
                  disabled={!replyText.trim()}
                  startIcon={<Reply />}
                  sx={{
                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                    py: { xs: 1.5, sm: 1.25 },
                    px: { xs: 2, sm: 3 },
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    backgroundColor: '#0b87ac',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(11, 135, 172, 0.3)',
                    '&:hover': {
                      backgroundColor: '#0a6b8a',
                      boxShadow: '0 4px 12px rgba(11, 135, 172, 0.4)'
                    },
                    '&:disabled': {
                      background: '#E9ECEF',
                      color: '#6C757D',
                      boxShadow: 'none'
                    }
                  }}
                >
                  Send Reply
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
        
      </Box>
    </Box>
  );
};

export default AdminSupportDesk;
