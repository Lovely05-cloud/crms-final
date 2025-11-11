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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Badge,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Notifications as NotificationsIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import PWDMemberSidebar from '../shared/PWDMemberSidebar';
import AccessibilitySettings from '../shared/AccessibilitySettings';
import MobileHeader from '../shared/MobileHeader';
import HelpGuide from '../shared/HelpGuide';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/production';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useScreenReader } from '../../hooks/useScreenReader';
import { documentService } from '../../services/documentService';
import { filePreviewService } from '../../services/filePreviewService';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { 
  mainContainerStyles, 
  contentAreaStyles, 
  headerStyles, 
  titleStyles, 
  cardStyles,
  buttonStyles
} from '../../utils/themeStyles';

// Maximum file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

function MemberDocumentUpload() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { announcePageChange } = useScreenReader();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // Preview modal state (A4-style modal like PWDRecords)
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  
  // Legacy preview state (keeping for backward compatibility)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewName, setPreviewName] = useState('');

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
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reflecting, setReflecting] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileMenuToggle = (isOpen) => {
    setIsMobileMenuOpen(isOpen);
  };

  // Reflection cache for faster reloads
  const getCacheKey = () => {
    const uid = currentUser?.id || 'anon';
    return `memberDocReflections:${uid}`;
  };

  const loadReflectionCache = () => {
    try {
      const raw = localStorage.getItem(getCacheKey());
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  };

  const saveReflectionCache = (mapping) => {
    try { localStorage.setItem(getCacheKey(), JSON.stringify(mapping || {})); } catch (_) {}
  };

  // Merge active document types with member's current documents so new types appear
  const mergeActiveTypes = (memberDocs, activeTypes) => {
    const byName = new Map();
    (memberDocs || []).forEach(d => byName.set((d.name || '').toLowerCase(), d));
    const merged = [...(memberDocs || [])];
    (activeTypes || []).forEach(t => {
      const key = (t.name || '').toLowerCase();
      if (!byName.has(key)) {
        merged.push({
          id: t.id,
          name: t.name,
          description: t.description,
          is_required: t.is_required,
          file_types: t.file_types,
          max_file_size: t.max_file_size,
          member_documents: [] // none uploaded yet
        });
      }
    });
    return merged;
  };

  // Fetch data
  const fetchDocuments = async () => {
    try {
      const [memberResp, activeTypes] = await Promise.all([
        api.get('/documents/my-documents'),
        documentService.getActiveDocumentTypes()
      ]);

      let initial;
      if (memberResp && memberResp.success) {
        // Log the response for debugging
        console.log('Member documents API response:', {
          success: memberResp.success,
          documents_count: memberResp.documents?.length || 0,
          documents: memberResp.documents?.map(doc => ({
            name: doc.name,
            memberDocuments_count: doc.memberDocuments?.length || doc.member_documents?.length || 0,
            memberDocuments: doc.memberDocuments || doc.member_documents
          }))
        });
        
        // Normalize memberDocuments (camelCase from backend) to member_documents (snake_case for frontend)
        const normalizedDocs = (memberResp.documents || []).map(doc => ({
          ...doc,
          member_documents: (doc.memberDocuments || doc.member_documents || []).map(md => ({
            ...md,
            id: md.id || null, // Ensure ID is present for migrated documents
            file_path: md.file_path || md.filePath || null
          }))
        }));
        
        console.log('Normalized documents:', normalizedDocs.map(doc => ({
          name: doc.name,
          member_documents_count: doc.member_documents?.length || 0,
          member_documents: doc.member_documents
        })));
        
        initial = mergeActiveTypes(normalizedDocs, activeTypes);
      } else {
        // Fallback: show all active types even if member endpoint fails
        initial = (activeTypes || []).map(t => ({ ...t, member_documents: [] }));
      }

      // Only apply cached reflections if user is NOT a PWD member (still an applicant)
      // PWD members should have migrated documents with IDs from the backend
      const isPWDMember = currentUser?.role === 'PWDMember';
      if (!isPWDMember) {
        // Only apply cached reflections if there are NO real member_documents (with IDs)
        // This should only happen for applicants who haven't been approved yet
        // After approval, documents should be migrated and have real member_documents with IDs
        const cached = loadReflectionCache();
        if (cached && Object.keys(cached).length > 0) {
          initial = initial.map(doc => {
            // Only use reflection if there are NO real member_documents (no ID means it's a fake entry)
            const hasRealMemberDoc = doc.member_documents && doc.member_documents.some(md => md.id !== null && md.id !== undefined);
            if (!hasRealMemberDoc && (!doc.member_documents || doc.member_documents.length === 0)) {
              const cachedPath = cached[doc.name];
              if (cachedPath) {
                return {
                  ...doc,
                  member_documents: [{
                    id: null,
                    status: 'pending',
                    uploaded_at: cached.__uploaded_at || null,
                    notes: 'Reflected from your application upload (cached)',
                    filePath: cachedPath
                  }]
                };
              }
            }
            return doc;
          });
        }
      }
      setDocuments(initial);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/documents/notifications');
      if (response.success) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    // Announce page load
    announcePageChange(t('documents.title'));
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDocuments(),
        fetchNotifications()
      ]);

      // After loading member documents, attempt to reflect any files from the
      // most recent application submission as a fallback baseline
      // BUT ONLY if the user is still an applicant (not yet approved/migrated)
      try {
        // Skip reflection if user is already a PWD member (documents should be migrated)
        const isPWDMember = currentUser?.role === 'PWDMember';
        if (isPWDMember) {
          // User is already a member, so documents should be migrated
          // Don't run reflection - rely on migrated documents from backend
          setReflecting(false);
          setLoading(false);
          return;
        }
        
        setReflecting(true);
        const allApplications = await api.get('/applications');
        const id = currentUser?.id;
        const email = currentUser?.pwd_member?.email || currentUser?.email || null;
        const username = currentUser?.username || null;
        if (Array.isArray(allApplications)) {
          // Pick most recent application for this user by multiple identifiers
          const userApps = allApplications.filter(a => {
            return (
              (id && (a.userID === id || a.userId === id)) ||
              (email && a.email === email) ||
              (username && (a.username === username || a.userName === username))
            );
          });
          const latestApp = userApps.sort((a,b)=>{
            const at = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
            const bt = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
            return bt - at;
          })[0];

          if (latestApp) {
            const docTypes = await documentService.getActiveDocumentTypes();
            // Enhance each required document with an application file if member copy is missing
            const reflectionMap = {};
            setDocuments(prevDocs => prevDocs.map(doc => {
              const fieldName = documentService.getFieldNameFromDocumentName(doc.name);
              const fieldValue = latestApp ? latestApp[fieldName] : null;
              // Check if there's a REAL member_document (with an ID) - don't override migrated documents
              const hasRealMemberDoc = doc.member_documents && doc.member_documents.some(md => md.id !== null && md.id !== undefined);
              const hasAnyMemberDoc = doc.member_documents && doc.member_documents.length > 0;

              // Only create reflection if there's NO real member_document
              // This should only happen for applicants who haven't been approved yet
              // After approval, documents are migrated and have real member_documents with IDs
              if (!hasRealMemberDoc && !hasAnyMemberDoc && fieldValue) {
                // Normalize to a single file path string
                let filePath = null;
                if (Array.isArray(fieldValue)) {
                  filePath = fieldValue[0] || null;
                } else if (typeof fieldValue === 'string') {
                  try {
                    const parsed = JSON.parse(fieldValue);
                    filePath = Array.isArray(parsed) ? (parsed[0] || null) : fieldValue;
                  } catch (_) {
                    filePath = fieldValue;
                  }
                }

                if (filePath) {
                  reflectionMap[doc.name] = filePath;
                  // Attach a pseudo member_document with filePath so it can be viewed
                  // This is only for applicants who haven't been approved yet
                  return {
                    ...doc,
                    member_documents: [
                      {
                        id: null,
                        status: 'pending',
                        uploaded_at: latestApp.submissionDate || latestApp.created_at,
                        notes: 'Reflected from your application upload',
                        filePath
                      }
                    ]
                  };
                }
              }
              return doc;
            }));
            if (Object.keys(reflectionMap).length > 0) {
              reflectionMap.__uploaded_at = latestApp.submissionDate || latestApp.created_at;
              saveReflectionCache(reflectionMap);
            }
          }
        }
      } catch (e) {
        console.log('Skipping application file reflection:', e?.message || e);
      } finally { setReflecting(false); }
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Dialog handlers
  const handleUploadDialogOpen = (document) => {
    setSelectedDocument(document);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleDialogClose = () => {
    setUploadDialogOpen(false);
    setSelectedDocument(null);
    setSelectedFile(null);
  };

  // File upload handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }

    // Validate file size (15MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB. Please select a smaller file.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocument) return;

    // Validate file size before upload
    if (selectedFile.size > MAX_FILE_SIZE) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB. Please select a smaller file.`);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('required_document_id', selectedDocument.id);
      formData.append('document', selectedFile);

      // Don't set Content-Type manually - browser will set it with boundary automatically
      const response = await api.post('/documents/upload', formData);

      if (response.success) {
        setSuccess('Document uploaded successfully!');
        await fetchDocuments();
        handleDialogClose();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      const response = await api.post(`/documents/notifications/${notificationId}/read`);
      if (response.success) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      case 'pending': return <PendingIcon />;
      default: return <DescriptionIcon />;
    }
  };

  const getDocumentStatus = (document) => {
    const memberDoc = document.member_documents?.[0];
    if (!memberDoc) {
      return { status: t('documents.missing'), color: 'error', icon: <WarningIcon /> };
    }
    const statusKey = memberDoc.status === 'approved' ? 'documents.approved' :
                     memberDoc.status === 'rejected' ? 'documents.rejected' :
                     memberDoc.status === 'pending' ? 'common.pending' :
                     memberDoc.status;
    return {
      status: typeof statusKey === 'string' && statusKey.includes('.') ? t(statusKey) : statusKey,
      color: getStatusColor(memberDoc.status),
      icon: getStatusIcon(memberDoc.status)
    };
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  const isImageFile = (fileNameOrUrl) => {
    if (!fileNameOrUrl) return false;
    const name = String(fileNameOrUrl).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => name.includes(ext));
  };

  // Normalize storage path and build full URL safely
  const buildStorageUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path; // already absolute
    // Remove any leading '/'
    let normalized = path.startsWith('/') ? path.substring(1) : path;
    // Don't assume applications/ - use the path as-is if it already contains a folder
    // Only add applications/ if it's a bare filename (no path separators)
    if (!normalized.includes('/')) {
      // This is likely an old application file, but we should avoid this fallback
      // Prefer using the API endpoint for member documents
      console.warn('Using fallback applications/ path for:', normalized);
      normalized = `applications/${normalized}`;
    }
    // Encode each segment to handle spaces/special chars
    const encoded = normalized.split('/').map(seg => encodeURIComponent(seg)).join('/');
    return api.getStorageUrl(encoded);
  };

  const buildFileUrl = (memberDoc) => {
    if (!memberDoc) return null;
    
    // Get base URL
    let url = null;
    // ALWAYS prefer using the API endpoint if there's an ID (migrated documents)
    if (memberDoc.id) {
      url = api.getFilePreviewUrl('document-file', memberDoc.id);
    } else if (memberDoc.file_path || memberDoc.filePath) {
      // For documents without ID (reflection from application), use storage URL
      // But check if it's a migrated path (member-documents/) vs old application path
      const filePath = memberDoc.file_path || memberDoc.filePath;
      
      // If user is a PWD member, they should have migrated documents with IDs
      // If we're here with no ID, it might be a reflection that shouldn't exist
      // Try to use the application-file endpoint as a fallback for old application paths
      if (filePath.includes('member-documents/')) {
        // This is a migrated document path, use storage URL directly
        url = buildStorageUrl(filePath);
      } else if (filePath.includes('uploads/applications/')) {
        // Old application path - try to extract application ID and use application-file endpoint
        // This is a fallback for reflected documents that shouldn't really be shown to members
        console.warn('Attempting to load old application file for member:', filePath);
        // For now, use storage URL but this should ideally not happen for members
        url = buildStorageUrl(filePath);
      } else {
        // Unknown path format
        url = buildStorageUrl(filePath);
      }
    } else {
      return null;
    }
    
    // Add authentication token if available
    const token = localStorage.getItem('auth.token');
    if (token && url) {
      try {
        const tokenData = JSON.parse(token);
        const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
        if (tokenValue) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}token=${tokenValue}`;
        }
      } catch (error) {
        console.warn('Error parsing auth token for file URL:', error);
      }
    }
    
    return url;
  };

  const handlePreviewImage = (imageUrl, fileName) => {
    setPreviewImageUrl(imageUrl);
    setPreviewFileName(fileName);
    setPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewImageUrl('');
    setPreviewFileName('');
  };

  const openPreview = (memberDoc, documentName) => {
    // Use filePreviewService for preview modal to ensure proper token handling
    let fileUrl = null;
    const fileName = memberDoc.file_path || memberDoc.filePath || documentName || 'Document';
    
    if (memberDoc?.id) {
      // Use filePreviewService for member documents with ID
      try {
        fileUrl = filePreviewService.getPreviewUrl('document-file', memberDoc.id);
      } catch (error) {
        console.error('Error getting preview URL:', error);
        // Fallback to buildFileUrl
        fileUrl = buildFileUrl(memberDoc);
      }
    } else if (memberDoc?.filePath || memberDoc?.file_path) {
      // For reflected documents, use buildFileUrl
      fileUrl = buildFileUrl(memberDoc);
    }
    
    if (!fileUrl) {
      console.error('No file URL available for preview');
      return;
    }
    
    // Check if it's an image file
    const isImage = isImageFile(fileName) || isImageFile(fileUrl);
    
    if (isImage) {
      // Open in A4-style modal for images
      handlePreviewImage(fileUrl, fileName);
    } else {
      // For PDFs, open in new tab
      window.open(fileUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <Box sx={mainContainerStyles}>
        <MobileHeader 
          onMenuToggle={handleMobileMenuToggle}
          isMenuOpen={isMobileMenuOpen}
        />
        <PWDMemberSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
        <Box sx={{ ...contentAreaStyles, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={mainContainerStyles}>
      {/* Mobile Header */}
      <MobileHeader 
        onMenuToggle={handleMobileMenuToggle}
        isMenuOpen={isMobileMenuOpen}
      />
      
      {/* PWD Member Sidebar */}
      <PWDMemberSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          ...contentAreaStyles,
          flexGrow: 1,
          ml: { xs: 0, md: '280px' },
          width: { xs: '100%', md: 'calc(100% - 280px)' },
          transition: 'margin-left 0.3s ease-in-out',
          paddingTop: { xs: '56px', md: 0 },
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Page Header */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#000000', 
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
              }}
            >
              {t('documents.title')}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#000000',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {t('documents.uploadDocument')}
            </Typography>
          </Box>

          {/* Help Guide for Documents */}
          <HelpGuide
            title={t('guide.documents.title')}
            type="info"
            steps={[
              {
                title: t('guide.documents.steps.understanding.title'),
                description: t('guide.documents.steps.understanding.description')
              },
              {
                title: t('guide.documents.steps.uploading.title'),
                description: t('guide.documents.steps.uploading.description')
              },
              {
                title: t('guide.documents.steps.checkingStatus.title'),
                description: t('guide.documents.steps.checkingStatus.description')
              },
              {
                title: t('guide.documents.steps.viewingReplacing.title'),
                description: t('guide.documents.steps.viewingReplacing.description')
              },
              {
                title: t('guide.documents.steps.ifRejected.title'),
                description: t('guide.documents.steps.ifRejected.description')
              }
            ]}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Notifications */}
          {unreadNotifications.length > 0 && (
            <Card sx={{ mb: 3, bgcolor: '#fff3cd' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Badge badgeContent={unreadNotifications.length} color="error">
                    <NotificationsIcon color="warning" />
                  </Badge>
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {t('documents.newDocumentRequirements')}
                  </Typography>
                </Box>
                <List>
                  {unreadNotifications.map((notification) => (
                    <ListItem key={notification.id}>
                      <ListItemIcon>
                        <DescriptionIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={notification.title}
                        secondary={notification.message}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          onClick={() => handleMarkNotificationAsRead(notification.id)}
                          size="small"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Documents List */}
          <Grid container spacing={3}>
            {documents.map((document) => {
              const docStatus = getDocumentStatus(document);
              const memberDoc = document.member_documents?.[0];
              
              return (
                <Grid item xs={12} md={6} lg={4} key={document.id}>
                  <Card sx={{ 
                    ...cardStyles, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column' 
                  }}>
                    <CardContent sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      minHeight: '280px'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {document.name}
                        </Typography>
                        <Chip
                          icon={docStatus.icon}
                          label={docStatus.status}
                          color={docStatus.color}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {document.description || t('documents.noDescription')}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('documents.required')}: {document.is_required ? t('common.yes') : t('common.no')}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {t('documents.fileTypes')}: {document.file_types?.join(', ')}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {t('documents.maxSize')}: {document.max_file_size} KB
                        </Typography>
                      </Box>

                      {/* Always show uploaded date section for consistency */}
                      <Box sx={{ mb: 2, minHeight: '40px' }}>
                        {memberDoc ? (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              {t('documents.uploadDate')}: {formatDateMMDDYYYY(memberDoc.uploaded_at)}
                            </Typography>
                            {memberDoc.notes && (
                              <>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {t('documents.notes')}: {memberDoc.notes}
                                </Typography>
                              </>
                            )}
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('common.status')}: {t('common.pending')}
                          </Typography>
                        )}
                      </Box>

                      {/* Button section with consistent height */}
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        flexWrap: 'wrap',
                        mt: 'auto',
                        minHeight: '40px',
                        alignItems: 'flex-end'
                      }}>
                        {memberDoc ? (
                          <>
                            {/* A4-aspect thumbnail */}
                            <Box
                              onClick={() => openPreview(memberDoc, document.name)}
                              sx={{
                                width: 120,
                                height: 170,
                                border: '1px solid #dee2e6',
                                borderRadius: 1,
                                bgcolor: '#fafafa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                '&:hover': { boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }
                              }}
                              title={`Preview ${document.name}`}
                            >
                              {(() => {
                                // Use filePreviewService for member documents with ID to ensure proper authentication
                                let fileUrl = null;
                                try {
                                  if (memberDoc?.id) {
                                    fileUrl = filePreviewService.getPreviewUrl('document-file', memberDoc.id);
                                  } else {
                                    fileUrl = buildFileUrl(memberDoc);
                                  }
                                } catch (error) {
                                  console.warn('Error getting preview URL for thumbnail:', error);
                                  fileUrl = buildFileUrl(memberDoc);
                                }
                                
                                // Check if it's an image based on file path/name, not URL
                                const fileName = memberDoc.file_path || memberDoc.filePath || '';
                                const isImage = isImageFile(fileName) || isImageFile(fileUrl);
                                
                                if (isImage && fileUrl) {
                                  // Add cache-busting parameter to ensure fresh image loads
                                  const cacheBuster = `t=${Date.now()}`;
                                  const separator = fileUrl.includes('?') ? '&' : '?';
                                  const finalUrl = `${fileUrl}${separator}${cacheBuster}`;
                                  
                                  return (
                                    <img
                                      src={finalUrl}
                                      alt={document.name}
                                      style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        display: 'block'
                                      }}
                                      onError={(e) => { 
                                        console.error('Error loading thumbnail image:', finalUrl, memberDoc);
                                        e.target.style.display = 'none';
                                        const parent = e.target.parentElement;
                                        if (parent) {
                                          // Show PDF icon as fallback
                                          parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#7f8c8d" style="font-size: 36px;"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
                                        }
                                      }}
                                    />
                                  );
                                } else {
                                  return <PictureAsPdfIcon sx={{ fontSize: 36, color: '#7f8c8d' }} />;
                                }
                              })()}
                            </Box>
                            <Button
                              size="small"
                              startIcon={<CloudUploadIcon />}
                              onClick={() => handleUploadDialogOpen(document)}
                              variant="outlined"
                            >
                              {t('documents.replace')}
                            </Button>
                          </>
                        ) : reflecting ? (
                        // Skeleton placeholder while reflecting
                            <Box
                              sx={{
                                width: 120,
                                height: 170,
                                borderRadius: 1,
                                bgcolor: '#F0F3F5',
                                border: '1px dashed #d0d7de'
                              }}
                              title="Loading preview..."
                            />
                          ) : (
                          <Button
                            size="small"
                            startIcon={<CloudUploadIcon />}
                            onClick={() => handleUploadDialogOpen(document)}
                            variant="contained"
                            color={document.is_required ? 'error' : 'primary'}
                            fullWidth
                          >
{t('documents.uploadDocument')}
                          </Button>
                          )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {documents.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('documents.requiredDocuments')} {t('common.loading')}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={handleDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#FFFFFF', 
          color: '#2C3E50',
          fontWeight: 'bold',
          borderBottom: '1px solid #E0E0E0'
        }}>
          {t('documents.uploadDocument')}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#FFFFFF', color: '#2C3E50' }}>
          {selectedDocument && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#2C3E50', fontWeight: 'bold' }}>
                {selectedDocument.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#7F8C8D' }}>
                {selectedDocument.description}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                  {t('documents.fileTypes')}: {selectedDocument.file_types?.join(', ')}
                </Typography>
                <br />
                <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                  {t('documents.maxSize')}: {selectedDocument.max_file_size} KB
                </Typography>
              </Box>
            </Box>
          )}
          
          <input
            accept={selectedDocument?.file_types?.map(type => `.${type}`).join(',')}
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ 
                mb: 2,
                borderColor: '#3498DB',
                color: '#3498DB',
                '&:hover': {
                  borderColor: '#2980B9',
                  bgcolor: '#E8F4FD'
                }
              }}
            >
              {t('documents.selectFile')}
            </Button>
          </label>
          
          {selectedFile && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#F8F9FA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
              <Typography variant="body2" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                {t('documents.selected')}: {selectedFile.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                {t('documents.size')}: {(selectedFile.size / 1024).toFixed(2)} KB
              </Typography>
            </Box>
          )}
          
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress sx={{ 
                '& .MuiLinearProgress-bar': { 
                  bgcolor: '#3498DB' 
                } 
              }} />
              <Typography variant="caption" sx={{ mt: 1, color: '#7F8C8D' }}>
                {t('common.loading')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#FFFFFF', 
          borderTop: '1px solid #E0E0E0',
          p: 2
        }}>
          <Button 
            onClick={handleDialogClose} 
            disabled={uploading}
            sx={{ 
              color: '#7F8C8D',
              '&:hover': {
                bgcolor: '#F8F9FA'
              }
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!selectedFile || uploading}
            sx={{
              bgcolor: '#3498DB',
              color: '#FFFFFF',
              '&:hover': {
                bgcolor: '#2980B9'
              },
              '&:disabled': {
                bgcolor: '#BDC3C7'
              }
            }}
          >
            {uploading ? t('common.uploading') || 'Uploading...' : t('common.upload')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Image Preview Modal - A4 Paper Shape (copied from PWDRecords) */}
      <Dialog
        open={previewModalOpen}
        onClose={handleClosePreviewModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            bgcolor: '#FFFFFF',
            // A4 paper aspect ratio: 1:1.414
            aspectRatio: '1/1.414',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Prevent scrolling
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#0b87ac', 
          color: '#FFFFFF', 
          textAlign: 'center',
          py: 1.5,
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden' // Prevent any overflow
        }}>
          <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            {t('documents.documentPreview')}
          </Typography>
          <IconButton
            onClick={handleClosePreviewModal}
            sx={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#FFFFFF'
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ 
          p: 0, 
          bgcolor: '#FFFFFF',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden', // Prevent scrolling
          minHeight: 0, // Allow flexbox to shrink
          '&::-webkit-scrollbar': {
            display: 'none' // Hide scrollbar
          },
          scrollbarWidth: 'none', // Hide scrollbar for Firefox
          msOverflowStyle: 'none' // Hide scrollbar for IE/Edge
        }}>
          {previewImageUrl && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f5f5',
                position: 'relative',
                overflow: 'hidden', // Prevent scrolling
                '&::-webkit-scrollbar': {
                  display: 'none' // Hide scrollbar
                },
                scrollbarWidth: 'none', // Hide scrollbar for Firefox
                msOverflowStyle: 'none' // Hide scrollbar for IE/Edge
              }}
            >
              <img
                src={previewImageUrl}
                alt={previewFileName}
                crossOrigin="anonymous"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'block',
                  margin: 'auto'
                }}
                onError={(e) => {
                  console.error('Error loading image:', previewImageUrl);
                  e.target.style.display = 'none';
                  handleClosePreviewModal();
                }}
              />
            </Box>
          )}
        </DialogContent>
        
      </Dialog>
      
      {/* Accessibility Settings Floating Button */}
      <AccessibilitySettings />
    </Box>
  );
}

export default MemberDocumentUpload;
