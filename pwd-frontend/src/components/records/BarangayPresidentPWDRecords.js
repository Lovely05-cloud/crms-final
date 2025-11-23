import React, { useState, useEffect, useMemo } from 'react';
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
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  InputAdornment,
  Collapse,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  Backdrop,
  Checkbox,
  FormControlLabel
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
import BarangayPresidentSidebar from '../shared/BarangayPresidentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { filePreviewService } from '../../services/filePreviewService';
import toastService from '../../services/toastService';
import { documentService } from '../../services/documentService';
import { formatName } from '../../utils/nameFormatter';

// Helper function to convert text to proper case
const toProperCase = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

function BarangayPresidentPWDRecords() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    barangay: '',
    disability: '',
    status: ''
  });
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

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

  // Mock data - in real implementation, this would fetch from API filtered by barangay
  const [rows, setRows] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [printing, setPrinting] = useState(false);
  
  // Document correction modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedDocumentsForCorrection, setSelectedDocumentsForCorrection] = useState([]);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [submittingCorrectionRequest, setSubmittingCorrectionRequest] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentMapping, setDocumentMapping] = useState({});
  
  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [rejectionConfirmationOpen, setRejectionConfirmationOpen] = useState(false);
  
  // Approval confirmation state
  const [approvalConfirmationOpen, setApprovalConfirmationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'approve' or 'reject'
  const [applicationRemarks, setApplicationRemarks] = useState(''); // Remarks for viewing/approving applications
  const [documentRemarks, setDocumentRemarks] = useState({}); // Remarks per document (fieldName -> remarks)
  
  // Image preview modal state
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewImageTitle, setPreviewImageTitle] = useState('');
  
  // Toast notifications will be used instead of modals

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

  // Helper functions for file handling
  // Normalize file path: remove leading slash and encode each segment to handle spaces
  const normalizeFilePath = (path) => {
    if (!path) return '';
    // Remove leading slash if present
    let normalized = path.startsWith('/') ? path.substring(1) : path;
    // Encode each path segment separately to handle spaces in filenames
    const parts = normalized.split('/').map(part => encodeURIComponent(part));
    return parts.join('/');
  };

  // Ensure a default folder for bare filenames (e.g., corrections saved under storage/applications)
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

  // Get authenticated image URL as blob for thumbnails
  const getAuthenticatedImageUrl = async (fieldName) => {
    if (!selectedApplication || !selectedApplication[fieldName]) return null;
    
    const fileType = getFileTypeFromFieldName(fieldName);
    if (!fileType || !selectedApplication.applicationID) return null;
    
    try {
      const url = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, fileType);
      
      // Fetch image with authentication
      const token = localStorage.getItem('auth.token');
      const headers = {};
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
          if (tokenValue) {
            headers['Authorization'] = `Bearer ${tokenValue}`;
          }
        } catch (e) {
          console.warn('Error parsing token:', e);
        }
      }
      
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Error fetching authenticated image:', error);
      return null;
    }
  };

  const getFileUrl = (fieldName) => {
    if (!selectedApplication || !selectedApplication[fieldName]) return null;
    
    // Use authenticated API endpoint for thumbnails
    const fileType = getFileTypeFromFieldName(fieldName);
    if (fileType && selectedApplication.applicationID) {
      try {
        // Use filePreviewService to get authenticated URL
        return filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, fileType);
      } catch (error) {
        console.warn('Error getting authenticated file URL, falling back to storage URL:', error);
        // Fallback to storage URL if authenticated URL fails
      }
    }
    
    // Fallback to storage URL for idPictures or if fileType mapping fails
    const fileName = selectedApplication[fieldName];
    
    // Handle JSON string (for arrays stored as strings)
    if (typeof fileName === 'string') {
      try {
        const parsed = JSON.parse(fileName);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return null;
          const normalizedPath = normalizeFilePath(ensureStorageFolder(parsed[0]));
          return api.getStorageUrl(normalizedPath);
        } else {
          // Single file as string
          const normalizedPath = normalizeFilePath(ensureStorageFolder(fileName));
          return api.getStorageUrl(normalizedPath);
        }
      } catch (e) {
        // Not JSON, treat as regular string
        const normalizedPath = normalizeFilePath(ensureStorageFolder(fileName));
        return api.getStorageUrl(normalizedPath);
      }
    } else if (Array.isArray(fileName)) {
      // Handle actual array
      if (fileName.length === 0) return null;
      const normalizedPath = normalizeFilePath(ensureStorageFolder(fileName[0]));
      return api.getStorageUrl(normalizedPath);
    }
    return null;
  };

  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lowerFileName = fileName.toLowerCase();
    return imageExtensions.some(ext => lowerFileName.includes(ext));
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('.pdf')) return '📄';
    if (lowerFileName.includes('.doc') || lowerFileName.includes('.docx')) return '📝';
    if (lowerFileName.includes('.txt')) return '📄';
    return '📄';
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
    
    // Return mapped name if exists, otherwise return null (for unsupported types)
    return mapping[fieldName] || null;
  };

  const handleViewFileBatch = (fileType, fileIndex = 0) => {
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
      // idPictures is now a single file (standardized), no index parameter needed
      const indexParam = null;
      const fileUrl = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, documentType, indexParam);
      
      // Check if it's an image file by checking the field name
      const fileName = selectedApplication[fileType];
      let isImage = false;
      
      if (Array.isArray(fileName) || (typeof fileName === 'string' && fileName.startsWith('['))) {
        // For arrays, check the file at the specified index
        try {
          const parsed = typeof fileName === 'string' ? JSON.parse(fileName) : fileName;
          if (Array.isArray(parsed) && parsed[fileIndex]) {
            isImage = isImageFile(parsed[fileIndex]);
          }
        } catch (e) {
          // Not an array, check the field name
          isImage = isImageFile(fileType);
        }
      } else {
        isImage = isImageFile(fileName);
      }
      
      if (isImage) {
        // Open in modal for images
        setPreviewImageUrl(fileUrl);
        const title = documentMapping[fileType]?.name || fileType;
        setPreviewImageTitle(fileIndex > 0 ? `${title} - Image ${fileIndex + 1}` : title);
        setImagePreviewOpen(true);
      } else {
        // For non-images (PDFs, etc.), open in new tab
        filePreviewService.openPreview('application-file', selectedApplication.applicationID, documentType);
      }
    } catch (error) {
      console.error('Error getting file preview URL:', error);
      toastService.error('Failed to load file preview');
    }
  };

  const handleViewFile = (fileType) => {
    handleViewFileBatch(fileType, 0);
  };

  const handleCloseImagePreview = () => {
    setImagePreviewOpen(false);
    setPreviewImageUrl(null);
    setPreviewImageTitle('');
  };


  useEffect(() => {
    fetchData();
    fetchDocumentTypes();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const barangay = currentUser?.barangay || 'Unknown Barangay';
      
      // Fetch applications pending barangay approval for this barangay
      const applicationsUrl = `/applications/barangay/${encodeURIComponent(barangay)}/status/Pending%20Barangay%20Approval`;
      
      try {
        const applicationsData = await api.get(applicationsUrl);
        // Transform applications data to proper case
        const transformedApplications = applicationsData.map(app => ({
          ...app,
          firstName: toProperCase(app.firstName),
          lastName: toProperCase(app.lastName),
          disabilityType: toProperCase(app.disabilityType)
        }));
        // Sort by most recent submission first
        const sorted = [...transformedApplications].sort((a, b) => {
          const aTime = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          const bTime = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
          return bTime - aTime;
        });
        setApplications(sorted);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
        setApplications([]);
      }

      // Fetch approved applications (masterlist) for this barangay
      const masterlistUrl = `/applications/barangay/${encodeURIComponent(barangay)}/status/Approved`;
      
      try {
        const masterlistData = await api.get(masterlistUrl);
        // Transform the data to match the expected format
        const transformedData = masterlistData.map((app, index) => ({
          id: app.applicationID || index + 1,
          pwdID: `PWD-${String(app.applicationID || index + 1).padStart(3, '0')}`,
          firstName: toProperCase(app.firstName),
          lastName: toProperCase(app.lastName),
          barangay: app.barangay,
          disabilityType: toProperCase(app.disabilityType),
          status: 'Active', // All approved applications are considered active
          contactNumber: app.contactNumber,
          email: app.email
        }));
        setRows(transformedData);
      } catch (err) {
        console.error('Failed to fetch masterlist data:', err);
        // Fallback to empty array if API fails
        setRows([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data');
      // Set empty arrays on error
      setApplications([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const approveDelayRef = React.useRef(null);
  const [approving, setApproving] = useState(false);

  const handleApproveClick = async (application) => {
    // Show application details modal
    setSelectedApplication(application);
    setViewDetailsOpen(true);
    setPendingAction('approve');
    
    // Fetch fresh application data to ensure we have the latest document paths
    try {
      const response = await api.get(`/applications`);
      if (response && Array.isArray(response)) {
        const freshApplication = response.find(app => app.applicationID === application.applicationID);
        if (freshApplication) {
          setSelectedApplication(freshApplication);
        }
      }
    } catch (error) {
      console.error('Error fetching fresh application data:', error);
      // Don't show error to user, just use the cached data
    }
    
    // Show toast notification
    toastService.info('Please review once more the application before proceeding.');
  };

  const handleRejectClick = async (application) => {
    // Show application details modal
    setSelectedApplication(application);
    setViewDetailsOpen(true);
    setPendingAction('reject');
    
    // Fetch fresh application data to ensure we have the latest document paths
    try {
      const response = await api.get(`/applications`);
      if (response && Array.isArray(response)) {
        const freshApplication = response.find(app => app.applicationID === application.applicationID);
        if (freshApplication) {
          setSelectedApplication(freshApplication);
        }
      }
    } catch (error) {
      console.error('Error fetching fresh application data:', error);
      // Don't show error to user, just use the cached data
    }
    
    // Show toast notification
    toastService.info('Please review once more the application before proceeding.');
  };

  const handleApproveFromModal = () => {
    setApprovalConfirmationOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedApplication) return;
    
    setApprovalConfirmationOpen(false);
    
    try {
      approveDelayRef.current = setTimeout(() => setApproving(true), 700);
      await api.post(`/applications/${selectedApplication.applicationID}/approve-barangay`, {
        remarks: applicationRemarks.trim() || 'Approved by Barangay President'
      });

      // Refresh the applications list
      await fetchData();
      toastService.success('Application successfully endorsed!');
      
      // Close modal
      setViewDetailsOpen(false);
      setSelectedApplication(null);
      setPendingAction(null);
      setApplicationRemarks(''); // Reset remarks
      setDocumentRemarks({}); // Reset document remarks
    } catch (err) {
      console.error('Error approving application:', err);
      toastService.error('Failed to endorse application: ' + (err.message || 'Unknown error'));
    } finally {
      if (approveDelayRef.current) {
        clearTimeout(approveDelayRef.current);
        approveDelayRef.current = null;
      }
      setApproving(false);
    }
  };

  const handleRejectFromModal = () => {
    // Open rejection reason dialog (keep application details modal open)
    setRejectionModalOpen(true);
    setRejectionReason('');
    setCustomReason('');
    setRejectionRemarks('');
    // Note: Don't reset documentRemarks here - keep them visible in the modal
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
      
      // Include document-specific remarks if any
      const documentRemarksEntries = Object.entries(documentRemarks).filter(([_, remarks]) => remarks && remarks.trim());
      if (documentRemarksEntries.length > 0) {
        rejectionData.documentRemarks = Object.fromEntries(documentRemarksEntries);
      }
      
      await api.post(`/applications/${selectedApplication.applicationID}/reject`, rejectionData);

      // Refresh the applications list
      await fetchData();
      toastService.success('Application rejected successfully!');
      
      // Close modals
      setViewDetailsOpen(false);
      setSelectedApplication(null);
      setPendingAction(null);
      setRejectionReason('');
      setCustomReason('');
      setRejectionRemarks('');
      setDocumentRemarks({});
    } catch (err) {
      console.error('Error rejecting application:', err);
      toastService.error('Failed to reject application: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePrintList = () => {
    setPrinting(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get barangay name from current user
    const barangay = currentUser?.barangay || 'Unknown Barangay';
    
    // Get current data based on active tab and apply filters
    const baseData = tab === 0 ? rows : applications;
    const currentTitle = tab === 0 ? 'PWD Masterlist' : 'Pending Applications';
    
    // Apply search filter
    let currentData = baseData;
    if (searchTerm) {
      currentData = baseData.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply status filter if active
    if (filters.status && filters.status !== 'all') {
      currentData = currentData.filter(item => 
        item.status && item.status.toLowerCase().includes(filters.status.toLowerCase())
      );
    }
    
    // Apply disability type filter if active
    if (filters.disability && filters.disability !== 'all') {
      currentData = currentData.filter(item => 
        item.disabilityType && item.disabilityType.toLowerCase().includes(filters.disability.toLowerCase())
      );
    }
    
    // Create HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentTitle} - ${barangay}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #3498DB;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2C3E50;
              margin: 0;
              font-size: 24px;
            }
            .header h2 {
              color: #7F8C8D;
              margin: 5px 0;
              font-size: 18px;
            }
            .info {
              margin-bottom: 20px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #3498DB;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            .status-pending {
              background-color: #FFF3CD;
              color: #856404;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
            }
            .status-approved {
              background-color: #D4EDDA;
              color: #155724;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
            }
            .status-rejected {
              background-color: #F8D7DA;
              color: #721C24;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #7F8C8D;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CABUYAO PDAO RMS</h1>
            <h2>${currentTitle} - ${barangay}</h2>
            <div class="info">
              Generated on: ${formatDateMMDDYYYY(new Date().toISOString())}
              ${searchTerm ? `<br>Search Filter: "${searchTerm}"` : ''}
              ${filters.status && filters.status !== 'all' ? `<br>Status Filter: ${filters.status}` : ''}
              ${filters.disability && filters.disability !== 'all' ? `<br>Disability Filter: ${filters.disability}` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                ${tab === 0 ? `
                  <th>PWD ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Disability Type</th>
                  <th>Status</th>
                  <th>Contact Number</th>
                  <th>Email</th>
                ` : `
                  <th>Application ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Disability Type</th>
                  <th>Status</th>
                  <th>Submission Date</th>
                  <th>Contact Number</th>
                  <th>Email</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${currentData.map(item => `
                <tr>
                  ${tab === 0 ? `
                    <td>${item.pwdID || 'N/A'}</td>
                    <td>${item.firstName || 'N/A'}</td>
                    <td>${item.lastName || 'N/A'}</td>
                    <td>${item.disabilityType || 'N/A'}</td>
                    <td><span class="status-approved">${item.status || 'Active'}</span></td>
                    <td>${item.contactNumber || 'N/A'}</td>
                    <td>${item.email || 'N/A'}</td>
                  ` : `
                    <td>${item.applicationID || 'N/A'}</td>
                    <td>${item.firstName || 'N/A'}</td>
                    <td>${item.lastName || 'N/A'}</td>
                    <td>${item.disabilityType || 'N/A'}</td>
                    <td><span class="status-pending">${item.status || 'Pending'}</span></td>
                    <td>${item.submissionDate ? formatDateMMDDYYYY(item.submissionDate) : 'N/A'}</td>
                    <td>${item.contactNumber || 'N/A'}</td>
                    <td>${item.email || 'N/A'}</td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Total Records: ${currentData.length}</p>
            <p>This document was generated by CABUYAO PDAO RMS</p>
          </div>
        </body>
      </html>
    `;
    
    // Check if there's data to print
    if (currentData.length === 0) {
      setPrinting(false);
      toastService.warning('There are no records to print with the current filters.');
      printWindow.close();
      return;
    }
    
    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
      setPrinting(false);
    };
  };


  const handleViewDetails = async (application) => {
    // Set the application immediately for quick display
    setSelectedApplication(application);
    setViewDetailsOpen(true);
    
    // Fetch fresh application data to ensure we have the latest document paths
    try {
      const response = await api.get(`/applications`);
      if (response && Array.isArray(response)) {
        const freshApplication = response.find(app => app.applicationID === application.applicationID);
        if (freshApplication) {
          setSelectedApplication(freshApplication);
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
    setApplicationRemarks(''); // Reset remarks when closing
    setDocumentRemarks({}); // Reset document remarks when closing
    setPendingAction(null); // Reset pending action when closing
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

  const handlePrintApplication = () => {
    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('application-details');
    const dateString = formatDateMMDDYYYY(new Date().toISOString());
    const safeInnerHtml = printContent && printContent.innerHTML ? printContent.innerHTML : `
      <div class="section">
        <div class="field"><span class="label">Applicant:</span> ${selectedApplication?.firstName || ''} ${selectedApplication?.lastName || ''}</div>
        <div class="field"><span class="label">Application ID:</span> ${selectedApplication?.applicationID || 'N/A'}</div>
      </div>
    `;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>PWD Application Details</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #2c3e50; }
            .container { width: 100%; max-width: 180mm; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 12mm; }
            .brand { font-size: 12px; letter-spacing: .1em; color: #7f8c8d; }
            h1 { margin: 0; font-size: 20px; }
            h2 { margin: 2mm 0 0; font-size: 16px; font-weight: 600; }
            .meta { margin-top: 3mm; font-size: 12px; color: #555; }
            .divider { border: 0; border-top: 2px solid #0b87ac; margin: 6mm 0; }
            .section { margin-bottom: 6mm; }
            .section-title { font-size: 13px; font-weight: 700; color: #0b87ac; margin-bottom: 3mm; text-transform: uppercase; }
            .fields { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; row-gap: 3mm; }
            .field { font-size: 12px; line-height: 1.3; }
            .label { font-weight: 600; margin-right: 2mm; color: #34495e; }
            .table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .table th, .table td { border: 1px solid #dfe6e9; padding: 3mm; text-align: left; }
            .table th { background: #f4f9fb; color: #0b87ac; }
            .footer { margin-top: 10mm; font-size: 11px; color: #7f8c8d; text-align: center; }
            .badge { display: inline-block; padding: 2px 6px; border: 1px solid #0b87ac; color: #0b87ac; border-radius: 4px; font-size: 11px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">CITY OF CABUYAO • PDAO RMS</div>
              <h1>PWD Application</h1>
              <h2>Application Details</h2>
              <div class="meta">Application ID: <strong>${selectedApplication?.applicationID || ''}</strong> &nbsp;•&nbsp; Date: ${dateString} &nbsp;•&nbsp; Status: <span class="badge">${selectedApplication?.status || 'N/A'}</span></div>
            </div>
            <hr class="divider" />
            <!-- Inject existing application details content -->
            <div class="section">
              ${safeInnerHtml}
            </div>
            <div class="footer">Generated by Cabuyao PDAO RMS</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      barangay: '',
      disability: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Filter the rows based on current filters
  const filteredRows = useMemo(() => {
    const dataToFilter = tab === 0 ? rows : applications;
    
    const hasAnyFilters = Object.values(filters).some(value => value !== '');
    const filtered = (!hasAnyFilters && !searchTerm) ? [...dataToFilter] : dataToFilter.filter(row => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        (row.firstName && row.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.lastName && row.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.pwdID && row.pwdID.toLowerCase().includes(searchTerm.toLowerCase()));

      // Barangay filter
      let matchesBarangay = true;
      if (filters.barangay) {
        matchesBarangay = row.barangay && row.barangay.toLowerCase().includes(filters.barangay.toLowerCase());
      }

      // Disability filter - handle both masterlist and application data
      let matchesDisability = true;
      if (filters.disability) {
        if (tab === 0) {
          // Masterlist data
          matchesDisability = row.disabilityType && row.disabilityType === filters.disability;
        } else {
          // Application data - handle case sensitivity and partial matches
          const rowDisability = row.disabilityType ? row.disabilityType.toLowerCase() : '';
          const filterDisability = filters.disability.toLowerCase();
          
          if (filterDisability.includes('visual')) {
            matchesDisability = rowDisability.includes('visual');
          } else if (filterDisability.includes('physical')) {
            matchesDisability = rowDisability.includes('physical');
          } else {
            matchesDisability = rowDisability.includes(filterDisability);
          }
        }
      }

      // Status filter
      let matchesStatus = true;
      if (filters.status) {
        matchesStatus = row.status && row.status === filters.status;
      }

      return matchesSearch && matchesBarangay && matchesDisability && matchesStatus;
    });
    
    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue = a[orderBy];
        let bValue = b[orderBy];
        
        // Handle nested properties
        if (orderBy === 'pwdID' || orderBy === 'applicationID') {
          aValue = a[orderBy] || '';
          bValue = b[orderBy] || '';
        } else if ((orderBy === 'firstName' || orderBy === 'lastName') && tab === 1) {
          if (orderBy === 'firstName') {
            aValue = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            bValue = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          } else {
            aValue = `${a.lastName || ''} ${a.firstName || ''}`.trim();
            bValue = `${b.lastName || ''} ${b.firstName || ''}`.trim();
          }
        } else if (orderBy === 'submissionDate' && tab === 1) {
          aValue = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
          bValue = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
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
    }
    
    return filtered;
  }, [tab, rows, applications, filters, searchTerm, orderBy, order]);

  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
      case 'Approved':
        return '#27AE60';
      case 'Pending':
      case 'Pending Barangay Approval':
      case 'Pending Admin Approval':
        return '#F39C12';
      case 'Inactive':
      case 'Rejected':
        return '#E74C3C';
      default:
        return '#7F8C8D';
    }
  };

  const columns = tab === 0 ? [
    { id: 'pwdID', label: 'PWD ID', minWidth: 60 },
    { id: 'firstName', label: 'First Name', minWidth: 80 },
    { id: 'lastName', label: 'Last Name', minWidth: 80 },
    { id: 'barangay', label: 'Barangay', minWidth: 80 },
    { id: 'disabilityType', label: 'Disability Type', minWidth: 100 },
    { id: 'status', label: 'Status', minWidth: 80 },
    { id: 'contactNumber', label: 'Contact Number', minWidth: 90 },
    { id: 'email', label: 'Email', minWidth: 120 }
  ] : [
    { id: 'applicationID', label: 'Application ID', minWidth: 60 },
    { id: 'firstName', label: 'First Name', minWidth: 70 },
    { id: 'lastName', label: 'Last Name', minWidth: 70 },
    { id: 'barangay', label: 'Barangay', minWidth: 80 },
    { id: 'disabilityType', label: 'Disability Type', minWidth: 90 },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'submissionDate', label: 'Submission Date', minWidth: 90 },
    { id: 'contactNumber', label: 'Contact Number', minWidth: 90 },
    { id: 'email', label: 'Email', minWidth: 110 },
    { id: 'actions', label: 'Actions', minWidth: 150 }
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <BarangayPresidentSidebar />
      
      {/* Main content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        ml: '280px',
        width: 'calc(100% - 280px)',
        bgcolor: '#F7F9FB'
      }}>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '2rem', color: '#1976D2', mb: 1 }}>
              PWD Records - {currentUser?.barangay || 'Your Barangay'}
            </Typography>
            <Typography sx={{ color: '#7F8C8D', fontSize: '1rem' }}>
              Manage and view PWD records for {currentUser?.barangay || 'your barangay'}
            </Typography>
          </Box>

          {/* Tabs and Controls */}
          <Paper elevation={0} sx={{ 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #E0E0E0', 
            mb: 3,
            backgroundColor: '#FFFFFF'
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Tabs 
                  value={tab} 
                  onChange={handleTabChange}
                  sx={{ 
                    minHeight: 40,
                    '& .MuiTab-root': {
                      color: '#1976D2',
                      fontWeight: 600,
                      textTransform: 'none',
                      bgcolor: '#F8F9FA',
                      borderRadius: '8px 8px 0 0',
                      mx: 0.5,
                      px: 3,
                      '&.Mui-selected': {
                        color: '#FFFFFF !important',
                        fontWeight: 700,
                        bgcolor: '#3498DB !important'
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
                  startIcon={printing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />} 
                  variant="outlined" 
                  onClick={handlePrintList}
                  disabled={printing}
                  sx={{ 
                    textTransform: 'none',
                    color: '#FFFFFF',
                    bgcolor: '#3498DB',
                    borderColor: '#3498DB',
                    '&:hover': {
                      borderColor: '#2980B9',
                      bgcolor: '#2980B9',
                      color: '#FFFFFF'
                    },
                    '&:disabled': {
                      bgcolor: '#BDC3C7',
                      borderColor: '#BDC3C7',
                      color: '#FFFFFF'
                    }
                  }}
                >
                  {printing ? 'Printing...' : 'Print List'}
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
                    color: showFilters ? '#FFFFFF' : '#1976D2',
                    borderColor: '#3498DB',
                    '&:hover': {
                      bgcolor: showFilters ? '#229954' : '#F8FAFC',
                      borderColor: '#3498DB',
                      color: showFilters ? '#FFFFFF' : '#1976D2'
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
                    placeholder="Search by name or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ 
                      width: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: '#FFFFFF',
                        '& fieldset': { borderColor: '#E0E0E0' },
                        '&:hover fieldset': { borderColor: '#BDC3C7' },
                        '&.Mui-focused fieldset': { borderColor: '#3498DB' },
                      },
                      '& .MuiInputBase-input': {
                        color: '#1976D2',
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
              <Box sx={{ mt: 2, p: 3, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E0E0E0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976D2' }}>
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
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#1976D2', fontWeight: 600 }}>Barangay</InputLabel>
                      <Select
                        value={filters.barangay}
                        onChange={(e) => handleFilterChange('barangay', e.target.value)}
                        label="Barangay"
                        sx={{
                          bgcolor: '#FFFFFF',
                          '& .MuiSelect-select': {
                            color: '#1976D2',
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
                            borderColor: '#3498DB'
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#FFFFFF',
                              '& .MuiMenuItem-root': {
                                color: '#1976D2',
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
                        <MenuItem value={currentUser?.barangay || 'Barangay Poblacion'} sx={{ color: '#1976D2', fontWeight: 600 }}>
                          {currentUser?.barangay || 'Barangay Poblacion'}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#1976D2', fontWeight: 600 }}>Disability Type</InputLabel>
                      <Select
                        value={filters.disability}
                        onChange={(e) => handleFilterChange('disability', e.target.value)}
                        label="Disability Type"
                        sx={{
                          bgcolor: '#FFFFFF',
                          '& .MuiSelect-select': {
                            color: '#1976D2',
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
                            borderColor: '#3498DB'
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#FFFFFF',
                              '& .MuiMenuItem-root': {
                                color: '#1976D2',
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
                        <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Types</MenuItem>
                        <MenuItem value="Visual Impairment" sx={{ color: '#1976D2', fontWeight: 600 }}>Visual Impairment</MenuItem>
                        <MenuItem value="Physical Disability" sx={{ color: '#1976D2', fontWeight: 600 }}>Physical Disability</MenuItem>
                        <MenuItem value="Hearing Impairment" sx={{ color: '#1976D2', fontWeight: 600 }}>Hearing Impairment</MenuItem>
                        <MenuItem value="Intellectual Disability" sx={{ color: '#1976D2', fontWeight: 600 }}>Intellectual Disability</MenuItem>
                        <MenuItem value="Mental Health" sx={{ color: '#1976D2', fontWeight: 600 }}>Mental Health</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#1976D2', fontWeight: 600 }}>Status</InputLabel>
                      <Select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        label="Status"
                        sx={{
                          bgcolor: '#FFFFFF',
                          '& .MuiSelect-select': {
                            color: '#1976D2',
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
                            borderColor: '#3498DB'
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#FFFFFF',
                              '& .MuiMenuItem-root': {
                                color: '#1976D2',
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
                        <MenuItem value="" sx={{ color: '#95A5A6', fontWeight: 600 }}>All Status</MenuItem>
                        {tab === 0 ? (
                          <>
                            <MenuItem value="Active" sx={{ color: '#1976D2', fontWeight: 600 }}>Active</MenuItem>
                            <MenuItem value="Inactive" sx={{ color: '#1976D2', fontWeight: 600 }}>Inactive</MenuItem>
                          </>
                        ) : (
                          <>
                            <MenuItem value="Pending" sx={{ color: '#1976D2', fontWeight: 600 }}>Pending</MenuItem>
                            <MenuItem value="Approved" sx={{ color: '#1976D2', fontWeight: 600 }}>Approved</MenuItem>
                            <MenuItem value="Rejected" sx={{ color: '#1976D2', fontWeight: 600 }}>Rejected</MenuItem>
                          </>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Table */}
          <Paper elevation={0} sx={{ 
            border: '1px solid #E0E0E0', 
            borderRadius: 2,
            backgroundColor: '#FFFFFF'
          }}>
            <TableContainer sx={{ 
              maxHeight: 'calc(100vh - 400px)',
              backgroundColor: '#FFFFFF'
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        sx={{
                          backgroundColor: '#FFFFFF',
                          color: '#0b87ac',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          borderBottom: '2px solid #E0E0E0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          py: 2,
                          px: 2,
                          textAlign: 'center',
                          cursor: column.id === 'actions' ? 'default' : 'pointer',
                          '&:hover': column.id === 'actions' ? {} : { bgcolor: '#F0F0F0' }
                        }}
                        onClick={() => column.id !== 'actions' && handleRequestSort(column.id)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {column.label}
                          {column.id !== 'actions' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                              <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === column.id && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === column.id && order === 'asc' ? 1 : 0.3 }} />
                              <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === column.id && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === column.id && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.map((row, idx) => (
                    <TableRow key={row.applicationID || row.id} sx={{ bgcolor: idx % 2 ? '#F7FBFF' : 'white' }}>
                      {columns.map((column) => (
                        <TableCell 
                          key={column.id}
                          sx={{ 
                            color: '#000000',
                            borderBottom: '1px solid #E0E0E0',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            py: 2,
                            px: 2,
                            textAlign: 'center'
                          }}
                        >
                          {column.id === 'status' ? (
                                                         <Chip
                               label={row[column.id]}
                               size="small"
                               sx={{
                                 backgroundColor: `${getStatusColor(row[column.id])}20`,
                                 color: getStatusColor(row[column.id]),
                                 fontWeight: 700,
                                 fontSize: '0.7rem',
                                 textTransform: 'uppercase',
                                 letterSpacing: '0.5px',
                                 border: `1px solid ${getStatusColor(row[column.id])}`,
                                 height: 20,
                                 '& .MuiChip-label': {
                                   px: 1,
                                   py: 0
                                 },
                                 '&:hover': {
                                   backgroundColor: `${getStatusColor(row[column.id])}30`
                                 }
                               }}
                             />
                          ) : column.id === 'actions' && tab === 1 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon sx={{ fontSize: '0.875rem' }} />}
                                onClick={() => handleViewDetails(row)}
                                sx={{
                                  borderColor: '#3498DB',
                                  color: '#3498DB',
                                  textTransform: 'none',
                                  fontSize: '0.65rem',
                                  py: 0.25,
                                  px: 0.75,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    borderColor: '#2980B9',
                                    bgcolor: '#3498DB',
                                    color: '#FFFFFF'
                                  }
                                }}
                              >
                                View
                              </Button>
                              {(row.status === 'Pending Barangay Approval' || row.status === 'Pending') && (
                                <>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleApproveClick(row)}
                                    sx={{
                                      bgcolor: '#27AE60',
                                      textTransform: 'none',
                                      fontSize: '0.65rem',
                                      py: 0.25,
                                      px: 0.75,
                                      minWidth: 'auto',
                                      '&:hover': {
                                        bgcolor: '#229954'
                                      }
                                    }}
                                  >
                                    Endorse
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleRejectClick(row)}
                                    sx={{
                                      borderColor: '#E74C3C',
                                      color: '#E74C3C',
                                      textTransform: 'none',
                                      fontSize: '0.65rem',
                                      py: 0.25,
                                      px: 0.75,
                                      minWidth: 'auto',
                                      '&:hover': {
                                        borderColor: '#C0392B',
                                        bgcolor: '#FDF2F2'
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </Box>
                                                     ) : (
                             <span style={{
                               color: column.id === 'applicationID' ? '#1976D2' : 
                                      column.id === 'firstName' || column.id === 'lastName' ? '#1976D2' :
                                      column.id === 'barangay' ? '#2980B9' :
                                      column.id === 'disabilityType' ? '#8E44AD' :
                                      column.id === 'submissionDate' ? '#E67E22' :
                                      column.id === 'contactNumber' ? '#16A085' :
                                      column.id === 'email' ? '#D35400' : '#1976D2',
                               fontWeight: column.id === 'applicationID' ? 700 : 
                                          column.id === 'firstName' || column.id === 'lastName' ? 600 : 500,
                               fontSize: '0.75rem',
                               whiteSpace: 'nowrap',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               display: 'inline-block',
                               maxWidth: '100%'
                             }}>
                               {column.id === 'submissionDate' && row[column.id] ? formatDateMMDDYYYY(row[column.id]) : row[column.id]}
                             </span>
                           )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                        color: '#1976D2',
                backgroundColor: '#FFFFFF',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        color: '#1976D2',
                  fontWeight: 500
                },
                '& .MuiTablePagination-toolbar': {
                  backgroundColor: '#FFFFFF'
                },
                '& .MuiTablePagination-select': {
                  backgroundColor: '#FFFFFF'
                }
              }}
            />
          </Paper>

          {/* Summary */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography sx={{ color: '#7F8C8D', fontSize: '0.9rem', fontWeight: 500 }}>
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredRows.length)} of {filteredRows.length} records
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Application Details Modal */}
      <Dialog
        open={viewDetailsOpen}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            p: 0,
            m: 2,
            bgcolor: '#FFFFFF',
            color: '#000000',
            zIndex: 1300 // Lower than rejection modal (1400)
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#FFFFFF', 
          color: '#000000', 
          py: 2,
          px: 3,
          borderBottom: '1px solid #E0E0E0',
          position: 'relative'
        }}>
          {selectedApplication && (
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                color: '#000000',
                fontSize: '1.25rem',
                mb: 0.5
              }}>
                {formatName(
                  selectedApplication.firstName,
                  selectedApplication.middleName,
                  selectedApplication.lastName,
                  selectedApplication.suffix
                )}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#7F8C8D',
                fontSize: '0.875rem'
              }}>
                Reference Number: {selectedApplication.referenceNumber || selectedApplication.applicationID}
              </Typography>
            </Box>
          )}
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
          p: 3, 
          bgcolor: '#FFFFFF', 
          color: '#000000',
          maxHeight: '70vh',
          overflow: 'auto'
        }}>
          {selectedApplication && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Personal Information */}
              <Paper sx={{ p: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold', 
                  color: '#0b87ac', 
                  mb: 1.5,
                  borderBottom: '2px solid #0b87ac',
                  pb: 0.75,
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
                
                {/* Contact Information - Grouped with Personal Info */}
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
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
                  </Grid>
              </Paper>

              {/* Address Information */}
              <Paper sx={{ p: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold', 
                  color: '#0b87ac', 
                  mb: 1.5,
                  borderBottom: '2px solid #F39C12',
                  pb: 0.75,
                  fontSize: '1rem'
                }}>
                  Address Information
                </Typography>
                
                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#34495E', mb: 0.25, fontSize: '0.75rem' }}>
                      Complete Address:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#0b87ac', mb: 0.75, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {(() => {
                        const addressParts = [];
                        
                        if (selectedApplication.address) {
                          addressParts.push(selectedApplication.address);
                        }
                        
                        if (selectedApplication.barangay && selectedApplication.barangay !== 'N/A') {
                          addressParts.push(selectedApplication.barangay);
                        }
                        
                        const city = selectedApplication.city && selectedApplication.city !== 'N/A' 
                          ? selectedApplication.city 
                          : 'Cabuyao';
                        addressParts.push(city);
                        
                        const province = selectedApplication.province && selectedApplication.province !== 'N/A' 
                          ? selectedApplication.province 
                          : 'Laguna';
                        addressParts.push(province);
                        
                        if (selectedApplication.postalCode && selectedApplication.postalCode !== 'N/A') {
                          addressParts.push(selectedApplication.postalCode);
                        }
                        
                        return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
                      })()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Disability Details */}
              <Paper sx={{ p: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold', 
                  color: '#0b87ac', 
                  mb: 1.5,
                  borderBottom: '2px solid #E74C3C',
                  pb: 0.75,
                  fontSize: '1rem'
                }}>
                  Disability Details
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

              {/* Uploaded Documents + Remarks */}
              <Paper sx={{ p: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF' }}>
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
                      <Grid item xs={12} sm={6} key={fieldName}>
                        <Paper sx={{ p: 1.5, border: '1px solid #DEE2E6', bgcolor: '#FAFAFA', borderRadius: 1 }}>
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
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: '80px', flex: '0 0 auto' }}>
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
                                        // Always use authenticated URL for thumbnails
                                        let singleFileUrl = null;
                                        const fileType = getFileTypeFromFieldName(fieldName);
                                        if (fileType && selectedApplication.applicationID) {
                                          try {
                                            // idPictures is now single file, no index needed (backward compatibility: old data might be array)
                                            singleFileUrl = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, fileType, null);
                                          } catch (error) {
                                            console.warn('Error getting authenticated URL for array file:', error);
                                          }
                                        }
                                        // If authenticated URL fails, try storage URL as last resort
                                        if (!singleFileUrl) {
                                          try {
                                            const normalizedPath = normalizeFilePath(ensureStorageFolder(file));
                                            singleFileUrl = api.getStorageUrl(normalizedPath);
                                          } catch (error) {
                                            console.warn('Error getting storage URL:', error);
                                          }
                                        }
                                        return (
                                          <Box
                                            key={index}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewFileBatch(fieldName, index);
                                            }}
                                            sx={{ 
                                              width: 48, 
                                              height: 64,
                                              borderRadius: 1,
                                              overflow: 'hidden',
                                              bgcolor: isImageFile(file) ? 'transparent' : '#0b87ac',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '1rem',
                                              color: 'white',
                                              border: '1px solid #ddd',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isImageFile(file) ? (
                                              <img 
                                                src={singleFileUrl} 
                                                alt="Preview" 
                                                crossOrigin="anonymous"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleViewFileBatch(fieldName, index);
                                                }}
                                                onError={(e) => {
                                                  e.target.style.display = 'none';
                                                  e.target.parentElement.innerHTML = '<span style="font-size: 0.8rem; color: white;">Preview</span>';
                                                }}
                                                style={{ 
                                                  width: '100%', 
                                                  height: '100%', 
                                                  objectFit: 'cover',
                                                  cursor: 'pointer'
                                                }}
                                              />
                                            ) : (
                                              getFileIcon(file)
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
                                  // Handle single file - use authenticated URL if available
                                  let finalFileUrl = fileUrl;
                                  if (!finalFileUrl) {
                                    // Try authenticated URL first
                                    const fileType = getFileTypeFromFieldName(fieldName);
                                    if (fileType && selectedApplication.applicationID) {
                                      try {
                                        finalFileUrl = filePreviewService.getPreviewUrl('application-file', selectedApplication.applicationID, fileType);
                                      } catch (error) {
                                        console.warn('Error getting authenticated URL for single file:', error);
                                      }
                                    }
                                    // Fallback to storage URL
                                    if (!finalFileUrl) {
                                      const normalizedPath = normalizeFilePath(ensureStorageFolder(fileName || ''));
                                      finalFileUrl = api.getStorageUrl(normalizedPath);
                                    }
                                  }
                                  
                                  return (
                                    <Box
                                      sx={{ 
                                        width: 56, 
                                        height: 80,
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        bgcolor: isImageFile(fileName) ? 'transparent' : '#0b87ac',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        color: 'white',
                                        border: '1px solid #ddd'
                                      }}
                                    >
                                      {isImageFile(fileName) && finalFileUrl ? (
                                        <img 
                                          src={finalFileUrl} 
                                          alt="Preview" 
                                          crossOrigin="anonymous"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewFile(fieldName);
                                          }}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            // Show placeholder text if image fails to load
                                            const parent = e.target.parentElement;
                                            if (parent && !parent.textContent.includes('Preview')) {
                                              parent.innerHTML = '<span style="font-size: 0.7rem; color: white; text-align: center; padding: 5px;">Preview</span>';
                                            }
                                          }}
                                          style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover' 
                                          }}
                                        />
                                      ) : (
                                        getFileIcon(fileName)
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
                          </Box>
                          {docInfo.description && (
                            <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                              {docInfo.description}
                              </Typography>
                          )}
                          {/* Document Remarks - Only show when rejecting */}
                          {pendingAction === 'reject' && (
                            <Box sx={{ mt: 1.5 }}>
                              <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                                size="small"
                                placeholder={`Add remarks for ${docInfo.name} (optional)`}
                                value={documentRemarks[fieldName] || ''}
                                onChange={(e) => setDocumentRemarks(prev => ({
                                  ...prev,
                                  [fieldName]: e.target.value
                                }))}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '0.75rem',
                                    bgcolor: '#FFFFFF',
                                    '& fieldset': {
                                      borderColor: '#E74C3C'
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#C0392B'
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#E74C3C'
                                    }
                                  }
                                }}
                              />
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    );
                  }                  )}
                </Grid>
              </Paper>

              {/* Remarks Section - Only show for pending applications */}
              {selectedApplication && (selectedApplication.status === 'Pending Barangay Approval' || selectedApplication.status === 'Pending') && (
                <Paper sx={{ p: 2, border: '1px solid #DEE2E6', bgcolor: '#FFFFFF', mt: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: '#0b87ac', 
                    mb: 1.5,
                    borderBottom: '2px solid #3498DB',
                    pb: 0.75,
                    fontSize: '1rem'
                  }}>
                    Remarks
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={6}
                    placeholder="Enter remarks or notes about this application (optional)"
                    value={applicationRemarks}
                    onChange={(e) => setApplicationRemarks(e.target.value)}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.9rem',
                        '& fieldset': {
                          borderColor: '#DEE2E6'
                        },
                        '&:hover fieldset': {
                          borderColor: '#0b87ac'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#0b87ac'
                        }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                    These remarks will be included when endorsing the application. Leave empty to use default message.
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 2, 
          bgcolor: '#F8F9FA',
          borderTop: '1px solid #DEE2E6',
          gap: 1,
          justifyContent: 'flex-end'
        }}>
          <Button
            onClick={handleCloseDetails}
            variant="outlined"
            size="medium"
            sx={{
              borderColor: '#6C757D',
              color: '#6C757D',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Close
          </Button>
          {selectedApplication && (selectedApplication.status === 'Pending Barangay Approval' || selectedApplication.status === 'Pending') && (
            <>
              <Button
                onClick={handleRequestCorrection}
                variant="outlined"
                size="medium"
                startIcon={<EditIcon />}
                sx={{
                  borderColor: '#F39C12',
                  color: '#F39C12',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#E67E22',
                    bgcolor: '#FEF5E7'  
                  }
                }}
              >
                Request Document Correction
              </Button>
              {pendingAction === 'reject' ? (
                <Button
                  onClick={handleRejectFromModal}
                  variant="contained"
                  size="medium"
                  sx={{
                    bgcolor: '#E74C3C',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#C0392B'
                    }
                  }}
                >
                  Reject
                </Button>
              ) : pendingAction === 'approve' ? (
                <Button
                  onClick={handleApproveFromModal}
                  variant="contained"
                  size="medium"
                  sx={{
                    bgcolor: '#27AE60',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#229954'
                    }
                  }}
                >
                  Endorse
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleRejectFromModal}
                    variant="contained"
                    size="medium"
                    sx={{
                      bgcolor: '#E74C3C',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#C0392B'
                      }
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleApproveFromModal}
                    variant="contained"
                    size="medium"
                    sx={{
                      bgcolor: '#27AE60',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#229954'
                      }
                    }}
                  >
                    Endorse
                  </Button>
                </>
              )}
            </>
          )}
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

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={approvalConfirmationOpen}
        onClose={() => setApprovalConfirmationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#27AE60', color: '#FFFFFF', fontWeight: 'bold' }}>
          Confirm Endorsement
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1">
            Are you sure you want to endorse this application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setApprovalConfirmationOpen(false)}
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
            onClick={handleApproveConfirm}
            variant="contained"
            sx={{
              bgcolor: '#27AE60',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#229954'
              }
            }}
          >
            Confirm Endorsement
          </Button>
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

      {/* Image Preview Modal */}
      <Dialog
        open={imagePreviewOpen}
        onClose={handleCloseImagePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            bgcolor: '#000'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: '#000',
            color: '#fff',
            borderBottom: '1px solid #333'
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff' }}>
            {previewImageTitle}
          </Typography>
          <IconButton
            onClick={handleCloseImagePreview}
            sx={{ color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#000',
            minHeight: '60vh',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          {previewImageUrl && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                p: 2
              }}
            >
              <img
                src={previewImageUrl}
                alt={previewImageTitle}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Error loading image:', e);
                  toastService.error('Failed to load image');
                  handleCloseImagePreview();
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            bgcolor: '#000',
            borderTop: '1px solid #333',
            p: 2
          }}
        >
          <Button
            onClick={handleCloseImagePreview}
            variant="contained"
            sx={{
              bgcolor: '#6C757D',
              color: '#fff',
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#5A6268'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    );
  }

  export default BarangayPresidentPWDRecords;
