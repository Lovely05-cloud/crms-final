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

function PWDCard() {
  const { currentUser } = useAuth();
  const [pwdMembers, setPwdMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [idPictureUrl, setIdPictureUrl] = useState(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
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
  const fetchPwdMembers = async (page = currentPage) => {
    try {
      setLoading(true);
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

  // Load PWD members when page or filters change
  useEffect(() => {
    fetchPwdMembers(currentPage);
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
          const memberDocs = targetMember.memberDocuments || targetMember.member_documents || [];
          
          if (memberDocs.length > 0) {
            // Find the ID Pictures document for this member
            const idPicturesDoc = memberDocs.find(md => {
              const docName = md.requiredDocument?.name || md.required_document?.name;
              return docName === 'ID Pictures' || docName === 'ID Picture';
            });
            
            if (idPicturesDoc) {
              const memberDoc = idPicturesDoc;
              
              if (memberDoc.id) {
                // Use the document-file API endpoint to get the authenticated URL
                const fileUrl = api.getFilePreviewUrl('document-file', memberDoc.id);
                
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
                      console.log('ID picture URL set from member documents:', finalUrl);
                      return;
                    }
                  } catch (error) {
                    console.warn('Error parsing auth token:', error);
                  }
                }
                
                setIdPictureUrl(fileUrl);
                console.log('ID picture URL set from member documents:', fileUrl);
              } else {
                console.log('Member document has no ID, cannot fetch file');
                setIdPictureUrl(null);
              }
            } else {
              console.log('No ID Pictures document found in member documents');
              setIdPictureUrl(null);
            }
          } else {
            console.log('No documents found for this member');
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
      const disabilityType = selectedMemberData.disabilityType || selectedMemberData.typeOfDisability || 'NOT SPECIFIED';
      const province = selectedMemberData.province || 'LAGUNA';
      const cityMunicipality = selectedMemberData.cityMunicipality || selectedMemberData.city || 'CABUYAO';

      // Create PDF in landscape orientation to fit both front and back side by side (6.5in x 2in)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [6.5, 2]
      });

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

      // Top section with flag, header, logos (landscape layout) - FRONT CARD
      const topSectionY = frontCardY + margin + 0.05;
      const topSectionHeight = 0.3;

      // Draw Philippine flag (left side)
      const flagX = frontCardX + margin + 0.06;
      const flagY = topSectionY;
      const flagWidth = 0.2;
      const flagHeight = 0.15;

      // Flag border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.005);
      pdf.rect(flagX, flagY, flagWidth, flagHeight);

      // White background (left triangle area)
      pdf.setFillColor(255, 255, 255);
      pdf.rect(flagX, flagY, flagWidth * 0.33, flagHeight, 'F');

      // Blue stripe (top right)
      pdf.setFillColor(0, 56, 168);
      pdf.rect(flagX + flagWidth * 0.33, flagY, flagWidth * 0.67, flagHeight / 2, 'F');

      // Red stripe (bottom right)
      pdf.setFillColor(206, 17, 38);
      pdf.rect(flagX + flagWidth * 0.33, flagY + flagHeight / 2, flagWidth * 0.67, flagHeight / 2, 'F');

      // Golden sun (simplified as circle)
      pdf.setFillColor(252, 209, 22);
      pdf.circle(flagX + flagWidth * 0.2, flagY + flagHeight / 2, 0.025, 'F');

      // Header text (next to flag)
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('REPUBLIC OF THE PHILIPPINES', flagX + flagWidth + 0.04, flagY + 0.03);
      
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`PROVINCE OF ${province}`, flagX + flagWidth + 0.04, flagY + 0.06);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5);
      pdf.text(`CITY OF ${cityMunicipality}`, flagX + flagWidth + 0.04, flagY + 0.09);

      // Right side logos
      const logoX = frontCardX + cardWidth - margin - 0.28;
      const logoY = topSectionY;

      // PDAO Logo (wheelchair symbol)
      pdf.setFillColor(0, 56, 168);
      pdf.circle(logoX, logoY + 0.075, 0.08, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text('♿', logoX, logoY + 0.08, { align: 'center' });

      // City Seal (front side)
      const frontSealX = logoX + 0.12;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.005);
      pdf.circle(frontSealX, logoY + 0.075, 0.08);
      pdf.circle(frontSealX, logoY + 0.075, 0.07);
      
      pdf.setFontSize(3);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LUNGSOD', frontSealX, logoY + 0.04, { align: 'center' });
      pdf.text('NG', frontSealX, logoY + 0.055, { align: 'center' });
      pdf.text('CABUYAO', frontSealX, logoY + 0.07, { align: 'center' });
      pdf.text('2012', frontSealX, logoY + 0.09, { align: 'center' });

      // BAGONG CABUYAO text
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 107, 53); // Orange-red color
      pdf.text('BAGONG CABUYAO', frontCardX + cardWidth / 2, topSectionY + topSectionHeight + 0.08, { align: 'center' });

      // Main content section (landscape - horizontal layout)
      const mainContentY = topSectionY + topSectionHeight + 0.12;
      const mainContentHeight = cardHeight - (mainContentY - frontCardY) - margin - 0.15;

      // Left column - Member information
      const leftColumnX = frontCardX + margin + 0.08;
      const leftColumnWidth = contentWidth * 0.6;

      // NAME field
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('NAME', leftColumnX, mainContentY + 0.08);
      pdf.setLineWidth(0.003);
      pdf.line(leftColumnX, mainContentY + 0.1, leftColumnX + leftColumnWidth * 0.85, mainContentY + 0.1);
      
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      const nameLines = pdf.splitTextToSize(memberName.toUpperCase(), leftColumnWidth * 0.85);
      pdf.text(nameLines, leftColumnX, mainContentY + 0.15);

      // DISABILITY field
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DISABILITY', leftColumnX, mainContentY + 0.28);
      pdf.line(leftColumnX, mainContentY + 0.3, leftColumnX + leftColumnWidth * 0.85, mainContentY + 0.3);
      
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      const disabilityLines = pdf.splitTextToSize(disabilityType.toUpperCase(), leftColumnWidth * 0.85);
      pdf.text(disabilityLines, leftColumnX, mainContentY + 0.35);

      // ID NO field
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ID NO.', leftColumnX, mainContentY + 0.48);
      pdf.line(leftColumnX, mainContentY + 0.5, leftColumnX + leftColumnWidth * 0.85, mainContentY + 0.5);
      
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(memberId, leftColumnX, mainContentY + 0.55);

      // Right column - Photo
      const rightColumnX = leftColumnX + leftColumnWidth + 0.05;
      const photoWidth = 0.7;
      const photoHeight = 0.9;
      const photoX = rightColumnX;
      const photoY = mainContentY;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(photoX, photoY, photoWidth, photoHeight);

      // Try to load and add ID picture if available
      if (idPictureUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = idPictureUrl;
          
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

      // Footer
      const footerY = frontCardY + cardHeight - margin - 0.08;
      pdf.setFontSize(4);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('VALID ANYWHERE IN PHILIPPINES', frontCardX + cardWidth / 2, footerY, { align: 'center' });

      // BACK SIDE - Right side of the page
      const backMargin = 0.05;
      const backContentWidth = cardWidth - (backMargin * 2);
      const backContentHeight = cardHeight - (backMargin * 2);

      // Draw border for back side (full card size)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(backCardX, backCardY, cardWidth, cardHeight);

      // Top right: Logos and BAGONG CABUYAO text (landscape)
      const topRightX = backCardX + cardWidth - backMargin - 0.28;
      const topRightY = backCardY + backMargin + 0.05;
      
      // BAGONG CABUYAO text
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 107, 53); // Orange-red
      pdf.text('BAGONG CABUYAO', topRightX - 0.15, topRightY, { align: 'right' });

      // City Seal (back side)
      const backSealX = topRightX;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.005);
      pdf.circle(backSealX, topRightY + 0.075, 0.08);
      pdf.circle(backSealX, topRightY + 0.075, 0.07);
      pdf.setFontSize(3);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('LUNGSOD', backSealX, topRightY + 0.04, { align: 'center' });
      pdf.text('NG', backSealX, topRightY + 0.055, { align: 'center' });
      pdf.text('CABUYAO', backSealX, topRightY + 0.07, { align: 'center' });
      pdf.text('2012', backSealX, topRightY + 0.09, { align: 'center' });

      // PDAO Logo
      const pdaoX = backSealX + 0.12;
      pdf.setFillColor(0, 56, 168);
      pdf.circle(pdaoX, topRightY + 0.075, 0.08, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text('♿', pdaoX, topRightY + 0.08, { align: 'center' });

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

      // QR Code Description
      pdf.setFontSize(3);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(127, 140, 141); // Gray color
      const qrDescription = 'Scan the QR code to verify card authenticity and access member information digitally.';
      const descLines = pdf.splitTextToSize(qrDescription, backRightColumnWidth * 0.95);
      pdf.text(descLines, backRightColumnX, detailY);
      detailY += (descLines.length * 0.04) + 0.08;

      // ADDRESS
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ADDRESS:', backRightColumnX, detailY);
      pdf.setLineWidth(0.003);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      const address = selectedMemberData?.address ? 
        `${selectedMemberData.address}, ${selectedMemberData.barangay || ''}, ${selectedMemberData.city || 'Cabuyao'}, ${selectedMemberData.province || 'Laguna'}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') : '';
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      if (address) {
        const addressLines = pdf.splitTextToSize(address, backRightColumnWidth * 0.95);
        pdf.text(addressLines, backRightColumnX, detailY + 0.055);
        detailY += (addressLines.length * 0.055) + lineHeight;
      } else {
        detailY += lineHeight;
      }

      // DATE OF BIRTH and DATE ISSUED (side by side)
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE OF BIRTH:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.45, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      const dob = selectedMemberData?.dateOfBirth ? 
        new Date(selectedMemberData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      pdf.text(dob, backRightColumnX, detailY + 0.055);
      
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE ISSUED:', backRightColumnX + backRightColumnWidth * 0.52, detailY);
      pdf.line(backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      const dateIssued = selectedMemberData?.cardIssueDate ? 
        new Date(selectedMemberData.cardIssueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      pdf.text(dateIssued, backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.055);
      detailY += lineHeight;

      // SEX and BLOOD TYPE (side by side)
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SEX:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.45, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedMemberData?.gender || '', backRightColumnX, detailY + 0.055);
      
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BLOOD TYPE:', backRightColumnX + backRightColumnWidth * 0.52, detailY);
      pdf.line(backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedMemberData?.bloodType || '', backRightColumnX + backRightColumnWidth * 0.52, detailY + 0.055);
      detailY += lineHeight;

      // CONTACT NO
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTACT NO:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedMemberData?.contactNumber || '', backRightColumnX, detailY + 0.055);
      detailY += lineHeight;

      // GUARDIAN NAME
      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GUARDIAN NAME:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedMemberData?.guardianName || '', backRightColumnX, detailY + 0.055);

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
    const disabilityType = selectedMemberData.disabilityType || selectedMemberData.typeOfDisability || 'NOT SPECIFIED';
    const province = selectedMemberData.province || 'LAGUNA';
    const cityMunicipality = selectedMemberData.cityMunicipality || selectedMemberData.city || 'CABUYAO';
    const address = selectedMemberData?.address ? 
      `${selectedMemberData.address}, ${selectedMemberData.barangay || ''}, ${selectedMemberData.city || 'Cabuyao'}, ${selectedMemberData.province || 'Laguna'}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') : '';
    const dob = selectedMemberData?.dateOfBirth ? 
      new Date(selectedMemberData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    const dateIssued = selectedMemberData?.cardIssueDate ? 
      new Date(selectedMemberData.cardIssueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PWD ID Card - ${memberName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .id-card {
              width: 3in;
              height: 2in;
              border: 2px solid #000;
              background: white;
              position: relative;
              margin: 0 auto;
              box-sizing: border-box;
              display: flex;
              flex-direction: row;
            }
            .top-section {
              display: flex;
              align-items: center;
              padding: 8px 12px;
              border-bottom: 1px solid #000;
            }
            .flag-section {
              width: 60px;
              height: 40px;
              border: 1px solid #000;
              position: relative;
              margin-right: 12px;
              flex-shrink: 0;
              background: #FFFFFF;
            }
            .flag-triangle {
              position: absolute;
              left: 0;
              top: 0;
              width: 0;
              height: 0;
              border-style: solid;
              border-width: 20px 0 20px 20px;
              border-color: transparent transparent transparent #FFFFFF;
              z-index: 1;
            }
            .flag-blue {
              position: absolute;
              top: 0;
              left: 20px;
              width: 40px;
              height: 20px;
              background: #0038A8;
            }
            .flag-red {
              position: absolute;
              bottom: 0;
              left: 20px;
              width: 40px;
              height: 20px;
              background: #CE1126;
            }
            .flag-sun {
              position: absolute;
              left: 6px;
              top: 50%;
              transform: translateY(-50%);
              width: 8px;
              height: 8px;
              background: #FCD116;
              border-radius: 50%;
              z-index: 2;
            }
            .flag-star {
              position: absolute;
              width: 3px;
              height: 3px;
              background: #FCD116;
              clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
              z-index: 2;
            }
            .header-text {
              flex: 1;
              text-align: left;
            }
            .header-text h1 {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 2px;
              letter-spacing: 0.5px;
            }
            .header-text .province {
              font-size: 9px;
              margin-bottom: 2px;
            }
            .header-text .city {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .seal-section {
              width: 50px;
              height: 50px;
              border: 2px solid #000;
              border-radius: 50%;
              margin: 0 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              background: white;
              position: relative;
            }
            .seal-inner {
              width: 40px;
              height: 40px;
              border: 1px solid #000;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
              text-align: center;
              font-weight: bold;
            }
            .disability-symbol {
              width: 30px;
              height: 30px;
              border: 2px solid #0000FF;
              border-radius: 50%;
              background: #0000FF;
              margin: 0 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .disability-icon {
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
            .id-number {
              font-size: 14px;
              font-weight: bold;
              margin: 4px 0;
              text-align: center;
            }
            .main-content {
              display: flex;
              flex: 1;
              padding: 8px 12px;
            }
            .left-column {
              flex: 1;
              padding-right: 12px;
            }
            .field-label {
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .field-value {
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 6px;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .field-value.name {
              font-size: 12px;
            }
            .field-value.disability {
              font-size: 11px;
            }
            .signature-line {
              margin-top: 8px;
              border-top: 1px solid #000;
              width: 100%;
              height: 20px;
            }
            .right-column {
              width: 80px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              padding-left: 12px;
              border-left: 1px solid #000;
            }
            .photo-placeholder {
              width: 60px;
              height: 70px;
              border: 1px solid #000;
              background: #F5F5F5;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 7px;
              text-align: center;
              position: relative;
            }
            .photo-placeholder img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .id-no-field {
              margin-top: 8px;
              text-align: center;
            }
            .id-no-label {
              font-size: 7px;
              font-weight: bold;
              margin-top: 4px;
            }
            .footer {
              padding: 6px 12px;
              border-top: 1px solid #000;
              text-align: center;
              font-size: 6px;
              font-weight: bold;
              line-height: 1.3;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 0;
              }
              .id-card { 
                margin: 0;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <!-- Front Side -->
          <div class="id-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 3px;">
              <div style="display: flex; align-items: flex-start; gap: 4px; flex: 1;">
                <div class="flag-section" style="width: 25px; height: 18px;">
                  <div class="flag-triangle"></div>
                  <div class="flag-blue"></div>
                  <div class="flag-red"></div>
                  <div class="flag-sun"></div>
                </div>
                <div style="font-size: 5px; line-height: 1.2;">
                  <div style="font-weight: bold;">REPUBLIC OF THE</div>
                  <div style="font-weight: bold;">PHILIPPINES</div>
                  <div style="font-size: 4px;">Province of ${province}</div>
                  <div style="font-weight: bold; font-size: 4.5px;">CITY OF ${cityMunicipality}</div>
                </div>
              </div>
              <div style="display: flex; gap: 3px; align-items: flex-start;">
                <div class="disability-symbol" style="width: 18px; height: 18px;">
                  <span class="disability-icon" style="font-size: 12px;">♿</span>
                </div>
                <div class="seal-section" style="width: 18px; height: 18px;">
                  <div class="seal-inner" style="width: 14px; height: 14px; font-size: 3px;">
                    LUNGSOD<br>NG<br>CABUYAO<br>2012
                  </div>
                </div>
              </div>
            </div>
            <div style="text-align: center; font-size: 7px; font-weight: bold; color: #FF6B35; margin: 2px 0; letter-spacing: 0.5px;">
              BAGONG CABUYAO
            </div>
            <div style="display: flex; gap: 6px; padding: 3px; flex: 1;">
              <div style="flex: 1;">
                <div style="font-size: 5px; font-weight: bold; margin-bottom: 1px;">NAME</div>
                <div style="font-size: 4px; border-bottom: 1px solid #000; min-height: 8px; margin-bottom: 4px;">${memberName.toUpperCase()}</div>
                <div style="font-size: 5px; font-weight: bold; margin-bottom: 1px;">DISABILITY</div>
                <div style="font-size: 4px; border-bottom: 1px solid #000; min-height: 8px; margin-bottom: 4px;">${disabilityType.toUpperCase()}</div>
                <div style="font-size: 5px; font-weight: bold; margin-bottom: 1px;">ID NO.</div>
                <div style="font-size: 4px; border-bottom: 1px solid #000; min-height: 8px;">${memberId}</div>
              </div>
              <div style="width: 35px; height: 45px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${idPictureUrl ? `<img src="${idPictureUrl}" alt="ID Picture" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-size: 4px;\\'>2x2</span>';" />` : '<span style="font-size: 4px;">2x2</span>'}
              </div>
            </div>
            <div style="text-align: center; font-size: 4px; font-weight: bold; padding: 2px;">
              VALID ANYWHERE IN PHILIPPINES
            </div>
          </div>
          
          <!-- Back Side -->
          <div class="id-card" style="margin-top: 20px;">
            <div style="display: flex; justify-content: flex-end; align-items: flex-start; padding: 3px;">
              <div style="display: flex; gap: 3px; align-items: flex-start;">
                <div style="font-size: 6px; font-weight: bold; color: #FF6B35; align-self: center; letter-spacing: 0.5px;">BAGONG CABUYAO</div>
                <div class="seal-section" style="width: 18px; height: 18px;">
                  <div class="seal-inner" style="width: 14px; height: 14px; font-size: 3px;">
                    LUNGSOD<br>NG<br>CABUYAO<br>2012
                  </div>
                </div>
                <div class="disability-symbol" style="width: 18px; height: 18px;">
                  <span class="disability-icon" style="font-size: 12px;">♿</span>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0; padding: 0; flex: 1; height: 100%;">
              <!-- Left: QR Code - covers whole left half -->
              <div style="width: 50%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F8F9FA; border-right: 1px solid #E0E0E0; padding: 4px;">
                ${qrCode ? `<img src="${qrCode}" alt="QR Code" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;" />` : '<span style="font-size: 5px; color: #BDC3C7;">QR CODE</span>'}
              </div>
              <!-- Right: Member Details - Full height utilization -->
              <div style="width: 50%; display: flex; flex-direction: column; justify-content: space-between; gap: 3px; padding: 4px; font-size: 4px;">
                <!-- QR Code Description -->
                <div style="margin-bottom: 4px;">
                  <div style="font-size: 3px; color: #7F8C8D; font-style: italic; line-height: 1.3; text-align: justify;">
                    Scan the QR code to verify card authenticity and access member information digitally.
                  </div>
                </div>
                <!-- Member Details -->
                <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
                  <div>
                    <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">ADDRESS:</div>
                    <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${address || ''}</div>
                  </div>
                  <div style="display: flex; gap: 5px;">
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">DATE OF BIRTH:</div>
                      <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${dob || ''}</div>
                    </div>
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">DATE ISSUED:</div>
                      <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${dateIssued || ''}</div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 5px;">
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">SEX:</div>
                      <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${selectedMemberData?.gender || ''}</div>
                    </div>
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">BLOOD TYPE:</div>
                      <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${selectedMemberData?.bloodType || ''}</div>
                    </div>
                  </div>
                  <div>
                    <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">CONTACT NO:</div>
                    <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${selectedMemberData?.contactNumber || ''}</div>
                  </div>
                  <div>
                    <div style="font-weight: bold; font-size: 4.5px; margin-bottom: 1px;">GUARDIAN NAME:</div>
                    <div style="border-bottom: 1px solid #000; min-height: 7px; font-size: 4px; line-height: 1.3; padding-bottom: 1px;">${selectedMemberData?.guardianName || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function(){ 
              setTimeout(function() {
                window.print(); 
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 500);
            }
          </script>
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
                      <IconButton sx={{ color: 'white' }} onClick={() => fetchPwdMembers(currentPage)}>
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
                  <Box sx={{
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
                    flexDirection: 'column'
                  }}>
                    {/* Header Section - Landscape Layout */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, px: 0.5, pt: 0.3 }}>
                      {/* Left: Philippine Flag and Header Text */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flex: 1 }}>
                        {/* Philippine Flag */}
                        <Box sx={{
                          width: '30px',
                          height: '20px',
                          border: '1px solid #000',
                          position: 'relative',
                          flexShrink: 0
                        }}>
                          {/* White triangle area */}
                          <Box sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '33%',
                            height: '100%',
                            backgroundColor: '#FFFFFF'
                          }} />
                          {/* Blue stripe */}
                          <Box sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: '67%',
                            height: '50%',
                            backgroundColor: '#0038A8'
                          }} />
                          {/* Red stripe */}
                          <Box sx={{
                            position: 'absolute',
                            right: 0,
                            bottom: 0,
                            width: '67%',
                            height: '50%',
                            backgroundColor: '#CE1126'
                          }} />
                        </Box>
                        
                        {/* Header Text */}
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '7px', 
                            color: '#2C3E50',
                            lineHeight: 1.1,
                            mb: 0.1
                          }}>
                            REPUBLIC OF THE PHILIPPINES
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontSize: '6px', 
                            color: '#2C3E50',
                            lineHeight: 1.1,
                            mb: 0.1
                          }}>
                            PROVINCE OF LAGUNA
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '6.5px', 
                            color: '#2C3E50',
                            lineHeight: 1.1
                          }}>
                            CITY OF CABUYAO
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right: Logos */}
                      <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'flex-start' }}>
                        {/* PDAO Logo */}
                        <Box sx={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#0038A8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #000',
                          flexShrink: 0
                        }}>
                          <Typography sx={{ fontSize: '14px', color: '#FFFFFF' }}>♿</Typography>
                        </Box>
                        {/* City Seal */}
                        <Box sx={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: '1px solid #000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: '#FFFFFF'
                        }}>
                          <Typography sx={{ fontSize: '4px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1 }}>
                            LUNGSOD<br/>NG<br/>CABUYAO<br/>2012
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* BAGONG CABUYAO Text */}
                    <Typography sx={{
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#FF6B35',
                      textAlign: 'center',
                      mb: 0.3,
                      letterSpacing: '0.5px'
                    }}>
                      BAGONG CABUYAO
                    </Typography>

                    {/* Main Content - Landscape Layout */}
                    <Box sx={{ display: 'flex', gap: 1, flex: 1, px: 0.5, alignItems: 'center' }}>
                      {/* Left: Member Info */}
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.3 }}>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontSize: '7px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            mb: 0.1
                          }}>
                            NAME
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontSize: '6px', 
                            color: '#2C3E50',
                            mb: 0.3,
                            borderBottom: '1px solid #000',
                            minHeight: '12px',
                            lineHeight: 1.2
                          }}>
                            {selectedMemberData?.name || '________________'}
                          </Typography>

                          <Typography variant="body2" sx={{ 
                            fontSize: '7px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            mb: 0.1,
                            mt: 0.3
                          }}>
                            DISABILITY
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontSize: '6px', 
                            color: '#2C3E50',
                            mb: 0.3,
                            borderBottom: '1px solid #000',
                            minHeight: '12px',
                            lineHeight: 1.2
                          }}>
                            {selectedMemberData?.disabilityType || '________________'}
                          </Typography>

                          <Typography variant="body2" sx={{ 
                            fontSize: '7px', 
                            color: '#2C3E50', 
                            fontWeight: 'bold',
                            mb: 0.1,
                            mt: 0.3
                          }}>
                            ID NO.
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontSize: '6px', 
                            color: '#2C3E50',
                            borderBottom: '1px solid #000',
                            minHeight: '12px',
                            lineHeight: 1.2
                          }}>
                            {selectedMemberData?.id || '________________'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right: Photo */}
                      <Box sx={{
                        width: '70px',
                        height: '90px',
                        backgroundColor: '#F8F9FA',
                        border: '1px solid #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative'
                      }}>
                        {(() => {
                          if (idPictureUrl) {
                            return (
                              <img
                                src={idPictureUrl}
                                alt="ID Picture"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            );
                          }
                          if (selectedMemberData?.idPictures) {
                            let imagePath = null;
                            if (Array.isArray(selectedMemberData.idPictures)) {
                              imagePath = selectedMemberData.idPictures[0];
                            } else if (typeof selectedMemberData.idPictures === 'string') {
                              try {
                                const parsed = JSON.parse(selectedMemberData.idPictures);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  imagePath = parsed[0];
                                }
                              } catch (e) {
                                imagePath = selectedMemberData.idPictures;
                              }
                            }
                            if (imagePath) {
                              const fullUrl = api.getStorageUrl(imagePath);
                              return (
                                <img
                                  src={fullUrl}
                                  alt="ID Picture"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              );
                            }
                          }
                          return (
                            <Typography sx={{ fontSize: '6px', color: '#BDC3C7', textAlign: 'center' }}>
                              2x2
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Box>
                    
                    {/* Footer */}
                    <Typography variant="body2" sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '5px', 
                      color: '#2C3E50',
                      textAlign: 'center',
                      mt: 'auto',
                      pt: 0.3
                    }}>
                      VALID ANYWHERE IN PHILIPPINES
                    </Typography>
                  </Box>

                  {/* Back Side */}
                  <Box sx={{
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
                    flexDirection: 'column'
                  }}>
                    {/* Header with Logos - Landscape */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', mb: 0.3, px: 0.5, pt: 0.3 }}>
                      <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'flex-start' }}>
                        {/* BAGONG CABUYAO Text */}
                        <Typography sx={{
                          fontSize: '7px',
                          fontWeight: 'bold',
                          color: '#FF6B35',
                          letterSpacing: '0.5px',
                          alignSelf: 'center'
                        }}>
                          BAGONG CABUYAO
                        </Typography>
                        {/* City Seal */}
                        <Box sx={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: '1px solid #000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: '#FFFFFF'
                        }}>
                          <Typography sx={{ fontSize: '4px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1 }}>
                            LUNGSOD<br/>NG<br/>CABUYAO<br/>2012
                          </Typography>
                        </Box>
                        {/* PDAO Logo */}
                        <Box sx={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#0038A8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #000',
                          flexShrink: 0
                        }}>
                          <Typography sx={{ fontSize: '14px', color: '#FFFFFF' }}>♿</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Main Content - Landscape Layout: QR Code covers whole left side */}
                    <Box sx={{ display: 'flex', gap: 0, flex: 1, px: 0, alignItems: 'stretch' }}>
                      {/* Left: QR Code - covers whole left half */}
                      <Box sx={{
                        width: '50%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F8F9FA',
                        borderRight: '1px solid #E0E0E0',
                        p: 1
                      }}>
                        {qrCodeDataURL ? (
                          <img 
                            src={qrCodeDataURL} 
                            alt="QR Code" 
                            style={{
                              width: '100%',
                              height: '100%',
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '8px', color: '#BDC3C7', textAlign: 'center' }}>
                            QR CODE
                          </Typography>
                        )}
                      </Box>

                      {/* Right: Member Details - Full height utilization */}
                      <Box sx={{ 
                        width: '50%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        gap: 0.4,
                        px: 0.8,
                        py: 0.8,
                        height: '100%'
                      }}>
                        {/* QR Code Description */}
                        <Box sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '5px', 
                            color: '#7F8C8D', 
                            fontStyle: 'italic',
                            lineHeight: 1.3,
                            textAlign: 'justify'
                          }}>
                            Scan the QR code to verify card authenticity and access member information digitally.
                          </Typography>
                        </Box>

                        {/* Member Details */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, flex: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ 
                              fontSize: '6.5px', 
                              color: '#2C3E50', 
                              fontWeight: 'bold',
                              mb: 0.15
                            }}>
                              ADDRESS:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontSize: '5.5px', 
                              color: '#2C3E50',
                              borderBottom: '1px solid #000',
                              minHeight: '12px',
                              lineHeight: 1.3,
                              pb: 0.1
                            }}>
                              {(() => {
                                const addressParts = [];
                                if (selectedMemberData?.address) addressParts.push(selectedMemberData.address);
                                if (selectedMemberData?.barangay && selectedMemberData.barangay !== 'N/A') addressParts.push(selectedMemberData.barangay);
                                const city = selectedMemberData?.city && selectedMemberData.city !== 'N/A' ? selectedMemberData.city : 'Cabuyao';
                                addressParts.push(city);
                                const province = selectedMemberData?.province && selectedMemberData.province !== 'N/A' ? selectedMemberData.province : 'Laguna';
                                addressParts.push(province);
                                return addressParts.length > 0 ? addressParts.join(', ') : '________________';
                              })()}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.8 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                fontSize: '6.5px', 
                                color: '#2C3E50', 
                                fontWeight: 'bold',
                                mb: 0.15
                              }}>
                                DATE OF BIRTH:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '5.5px', 
                                color: '#2C3E50',
                                borderBottom: '1px solid #000',
                                minHeight: '12px',
                                lineHeight: 1.3,
                                pb: 0.1
                              }}>
                                {selectedMemberData?.dateOfBirth ? new Date(selectedMemberData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '________________'}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                fontSize: '6.5px', 
                                color: '#2C3E50', 
                                fontWeight: 'bold',
                                mb: 0.15
                              }}>
                                DATE ISSUED:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '5.5px', 
                                color: '#2C3E50',
                                borderBottom: '1px solid #000',
                                minHeight: '12px',
                                lineHeight: 1.3,
                                pb: 0.1
                              }}>
                                {selectedMemberData?.cardIssueDate ? new Date(selectedMemberData.cardIssueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '________________'}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.8 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                fontSize: '6.5px', 
                                color: '#2C3E50', 
                                fontWeight: 'bold',
                                mb: 0.15
                              }}>
                                SEX:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '5.5px', 
                                color: '#2C3E50',
                                borderBottom: '1px solid #000',
                                minHeight: '12px',
                                lineHeight: 1.3,
                                pb: 0.1
                              }}>
                                {selectedMemberData?.gender || '________________'}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                fontSize: '6.5px', 
                                color: '#2C3E50', 
                                fontWeight: 'bold',
                                mb: 0.15
                              }}>
                                BLOOD TYPE:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '5.5px', 
                                color: '#2C3E50',
                                borderBottom: '1px solid #000',
                                minHeight: '12px',
                                lineHeight: 1.3,
                                pb: 0.1
                              }}>
                                {selectedMemberData?.bloodType || '________________'}
                              </Typography>
                            </Box>
                          </Box>

                          <Box>
                            <Typography variant="body2" sx={{ 
                              fontSize: '6.5px', 
                              color: '#2C3E50', 
                              fontWeight: 'bold',
                              mb: 0.15
                            }}>
                              CONTACT NO:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontSize: '5.5px', 
                              color: '#2C3E50',
                              borderBottom: '1px solid #000',
                              minHeight: '12px',
                              lineHeight: 1.3,
                              pb: 0.1
                            }}>
                              {selectedMemberData?.contactNumber || '________________'}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" sx={{ 
                              fontSize: '6.5px', 
                              color: '#2C3E50', 
                              fontWeight: 'bold',
                              mb: 0.15
                            }}>
                              GUARDIAN NAME:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontSize: '5.5px', 
                              color: '#2C3E50',
                              borderBottom: '1px solid #000',
                              minHeight: '12px',
                              lineHeight: 1.3,
                              pb: 0.1
                            }}>
                              {selectedMemberData?.guardianName || '________________'}
                            </Typography>
                          </Box>
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