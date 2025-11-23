import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Grid, 
  Button,
  Backdrop,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Collapse,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Card,
  Container,
  CardContent,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AdminSidebar from '../shared/AdminSidebar';
import Staff1Sidebar from '../shared/Staff1Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import MobileHeader from '../shared/MobileHeader';
import { applicationService } from '../../services/applicationService';
import pwdMemberService from '../../services/pwdMemberService';
import { api } from '../../services/api';
import { filePreviewService } from '../../services/filePreviewService';
import toastService from '../../services/toastService';
import { documentService } from '../../services/documentService';
  import { 
    mainContainerStyles, 
    contentAreaStyles, 
    headerStyles, 
    titleStyles, 
    cardStyles,
    dialogStyles,
    dialogTitleStyles,
    dialogContentStyles,
    dialogActionsStyles,
    buttonStyles,
    textFieldStyles,
    tableStyles
  } from '../../utils/themeStyles';

// Use localhost-bound storage URL to avoid network interface issues
const STORAGE_BASE_URL = 'http://192.168.18.25:8000/storage';

function PWDRecords() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [tab, setTab] = React.useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [filters, setFilters] = useState({
      search: '',
      barangay: '',
      disability: '',
      ageRange: '',
      status: ''
    });
    const [orderBy, setOrderBy] = useState('');
    const [order, setOrder] = useState('asc');
    const [applications, setApplications] = useState([]);
    const [pwdMembers, setPwdMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [currentDetailPage, setCurrentDetailPage] = useState(1); // Page 0 = header (always visible), Page 1-6 = sections
    const [fileRefreshKey, setFileRefreshKey] = useState(0); // Key to force image refresh
    
    // File viewer modal state
    const [fileViewerOpen, setFileViewerOpen] = useState(false);
    const [viewedFile, setViewedFile] = useState(null);
    const [fileType, setFileType] = useState('image'); // 'image' or 'pdf'
    
    // Document correction modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedDocumentsForCorrection, setSelectedDocumentsForCorrection] = useState([]);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [submittingCorrectionRequest, setSubmittingCorrectionRequest] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentMapping, setDocumentMapping] = useState({});
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  
  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [rejectionConfirmationOpen, setRejectionConfirmationOpen] = useState(false);
    
  // Toast notifications will be used instead of modals

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

    // Sample data for dropdowns
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

    // Fetch document types
    const fetchDocumentTypes = async () => {
      try {
        const types = await documentService.getActiveDocumentTypes();
        setDocumentTypes(types);
        
        const mapping = documentService.getDocumentFieldMapping(types);
        setDocumentMapping(mapping);
      } catch (error) {
        console.error('Error fetching document types:', error);
      }
    };

    // Fetch applications and PWD members from database
    useEffect(() => {
      const fetchData = async () => {
        // Only fetch data if user is authenticated
        if (!currentUser) {
          console.log('User not authenticated, skipping data fetch');
          return;
        }

        setLoading(true);
        setError(null);
        try {
          // Fetch applications pending admin approval and barangay approval
          const adminPendingData = await applicationService.getByStatus('Pending Admin Approval');
          const barangayPendingData = await applicationService.getByStatus('Pending Barangay Approval');
          
          // Combine both types of pending applications
          const allPendingApplications = [...adminPendingData, ...barangayPendingData];
        // Sort most recent submissions first
        const sorted = [...allPendingApplications].sort((a, b) => {
          const aTime = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          const bTime = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
          return bTime - aTime;
        });
        setApplications(sorted);
          
          // Also fetch all applications to get complete data for PWD members
          const allApplicationsResponse = await api.get('/applications');
          const allApplications = allApplicationsResponse || [];
          
          // Fetch PWD members using the service (which now uses fallback endpoint)
          let members = [];
          try {
            const pwdResponse = await pwdMemberService.getAll();
            members = pwdResponse.data || pwdResponse.members || [];
            console.log('PWD members fetched successfully:', members.length);
          } catch (pwdError) {
            console.log('PWD Member service failed, using approved applications directly:', pwdError);
            // If service fails, use approved applications directly
            const approvedApplications = allApplications.filter(app => app.status === 'Approved');
            members = approvedApplications.map(app => ({
              id: app.applicationID,
              userID: app.applicationID,
              firstName: app.firstName,
              lastName: app.lastName,
              middleName: app.middleName,
              birthDate: app.birthDate,
              gender: app.gender,
              disabilityType: app.disabilityType,
              address: app.address,
              contactNumber: app.contactNumber,
              email: app.email,
              barangay: app.barangay,
              emergencyContact: app.emergencyContact,
              emergencyPhone: app.emergencyPhone,
              emergencyRelationship: app.emergencyRelationship,
              status: 'Active'
            }));
          }
          
          // Enhance PWD members with application data
          const enhancedMembers = members.map(member => {
            // Find the corresponding application by email
            const correspondingApp = allApplications.find(app => 
              app.email && member.email && app.email === member.email
            );
            
            return {
              ...member,
              barangay: correspondingApp?.barangay || member.barangay,
              disabilityType: member.disabilityType || correspondingApp?.disabilityType,
              emergencyContact: member.emergencyContact || correspondingApp?.emergencyContact,
              contactNumber: member.contactNumber || correspondingApp?.contactNumber,
              email: member.email || correspondingApp?.email
            };
          });
          
          setPwdMembers(enhancedMembers);
        } catch (err) {
          console.error('Error fetching data:', err);
          setError('Failed to fetch data');
          setApplications([]);
          setPwdMembers([]);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      fetchDocumentTypes();
    }, [currentUser]);

    // Handle notification navigation - auto-open specific application
    useEffect(() => {
      if (location.state?.notificationItem) {
        const notificationItem = location.state.notificationItem;
        
        // If it's a pending application notification, open that application
        if (notificationItem.type === 'pending_application' && notificationItem.applicationID) {
          // Wait for applications to load, then find and open the specific application
          const timer = setTimeout(() => {
            const app = applications.find(a => a.applicationID === notificationItem.applicationID);
            if (app) {
              // Switch to pending applications tab
              setTab(1);
              // Open the application details
              handleViewDetails(app);
              // Clear the state to prevent re-opening on refresh
              window.history.replaceState({}, document.title);
            }
          }, 500);
          
          return () => clearTimeout(timer);
        }
      }
    }, [location.state, applications]);

    const approveDelayRef = React.useRef(null);
    const [approving, setApproving] = useState(false);

    const handleApproveApplication = async (applicationId) => {
      try {
        // Show a backdrop only if the request takes longer than 700ms
        approveDelayRef.current = setTimeout(() => setApproving(true), 700);
        // Use the proper admin approval endpoint that creates PWD Member record
        await api.post(`/applications/${applicationId}/approve-admin`, {
          remarks: 'Approved by Admin'
        });

        // Refresh both applications and PWD members lists
        const applicationsData = await applicationService.getByStatus('Pending Admin Approval');
        const sortedApps = [...applicationsData].sort((a, b) => {
          const aTime = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          const bTime = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
          return bTime - aTime;
        });
        setApplications(sortedApps);
        
        // Refresh PWD members using the service
        const allApplicationsResponse = await api.get('/applications');
        const allApplications = allApplicationsResponse || [];
        
        let members = [];
        try {
          const pwdResponse = await pwdMemberService.getAll();
           members = pwdResponse.data || pwdResponse.members || [];
        } catch (pwdError) {
          console.log('PWD Member service failed, using approved applications directly:', pwdError);
          // If service fails, use approved applications directly
          const approvedApplications = allApplications.filter(app => app.status === 'Approved');
          members = approvedApplications.map(app => ({
            id: app.applicationID,
            userID: app.applicationID,
            firstName: app.firstName,
            lastName: app.lastName,
            middleName: app.middleName,
            birthDate: app.birthDate,
            gender: app.gender,
            disabilityType: app.disabilityType,
            address: app.address,
            contactNumber: app.contactNumber,
            email: app.email,
            barangay: app.barangay,
            emergencyContact: app.emergencyContact,
            emergencyPhone: app.emergencyPhone,
            emergencyRelationship: app.emergencyRelationship,
            status: 'Active'
          }));
        }
        
        const enhancedMembers = members.map(member => {
          const correspondingApp = allApplications.find(app => 
            app.email && member.email && app.email === member.email
          );
          
          return {
            ...member,
            barangay: correspondingApp?.barangay || member.barangay,
            disabilityType: member.disabilityType || correspondingApp?.disabilityType,
            emergencyContact: member.emergencyContact || correspondingApp?.emergencyContact,
            contactNumber: member.contactNumber || correspondingApp?.contactNumber,
            email: member.email || correspondingApp?.email
          };
        });
        
        setPwdMembers(enhancedMembers);
        
        toastService.success('Application approved successfully! PWD Member created and added to masterlist.');
      } catch (err) {
        console.error('Error approving application:', err);
        toastService.error('Failed to approve application: ' + (err.message || 'Unknown error'));
      }
      finally {
        if (approveDelayRef.current) {
          clearTimeout(approveDelayRef.current);
          approveDelayRef.current = null;
        }
        setApproving(false);
      }
    };

    const handleRejectApplication = async (applicationId) => {
      const application = applications.find(app => app.applicationID === applicationId);
      if (!application) return;

      // Set the selected application and open rejection modal
      setSelectedApplication(application);
      setRejectionModalOpen(true);
      setRejectionReason('');
      setCustomReason('');
      setRejectionRemarks('');
    };

    const handleRejectSubmit = () => {
      if (!rejectionReason) {
        toastService.error('Please select a rejection reason.');
        return;
      }
      
      if (rejectionReason === 'other' && !customReason.trim()) {
        toastService.error('Please provide a custom rejection reason.');
        return;
      }
      
      if (!rejectionRemarks.trim()) {
        toastService.error('Please provide remarks for the rejection.');
        return;
      }
      
      // Close rejection modal and show confirmation
      setRejectionModalOpen(false);
      setRejectionConfirmationOpen(true);
    };
    
    // Get formatted rejection reason for display
    const getFormattedRejectionReason = () => {
      if (!rejectionReason) return '';
      
      const reasonMap = {
        'incomplete_information': 'Incomplete Information',
        'incorrect_information': 'Incorrect Information',
        'does_not_meet_criteria': 'Does Not Meet Criteria',
        'other': customReason || 'Other'
      };
      
      return reasonMap[rejectionReason] || rejectionReason;
    };
    
    // Generate preview message (same as email)
    const getPreviewMessage = () => {
      if (!selectedApplication || !rejectionReason) return '';
      
      const formattedReason = getFormattedRejectionReason();
      const refNumber = selectedApplication.referenceNumber || 'N/A';
      const frontendUrl = window.location.origin;
      
      return `Dear ${selectedApplication.firstName} ${selectedApplication.lastName},

We regret to inform you that your PWD (Persons with Disabilities) application has been reviewed and rejected by the Cabuyao PDAO (Persons with Disabilities Affairs Office).

Your Application Reference Number: ${refNumber}

Rejection Reason: ${formattedReason}

Remarks/Instructions:
${rejectionRemarks || '(No additional remarks provided)'}

Your application data and submitted documents have been retained. You do not need to re-apply from scratch.

You can check your application status and re-upload documents at:
${frontendUrl}/check-status/${refNumber}

Thank you for your interest in Cabuyao PDAO RMS.`;
    };

    const handleRejectConfirm = async () => {
      if (!selectedApplication) return;
      
      setRejectionConfirmationOpen(false);
      
      try {
        const rejectionData = {
          remarks: rejectionRemarks,
          rejectionReason: rejectionReason
        };
        
        // If "Other" is selected, include custom reason
        if (rejectionReason === 'other' && customReason.trim()) {
          rejectionData.customReason = customReason.trim();
        }

        await api.post(`/applications/${selectedApplication.applicationID}/reject`, rejectionData);

        // Refresh the applications list
        const data = await applicationService.getByStatus('Pending Admin Approval');
        const sortedData = [...data].sort((a, b) => {
          const aTime = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          const bTime = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
          return bTime - aTime;
        });
        setApplications(sortedData);
        toastService.success('Application rejected successfully! Email notification sent to applicant.');
        
        // Reset rejection state
        setRejectionReason('');
        setCustomReason('');
        setRejectionRemarks('');
        setSelectedApplication(null);
      } catch (err) {
        console.error('Error rejecting application:', err);
        toastService.error('Failed to reject application: ' + (err.message || 'Unknown error'));
      }
    };

    const handleViewDetails = async (application) => {
      // Set the application immediately for quick display
      setSelectedApplication(application);
      setViewDetailsOpen(true);
      
      // Fetch fresh application data to ensure we have the latest document paths
      // Add cache-busting parameter to force fresh data
      try {
        const cacheBuster = `?t=${Date.now()}`;
        const response = await api.get(`/applications${cacheBuster}`);
        if (response && Array.isArray(response)) {
          const freshApplication = response.find(app => app.applicationID === application.applicationID);
          if (freshApplication) {
            console.log('Fresh application data loaded:', {
              applicationID: freshApplication.applicationID,
              medicalCertificate: freshApplication.medicalCertificate,
              idPictures: freshApplication.idPictures,
              barangayCertificate: freshApplication.barangayCertificate
            });
            setSelectedApplication(freshApplication);
            // Force refresh of file URLs by updating the refresh key
            setFileRefreshKey(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error fetching fresh application data:', error);
        // Don't show error to user, just use the cached data
      }
    };

  const handleCloseDetails = () => {
    setViewDetailsOpen(false);
    setSelectedApplication(null);
    setCurrentDetailPage(1); // Reset to first page
  };

    // File viewer functions
    // Normalize file path: remove leading slash and encode each segment to handle spaces
    const normalizeFilePath = (path) => {
      if (!path) return '';
      let normalized = path.startsWith('/') ? path.substring(1) : path;
      const parts = normalized.split('/').map(part => encodeURIComponent(part));
      return parts.join('/');
    };
    // Ensure a default folder for bare filenames
    const ensureStorageFolder = (path) => {
      if (!path) return '';
      return path.includes('/') ? path : `applications/${path}`;
    };

    // Map field names to API fileType parameter
    const getFileTypeFromFieldName = (fieldName) => {
      const fieldToTypeMap = {
        'medicalCertificate': 'medicalCertificate',
        'barangayCertificate': 'barangayCertificate',
        'clinicalAbstract': 'clinicalAbstract',
        'voterCertificate': 'voterCertificate',
        'birthCertificate': 'birthCertificate',
        'wholeBodyPicture': 'wholeBodyPicture',
        'affidavit': 'affidavit',
        'idPictures': 'idPictures' // Special case - handled separately
      };
      return fieldToTypeMap[fieldName] || null;
    };

    // Map frontend field names to backend document type names that API accepts
    const mapFieldNameToDocumentType = (fieldName) => {
      const mapping = {
        'medicalCertificate': 'medicalCertificate',
        'clinicalAbstract': 'clinicalAbstract',
        'voterCertificate': 'voterCertificate',
        'birthCertificate': 'birthCertificate',
        'wholeBodyPicture': 'wholeBodyPicture',
        'affidavit': 'affidavit',
        'barangayCertificate': 'barangayCertificate'
      };
      return mapping[fieldName] || null;
    };

    const handleViewFile = (fileType, fileIndex = 0) => {
      if (!selectedApplication) {
        console.error('No application selected');
        return;
      }
      
      // Map field name to backend document type name
      const documentType = mapFieldNameToDocumentType(fileType) || getFileTypeFromFieldName(fileType);
      
      if (!documentType) {
        console.error(`Document type not supported for field: ${fileType}`);
        toastService.error(`File preview not available for this document type`);
        return;
      }
      
      // Get the file URL using authenticated endpoint
      try {
        // idPictures is now a single file (standardized), but support old array format for backward compatibility
        const fileName = selectedApplication[fileType];
        let actualFileName = fileName;
        
        // Handle backward compatibility: check if it's stored as array (old format)
        if (fileType === 'idPictures' && (Array.isArray(fileName) || (typeof fileName === 'string' && fileName.startsWith('[')))) {
          try {
            const parsed = typeof fileName === 'string' ? JSON.parse(fileName) : fileName;
            if (Array.isArray(parsed) && parsed.length > 0) {
              actualFileName = parsed[0]; // Use first file from old array format
            }
          } catch (e) {
            // Not a valid array, use as-is
          }
        }
        
        // No index parameter needed anymore (idPictures is single file)
        const fileUrl = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, documentType, null);
        
        // Check if it's an image file
        const isImage = isImageFile(actualFileName || fileType);
        
        if (isImage) {
          // Open in modal for images
          handlePreviewImage(fileUrl, fileName || fileType);
        } else {
          // For non-images (PDFs, etc.), open in new tab
          filePreviewService.openPreview('application-file', selectedApplication.applicationID, documentType);
        }
      } catch (error) {
        console.error('Error getting file preview URL:', error);
        toastService.error('Failed to load file preview');
      }
    };

    // Get file URL for thumbnail display - use authenticated API endpoint
    const getFileUrl = (fieldName, index = null) => {
      if (!selectedApplication || !selectedApplication[fieldName]) return null;
      
      // Always use authenticated API endpoint for thumbnails
      const fileType = getFileTypeFromFieldName(fieldName);
      if (fileType && selectedApplication.applicationID) {
        try {
          // idPictures is now a single file (standardized), no index parameter needed
          const url = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, fileType, null);
          
          // Validate that we got an authenticated URL (should contain /api/application-file/)
          if (!url || !url.includes('/api/application-file/')) {
            console.error('Invalid file URL - not using authenticated endpoint:', url);
            return null;
          }
          
          return url;
        } catch (error) {
          console.error('Error getting authenticated file URL:', error);
          return null; // Don't fallback to storage URL - return null instead
        }
      }
      
      // If fileType mapping fails, return null instead of using storage URL
      console.warn(`File type mapping failed for field: ${fieldName}`);
      return null;
    };

    // Check if file is an image
    const isImageFile = (fileName) => {
      if (!fileName) return false;
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const lowerFileName = fileName.toLowerCase();
      return imageExtensions.some(ext => lowerFileName.includes(ext));
    };

    // Get file icon for non-image files
    const getFileIcon = (fileName) => {
      if (!fileName) return '📄';
      const lowerFileName = fileName.toLowerCase();
      if (lowerFileName.includes('.pdf')) return '📄';
      if (lowerFileName.includes('.doc') || lowerFileName.includes('.docx')) return '📝';
      if (lowerFileName.includes('.txt')) return '📄';
      return '📄';
    };

    const handleCloseFileViewer = () => {
      setFileViewerOpen(false);
      setViewedFile(null);
    };

    // Document correction handlers
    const handleRequestCorrection = () => {
      setCorrectionModalOpen(true);
      setSelectedDocumentsForCorrection([]);
      setCorrectionNotes('');
    };

    const handleCloseCorrectionModal = () => {
      setCorrectionModalOpen(false);
      setSelectedDocumentsForCorrection([]);
      setCorrectionNotes('');
    };

    const handleDocumentSelection = (documentType) => {
      setSelectedDocumentsForCorrection(prev => {
        if (prev.includes(documentType)) {
          return prev.filter(doc => doc !== documentType);
        } else {
          return [...prev, documentType];
        }
      });
    };

  const handleSubmitCorrectionRequest = async () => {
    if (selectedDocumentsForCorrection.length === 0) {
      toastService.error('Please select at least one document that needs correction.');
      return;
    }

    // Show confirmation dialog using toast service
    const documentLabels = documentService.getDocumentLabels(documentMapping);

    const selectedDocumentsList = selectedDocumentsForCorrection.map(doc => `• ${documentLabels[doc]}`).join('\n');
    
    const confirmed = await toastService.confirmAsync(
      'Send Correction Request?',
      `Are you sure you want to send a correction request for ${selectedDocumentsForCorrection.length} document(s)?\n\n` +
      `Selected documents:\n${selectedDocumentsList}\n\n` +
      `This will send an email notification to the applicant with a secure link to re-upload the selected documents.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmittingCorrectionRequest(true);
      
      // Debug: Log the data being sent
      const requestData = {
        applicationId: String(selectedApplication.applicationID),
        documentsToCorrect: selectedDocumentsForCorrection,
        notes: correctionNotes,
        requestedBy: String(currentUser.userID),
        requestedByName: currentUser.username || currentUser.email
      };
      
      console.log('Sending correction request with data:', requestData);
      console.log('Current user:', currentUser);

      // Call API to create correction request
      await api.post('/applications/correction-request', requestData);

      toastService.success('Correction request sent! The applicant has been notified via email to re-upload the selected documents.');
      handleCloseCorrectionModal();
    } catch (error) {
      console.error('Error submitting correction request:', error);
      toastService.error('Failed to send correction request. Please try again.');
    } finally {
      setSubmittingCorrectionRequest(false);
    }
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

    const handlePrintApplication = () => {
      const printWindow = window.open('', '_blank');
      const app = selectedApplication;
      
      // Get formatted date for print
      const printDate = formatDateMMDDYYYY(new Date().toISOString());

      // Format date for display
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };

      // Calculate age from birth date
      const calculateAge = (birthDate) => {
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
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PWD Application Details - ${app?.firstName} ${app?.lastName}</title>
            <meta charset="UTF-8">
            <style>
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
              }
              
              body { 
                font-family: 'Arial', sans-serif; 
                line-height: 1.6; 
                color: #333; 
                background: white;
                padding: 20px;
                font-size: 12px;
              }
              
              .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white;
              }
              
              /* Header Styles */
              .header { 
                text-align: center; 
                border-bottom: 3px solid #0b87ac; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
              }
              
              .header h1 { 
                color: #0b87ac; 
                font-size: 24px; 
                font-weight: bold; 
                margin-bottom: 8px; 
                letter-spacing: 2px;
                text-transform: uppercase;
              }
              
              .header h2 { 
                color: #2c3e50; 
                font-size: 18px; 
                margin-bottom: 15px; 
                font-weight: 600;
              }
              
              .header-info { 
                display: flex; 
                justify-content: space-between; 
                margin-top: 15px; 
                font-size: 11px; 
                color: #666; 
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
              }
              
              /* Section Styles */
              .section { 
                margin-bottom: 25px; 
                page-break-inside: avoid; 
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
              }
              
              .section-title { 
                background: #0b87ac; 
                color: white; 
                padding: 12px 15px; 
                font-size: 14px; 
                font-weight: bold; 
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .section-content { 
                padding: 15px; 
                background: white;
              }
              
              /* Field Styles */
              .field-row { 
                display: flex; 
                margin-bottom: 12px; 
                border-bottom: 1px dotted #ddd; 
                padding-bottom: 8px; 
                align-items: flex-start;
              }
              
              .field-label { 
                font-weight: bold; 
                color: #2c3e50; 
                min-width: 180px; 
                margin-right: 20px; 
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .field-value { 
                color: #333; 
                flex: 1; 
                font-size: 12px;
                line-height: 1.4;
              }
              
              /* Status Styles */
              .status { 
                display: inline-block; 
                padding: 4px 12px; 
                border-radius: 20px; 
                font-weight: bold; 
                font-size: 10px; 
                text-transform: uppercase; 
                letter-spacing: 0.5px;
              }
              
              .status-pending { background: #f39c12; color: white; }
              .status-approved { background: #27ae60; color: white; }
              .status-rejected { background: #e74c3c; color: white; }
              
              /* Footer */
              .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 10px; 
                color: #666; 
                border-top: 2px solid #0b87ac; 
                padding-top: 15px; 
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
              }
              
              /* Print Specific Styles */
              @media print {
                body { 
                  padding: 15px; 
                  font-size: 11px;
                }
                .section { 
                  page-break-inside: avoid; 
                  margin-bottom: 20px;
                }
                .header { 
                  page-break-after: avoid; 
                }
                .field-row {
                  page-break-inside: avoid;
                }
                .container {
                  max-width: 100%;
                }
              }
              
              /* Grid Layout for better organization */
              .grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
              }
              
              .grid-3 {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
              }
              
              @media print {
                .grid-2, .grid-3 {
                  display: block;
                }
                .grid-2 > *, .grid-3 > * {
                  margin-bottom: 10px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <!-- Header -->
            <div class="header">
              <h1>CABUYAO PDAO RMS</h1>
              <h2>PWD Application Details</h2>
                <div class="header-info">
                  <span><strong>Application ID:</strong> ${app?.applicationID || 'N/A'}</span>
                  <span><strong>Print Date:</strong> ${printDate}</span>
            </div>
              </div>

              <!-- Personal Information -->
              <div class="section">
                <div class="section-title">Personal Information</div>
                <div class="section-content">
                  <div class="grid-2">
                    <div class="field-row">
                      <span class="field-label">Full Name:</span>
                      <span class="field-value">${(() => {
                        const parts = [];
                        if (app?.firstName) parts.push(app.firstName);
                        if (app?.middleName && app.middleName.trim().toUpperCase() !== 'N/A') parts.push(app.middleName);
                        if (app?.lastName) parts.push(app.lastName);
                        if (app?.suffix) parts.push(app.suffix);
                        return parts.join(' ');
                      })()}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Date of Birth:</span>
                      <span class="field-value">${formatDate(app?.birthDate)} (Age: ${calculateAge(app?.birthDate)})</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Gender:</span>
                      <span class="field-value">${app?.gender || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Civil Status:</span>
                      <span class="field-value">${app?.civilStatus || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Contact Number:</span>
                      <span class="field-value">${app?.contactNumber || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Email Address:</span>
                      <span class="field-value">${app?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Address Information -->
              <div class="section">
                <div class="section-title">Address Information</div>
                <div class="section-content">
                  <div class="field-row">
                    <span class="field-label">Home Number/Street:</span>
                    <span class="field-value">${(() => {
                      const addressParts = [];
                      if (app?.address) addressParts.push(app.address);
                      if (app?.barangay && app.barangay !== 'N/A') addressParts.push(app.barangay);
                      const city = app?.city && app.city !== 'N/A' ? app.city : 'Cabuyao';
                      addressParts.push(city);
                      const province = app?.province && app.province !== 'N/A' ? app.province : 'Laguna';
                      addressParts.push(province);
                      if (app?.postalCode && app.postalCode !== 'N/A') addressParts.push(app.postalCode);
                      return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                    })()}</span>
                  </div>
                </div>
              </div>

              <!-- Disability Information -->
              <div class="section">
                <div class="section-title">Disability Information</div>
                <div class="section-content">
                  <div class="grid-3">
                    <div class="field-row">
                      <span class="field-label">Disability Type:</span>
                      <span class="field-value">${app?.disabilityType || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Disability Cause:</span>
                      <span class="field-value">${app?.disabilityCause || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Severity Level:</span>
                      <span class="field-value">${app?.severityLevel || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Emergency Contact -->
              <div class="section">
                <div class="section-title">Emergency Contact</div>
                <div class="section-content">
                  <div class="grid-3">
                    <div class="field-row">
                      <span class="field-label">Contact Name:</span>
                      <span class="field-value">${app?.emergencyContact || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Contact Number:</span>
                      <span class="field-value">${app?.emergencyPhone || 'N/A'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Relationship:</span>
                      <span class="field-value">${app?.emergencyRelationship || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Application Status -->
              <div class="section">
                <div class="section-title">Application Status</div>
                <div class="section-content">
                  <div class="field-row">
                    <span class="field-label">Current Status:</span>
                    <span class="field-value">
                      <span class="status status-${(app?.status || 'pending').toLowerCase()}">
                        ${app?.status || 'Pending'}
                      </span>
                    </span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Submission Date:</span>
                    <span class="field-value">${formatDate(app?.submissionDate)}</span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p><strong>This document was generated by Cabuyao PDAO RMS</strong></p>
                <p>Generated on: ${new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p>For inquiries, please contact the Cabuyao PDAO office.</p>
                <p style="margin-top: 10px; font-size: 9px; color: #999;">
                  This is an official document. Please keep it secure.
                </p>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
      printWindow.print();
        printWindow.close();
      }, 500);
    };

    // Helper function to calculate age from birth date
    const getAgeFromBirthDate = (birthDate) => {
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

    // Helper function to convert text to proper case
    const toProperCase = (text) => {
      if (!text) return '';
      return text.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    };

    // Transform PWD members data for display
    const rows = useMemo(() => {
      return pwdMembers.map((member, index) => ({
        id: member.id,
        pwdId: `PWD-${member.userID}`,
        name: `${toProperCase(member.firstName || '')} ${toProperCase(member.lastName || '')} ${member.suffix || ''}`.trim(),
        age: getAgeFromBirthDate(member.birthDate),
        barangay: member.barangay || 'Not specified',
        disability: member.disabilityType || 'Not specified',
        guardian: member.emergencyContact || 'Not provided',
        contact: member.contactNumber || 'Not provided',
        status: 'Active' // Default status since it's not in the API response
      }));
    }, [pwdMembers]);

    // Filter the rows based on current filters
    const filteredRows = useMemo(() => {
      // Use different data based on selected tab
      const dataToFilter = tab === 0 ? rows : applications;
      
      // Check if any filters are active
      const hasAnyFilters = Object.values(filters).some(value => value !== '');
      
      // Filter the data if filters are active
      const filtered = hasAnyFilters ? dataToFilter.filter(row => {
        // Search filter
        const matchesSearch = !filters.search || 
          (row.name && row.name.toLowerCase().includes(filters.search.toLowerCase())) ||
          (row.pwdId && row.pwdId.toLowerCase().includes(filters.search.toLowerCase())) ||
          (row.guardian && row.guardian.toLowerCase().includes(filters.search.toLowerCase())) ||
          (row.contact && row.contact.toLowerCase().includes(filters.search.toLowerCase())) ||
          (row.firstName && `${row.firstName} ${row.lastName} ${row.suffix || ''}`.toLowerCase().includes(filters.search.toLowerCase())) ||
          (row.email && row.email.toLowerCase().includes(filters.search.toLowerCase()));

        // Barangay filter
        const matchesBarangay = !filters.barangay || 
          (row.barangay && row.barangay === filters.barangay) ||
          (row.address && row.address.toLowerCase().includes(filters.barangay.toLowerCase())) ||
          (row.barangay === 'Not specified' && filters.barangay === 'Not specified');
        
              // Disability filter - handle both masterlist and application data
        let matchesDisability = true;
        if (filters.disability) {
          if (tab === 0) {
            // Masterlist data - support both disability and disabilityType fields, case-insensitive and partial match
            const rowDisability = (row.disabilityType || row.disability || '').toString().toLowerCase();
            const filterDisability = filters.disability.toLowerCase();
            matchesDisability = rowDisability === filterDisability ||
                                rowDisability.includes(filterDisability) ||
                                filterDisability.includes(rowDisability);
          } else {
            // Application data - handle case sensitivity and partial matches
            const rowDisability = row.disabilityType ? row.disabilityType.toLowerCase() : '';
            const filterDisability = filters.disability.toLowerCase();
            
            // For "Visual Impairment" filter, match "Visual" in database
            // For "Physical Disability" filter, match "Physical" or "physical" in database
            if (filterDisability.includes('visual')) {
              matchesDisability = rowDisability.includes('visual');
            } else if (filterDisability.includes('physical')) {
              matchesDisability = rowDisability.includes('physical');
            } else {
              // For other disabilities, check for exact match or partial match
              matchesDisability = rowDisability === filterDisability || 
                                  rowDisability.includes(filterDisability) ||
                                  filterDisability.includes(rowDisability);
            }
            
            console.log(`Disability check: "${rowDisability}" vs "${filterDisability}" = ${matchesDisability}`);
          }
        }
        
        // Status filter
        const matchesStatus = !filters.status || 
          (row.status && row.status === filters.status) ||
          (row.applicationStatus && row.applicationStatus === filters.status);

        // Age range filter (only for masterlist data)
        let matchesAgeRange = true;
        if (filters.ageRange && row.age) {
          const [min, max] = filters.ageRange.split('-').map(Number);
          if (filters.ageRange === 'Under 18') {
            matchesAgeRange = row.age < 18;
          } else if (filters.ageRange === 'Over 65') {
            matchesAgeRange = row.age > 65;
          } else {
            matchesAgeRange = row.age >= min && row.age <= max;
          }
        }

        return matchesSearch && matchesBarangay && matchesDisability && matchesAgeRange && matchesStatus;
      }) : [...dataToFilter];
    
    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue = a[orderBy];
        let bValue = b[orderBy];
        
        // Handle nested properties
        if (orderBy === 'pwdId' && tab === 0) {
          aValue = a.pwdId || '';
          bValue = b.pwdId || '';
        } else if (orderBy === 'name' && tab === 0) {
          aValue = a.name || '';
          bValue = b.name || '';
        } else if (orderBy === 'firstName' && tab === 1) {
          aValue = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          bValue = `${b.firstName || ''} ${b.lastName || ''}`.trim();
        } else if (orderBy === 'submissionDate' && tab === 1) {
          aValue = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          bValue = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        }
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Handle number comparison for age
        if (orderBy === 'age') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        }
        
        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
    }, [rows, applications, filters, tab, orderBy, order]);

    const handleFilterChange = (field, value) => {
      setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleRequestSort = (property) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
    };

    const clearFilters = () => {
      setFilters({
        search: '',
        barangay: '',
        disability: '',
        ageRange: '',
        status: ''
      });
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileMenuToggle = (isOpen) => {
    setIsMobileMenuOpen(isOpen);
  };

    // Check if user is authenticated and is an admin
    if (!currentUser) {
      return (
        <Box sx={{ ...mainContainerStyles, bgcolor: 'white', p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#E74C3C' }}>
            Please log in to access this page.
          </Typography>
        </Box>
      );
    }

    if (currentUser.role !== 'Admin' && currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Staff1') {
      return (
        <Box sx={{ ...mainContainerStyles, bgcolor: 'white', p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#E74C3C' }}>
            Access denied. Admin privileges required.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={mainContainerStyles}>
        {/* Mobile Header */}
        {/* <MobileHeader 
          onMenuToggle={handleMobileMenuToggle}
          isMenuOpen={isMobileMenuOpen}
        /> */}
        
        {/* Role-based Sidebar with Toggle */}
        {currentUser?.role === 'Staff1' ? (
          <Staff1Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
        ) : (
          <AdminSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            ml: { xs: 0, md: '280px' }, // Hide sidebar margin on mobile
            width: { xs: '100%', md: 'calc(100% - 280px)' },
            transition: 'margin-left 0.3s ease-in-out',
            // Adjust for mobile header
            // paddingTop: { xs: '56px', md: 0 }, // Mobile header height
            p: { xs: 1, sm: 2, md: 3 } // Responsive padding
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 1 } }}>
            <Paper sx={{ 
              ...cardStyles, 
              p: 3, 
              bgcolor: 'white',
              borderRadius: 3
            }}>
              {/* Header */}
              <Box sx={{ mb: { xs: 2, md: 3 }, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#0b87ac',
                  mb: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
                }}>
                  PWD Member Records
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: '#7F8C8D',
                  fontWeight: 500,
                  fontSize: { xs: '0.9rem', md: '1rem' }
                }}>
                  Manage and track PWD member information and applications
                </Typography>
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Tabs 
                    value={tab} 
                    onChange={(_, v) => setTab(v)} 
                    sx={{ 
                      minHeight: 40,
                      '& .MuiTab-root': {
                        color: '#0b87ac',
                        fontWeight: 600,
                        textTransform: 'none',
                        bgcolor: 'transparent',
                        borderRadius: '8px 8px 0 0',
                        mx: 0.5,
                        px: 3,
                        border: '1px solid #E0E0E0',
                        '&:hover': {
                          bgcolor: '#F8FAFC',
                          color: '#0b87ac'
                        },
                        '&.Mui-selected': {
                          color: '#FFFFFF !important',
                          fontWeight: 700,
                          bgcolor: '#0b87ac !important',
                          border: '1px solid #0b87ac'
                        }
                      },
                      '& .MuiTabs-indicator': {
                        display: 'none'
                      }
                    }}
                  >
                    <Tab label="Masterlist" />
                    <Tab label="Pending Application" />
                  </Tabs>
                </Grid>
                <Grid item>
                  <Button 
                    startIcon={<PrintIcon />} 
                    variant="outlined" 
                    onClick={() => {
                      const listArea = document.getElementById('pwd-masterlist-table');
                      if (!listArea) return;
                      const printWindow = window.open('', '_blank');
                      const printDate = formatDateMMDDYYYY(new Date().toISOString());
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>PWD Masterlist</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 16px; }
                              h2 { text-align: center; }
                              table { width: 100%; border-collapse: collapse; }
                              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                              th { background: #f5f5f5; }
                              @media print { body { margin: 0; } }
                            </style>
                          </head>
                          <body>
                            <h2>PWD MASTERLIST</h2>
                            <p>Date: ${printDate}</p>
                            ${listArea.outerHTML}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }}
                    sx={{ 
                      textTransform: 'none',
                      color: '#FFFFFF',
                      bgcolor: '#0b87ac',
                      borderColor: '#0b87ac',
                      '&:hover': {
                        borderColor: '#0a6b8a',
                        bgcolor: '#0a6b8a',
                        color: '#FFFFFF'
                      }
                    }}
                  >
                    Print List
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    startIcon={<FilterListIcon />} 
                    variant={showFilters ? "contained" : "outlined"}
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{ 
                      textTransform: 'none',
                      bgcolor: showFilters ? '#27AE60' : '#FFFFFF',
                      color: showFilters ? '#FFFFFF' : '#0b87ac',
                      borderColor: '#0b87ac',
                      '&:hover': {
                        bgcolor: showFilters ? '#229954' : '#F8FAFC',
                        borderColor: '#0b87ac',
                        color: showFilters ? '#FFFFFF' : '#0b87ac'
                      }
                    }}
                  >
                    Filters
                  </Button>
                </Grid>
                <Grid item xs>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                    <TextField 
                      size="small" 
                      placeholder="Search table" 
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      sx={{ 
                        width: { xs: '100%', sm: 250, md: 300 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: '#FFFFFF',
                          '& fieldset': { borderColor: '#E0E0E0' },
                          '&:hover fieldset': { borderColor: '#BDC3C7' },
                          '&.Mui-focused fieldset': { borderColor: '#0b87ac' },
                        },
                        '& .MuiInputBase-input': {
                          color: '#0b87ac',
                          fontSize: '0.9rem',
                          '&::placeholder': {
                            color: '#95A5A6',
                            opacity: 1
                          }
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" sx={{ color: '#7F8C8D' }}>
                              <SearchIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Filter Section */}
              <Collapse in={showFilters}>
                <Box sx={{ mt: 3, p: { xs: 2, md: 4 }, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E0E0E0', m: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
                            bgcolor: '#FDF2F2',
                            color: '#C0392B'
                          }
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </Box>
                  
                                                                      <Grid container spacing={4}>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ color: '#0b87ac', fontWeight: 600 }}>Barangay</InputLabel>
                          <Select
                            value={filters.barangay}
                            onChange={(e) => handleFilterChange('barangay', e.target.value)}
                            label="Barangay"
                            sx={{
                              bgcolor: '#FFFFFF',
                              minWidth: 200,
                              '& .MuiSelect-select': {
                                color: '#0b87ac',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                py: 1.5
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E0E0E0'
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#BDC3C7'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0b87ac'
                              },
                              '& .MuiPaper-root': {
                                bgcolor: '#FFFFFF'
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: '#FFFFFF',
                                  minWidth: 250,
                                  '& .MuiMenuItem-root': {
                                    color: '#0b87ac',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    py: 1.5,
                                    '&:hover': {
                                      bgcolor: '#F8FAFC'
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: '#E3F2FD',
                                      color: '#1976D2',
                                      '&:hover': {
                                        bgcolor: '#E3F2FD'
                                      }
                                    }
                                  }
                                }
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
                              bgcolor: '#FFFFFF',
                              minWidth: 200,
                              '& .MuiSelect-select': {
                                color: '#0b87ac',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                py: 1.5
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E0E0E0'
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#BDC3C7'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0b87ac'
                              },
                              '& .MuiPaper-root': {
                                bgcolor: '#FFFFFF'
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: '#FFFFFF',
                                  minWidth: 250,
                                  '& .MuiMenuItem-root': {
                                    color: '#0b87ac',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    py: 1.5,
                                    '&:hover': {
                                      bgcolor: '#F8FAFC'
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: '#E3F2FD',
                                      color: '#1976D2',
                                      '&:hover': {
                                        bgcolor: '#E3F2FD'
                                      }
                                    }
                                  }
                                }
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
                              bgcolor: '#FFFFFF',
                              minWidth: 200,
                              '& .MuiSelect-select': {
                                color: '#0b87ac',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                py: 1.5
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E0E0E0'
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#BDC3C7'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0b87ac'
                              },
                              '& .MuiPaper-root': {
                                bgcolor: '#FFFFFF'
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: '#FFFFFF',
                                  minWidth: 250,
                                  '& .MuiMenuItem-root': {
                                    color: '#0b87ac',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    py: 1.5,
                                    '&:hover': {
                                      bgcolor: '#F8FAFC'
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: '#E3F2FD',
                                      color: '#1976D2',
                                      '&:hover': {
                                        bgcolor: '#E3F2FD'
                                      }
                                    }
                                  }
                                }
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
                              bgcolor: '#FFFFFF',
                              minWidth: 200,
                              '& .MuiSelect-select': {
                                color: '#0b87ac',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                py: 1.5
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E0E0E0'
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#BDC3C7'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0b87ac'
                              },
                              '& .MuiPaper-root': {
                                bgcolor: '#FFFFFF'
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: '#FFFFFF',
                                  minWidth: 250,
                                  '& .MuiMenuItem-root': {
                                    color: '#0b87ac',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    py: 1.5,
                                    '&:hover': {
                                      bgcolor: '#F8FAFC'
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: '#E3F2FD',
                                      color: '#1976D2',
                                      '&:hover': {
                                        bgcolor: '#E3F2FD'
                                      }
                                    }
                                  }
                                }
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
                  </Grid>

                                  {/* Active Filters Display */}
                  {hasActiveFilters && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" sx={{ color: '#0b87ac', mb: 2, fontWeight: 600 }}>
                        Active Filters:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {Object.entries(filters).map(([key, value]) => {
                          if (value && key !== 'search') {
                            return (
                              <Chip
                                key={key}
                                label={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`}
                                onDelete={() => handleFilterChange(key, '')}
                                size="small"
                                sx={{ 
                                  bgcolor: '#0b87ac', 
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

              <Box sx={{ borderTop: '2px solid #BDC3C7', mt: 3, mx: 1 }} />

              {/* Results Summary */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mx: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: '#FFFFFF', 
                  fontWeight: 700, 
                  bgcolor: '#0b87ac',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  fontSize: '0.9rem'
                }}>
                  Showing {filteredRows.length} of {tab === 0 ? rows.length : applications.length} records
                  {hasActiveFilters && ' (filtered)'}
                </Typography>
              </Box>

              <Box sx={{ mt: 4, mx: 1 }}>
                <Paper elevation={0} sx={{ border: '1px solid #D6DBDF', borderRadius: 2, overflow: 'hidden', p: 1, bgcolor: 'white' }}>
                  <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ bgcolor: 'white', color: '#0b87ac', p: 2, m: 1, borderBottom: '2px solid #E0E0E0' }}>
                    <Typography sx={{ fontWeight: 800, textAlign: 'center', color: '#0b87ac' }}>
                      {tab === 0 ? 'PWD MASTERLIST' : 'PENDING APPLICATIONS'}
                    </Typography>
                  </Box>

                  {loading && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography sx={{ color: '#0b87ac' }}>Loading...</Typography>
                    </Box>
                  )}

                  {error && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography sx={{ color: '#E74C3C' }}>{error}</Typography>
                    </Box>
                  )}

                  {!loading && !error && (
                  <Table id="pwd-masterlist-table" size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                          {tab === 0 ? (
                            <>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '90px', minWidth: '90px', textAlign: 'center' }}>
                                PWD ID NO.
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '180px', minWidth: '180px', textAlign: 'center' }}>
                                Name
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '65px', minWidth: '65px', textAlign: 'center' }}>
                                Age
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '160px', minWidth: '160px', textAlign: 'center' }}>
                                Barangay
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '180px', minWidth: '180px', textAlign: 'center' }}>
                                Disability
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '150px', minWidth: '150px', textAlign: 'center' }}>
                                Guardian Name
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '130px', minWidth: '130px', textAlign: 'center' }}>
                                Contact No.
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '100px', minWidth: '100px', textAlign: 'center' }}>
                                Status
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '100px', minWidth: '100px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('applicationID')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Application ID
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'applicationID' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'applicationID' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'applicationID' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'applicationID' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '180px', minWidth: '180px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('firstName')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Name
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'firstName' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'firstName' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'firstName' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'firstName' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '200px', minWidth: '200px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('email')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Email
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'email' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'email' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'email' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'email' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '170px', minWidth: '170px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('disabilityType')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Disability Type
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'disabilityType' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'disabilityType' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'disabilityType' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'disabilityType' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '130px', minWidth: '130px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('contactNumber')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Contact Number
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'contactNumber' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'contactNumber' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'contactNumber' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'contactNumber' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '130px', minWidth: '130px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('submissionDate')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Submission Date
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'submissionDate' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'submissionDate' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'submissionDate' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'submissionDate' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell 
                                sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '100px', minWidth: '100px', cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                                onClick={() => handleRequestSort('status')}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  Status
                                  <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'status' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'status' && order === 'asc' ? 1 : 0.3 }} />
                                    <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'status' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'status' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2, width: '150px', minWidth: '150px' }}>
                                Actions
                              </TableCell>
                            </>
                          )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRows.map((row, idx) => (
                          <TableRow key={row.applicationID || row.id} sx={{ bgcolor: idx % 2 ? '#F7FBFF' : 'white' }}>
                            {tab === 0 ? (
                              <>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '90px', minWidth: '90px', textAlign: 'center' }}>
                                  {row.pwdId}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '180px', minWidth: '180px', textAlign: 'center' }}>
                                  {row.name}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '65px', minWidth: '65px', textAlign: 'center' }}>
                                  {row.age}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '160px', minWidth: '160px', textAlign: 'center' }}>
                                  {row.barangay}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '180px', minWidth: '180px', textAlign: 'center' }}>
                                  {row.disability}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '150px', minWidth: '150px', textAlign: 'center' }}>
                                  {row.guardian}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '130px', minWidth: '130px', textAlign: 'center' }}>
                                  {row.contact}
                                </TableCell>
                                <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '100px', minWidth: '100px', textAlign: 'center' }}>
                                  <Chip 
                                    label={row.status} 
                                    size="small"
                                    sx={{ 
                                      bgcolor: row.status === 'Active' ? '#27AE60' : 
                                            row.status === 'Pending' ? '#F39C12' : 
                                            row.status === 'Suspended' ? '#E74C3C' : '#95A5A6',
                                      color: '#FFFFFF',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      height: 22
                                    }}
                                  />
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '100px', minWidth: '100px' }}>
                                  {row.applicationID}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '180px', minWidth: '180px' }}>
                                  {(() => {
                                    const toProperCase = (text) => {
                                      if (!text) return '';
                                      return text.split(' ').map(word => {
                                        if (!word) return '';
                                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                                      }).join(' ');
                                    };
                                    return `${toProperCase(row.firstName || '')} ${toProperCase(row.lastName || '')} ${row.suffix || ''}`.trim();
                                  })()}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '200px', minWidth: '200px' }}>
                                  {row.email}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '170px', minWidth: '170px' }}>
                                  {row.disabilityType}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '130px', minWidth: '130px' }}>
                                  {row.contactNumber}
                                </TableCell>
                                <TableCell sx={{ color: '#000000', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '130px', minWidth: '130px' }}>
                                  {formatDateMMDDYYYY(row.submissionDate)}
                              </TableCell>
                                <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '100px', minWidth: '100px' }}>
                                  <Chip 
                                    label={row.status || 'Pending'} 
                                    size="small"
                                    sx={{ 
                                      bgcolor: (row.status || 'Pending') === 'Approved' ? '#27AE60' : 
                                            (row.status || 'Pending') === 'Pending' ? '#F39C12' : 
                                            (row.status || 'Pending') === 'Rejected' ? '#E74C3C' : '#95A5A6',
                                      color: '#FFFFFF',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      height: 22
                                    }}
                                  />
                                </TableCell>
                              <TableCell sx={{ borderBottom: '1px solid #E0E0E0', py: 2, px: 2, width: '150px', minWidth: '150px', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  const isBarangayApproved = (row.status || '').toString().toLowerCase() === 'pending admin approval';
                                  const hasPendingCorrection = row.has_pending_correction === true;
                                  const isApproveDisabled = !isBarangayApproved || hasPendingCorrection;
                                  
                                  let disabledReason = '';
                                  if (!isBarangayApproved) {
                                    disabledReason = 'Disabled until Barangay approves the application';
                                  } else if (hasPendingCorrection) {
                                    disabledReason = 'Disabled: Document correction request is pending. Please wait for the applicant to submit corrected documents.';
                                  }
                                  
                                  return (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Tooltip title="View details">
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => handleViewDetails(row)}
                                          startIcon={<VisibilityIcon />}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          View
                                        </Button>
                                      </Tooltip>
                                      <Tooltip title={disabledReason} disableHoverListener={!isApproveDisabled}>
                                        <span>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            disabled={isApproveDisabled}
                                            onClick={() => handleApproveApplication(row.applicationID)}
                                            sx={{
                                              textTransform: 'none',
                                              bgcolor: '#27AE60',
                                              '&:disabled': { bgcolor: '#BBD7C5', color: '#FFFFFF' }
                                            }}
                                          >
                                            Approve
                                          </Button>
                                        </span>
                                      </Tooltip>
                                      <Tooltip title={disabledReason} disableHoverListener={isBarangayApproved && !hasPendingCorrection}>
                                        <span>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            disabled={!isBarangayApproved || hasPendingCorrection}
                                            onClick={() => handleRejectApplication(row.applicationID)}
                                            sx={{ textTransform: 'none' }}
                                          >
                                            Reject
                                          </Button>
                                        </span>
                                      </Tooltip>
                                    </Box>
                                  );
                                })()}
                              </TableCell>
                              </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                  </Box>
                </Paper>
              </Box>
            </Paper>
          </Container>
        </Box>

        {/* Application Details Modal */}
        <Dialog
          open={viewDetailsOpen}
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              p: 2,
              m: 2,
              bgcolor: '#FFFFFF',
              color: '#000000'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#FFFFFF', 
            color: '#000000', 
            textAlign: 'center',
            py: 2,
            position: 'relative',
            borderBottom: '1px solid #E0E0E0'
          }}>
            <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
              PWD Application Details
            </Typography>
            <IconButton
              onClick={handleCloseDetails}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#000000'
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ 
            p: 2, 
            bgcolor: '#FFFFFF', 
            color: '#000000',
            height: '500px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedApplication && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                overflow: 'hidden'
              }}>
                {/* Header Section - Always Visible */}
                <Paper sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: '#FFFFFF',
                  border: '2px solid #E9ECEF',
                  borderRadius: 2,
                  flexShrink: 0
                }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 'bold', 
                      color: '#0b87ac',
                      mb: 1,
                      fontSize: '1.25rem'
                    }}>
                      CABUYAO PDAO RMS
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: '#7F8C8D',
                      fontWeight: 500,
                      fontSize: '0.875rem'
                    }}>
                      Persons with Disabilities Application Form
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976D2', fontSize: '0.75rem' }}>
                        Application ID:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', fontSize: '0.875rem' }}>
                        {selectedApplication.applicationID}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976D2', fontSize: '0.75rem' }}>
                        Submission Date:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', fontSize: '0.875rem' }}>
                        {formatDateMMDDYYYY(selectedApplication.submissionDate)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Page Content - Scrollable */}
                <Box sx={{ 
                  flex: 1, 
                  overflow: 'auto',
                  pr: 1
                }}>
                  {/* Page 1: Personal Information */}
                  {currentDetailPage === 1 && (
                <Paper sx={{ p: 1.5, mb: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1,
                    borderBottom: '2px solid #0b87ac',
                    pb: 0.5,
                    fontSize: '1rem'
                  }}>
                    Personal Information
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        First Name:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.firstName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Last Name:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Middle Name:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.middleName || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Birth Date:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {formatDateMMDDYYYY(selectedApplication.birthDate)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Gender:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.gender}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Civil Status:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.civilStatus || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                  )}

                  {/* Page 2: Disability Information */}
                  {currentDetailPage === 2 && (
                <Paper sx={{ p: 1.5, mb: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1,
                    borderBottom: '2px solid #E74C3C',
                    pb: 0.5,
                    fontSize: '1rem'
                  }}>
                    Disability Information
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Disability Type:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.disabilityType}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Disability Cause:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.disabilityCause || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Disability Date:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.disabilityDate ? formatDateMMDDYYYY(selectedApplication.disabilityDate) : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                  )}

                  {/* Page 3: Contact Information */}
                  {currentDetailPage === 3 && (
                <Paper sx={{ p: 1.5, mb: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1,
                    borderBottom: '2px solid #27AE60',
                    pb: 0.5,
                    fontSize: '1rem'
                  }}>
                    Contact Information
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Email Address:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.email}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Contact Number:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.contactNumber || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Emergency Contact:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.emergencyContact || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Emergency Phone:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.emergencyPhone || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Emergency Relationship:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem' }}>
                        {selectedApplication.emergencyRelationship || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                  )}

                  {/* Page 4: Address Information */}
                  {currentDetailPage === 4 && (
                <Paper sx={{ p: 1.5, mb: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1,
                    borderBottom: '2px solid #F39C12',
                    pb: 0.5,
                    fontSize: '1rem'
                  }}>
                    Address Information
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                        Home Number/Street:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem', lineHeight: 1.5 }}>
                        {(() => {
                          const addressParts = [];
                          
                          // Add complete address if available
                          if (selectedApplication.address) {
                            addressParts.push(selectedApplication.address);
                          }
                          
                          // Add barangay if available
                          if (selectedApplication.barangay && selectedApplication.barangay !== 'N/A') {
                            addressParts.push(selectedApplication.barangay);
                          }
                          
                          // Add city if available, otherwise use default
                          const city = selectedApplication.city && selectedApplication.city !== 'N/A' 
                            ? selectedApplication.city 
                            : 'Cabuyao';
                          addressParts.push(city);
                          
                          // Add province if available, otherwise use default
                          const province = selectedApplication.province && selectedApplication.province !== 'N/A' 
                            ? selectedApplication.province 
                            : 'Laguna';
                          addressParts.push(province);
                          
                          // Add postal code if available
                          if (selectedApplication.postalCode && selectedApplication.postalCode !== 'N/A') {
                            addressParts.push(selectedApplication.postalCode);
                          }
                          
                          // Join all parts with commas and return
                          return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                        })()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                  )}

                  {/* Page 5: Uploaded Documents */}
                  {currentDetailPage === 5 && (
                <Paper sx={{ p: 2, mb: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'auto' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1.5,
                    borderBottom: '2px solid #8E44AD',
                    pb: 0.75,
                    fontSize: '1rem'
                  }}>
                    Uploaded Documents
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    {Object.keys(documentMapping).map((fieldName) => {
                      const docInfo = documentMapping[fieldName];
                      const hasDocument = documentService.hasDocument(selectedApplication, fieldName);
                      
                      return (
                        <Grid item xs={12} sm={4} key={fieldName}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', fontSize: '0.75rem' }}>
                              {docInfo.name}:
                            </Typography>
                            {docInfo.isRequired && (
                              <Chip 
                                label="Required" 
                                size="small" 
                                sx={{ 
                                  ml: 0.5, 
                                  bgcolor: '#E74C3C', 
                                  color: '#FFFFFF',
                                  fontSize: '0.55rem',
                                  height: '14px',
                                  '& .MuiChip-label': {
                                    px: 0.5
                                  }
                                }} 
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, minHeight: '80px' }}>
                            {hasDocument ? (
                              <Box 
                                sx={{ 
                                  cursor: 'pointer',
                                  border: '2px solid #0b87ac',
                                  borderRadius: 1,
                                  p: 0.5,
                                  bgcolor: '#f8f9fa',
                                  '&:hover': {
                                    borderColor: '#8E44AD',
                                    bgcolor: '#f0f0f0'
                                  }
                                }}
                                onClick={() => handleViewFile(fieldName)}
                              >
                                {(() => {
                                  const fileName = selectedApplication[fieldName];
                                  const fileUrl = getFileUrl(fieldName);
                                  
                                  // Parse fileName if it's a JSON string
                                  let parsedFiles = fileName;
                                  if (typeof fileName === 'string') {
                                    try {
                                      const parsed = JSON.parse(fileName);
                                      if (Array.isArray(parsed)) {
                                        parsedFiles = parsed;
                                      }
                                    } catch (e) {
                                      // Not JSON, treat as single file
                                      parsedFiles = fileName;
                                    }
                                  }
                                  
                                  if (Array.isArray(parsedFiles)) {
                                    // Handle arrays (backward compatibility for old idPictures data)
                                    // For idPictures, now only show first file (standardized to single file)
                                    const filesToShow = fieldName === 'idPictures' ? parsedFiles.slice(0, 1) : parsedFiles.slice(0, 2);
                                    return (
                                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {filesToShow.map((file, index) => {
                                          // Always use authenticated URL for thumbnails (no index needed for idPictures anymore)
                                          const singleFileUrl = getFileUrl(fieldName, null);
                                          const isImage = isImageFile(file);
                                          
                                          return (
                                            <Box
                                              key={index}
                                              sx={{ 
                                                width: 48, 
                                                height: 64,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                bgcolor: isImage && singleFileUrl ? 'transparent' : '#0b87ac',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem',
                                                color: 'white',
                                                border: '1px solid #ddd',
                                                cursor: singleFileUrl ? 'pointer' : 'default',
                                                opacity: singleFileUrl ? 1 : 0.6
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (singleFileUrl) {
                                                  handleViewFile(fieldName, index);
                                                }
                                              }}
                                            >
                                              {isImage && singleFileUrl ? (
                                                <img 
                                                  key={`${fieldName}-${index}-${fileRefreshKey}`}
                                                  src={`${singleFileUrl}${singleFileUrl.includes('?') ? '&' : '?'}refresh=${fileRefreshKey}`}
                                                  alt="Preview" 
                                                  crossOrigin="anonymous"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (singleFileUrl) {
                                                      handleViewFile(fieldName, index);
                                                    }
                                                  }}
                                                  style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover',
                                                    cursor: 'pointer'
                                                  }}
                                                  onError={(e) => {
                                                    console.error('Error loading thumbnail image:', e);
                                                    e.target.style.display = 'none';
                                                    const parent = e.target.parentElement;
                                                    if (parent) {
                                                      parent.innerHTML = '<span style="font-size: 0.8rem; color: white;">Preview</span>';
                                                      parent.style.bgcolor = '#0b87ac';
                                                    }
                                                  }}
                                                />
                                              ) : (
                                                <Typography sx={{ fontSize: '0.7rem', color: 'white', textAlign: 'center' }}>
                                                  {singleFileUrl ? getFileIcon(file) : 'N/A'}
                                                </Typography>
                                              )}
                                            </Box>
                                          );
                                        })}
                                        {parsedFiles.length > 2 && (
                                          <Box sx={{ 
                                            width: 48, 
                                            height: 64, 
                                            bgcolor: '#95A5A6', 
                                            fontSize: '0.7rem',
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            border: '1px solid #ddd'
                                          }}>
                                            +{parsedFiles.length - 2}
                                          </Box>
                                        )}
                                      </Box>
                                    );
                                  } else {
                                    // Handle single file - use authenticated URL
                                    const finalFileUrl = fileUrl; // fileUrl is already from getFileUrl which uses authenticated endpoint
                                    const isImage = isImageFile(fileName);
                                    
                                    return (
                                      <Box
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (finalFileUrl) {
                                            handleViewFile(fieldName);
                                          }
                                        }}
                                        sx={{ 
                                          width: 56, 
                                          height: 80,
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                          bgcolor: isImage && finalFileUrl ? 'transparent' : '#0b87ac',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '1.2rem',
                                          color: 'white',
                                          border: '1px solid #ddd',
                                          cursor: finalFileUrl ? 'pointer' : 'default',
                                          opacity: finalFileUrl ? 1 : 0.6
                                        }}
                                      >
                                        {isImage && finalFileUrl ? (
                                          <img 
                                             key={`${fieldName}-${fileRefreshKey}`}
                                             src={`${finalFileUrl}${finalFileUrl.includes('?') ? '&' : '?'}refresh=${fileRefreshKey}`}
                                            alt="Preview" 
                                            crossOrigin="anonymous"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (finalFileUrl) {
                                                handleViewFile(fieldName);
                                              }
                                            }}
                                            style={{ 
                                              width: '100%', 
                                              height: '100%', 
                                              objectFit: 'cover',
                                              cursor: 'pointer'
                                            }}
                                            onError={(e) => {
                                              console.error('Error loading thumbnail image:', e);
                                              e.target.style.display = 'none';
                                              const parent = e.target.parentElement;
                                              if (parent && !parent.textContent.includes('Preview')) {
                                                parent.innerHTML = '<span style="font-size: 0.7rem; color: white; text-align: center; padding: 5px;">Preview</span>';
                                                parent.style.bgcolor = '#0b87ac';
                                              }
                                            }}
                                          />
                                        ) : (
                                          <Typography sx={{ fontSize: '0.7rem', color: 'white', textAlign: 'center' }}>
                                            {finalFileUrl ? getFileIcon(fileName) : 'N/A'}
                                          </Typography>
                                        )}
                                      </Box>
                                    );
                                  }
                                })()}
                              </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#7F8C8D', fontStyle: 'italic', fontSize: '0.75rem' }}>
                              No file uploaded
                            </Typography>
                          )}
                        </Box>
                        {docInfo.description && (
                          <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                              {docInfo.description}
                            </Typography>
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
                  )}

                  {/* Page 6: Status Information */}
                  {currentDetailPage === 6 && (
                <Paper sx={{ p: 1.5, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1,
                    borderBottom: '2px solid #9B59B6',
                    pb: 0.5,
                    fontSize: '1rem'
                  }}>
                    Application Status
                  </Typography>
                  
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.5, fontSize: '0.75rem' }}>
                      Current Status:
                    </Typography>
                    <Chip 
                      label={selectedApplication.status || 'Pending'} 
                      size="small"
                      sx={{ 
                        bgcolor: (selectedApplication.status || 'Pending') === 'Approved' ? '#27AE60' : 
                               (selectedApplication.status || 'Pending') === 'Pending' ? '#F39C12' : 
                               (selectedApplication.status || 'Pending') === 'Rejected' ? '#E74C3C' : '#95A5A6',
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                </Paper>
                  )}
                </Box>

                {/* Pagination Navigation */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid #E0E0E0',
                  flexShrink: 0
                }}>
                  <Button
                    onClick={() => setCurrentDetailPage(prev => Math.max(1, prev - 1))}
                    disabled={currentDetailPage === 1}
                    startIcon={<ChevronLeftIcon />}
                    sx={{
                      textTransform: 'none',
                      color: currentDetailPage === 1 ? '#ccc' : '#0b87ac',
                      '&:hover': {
                        bgcolor: 'rgba(11, 135, 172, 0.1)'
                      }
                    }}
                  >
                    Previous
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5, 6].map((page) => (
                      <Chip
                        key={page}
                        label={page}
                        onClick={() => setCurrentDetailPage(page)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: currentDetailPage === page ? '#0b87ac' : 'transparent',
                          color: currentDetailPage === page ? '#fff' : '#0b87ac',
                          border: '1px solid #0b87ac',
                          '&:hover': {
                            bgcolor: currentDetailPage === page ? '#0b87ac' : 'rgba(11, 135, 172, 0.1)'
                          }
                        }}
                      />
                    ))}
                  </Box>

                  <Button
                    onClick={() => setCurrentDetailPage(prev => Math.min(6, prev + 1))}
                    disabled={currentDetailPage === 6}
                    endIcon={<ChevronRightIcon />}
                    sx={{
                      textTransform: 'none',
                      color: currentDetailPage === 6 ? '#ccc' : '#0b87ac',
                      '&:hover': {
                        bgcolor: 'rgba(11, 135, 172, 0.1)'
                      }
                    }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: '#F8F9FA',
            borderTop: '1px solid #DEE2E6',
            m: 1
          }}>
            <Button
              onClick={handleCloseDetails}
              variant="outlined"
              sx={{
                borderColor: '#6C757D',
                color: '#6C757D',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Close
            </Button>
            <Button
              onClick={handleRequestCorrection}
              variant="contained"
              startIcon={<EditIcon />}
              sx={{
                bgcolor: '#F39C12',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#E67E22'
                }
              }}
            >
              Request Document Correction
            </Button>
            <Button
              onClick={handlePrintApplication}
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{
                bgcolor: '#0b87ac',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#1B2631'
                }
              }}
            >
              Print Application
            </Button>
          </DialogActions>
        </Dialog>

        {/* File Viewer Modal */}
        <Dialog
          open={fileViewerOpen}
          onClose={handleCloseFileViewer}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              height: '90vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: '#0b87ac',
            color: '#FFFFFF'
          }}>
            <Typography variant="h2" component="div" sx={{ fontSize: '1.25rem' }}>
              Document Viewer
            </Typography>
            <IconButton
              onClick={handleCloseFileViewer}
              sx={{ color: '#FFFFFF' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '100%' }}>
            {viewedFile && (
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                bgcolor: '#f5f5f5'
              }}>
                {fileType === 'pdf' ? (
                  <iframe
                    src={viewedFile}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title="Document Viewer"
                  />
                ) : (
                  <img
                    src={viewedFile}
                    alt="Document"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </Box>
            )}
           </DialogContent>
         </Dialog>

         {/* Document Correction Modal */}
         <Dialog
           open={correctionModalOpen}
           onClose={handleCloseCorrectionModal}
           maxWidth="md"
           fullWidth
           PaperProps={{
             sx: {
               borderRadius: 3,
               boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
               bgcolor: '#FFFFFF'
             }
           }}
         >
           <DialogTitle sx={{ 
             bgcolor: '#F39C12', 
             color: '#FFFFFF', 
             textAlign: 'center',
             py: 2,
             position: 'relative'
           }}>
             <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
               Request Document Correction
             </Typography>
             <IconButton
               onClick={handleCloseCorrectionModal}
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
           
           <DialogContent sx={{ p: 3, bgcolor: '#FFFFFF' }}>
             <Typography variant="body1" sx={{ mb: 3, color: '#2C3E50' }}>
               Select the documents that need correction for <strong>{selectedApplication?.firstName} {selectedApplication?.lastName}</strong>:
             </Typography>
             
             <Grid container spacing={2} sx={{ mb: 3 }}>
               {Object.keys(documentMapping).map((fieldName) => {
                 const docInfo = documentMapping[fieldName];
                 return (
                   <Grid item xs={12} sm={6} key={fieldName}>
                     <Box sx={{ 
                       p: 2, 
                       border: '1px solid #DEE2E6', 
                       borderRadius: 2,
                       cursor: 'pointer',
                       bgcolor: selectedDocumentsForCorrection.includes(fieldName) ? '#E8F5E8' : '#FFFFFF',
                       borderColor: selectedDocumentsForCorrection.includes(fieldName) ? '#4CAF50' : '#DEE2E6',
                       '&:hover': {
                         borderColor: '#0b87ac',
                         bgcolor: selectedDocumentsForCorrection.includes(fieldName) ? '#E8F5E8' : '#F8F9FA'
                       }
                     }}
                     onClick={() => handleDocumentSelection(fieldName)}
                     >
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Box sx={{ 
                           width: 20, 
                           height: 20, 
                           minWidth: 20,
                           minHeight: 20,
                           flexShrink: 0,
                           border: '2px solid #0b87ac', 
                           borderRadius: '50%',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           bgcolor: selectedDocumentsForCorrection.includes(fieldName) ? '#0b87ac' : 'transparent'
                         }}>
                           {selectedDocumentsForCorrection.includes(fieldName) && (
                             <Typography sx={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}>
                               ✓
                             </Typography>
                           )}
                         </Box>
                         <Box>
                           <Typography variant="body2" sx={{ fontWeight: 500 }}>
                             {docInfo.name}
                           </Typography>
                           {docInfo.description && (
                             <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                               {docInfo.description}
                             </Typography>
                           )}
                           {docInfo.isRequired && (
                             <Box sx={{ mt: 0.5 }}>
                               <Chip 
                                 label="Required" 
                                 size="small" 
                                 sx={{ 
                                   bgcolor: '#E74C3C', 
                                   color: '#FFFFFF',
                                   fontSize: '0.7rem',
                                   height: '18px'
                                 }} 
                               />
                             </Box>
                           )}
                         </Box>
                       </Box>
                     </Box>
                   </Grid>
                 );
               })}
             </Grid>
             
             <TextField
               fullWidth
               multiline
               rows={3}
               label="Additional Notes (Optional)"
               value={correctionNotes}
               onChange={(e) => setCorrectionNotes(e.target.value)}
               placeholder="Provide specific instructions about what needs to be corrected..."
               sx={{
                 '& .MuiOutlinedInput-root': {
                   borderRadius: 2
                 }
               }}
             />
           </DialogContent>
           
           <DialogActions sx={{ 
             p: 3, 
             bgcolor: '#F8F9FA',
             borderTop: '1px solid #DEE2E6'
           }}>
             <Button
               onClick={handleCloseCorrectionModal}
               variant="outlined"
               sx={{
                 borderColor: '#6C757D',
                 color: '#6C757D',
                 textTransform: 'none',
                 fontWeight: 600
               }}
             >
               Cancel
             </Button>
             <Button
               onClick={handleSubmitCorrectionRequest}
               variant="contained"
               disabled={submittingCorrectionRequest}
               sx={{
                 bgcolor: submittingCorrectionRequest ? '#BDC3C7' : '#F39C12',
                 textTransform: 'none',
                 fontWeight: 600,
                 '&:hover': {
                   bgcolor: submittingCorrectionRequest ? '#BDC3C7' : '#E67E22'
                 },
                 '&:disabled': {
                   bgcolor: '#BDC3C7',
                   color: '#FFFFFF'
                 }
               }}
             >
               {submittingCorrectionRequest ? (
                 <>
                   <CircularProgress size={16} sx={{ mr: 1, color: '#FFFFFF' }} />
                   Sending...
                 </>
               ) : (
                 'Send Correction Request'
               )}
             </Button>
           </DialogActions>
         </Dialog>

         {/* Image Preview Modal - A4 Paper Shape */}
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
               flexDirection: 'column'
             }
           }}
         >
           <DialogTitle sx={{ 
             bgcolor: '#0b87ac', 
             color: '#FFFFFF', 
             textAlign: 'center',
             py: 1.5,
             position: 'relative',
             flexShrink: 0
           }}>
             <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
               Document Preview
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
             overflow: 'hidden'
           }}>
             {previewImageUrl && (
               <Box
                 sx={{
                   width: '100%',
                   height: '100%',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   bgcolor: '#f5f5f5',
                   position: 'relative'
                 }}
               >
                 <img
                   src={previewImageUrl}
                   alt={previewFileName}
                   crossOrigin="anonymous"
                   style={{
                     maxWidth: '100%',
                     maxHeight: '100%',
                     objectFit: 'contain',
                     borderRadius: '4px',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                   }}
                   onError={(e) => {
                     console.error('Error loading image:', previewImageUrl);
                     toastService.error('Failed to load image');
                     handleClosePreviewModal();
                   }}
                 />
               </Box>
             )}
           </DialogContent>
           
           <DialogActions sx={{ 
             bgcolor: '#f8f9fa', 
             px: 3, 
             py: 2,
             flexShrink: 0,
             justifyContent: 'center'
           }}>
             <Typography variant="body2" sx={{ color: '#6c757d', fontStyle: 'italic' }}>
               {previewFileName}
             </Typography>
           </DialogActions>
         </Dialog>

        {/* Rejection Reason Dialog */}
        <Dialog
          open={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              zIndex: 1400 // Higher than application details modal
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#E74C3C', color: '#FFFFFF', fontWeight: 'bold' }}>
            Rejection Details
          </DialogTitle>
          <DialogContent 
            sx={{ 
              mt: 2,
              maxHeight: '60vh',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Rejection Reason *</InputLabel>
              <Select
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setCustomReason(''); // Reset custom reason when reason changes
                }}
                label="Rejection Reason *"
              >
                <MenuItem value="incomplete_information">Incomplete Information</MenuItem>
                <MenuItem value="incorrect_information">Incorrect Information</MenuItem>
                <MenuItem value="does_not_meet_criteria">Does Not Meet Criteria</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* Custom Reason Input (only for "Other") */}
            {rejectionReason === 'other' && (
              <TextField
                fullWidth
                label="Custom Reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputLabelProps={{
                  shrink: true
                }}
                placeholder="Please specify the rejection reason..."
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Remarks"
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputLabelProps={{
                shrink: true
              }}
              placeholder="Please provide detailed remarks for the rejection..."
            />

            {/* Preview Message */}
            {rejectionReason && rejectionRemarks.trim() && (
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: '#F8F9FA', 
                borderRadius: 1, 
                border: '1px solid #DEE2E6' 
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  📧 Email Preview (This is what will be sent to the applicant):
                </Typography>
                <Box sx={{
                  p: 2,
                  bgcolor: '#FFFFFF',
                  borderRadius: 1,
                  border: '1px solid #E0E0E0',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6
                }}>
                  {getPreviewMessage()}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setRejectionModalOpen(false)}
              variant="outlined"
              sx={{
                borderColor: '#6C757D',
                color: '#6C757D',
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectSubmit}
              variant="contained"
              sx={{
                bgcolor: '#E74C3C',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#C0392B'
                }
              }}
            >
              Continue to Confirmation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rejection Confirmation Dialog */}
        <Dialog
          open={rejectionConfirmationOpen}
          onClose={() => setRejectionConfirmationOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: '#E74C3C', color: '#FFFFFF', fontWeight: 'bold' }}>
            Confirm Rejection
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to reject this application? This action cannot be undone.
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#F8F9FA', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Rejection Reason:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {getFormattedRejectionReason()}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Remarks:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {rejectionRemarks}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setRejectionConfirmationOpen(false)}
              variant="outlined"
              sx={{
                borderColor: '#6C757D',
                color: '#6C757D',
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              variant="contained"
              sx={{
                bgcolor: '#E74C3C',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#C0392B'
                }
              }}
            >
              Confirm Rejection
            </Button>
          </DialogActions>
        </Dialog>

        {/* Global approval loading backdrop */}
        <Backdrop
          open={approving}
          sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff', flexDirection: 'column' }}
        >
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>Approving application, please wait…</Typography>
        </Backdrop>
      </Box>
    );
  }

  export default PWDRecords;
