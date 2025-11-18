// src/components/cards/PWDCard.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  DialogActions,
  Tabs,
  Tab
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
  ArrowDownward as ArrowDownwardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Pagination } from '@mui/material';
import AdminSidebar from '../shared/AdminSidebar';
import FrontDeskSidebar from '../shared/FrontDeskSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import pwdMemberService from '../../services/pwdMemberService';
import QRCodeService from '../../services/qrCodeService';
import SuccessModal from '../shared/SuccessModal';
import { useModal } from '../../hooks/useModal';
import { jsPDF } from 'jspdf';
import { API_CONFIG } from '../../config/production';
import toastService from '../../services/toastService';

const PLACEHOLDER_LINE = '________________';
const HTML_ESCAPE_LOOKUP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const escapeHtml = (value = '') => value.toString().replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char] || char);

const getMemberFullName = (member = {}) => {
  if (!member) return '';
  const parts = [
    member.firstName,
    member.middleName && member.middleName.trim().toUpperCase() !== 'N/A' ? member.middleName : '',
    member.lastName,
    member.suffix
  ].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const getMemberAddressLine = (member = {}) => {
  if (!member) return '';
  const addressParts = [];
  if (member.address) addressParts.push(member.address);
  if (member.barangay && member.barangay !== 'N/A') addressParts.push(member.barangay);
  const city = member.cityMunicipality || member.city || 'Cabuyao';
  const province = member.province || 'Laguna';
  addressParts.push(city);
  addressParts.push(province);
  return addressParts.join(', ').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '');
};

const getMemberIdNumber = (member = {}) => {
  if (!member) return '';
  if (member.pwd_id) return member.pwd_id;
  if (member.id) return member.id;
  if (member.userID || member.userId) {
    const idValue = member.userID || member.userId;
    return `PWD-${String(idValue).padStart(6, '0')}`;
  }
  return '';
};

const formatCardDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return '';
  }
};

const withPlaceholder = (value, { uppercase = false } = {}) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return PLACEHOLDER_LINE;
  }
  const text = value.toString();
  return uppercase ? text.toUpperCase() : text;
};

const LOGO_FILES = {
  flag: 'Philippine Flag.jpg',
  bagong: 'Bagong Cabuyao Logo.jpg',
  pdao: 'PDAO Logo.jpg',
  seal: 'Lungsod ng cabuyao Logo.jpg'
};

const buildLogoUrl = (filename) => {
  const basePath = process.env.PUBLIC_URL || '';
  const encoded = filename
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${basePath}/logos/${encoded}`.replace(/([^:]\/)\/+/g, '$1');
};

const LOGO_URLS = Object.fromEntries(
  Object.entries(LOGO_FILES).map(([key, filename]) => [key, buildLogoUrl(filename)])
);

const detectImageFormat = (dataUrl) => {
  const match = dataUrl?.match(/^data:image\/(png|jpeg|jpg)/i);
  if (!match) return 'PNG';
  const extension = match[1].toUpperCase();
  return extension === 'JPG' ? 'JPEG' : extension;
};

const fetchImageDataUrl = async (url) => {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function PWDCard() {
  const { currentUser } = useAuth();
  const [pwdMembers, setPwdMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [idPictureUrl, setIdPictureUrl] = useState(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const logoAssetsRef = useRef({});

  const ensureLogoAssetsLoaded = useCallback(async () => {
    const currentAssets = logoAssetsRef.current;
    const missingKeys = Object.keys(LOGO_FILES).filter((key) => !currentAssets[key]);

    if (!missingKeys.length) {
      return currentAssets;
    }

    const loadedEntries = await Promise.all(
      missingKeys.map(async (key) => {
        try {
          const dataUrl = await fetchImageDataUrl(LOGO_URLS[key]);
          return [key, { dataUrl, format: detectImageFormat(dataUrl) }];
        } catch (error) {
          console.error(`Failed to load ${key} asset`, error);
          return null;
        }
      })
    );

    const nextAssets = { ...currentAssets };
    loadedEntries.forEach((entry) => {
      if (!entry) return;
      const [key, asset] = entry;
      nextAssets[key] = asset;
    });

    logoAssetsRef.current = nextAssets;
    return nextAssets;
  }, []);

  useEffect(() => {
    ensureLogoAssetsLoaded();
  }, [ensureLogoAssetsLoaded]);
  
  // Success modal
  const { modalOpen, modalConfig, showModal, hideModal } = useModal();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);
  const [pagination, setPagination] = useState({
    total: 0,
    last_page: 1,
    has_more: false
  });
  
  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
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

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Renewals state
  const [renewals, setRenewals] = useState([]);
  const [loadingRenewals, setLoadingRenewals] = useState(false);
  const [renewalStatusFilter, setRenewalStatusFilter] = useState('all');
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [viewRenewalDialogOpen, setViewRenewalDialogOpen] = useState(false);
  const [viewingRenewalFile, setViewingRenewalFile] = useState(null);
  const [processingRenewal, setProcessingRenewal] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [renewalNotes, setRenewalNotes] = useState('');

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.barangay, filters.disability, filters.status, filters.ageRange]);

  // Reset card flip when member selection changes
  useEffect(() => {
    setIsCardFlipped(false);
  }, [selectedMember]);

  // Fetch PWD members from API with pagination and filters
  const fetchPwdMembers = async (page = currentPage, showLoading = false) => {
    try {
      // Only show loading animation on initial load or when explicitly requested
      if (showLoading || isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      
      // Build API parameters
      const params = {
        page,
        per_page: perPage
      };
      
      // Add search filter
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      
      // Add other filters
      if (filters.barangay) {
        params.barangay = filters.barangay;
      }
      
      if (filters.disability) {
        params.disability_type = filters.disability;
      }
      
      if (filters.status) {
        params.status = filters.status;
      }
      
      const response = await pwdMemberService.getAll(params);
      const members = response.data || response.members || [];
      
      // Update pagination metadata
      if (response.pagination) {
        setPagination(response.pagination);
      } else {
        // Fallback: estimate pagination from response
        const total = response.count || members.length;
        setPagination({
          total,
          last_page: Math.ceil(total / perPage),
          has_more: page * perPage < total
        });
      }
      
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
          contactNumber: member.contactNumber || member.contact_number || member.phone || member.phoneNumber || '',
          emergencyContact: member.emergencyContact || member.emergency_contact || member.guardianName || member.guardian_name || '',
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
      
      // Handle selected member preservation when filters change
      if (transformedMembers.length > 0) {
        if (!selectedMember) {
          // No member selected, select the first one
          setSelectedMember(transformedMembers[0].id);
        } else {
          // Check if currently selected member is still in the filtered results
          const isSelectedMemberInResults = transformedMembers.some(m => m.id === selectedMember);
          if (!isSelectedMemberInResults) {
            // Selected member is not in filtered results, select the first member
            setSelectedMember(transformedMembers[0].id);
          }
          // If selected member is still in results, keep it selected (no change needed)
        }
      } else {
        // No members in filtered results, clear selection
        setSelectedMember(null);
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
      if (showLoading || isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  // Load PWD members when page or filters change
  useEffect(() => {
    // Don't show loading animation for search/filter changes, only for initial load
    fetchPwdMembers(currentPage, false);
  }, [currentPage, debouncedSearch, filters.barangay, filters.disability, filters.status]);

  // Fetch ID picture from member documents when member is selected
  useEffect(() => {
    if (!selectedMember || pwdMembers.length === 0) {
      setIdPictureUrl(null);
      return;
    }
    
    const fetchIdPicture = async () => {
      try {
        const member = pwdMembers.find(m => m.id === selectedMember);
        if (!member || !member.memberId) {
          setIdPictureUrl(null);
          return;
        }
        
        console.log('Fetching ID picture for member:', member.memberId);
        // Fetch member documents for the selected member
        // Use the admin endpoint to get all members with their documents, then filter for this member
        const response = await api.get('/documents/all-members');
        
        if (response && response.success && response.members) {
          // Find the specific member in the response
          const targetMember = response.members.find(m => 
            m.id === member.memberId || 
            m.userID === member.memberId ||
            m.pwd_member?.userID === member.memberId
          );
          
          // Handle both camelCase (from backend) and snake_case (normalized)
          // The structure is: member.memberDocuments is an array of MemberDocument records
          const memberDocs = targetMember.memberDocuments || targetMember.member_documents || [];
          
          if (memberDocs.length > 0) {
            // Find the ID Pictures MemberDocument record
            // Each memberDoc is a MemberDocument with a requiredDocument relationship
            const idPicturesDoc = memberDocs.find(md => {
              const docName = md.requiredDocument?.name || md.required_document?.name || 
                             md.requiredDocumentName || md.required_document_name;
              return docName === 'ID Pictures' || docName === 'ID Picture';
            });
            
            if (idPicturesDoc) {
              // idPicturesDoc IS the upload record, not a document type with nested uploads
              if (idPicturesDoc.id) {
                // Use the document-file API endpoint to get the authenticated URL
                const fileUrl = api.getFilePreviewUrl('document-file', idPicturesDoc.id);
                
                // Add authentication token if available
                const token = localStorage.getItem('auth.token');
                if (token) {
                  try {
                    const tokenData = JSON.parse(token);
                    const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
                    if (tokenValue) {
                      const separator = fileUrl.includes('?') ? '&' : '?';
                      const finalUrl = `${fileUrl}${separator}token=${tokenValue}`;
                      setIdPictureUrl(finalUrl);
                      console.log('ID picture URL set from member documents (member_doc id):', finalUrl);
                      return;
                    }
                  } catch (error) {
                    console.warn('Error parsing auth token:', error);
                  }
                }
                
                setIdPictureUrl(fileUrl);
                console.log('ID picture URL set from member documents (member_doc id):', fileUrl);
                return;
              }
              
              const filePath = idPicturesDoc.file_path || idPicturesDoc.filePath;
              if (filePath) {
                const storageUrl = api.getStorageUrl(filePath);
                setIdPictureUrl(storageUrl);
                console.log('ID picture URL set from file path:', storageUrl);
                return;
              }
              
              console.log('ID Pictures document found but no file path or ID available');
            } else {
              console.log('No ID Pictures document found in member documents, checking application files...');
              
              // Fallback: Check if member has idPictures in their profile (from application)
              if (member.idPictures) {
                let imagePath = null;
                if (Array.isArray(member.idPictures)) {
                  imagePath = member.idPictures[0];
                } else if (typeof member.idPictures === 'string') {
                  try {
                    const parsed = JSON.parse(member.idPictures);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      imagePath = parsed[0];
                    } else {
                      imagePath = member.idPictures;
                    }
                  } catch (error) {
                    imagePath = member.idPictures;
                  }
                }
                
                if (imagePath) {
                  const storageUrl = api.getStorageUrl(imagePath);
                  setIdPictureUrl(storageUrl);
                  console.log('ID picture URL set from application file (fallback):', storageUrl);
                  return;
                }
              }
              
              setIdPictureUrl(null);
            }
          } else {
            console.log('No documents found for this member, checking application files...');
            
            // Fallback: Check if member has idPictures in their profile (from application)
            if (member.idPictures) {
              let imagePath = null;
              if (Array.isArray(member.idPictures)) {
                imagePath = member.idPictures[0];
              } else if (typeof member.idPictures === 'string') {
                try {
                  const parsed = JSON.parse(member.idPictures);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    imagePath = parsed[0];
                  } else {
                    imagePath = member.idPictures;
                  }
                } catch (error) {
                  imagePath = member.idPictures;
                }
              }
              
              if (imagePath) {
                const storageUrl = api.getStorageUrl(imagePath);
                setIdPictureUrl(storageUrl);
                console.log('ID picture URL set from application file (fallback):', storageUrl);
                return;
              }
            }
            
            setIdPictureUrl(null);
          }
        } else {
          console.log('No documents found or invalid response');
          setIdPictureUrl(null);
        }
      } catch (error) {
        console.error('Error fetching ID picture from member documents:', error);
        setIdPictureUrl(null);
      }
    };
    
    fetchIdPicture();
  }, [selectedMember, pwdMembers]);

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


  const handleDownloadPDF = async () => {
    if (!selectedMemberData) {
      showModal({
        type: 'warning',
        title: 'No Member Selected',
        message: 'Please select a PWD member to generate their card PDF.',
        buttonText: 'OK'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Ensure QR code is generated before proceeding
      let qrCode = qrCodeDataURL;
      if (!qrCode) {
        try {
          qrCode = await QRCodeService.generateMemberQRCode(selectedMemberData);
          setQrCodeDataURL(qrCode);
        } catch (error) {
          console.error('Error generating QR code for PDF:', error);
          // Continue without QR code - will show placeholder
        }
      }
      
      const memberName = selectedMemberData.name || `${selectedMemberData.firstName || ''} ${selectedMemberData.middleName || ''} ${selectedMemberData.lastName || ''}`.trim() || 'Unknown';
      const memberId = selectedMemberData.pwd_id || selectedMemberData.id || `PWD-${selectedMemberData.userID || 'N/A'}`;

      // Create PDF in landscape orientation to fit both front and back side by side (6.5in x 2in)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [6.5, 2]
      });
      const logos = await ensureLogoAssetsLoaded();
      const addLogoImage = (asset, x, y, width, height, fallback) => {
        if (asset?.dataUrl) {
          pdf.addImage(asset.dataUrl, asset.format || 'PNG', x, y, width, height);
        } else if (typeof fallback === 'function') {
          fallback();
        }
      };

      // Set up dimensions for each card
      const cardWidth = 3;
      const cardHeight = 2;
      const cardSpacing = 0.25; // Space between front and back cards
      const pageMargin = 0.1; // Margin from page edges
      
      // Front card position (left side)
      const frontCardX = pageMargin;
      const frontCardY = pageMargin;
      
      // Back card position (right side)
      const backCardX = frontCardX + cardWidth + cardSpacing;
      const backCardY = pageMargin;
      
      const margin = 0.05; // Internal margin for each card
      const contentWidth = cardWidth - (margin * 2);
      const contentHeight = cardHeight - (margin * 2);

      // Draw border for front card (full card size)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(frontCardX, frontCardY, cardWidth, cardHeight);

      const centerX = frontCardX + cardWidth / 2;
      const headerTop = frontCardY + margin + 0.2;
      const headerLeftX = frontCardX + margin + 0.05;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('REPUBLIC OF THE PHILIPPINES', headerLeftX, headerTop);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5);
      pdf.text(`PROVINCE OF ${provinceValue}`, headerLeftX, headerTop + 0.07);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.text(`CITY OF ${cityValue}`, headerLeftX, headerTop + 0.14);

      // Logo group on the right - smaller size
      const topLogoSize = 0.28;
      const topLogoGap = 0.04;
      const topLogoY = frontCardY + margin + 0.02;
      const frontPdaoX = frontCardX + cardWidth - margin - topLogoSize;
      const frontSealX = frontPdaoX - topLogoGap - topLogoSize;

      addLogoImage(logos?.pdao, frontPdaoX, topLogoY, topLogoSize, topLogoSize, () => {
        const centerXLogo = frontPdaoX + topLogoSize / 2;
        const centerYLogo = topLogoY + topLogoSize / 2;
        pdf.setFillColor(0, 56, 168);
        pdf.circle(centerXLogo, centerYLogo, topLogoSize / 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text('♿', centerXLogo, centerYLogo + 0.01, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      });

      addLogoImage(logos?.seal, frontSealX, topLogoY, topLogoSize, topLogoSize, () => {
        const centerXLogo = frontSealX + topLogoSize / 2;
        const centerYLogo = topLogoY + topLogoSize / 2;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.005);
        pdf.circle(centerXLogo, centerYLogo, topLogoSize / 2);
        pdf.circle(centerXLogo, centerYLogo, topLogoSize / 2 - 0.01);
        pdf.setFontSize(3);
        pdf.setFont('helvetica', 'bold');
        pdf.text('LUNGSOD', centerXLogo, centerYLogo - 0.035, { align: 'center' });
        pdf.text('NG', centerXLogo, centerYLogo - 0.02, { align: 'center' });
        pdf.text('CABUYAO', centerXLogo, centerYLogo - 0.005, { align: 'center' });
        pdf.text('2012', centerXLogo, centerYLogo + 0.01, { align: 'center' });
      });

      const contentStartY = headerTop + 0.28;
      const leftColumnX = frontCardX + margin + 0.06;
      const leftColumnWidth = contentWidth * 0.55;
      const rightColumnWidth = contentWidth * 0.35;
      const rightColumnX = frontCardX + cardWidth - margin - rightColumnWidth;

      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NAME', leftColumnX, contentStartY + 0.05);
      pdf.setLineWidth(0.003);
      pdf.line(leftColumnX, contentStartY + 0.07, leftColumnX + leftColumnWidth * 0.85, contentStartY + 0.07);
      pdf.setFontSize(6);
      const nameLines = pdf.splitTextToSize(displayName, leftColumnWidth * 0.85);
      pdf.text(nameLines, leftColumnX, contentStartY + 0.12);

      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DISABILITY', leftColumnX, contentStartY + 0.25);
      pdf.line(leftColumnX, contentStartY + 0.27, leftColumnX + leftColumnWidth * 0.85, contentStartY + 0.27);
      pdf.setFontSize(5.5);
      const disabilityLines = pdf.splitTextToSize(displayDisability, leftColumnWidth * 0.85);
      pdf.text(disabilityLines, leftColumnX, contentStartY + 0.32);

      const idTextY = contentStartY + 0.05;
      const rightCenterX = rightColumnX + rightColumnWidth / 2;
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ID NO.', rightCenterX, idTextY, { align: 'center' });
      pdf.setFontSize(5.5);
      pdf.text(displayIdNumber, rightCenterX, idTextY + 0.08, { align: 'center' });

      // 2x2 inch photo (square) - slightly smaller
      const photoSize = Math.min(rightColumnWidth * 0.65, 0.85);
      const photoWidth = photoSize;
      const photoHeight = photoSize;
      const photoX = rightColumnX + (rightColumnWidth - photoWidth) / 2;
      const photoY = idTextY + 0.12;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(photoX, photoY, photoWidth, photoHeight);
      pdf.setFillColor(243, 244, 246);
      pdf.rect(photoX, photoY, photoWidth, photoHeight, 'F');

      const photoSource = resolvedPhotoUrl;
      if (photoSource) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = photoSource;
          
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                pdf.addImage(imgData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
                resolve();
              } catch (error) {
                console.error('Error adding image to PDF:', error);
                pdf.setFontSize(5);
                pdf.text('2x2', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
                resolve();
              }
            };
            img.onerror = () => {
              pdf.setFontSize(5);
              pdf.text('2x2', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
              resolve();
            };
            setTimeout(() => {
              pdf.setFontSize(5);
              pdf.text('2x2', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
              resolve();
            }, 3000);
          });
        } catch (error) {
          console.error('Error loading image:', error);
          pdf.setFontSize(5);
          pdf.text('2x2', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
        }
      } else {
        pdf.setFontSize(5);
        pdf.text('2x2', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
      }

      // Bottom flag and Bagong wordmark - ensure they fit within card
      const flagWidthPdf = 0.38;
      const flagHeightPdf = 0.23;
      const flagPosX = frontCardX + margin + 0.05;
      const flagPosY = frontCardY + cardHeight - margin - flagHeightPdf - 0.18;

      addLogoImage(logos?.flag, flagPosX, flagPosY, flagWidthPdf, flagHeightPdf, () => {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.005);
        pdf.rect(flagPosX, flagPosY, flagWidthPdf, flagHeightPdf);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(flagPosX, flagPosY, flagWidthPdf * 0.33, flagHeightPdf, 'F');
        pdf.setFillColor(0, 56, 168);
        pdf.rect(flagPosX + flagWidthPdf * 0.33, flagPosY, flagWidthPdf * 0.67, flagHeightPdf / 2, 'F');
        pdf.setFillColor(206, 17, 38);
        pdf.rect(flagPosX + flagWidthPdf * 0.33, flagPosY + flagHeightPdf / 2, flagWidthPdf * 0.67, flagHeightPdf / 2, 'F');
        pdf.setFillColor(252, 209, 22);
        pdf.circle(flagPosX + flagWidthPdf * 0.2, flagPosY + flagHeightPdf / 2, 0.03, 'F');
      });

      const bagongWidthPdf = 0.65;
      const bagongHeightPdf = 0.22;
      const bagongPosX = frontCardX + cardWidth - margin - bagongWidthPdf - 0.05;
      const bagongPosY = flagPosY + (flagHeightPdf - bagongHeightPdf) / 2;

      addLogoImage(logos?.bagong, bagongPosX, bagongPosY, bagongWidthPdf, bagongHeightPdf, () => {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(183, 28, 28);
        pdf.text('BAGONG CABUYAO', bagongPosX + bagongWidthPdf, bagongPosY + bagongHeightPdf / 2 + 0.03, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      });

      const footerY = frontCardY + cardHeight - margin - 0.05;
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VALID ANYWHERE IN PHILIPPINES', centerX, footerY, { align: 'center' });

      // BACK SIDE - Right side of the page
      const backMargin = 0.05;
      const backContentWidth = cardWidth - (backMargin * 2);
      const backContentHeight = cardHeight - (backMargin * 2);

      // Draw border for back side (full card size)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(backCardX, backCardY, cardWidth, cardHeight);

      // Top right logos - smaller size
      const topRightY = backCardY + backMargin + 0.05;
      const backPdaoSize = 0.24;
      const backSealSize = 0.26;
      const bagongWidthBack = 0.7;
      const bagongHeightBack = 0.22;
      const backPdaoX = backCardX + cardWidth - backMargin - backPdaoSize;
      const backSealX = backPdaoX - 0.04 - backSealSize;
      const bagongX = backSealX - 0.06 - bagongWidthBack;

      addLogoImage(logos?.pdao, backPdaoX, topRightY, backPdaoSize, backPdaoSize, () => {
        const centerXLogo = backPdaoX + backPdaoSize / 2;
        const centerYLogo = topRightY + backPdaoSize / 2;
        pdf.setFillColor(0, 56, 168);
        pdf.circle(centerXLogo, centerYLogo, backPdaoSize / 2, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text('♿', centerXLogo, centerYLogo + 0.01, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      });

      addLogoImage(logos?.seal, backSealX, topRightY, backSealSize, backSealSize, () => {
        const centerXLogo = backSealX + backSealSize / 2;
        const centerYLogo = topRightY + backSealSize / 2;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.005);
        pdf.circle(centerXLogo, centerYLogo, backSealSize / 2);
        pdf.circle(centerXLogo, centerYLogo, backSealSize / 2 - 0.01);
        pdf.setFontSize(3);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('LUNGSOD', centerXLogo, centerYLogo - 0.035, { align: 'center' });
        pdf.text('NG', centerXLogo, centerYLogo - 0.02, { align: 'center' });
        pdf.text('CABUYAO', centerXLogo, centerYLogo - 0.005, { align: 'center' });
        pdf.text('2012', centerXLogo, centerYLogo + 0.01, { align: 'center' });
      });

      addLogoImage(logos?.bagong, bagongX, topRightY + 0.02, bagongWidthBack, bagongHeightBack, () => {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 107, 53);
        pdf.text('BAGONG CABUYAO', bagongX + bagongWidthBack, topRightY + bagongHeightBack / 2 + 0.02, { align: 'left' });
        pdf.setTextColor(0, 0, 0);
      });

      // Main content: QR Code covers whole left side, details on right (landscape layout)
      const backMainContentY = topRightY + 0.2;
      const qrCodeColumnWidth = cardWidth * 0.5; // QR code takes half the card width
      const backLeftColumnX = backCardX + backMargin + 0.05;
      const backRightColumnX = backLeftColumnX + qrCodeColumnWidth + 0.05;
      const backRightColumnWidth = (backCardX + cardWidth) - backRightColumnX - backMargin - 0.05;

      // QR Code (left side - covers whole left half)
      const qrCodeHeight = (backCardY + cardHeight) - backMainContentY - backMargin - 0.1;
      const qrCodeSize = Math.min(qrCodeColumnWidth - 0.1, qrCodeHeight); // Square, fits in left half
      const qrCodeX = backLeftColumnX + (qrCodeColumnWidth - qrCodeSize) / 2; // Center in left half
      const qrCodeY = backMainContentY + (qrCodeHeight - qrCodeSize) / 2; // Center vertically

      if (qrCode) {
        try {
          pdf.addImage(qrCode, 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
        } catch (error) {
          console.error('Error adding QR code to PDF:', error);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.01);
          pdf.rect(qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
          pdf.setFontSize(qrCodeSize * 2);
          pdf.text('QR CODE', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2, { align: 'center' });
        }
      } else {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.01);
        pdf.rect(qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
        pdf.setFontSize(qrCodeSize * 2);
        pdf.text('QR CODE', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2, { align: 'center' });
      }

      // Member details (right side) - Better space utilization
      let detailY = backMainContentY;
      const lineHeight = 0.14;
      const fieldLabelSize = 4.5;
      const fieldValueSize = 4;

      // ADDRESS
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ADDRESS:', backRightColumnX, detailY);
      pdf.setLineWidth(0.003);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      const addressLines = pdf.splitTextToSize(displayAddress, backRightColumnWidth * 0.95);
      pdf.text(addressLines, backRightColumnX, detailY + 0.055);
      detailY += (addressLines.length * 0.055) + lineHeight;

      // DATE OF BIRTH and DATE ISSUED (side by side)
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE OF BIRTH:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.45, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayDob, backRightColumnX, detailY + 0.055);
      
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE ISSUED:', backRightColumnX + backRightColumnWidth * 0.52, detailY);
      pdf.line(backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayDateIssued, backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.055);
      detailY += lineHeight;

      // SEX and BLOOD TYPE (side by side)
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SEX:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.45, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayGender, backRightColumnX, detailY + 0.055);
      
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BLOOD TYPE:', backRightColumnX + backRightColumnWidth * 0.52, detailY);
      pdf.line(backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayBloodType, backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.055);
      detailY += lineHeight;

      // CONTACT NO
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTACT NO:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayContact, backRightColumnX, detailY + 0.055);
      detailY += lineHeight;

      // GUARDIAN NAME
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GUARDIAN NAME:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayGuardian, backRightColumnX, detailY + 0.055);

      // Save PDF
      const fileName = `PWD_ID_Card_${memberName.replace(/\s+/g, '_')}_${memberId}.pdf`;
      pdf.save(fileName);

      showModal({
        type: 'success',
        title: 'PDF Generated Successfully',
        message: `PWD ID Card PDF for ${memberName} has been generated and downloaded.`,
        buttonText: 'OK'
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      showModal({
        type: 'error',
        title: 'Error Generating PDF',
        message: 'Failed to generate PDF. Please try again.',
        buttonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
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
        await fetchPwdMembers(currentPage, false);
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
        await fetchPwdMembers(currentPage, false);
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

  // Load renewals
  useEffect(() => {
    if (activeTab === 1) {
      loadRenewals();
    }
  }, [activeTab, renewalStatusFilter]);

  const loadRenewals = async () => {
    try {
      setLoadingRenewals(true);
      const status = renewalStatusFilter === 'all' ? '' : renewalStatusFilter;
      const response = await api.get(`/id-renewals${status ? `?status=${status}` : ''}`);
      
      if (response?.success) {
        setRenewals(response.renewals || []);
      }
    } catch (err) {
      console.error('Error loading renewals:', err);
    } finally {
      setLoadingRenewals(false);
    }
  };

  const handleViewRenewalFile = async (renewalId, type) => {
    try {
      const apiBaseUrl = API_CONFIG?.API_BASE_URL || 'http://localhost:8000/api';
      let token = null;
      
      try {
        const raw = localStorage.getItem('auth.token');
        token = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('Error parsing auth token:', e);
      }

      const response = await fetch(`${apiBaseUrl}/id-renewals/${renewalId}/file/${type}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setViewingRenewalFile(url);
      setViewRenewalDialogOpen(true);
    } catch (err) {
      console.error('Error viewing file:', err);
      toastService.error('Failed to load file');
    }
  };

  const handleCloseViewRenewalDialog = () => {
    setViewRenewalDialogOpen(false);
    if (viewingRenewalFile) {
      window.URL.revokeObjectURL(viewingRenewalFile);
      setViewingRenewalFile(null);
    }
  };

  const handleApproveRenewal = async () => {
    if (!selectedRenewal) return;

    try {
      setProcessingRenewal(selectedRenewal.id);
      await api.post(`/id-renewals/${selectedRenewal.id}/approve`, {
        notes: renewalNotes
      });
      toastService.success('Renewal approved successfully');
      setApproveDialogOpen(false);
      setSelectedRenewal(null);
      setRenewalNotes('');
      loadRenewals();
    } catch (err) {
      console.error('Error approving renewal:', err);
      toastService.error('Failed to approve renewal');
    } finally {
      setProcessingRenewal(null);
    }
  };

  const handleRejectRenewal = async () => {
    if (!selectedRenewal || !renewalNotes.trim()) {
      toastService.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingRenewal(selectedRenewal.id);
      await api.post(`/id-renewals/${selectedRenewal.id}/reject`, {
        notes: renewalNotes
      });
      toastService.success('Renewal rejected');
      setRejectDialogOpen(false);
      setSelectedRenewal(null);
      setRenewalNotes('');
      loadRenewals();
    } catch (err) {
      console.error('Error rejecting renewal:', err);
      toastService.error('Failed to reject renewal');
    } finally {
      setProcessingRenewal(null);
    }
  };

  const openApproveDialog = (renewal) => {
    setSelectedRenewal(renewal);
    setRenewalNotes('');
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (renewal) => {
    setSelectedRenewal(renewal);
    setRenewalNotes('');
    setRejectDialogOpen(true);
  };

  const handlePrintCard = async () => {
    if (!selectedMemberData) {
      showModal({
        type: 'warning',
        title: 'No Member Selected',
        message: 'Please select a PWD member to print their card.',
        buttonText: 'OK'
      });
      return;
    }

    // Ensure QR code is generated before proceeding
    let qrCode = qrCodeDataURL;
    if (!qrCode) {
      try {
        qrCode = await QRCodeService.generateMemberQRCode(selectedMemberData);
        setQrCodeDataURL(qrCode);
      } catch (error) {
        console.error('Error generating QR code for print:', error);
        // Continue without QR code - will show placeholder
      }
    }

    const printWindow = window.open('', '_blank');
    const memberName = selectedMemberData.name || `${selectedMemberData.firstName || ''} ${selectedMemberData.middleName || ''} ${selectedMemberData.lastName || ''}`.trim() || 'Unknown';
    const memberId = selectedMemberData.pwd_id || selectedMemberData.id || `PWD-${selectedMemberData.userID || 'N/A'}`;
    
    const escapedName = escapeHtml(displayName);
    const escapedDisability = escapeHtml(displayDisability);
    const escapedIdNumber = escapeHtml(displayIdNumber);
    const escapedAddress = escapeHtml(displayAddress);
    const escapedDob = escapeHtml(displayDob);
    const escapedDateIssued = escapeHtml(displayDateIssued);
    const escapedGender = escapeHtml(displayGender);
    const escapedBloodType = escapeHtml(displayBloodType);
    const escapedContact = escapeHtml(displayContact);
    const escapedGuardian = escapeHtml(displayGuardian);
    const escapedProvince = escapeHtml(provinceValue);
    const escapedCity = escapeHtml(cityValue);
    const escapedBagong = 'BAGONG CABUYAO';

    const sanitizedPhotoSrc = resolvedPhotoUrl ? escapeHtml(resolvedPhotoUrl) : '';
    const sanitizedQrSrc = qrCode ? escapeHtml(qrCode) : '';

    const photoMarkup = sanitizedPhotoSrc
      ? `<img src="${sanitizedPhotoSrc}" alt="ID Photo" />`
      : '<span class="photo-placeholder-text">2x2</span>';

    const qrMarkup = sanitizedQrSrc
      ? `<img src="${sanitizedQrSrc}" alt="QR Code" />`
      : '<span class="qr-placeholder-text">QR CODE</span>';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PWD ID Card - ${escapeHtml(memberName)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              background: #ffffff;
              color: #111827;
            }
            .card {
              width: 3.35in;
              height: 2.12in;
              border: 2px solid #111827;
              border-radius: 16px;
              padding: 14px;
              margin: 0 auto 24px;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .card-header-text {
              flex: 1;
              text-align: center;
              line-height: 1.2;
            }
            .card-header-text .title {
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.08em;
            }
            .card-header-text .province {
              font-size: 10px;
              font-weight: 600;
            }
            .card-header-text .city {
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.1em;
            }
            .logo-group {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            .logo-circle {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 2px solid #1f2937;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              font-weight: 700;
              text-align: center;
              line-height: 1.1;
              padding: 2px;
            }
            .logo-pdao {
              background: #0b87ac;
              color: #ffffff;
              border-color: #0b87ac;
              font-size: 18px;
            }
            .front-body {
              display: flex;
              gap: 14px;
              flex: 1;
            }
            .front-left {
              flex: 1;
            }
            .field-label {
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 0.08em;
            }
            .field-value {
              font-size: 11px;
              font-weight: 700;
              border-bottom: 1px solid #111827;
              padding-bottom: 4px;
              margin-bottom: 12px;
            }
            .front-right {
              width: 38%;
              border-left: 1px solid #d1d5db;
              padding-left: 12px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .photo-frame {
              flex: 1;
              border: 1px solid #111827;
              border-radius: 8px;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder-text {
              font-size: 12px;
              font-weight: 600;
              color: #9ca3af;
            }
            .front-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .flag {
              position: relative;
              width: 60px;
              height: 36px;
              border: 1px solid #111827;
              border-radius: 4px;
              overflow: hidden;
            }
            .flag .triangle {
              position: absolute;
              top: 0;
              left: 0;
              width: 0;
              height: 0;
              border-style: solid;
              border-width: 18px 0 18px 24px;
              border-color: transparent transparent transparent #ffffff;
              z-index: 2;
            }
            .flag .stripe.blue {
              position: absolute;
              top: 0;
              left: 24px;
              width: 36px;
              height: 18px;
              background: #0038a8;
            }
            .flag .stripe.red {
              position: absolute;
              bottom: 0;
              left: 24px;
              width: 36px;
              height: 18px;
              background: #ce1126;
            }
            .flag .sun {
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              width: 12px;
              height: 12px;
              background: #fcd116;
              border-radius: 50%;
              z-index: 3;
            }
            .bagong {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.2em;
              color: #b71c1c;
            }
            .tagline {
              text-align: center;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.08em;
            }
            .back-body {
              display: flex;
              gap: 14px;
              flex: 1;
            }
            .qr-box {
              width: 45%;
              border: 1px solid #cbd5f5;
              background: #f3f4f6;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .qr-placeholder-text {
              font-size: 14px;
              font-weight: 600;
              color: #9ca3af;
            }
            .details {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .detail-field .label {
              font-size: 8px;
              letter-spacing: 0.08em;
              font-weight: 700;
            }
            .detail-field .value {
              font-size: 10px;
              font-weight: 600;
              border-bottom: 1px solid #111827;
              padding-bottom: 4px;
            }
            @media print {
              body {
                margin: 0;
                padding: 16px;
              }
              .card {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <div class="card-header-text">
                <div class="title">REPUBLIC OF THE PHILIPPINES</div>
                <div class="province">PROVINCE OF ${escapedProvince}</div>
                <div class="city">CITY OF ${escapedCity}</div>
              </div>
              <div class="logo-group">
                <div class="logo-circle">LUNGSOD<br/>NG<br/>CABUYAO<br/>2012</div>
                <div class="logo-circle logo-pdao">♿</div>
              </div>
            </div>
            <div class="front-body">
              <div class="front-left">
                <div class="field">
                  <div class="field-label">NAME</div>
                  <div class="field-value">${escapedName}</div>
                </div>
                <div class="field">
                  <div class="field-label">DISABILITY</div>
                  <div class="field-value">${escapedDisability}</div>
                </div>
              </div>
              <div class="front-right">
                <div class="field">
                  <div class="field-label">ID NO.</div>
                  <div class="field-value">${escapedIdNumber}</div>
                </div>
                <div class="photo-frame">
                  ${photoMarkup}
                </div>
              </div>
            </div>
            <div class="front-footer">
              <div class="flag">
                <div class="triangle"></div>
                <div class="stripe blue"></div>
                <div class="stripe red"></div>
                <div class="sun"></div>
              </div>
              <div class="bagong">${escapedBagong}</div>
            </div>
            <div class="tagline">VALID ANYWHERE IN PHILIPPINES</div>
          </div>

          <div class="card">
            <div class="card-header" style="justify-content: flex-end;">
              <div class="logo-group">
                <div class="bagong">${escapedBagong}</div>
                <div class="logo-circle">LUNGSOD<br/>NG<br/>CABUYAO<br/>2012</div>
                <div class="logo-circle logo-pdao">♿</div>
              </div>
            </div>
            <div class="back-body">
              <div class="qr-box">
                ${qrMarkup}
              </div>
              <div class="details">
                <div class="detail-field">
                  <div class="label">ADDRESS:</div>
                  <div class="value">${escapedAddress}</div>
                </div>
                <div class="detail-field" style="display:flex; gap:10px;">
                  <div style="flex:1;">
                    <div class="label">DATE OF BIRTH:</div>
                    <div class="value">${escapedDob}</div>
                  </div>
                  <div style="flex:1;">
                    <div class="label">DATE ISSUED:</div>
                    <div class="value">${escapedDateIssued}</div>
                  </div>
                </div>
                <div class="detail-field" style="display:flex; gap:10px;">
                  <div style="flex:1;">
                    <div class="label">SEX:</div>
                    <div class="value">${escapedGender}</div>
                  </div>
                  <div style="flex:1;">
                    <div class="label">BLOOD TYPE:</div>
                    <div class="value">${escapedBloodType}</div>
                  </div>
                </div>
                <div class="detail-field">
                  <div class="label">CONTACT NO:</div>
                  <div class="value">${escapedContact}</div>
                </div>
                <div class="detail-field">
                  <div class="label">GUARDIAN NAME:</div>
                  <div class="value">${escapedGuardian}</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function(){
              setTimeout(function(){
                window.print();
                window.close();
              }, 400);
            }
          <\/script>
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
    setSearchTerm('');
    setFilters({
      search: '',
      barangay: '',
      disability: '',
      ageRange: '',
      status: '',
      cardStatus: ''
    });
  };

  const hasActiveFilters = searchTerm !== '' || Object.values(filters).some(value => value !== '');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filter the members based on current filters (client-side filtering for card status and age range only)
  const filteredMembers = useMemo(() => {
    // Most filtering is done server-side, but we still need to filter by card status and age range client-side
    const filtered = pwdMembers.filter(member => {
      // Card Status filter (calculated client-side)
      const matchesCardStatus = !filters.cardStatus || 
        (member.cardStatus && member.cardStatus === filters.cardStatus);

      // Age range filter (calculated client-side)
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

      return matchesCardStatus && matchesAgeRange;
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

  const memberFullName = getMemberFullName(selectedMemberData);
  const disabilityValue = selectedMemberData?.disabilityType || selectedMemberData?.typeOfDisability || '';
  const idNumberValue = getMemberIdNumber(selectedMemberData);
  const addressValue = getMemberAddressLine(selectedMemberData);
  const dobValue = formatCardDate(selectedMemberData?.birthDate || selectedMemberData?.dateOfBirth);
  const dateIssuedValue = formatCardDate(selectedMemberData?.cardIssueDate);
  const genderValue = selectedMemberData?.gender || '';
  const bloodTypeValue = selectedMemberData?.bloodType || '';
  const contactValue = selectedMemberData?.contactNumber || '';
  const guardianValue = selectedMemberData?.emergencyContact || selectedMemberData?.guardianName || '';
  const provinceValue = (selectedMemberData?.province || 'Laguna').toUpperCase();
  const cityValue = (selectedMemberData?.cityMunicipality || selectedMemberData?.city || 'Cabuyao').toUpperCase();

  const displayName = withPlaceholder(memberFullName, { uppercase: true });
  const displayDisability = withPlaceholder(disabilityValue, { uppercase: true });
  const displayIdNumber = withPlaceholder(idNumberValue, { uppercase: true });
  const displayAddress = withPlaceholder(addressValue);
  const displayDob = withPlaceholder(dobValue);
  const displayDateIssued = withPlaceholder(dateIssuedValue);
  const displayGender = withPlaceholder(genderValue);
  const displayBloodType = withPlaceholder(bloodTypeValue);
  const displayContact = withPlaceholder(contactValue);
  const displayGuardian = withPlaceholder(guardianValue);
  const flagLogoUrl = LOGO_URLS.flag;
  const bagongLogoUrl = LOGO_URLS.bagong;
  const pdaoLogoUrl = LOGO_URLS.pdao;
  const sealLogoUrl = LOGO_URLS.seal;

  const resolvedPhotoUrl = useMemo(() => {
    if (idPictureUrl) return idPictureUrl;
    if (!selectedMemberData?.idPictures) return null;

    let imagePath = null;
    if (Array.isArray(selectedMemberData.idPictures)) {
      imagePath = selectedMemberData.idPictures[0];
    } else if (typeof selectedMemberData.idPictures === 'string') {
      try {
        const parsed = JSON.parse(selectedMemberData.idPictures);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imagePath = parsed[0];
        } else {
          imagePath = selectedMemberData.idPictures;
        }
      } catch (error) {
        imagePath = selectedMemberData.idPictures;
      }
    }

    return imagePath ? api.getStorageUrl(imagePath) : null;
  }, [idPictureUrl, selectedMemberData]);

  useEffect(() => {
    setPhotoLoadError(false);
  }, [resolvedPhotoUrl]);

  const renderPhotoPreview = () => {
    if (resolvedPhotoUrl && !photoLoadError) {
      return (
        <img
          src={resolvedPhotoUrl}
          alt="ID"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setPhotoLoadError(true)}
        />
      );
    }

    return (
      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600 }}>
        2x2
      </Typography>
    );
  };
  
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
                onClick={() => fetchPwdMembers(currentPage, true)}
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
              onClick={() => fetchPwdMembers(currentPage, true)}
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

          {/* Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
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
              <Tab label="PWD Masterlist" />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ fontSize: 20 }} />
                    <span>Renewals {renewals.filter(r => r.status === 'pending').length > 0 && `(${renewals.filter(r => r.status === 'pending').length})`}</span>
                  </Box>
                } 
              />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          {activeTab === 0 && (
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                      <IconButton sx={{ color: 'white' }} onClick={() => fetchPwdMembers(currentPage, false)}>
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
                  
                  {/* Pagination Controls */}
                  {pagination.last_page > 1 && (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 2,
                      borderTop: '1px solid #E0E0E0',
                      backgroundColor: '#F8F9FA'
                    }}>
                      <Typography variant="body2" sx={{ color: '#7F8C8D' }}>
                        Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total || 0} members
                      </Typography>
                      <Pagination
                        count={pagination.last_page}
                        page={currentPage}
                        onChange={(e, page) => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        color="primary"
                        sx={{
                          '& .MuiPaginationItem-root': {
                            color: '#0b87ac',
                            '&.Mui-selected': {
                              backgroundColor: '#0b87ac',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: '#0a6b8a'
                              }
                            },
                            '&:hover': {
                              backgroundColor: '#E8F4FD'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel - PWD Card Preview */}
            <Grid item xs={12} md={4}>
              {/* Print Card and Download PDF Buttons */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadPDF}
                  disabled={!selectedMemberData || loading}
                  sx={{
                    bgcolor: '#27AE60',
                    '&:hover': { bgcolor: '#229954' },
                    '&:disabled': { bgcolor: '#BDC3C7' },
                    textTransform: 'none',
                    fontWeight: 'bold',
                    px: 3,
                    py: 1
                  }}
                >
                  {loading ? 'Generating...' : 'Download PDF'}
                </Button>
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
                  Print PWD Card
                </Button>
              </Box>
              
              {/* Flip Card Container - Landscape orientation (responsive) */}
              <Box sx={{ 
                mb: 2, 
                width: '100%',
                maxWidth: { xs: '100%', sm: '500px', md: '600px' },
                height: 'auto',
                aspectRatio: '3/2', // Landscape ratio (3:2)
                maxHeight: { xs: 'calc(100vh - 250px)', sm: 'calc(100vh - 300px)', md: '400px' },
                perspective: '1000px',
                cursor: 'pointer',
                mx: 'auto',
                flexShrink: 0
              }}
              onMouseEnter={() => setIsCardFlipped(true)}
              onMouseLeave={() => setIsCardFlipped(false)}
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              >
                <Box sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  {/* Front Side */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      border: '2px solid #E0E0E0',
                      p: 2,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
                          REPUBLIC OF THE PHILIPPINES
                        </Typography>
                        <Typography sx={{ fontSize: '0.5rem', fontWeight: 500, color: '#1f2937', lineHeight: 1.2 }}>
                          PROVINCE OF {provinceValue}
                        </Typography>
                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>
                          CITY OF {cityValue}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box
                          component="img"
                          src={pdaoLogoUrl}
                          alt="PDAO logo"
                          sx={{
                            width: { xs: 32, sm: 36 },
                            height: { xs: 32, sm: 36 },
                            objectFit: 'contain'
                          }}
                        />
                        <Box
                          component="img"
                          src={sealLogoUrl}
                          alt="City of Cabuyao seal"
                          sx={{
                            width: { xs: 32, sm: 36 },
                            height: { xs: 32, sm: 36 },
                            objectFit: 'contain'
                          }}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                            NAME
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#111827',
                              borderBottom: '1px solid #111827',
                              pb: 0.3
                            }}
                          >
                            {displayName}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                            DISABILITY
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              color: '#111827',
                              borderBottom: '1px solid #111827',
                              pb: 0.3
                            }}
                          >
                            {displayDisability}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          width: '38%',
                          borderLeft: '1px solid #E5E7EB',
                          pl: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                            ID NO.
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              borderBottom: '1px solid #111827',
                              pb: 0.3
                            }}
                          >
                            {displayIdNumber}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '85%',
                            aspectRatio: '1 / 1',
                            borderRadius: 2,
                            border: '1px solid #1f2937',
                            bgcolor: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            mx: 'auto'
                          }}
                        >
                          {renderPhotoPreview()}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box
                        component="img"
                        src={flagLogoUrl}
                        alt="Philippine flag"
                        sx={{
                          maxWidth: '30%',
                          height: 'auto',
                          maxHeight: 32,
                          aspectRatio: '5/3',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                      <Box
                        component="img"
                        src={bagongLogoUrl}
                        alt="Bagong Cabuyao"
                        sx={{
                          maxWidth: '45%',
                          height: 'auto',
                          maxHeight: 24,
                          objectFit: 'contain',
                          flexShrink: 0
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        textAlign: 'center',
                        color: '#111827',
                        letterSpacing: '0.08em'
                      }}
                    >
                      VALID ANYWHERE IN PHILIPPINES
                    </Typography>
                  </Box>

                  {/* Back Side */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      border: '2px solid #E0E0E0',
                      p: 2,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        component="img"
                        src={bagongLogoUrl}
                        alt="Bagong Cabuyao"
                        sx={{ height: 22, objectFit: 'contain' }}
                      />
                      <Box
                        component="img"
                        src={sealLogoUrl}
                        alt="City of Cabuyao seal"
                        sx={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                      <Box
                        component="img"
                        src={pdaoLogoUrl}
                        alt="PDAO logo"
                        sx={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: '45%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 1,
                          textAlign: 'center'
                        }}
                      >
                        {qrCodeDataURL ? (
                          <img
                            src={qrCodeDataURL}
                            alt="QR Code"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>QR CODE</Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                            ADDRESS:
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: '#111827',
                              borderBottom: '1px solid #111827',
                              pb: 0.2
                            }}
                          >
                            {displayAddress}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              DATE OF BIRTH:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2
                              }}
                            >
                              {displayDob}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              DATE ISSUED:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2
                              }}
                            >
                              {displayDateIssued}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              SEX:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2
                              }}
                            >
                              {displayGender}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              BLOOD TYPE:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2
                              }}
                            >
                              {displayBloodType}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                            CONTACT NO:
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: '#111827',
                              borderBottom: '1px solid #111827',
                              pb: 0.2
                            }}
                          >
                            {displayContact}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                            GUARDIAN NAME:
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: '#111827',
                              borderBottom: '1px solid #111827',
                              pb: 0.2
                            }}
                          >
                            {displayGuardian}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

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
          )}

          {/* Renewals Tab */}
          {activeTab === 1 && (
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C3E50' }}>
                  ID Renewal Requests
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={renewalStatusFilter}
                    label="Filter by Status"
                    onChange={(e) => setRenewalStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {loadingRenewals ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : renewals.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No renewal requests found.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#0b87ac' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Member</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Documents</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {renewals.map((renewal) => (
                        <TableRow key={renewal.id} hover>
                          <TableCell>
                            {renewal.submitted_at ? new Date(renewal.submitted_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {renewal.member ? (
                              `${renewal.member.firstName || ''} ${renewal.member.lastName || ''}`.trim() || 'N/A'
                            ) : (
                              `Member ID: ${renewal.member_id || 'N/A'}`
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={renewal.status === 'pending' ? 'Pending' : renewal.status === 'approved' ? 'Approved' : 'Rejected'}
                              color={
                                renewal.status === 'approved' ? 'success' :
                                renewal.status === 'rejected' ? 'error' :
                                'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewRenewalFile(renewal.id, 'old_card')}
                              >
                                Old Card
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewRenewalFile(renewal.id, 'medical_certificate')}
                              >
                                Medical Cert
                              </Button>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {renewal.status === 'pending' && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => openApproveDialog(renewal)}
                                  disabled={processingRenewal === renewal.id}
                                >
                                  {processingRenewal === renewal.id ? 'Processing...' : 'Approve'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CancelIcon />}
                                  onClick={() => openRejectDialog(renewal)}
                                  disabled={processingRenewal === renewal.id}
                                >
                                  Reject
                                </Button>
                              </Box>
                            )}
                            {renewal.status === 'approved' && (
                              <Chip label="Approved" color="success" size="small" />
                            )}
                            {renewal.status === 'rejected' && (
                              <Chip label="Rejected" color="error" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </Container>
      </Box>

      {/* View Renewal File Dialog */}
      <Dialog
        open={viewRenewalDialogOpen}
        onClose={handleCloseViewRenewalDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">View Document</Typography>
          <IconButton onClick={handleCloseViewRenewalDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingRenewalFile && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={viewingRenewalFile}
                alt="Document"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 4
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewRenewalDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Renewal Dialog */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setSelectedRenewal(null);
          setRenewalNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#27AE60', color: '#FFFFFF', fontWeight: 'bold' }}>
          Approve Renewal Request
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to approve this renewal request?
          </Typography>
          {selectedRenewal?.member && (
            <Typography variant="body2" sx={{ mb: 2, color: '#7F8C8D' }}>
              Member: {selectedRenewal.member.firstName} {selectedRenewal.member.lastName}
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            value={renewalNotes}
            onChange={(e) => setRenewalNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setApproveDialogOpen(false);
              setSelectedRenewal(null);
              setRenewalNotes('');
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApproveRenewal}
            variant="contained"
            color="success"
            disabled={processingRenewal === selectedRenewal?.id}
          >
            {processingRenewal === selectedRenewal?.id ? 'Processing...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Renewal Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setSelectedRenewal(null);
          setRenewalNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#E74C3C', color: '#FFFFFF', fontWeight: 'bold' }}>
          Reject Renewal Request
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to reject this renewal request?
          </Typography>
          {selectedRenewal?.member && (
            <Typography variant="body2" sx={{ mb: 2, color: '#7F8C8D' }}>
              Member: {selectedRenewal.member.firstName} {selectedRenewal.member.lastName}
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason *"
            value={renewalNotes}
            onChange={(e) => setRenewalNotes(e.target.value)}
            required
            sx={{ mt: 2 }}
            error={!renewalNotes.trim()}
            helperText={!renewalNotes.trim() ? 'Please provide a rejection reason' : ''}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setRejectDialogOpen(false);
              setSelectedRenewal(null);
              setRenewalNotes('');
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectRenewal}
            variant="contained"
            color="error"
            disabled={processingRenewal === selectedRenewal?.id || !renewalNotes.trim()}
          >
            {processingRenewal === selectedRenewal?.id ? 'Processing...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
      
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