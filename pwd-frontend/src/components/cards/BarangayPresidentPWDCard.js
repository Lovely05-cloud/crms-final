import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Radio,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import Menu from '@mui/icons-material/Menu';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import PersonIcon from '@mui/icons-material/Person';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BarangayPresidentSidebar from '../shared/BarangayPresidentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import QRCodeService from '../../services/qrCodeService';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';

// Constants and helper functions from admin PWDCard
const PLACEHOLDER_LINE = '________________';

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

// Real PWD data will be fetched from API based on barangay

// Main Component
function BarangayPresidentPWDCard() {
  const { currentUser } = useAuth();
  const barangay = currentUser?.barangay || 'Unknown Barangay';
  
  const [pwdData, setPwdData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
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

  // Fetch PWD members from API filtered by barangay
  useEffect(() => {
    const fetchPwdMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching PWD members for barangay:', barangay);
        const response = await api.get('/pwd-members');
        console.log('API Response:', response);
        const members = response.data || response.members || [];
        console.log('All members data:', members);
        
        // Filter members by barangay
        const filteredMembers = members.filter(member => {
          // Only show members from the barangay president's barangay
          return member.barangay === barangay;
        });
        
        console.log(`Filtered members for ${barangay}:`, filteredMembers);
        setPwdData(filteredMembers);
        if (filteredMembers.length > 0) {
          setSelectedRow(filteredMembers[0].userID);
        }
      } catch (err) {
        console.error('Error fetching PWD members:', err);
        setError(`Failed to fetch PWD members: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPwdMembers();
  }, [barangay]);

  const handleRowSelect = (id) => {
    setSelectedRow(id);
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

  const getStatusChip = (status) => {
    let style = {
      bgcolor: '#3498DB',
      color: '#FFFFFF',
      fontWeight: 600,
      fontSize: '0.75rem',
      width: '100px',
      height: '24px'
    };
    if (status === 'ACTIVE') {
      style.bgcolor = '#27AE60'; // Green for ACTIVE
    }
    return <Chip label={status} size="small" sx={style} />;
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredData = useMemo(() => {
    const filtered = pwdData.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue = a[orderBy];
        let bValue = b[orderBy];
        
        // Handle nested properties
        if (orderBy === 'pwd_id') {
          aValue = a.pwd_id || `PWD-${a.userID}` || '';
          bValue = b.pwd_id || `PWD-${b.userID}` || '';
        } else if (orderBy === 'name') {
          const aName = [a.firstName, a.middleName, a.lastName, a.suffix].filter(Boolean).join(' ');
          const bName = [b.firstName, b.middleName, b.lastName, b.suffix].filter(Boolean).join(' ');
          aValue = aName;
          bValue = bName;
        } else if (orderBy === 'age') {
          aValue = a.birthDate ? getAgeFromBirthDate(a.birthDate) : 0;
          bValue = b.birthDate ? getAgeFromBirthDate(b.birthDate) : 0;
          // Convert to number if possible
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
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
  }, [pwdData, searchTerm, orderBy, order]);

  // Get the selected PWD data
  const selectedPWD = pwdData.find(pwd => pwd.userID === selectedRow) || pwdData[0];
  const selectedMemberData = selectedPWD;

  // Reset card flip when member selection changes
  useEffect(() => {
    setIsCardFlipped(false);
  }, [selectedRow]);

  // Fetch ID picture from member documents when member is selected
  useEffect(() => {
    if (!selectedRow || pwdData.length === 0) {
      setIdPictureUrl(null);
      return;
    }
    
    const fetchIdPicture = async () => {
      try {
        const member = pwdData.find(m => m.userID === selectedRow);
        if (!member || !member.memberId) {
          setIdPictureUrl(null);
          return;
        }
        
        const response = await api.get('/documents/all-members');
        
        if (response && response.success && response.members) {
          const targetMember = response.members.find(m => 
            m.id === member.memberId || 
            m.userID === member.memberId ||
            m.pwd_member?.userID === member.memberId
          );
          
          const memberDocs = targetMember?.memberDocuments || targetMember?.member_documents || [];
          
          if (memberDocs.length > 0) {
            const idPicturesDoc = memberDocs.find(md => {
              const docName = md.requiredDocument?.name || md.required_document?.name || 
                             md.requiredDocumentName || md.required_document_name;
              return docName === 'ID Pictures' || docName === 'ID Picture';
            });
            
            if (idPicturesDoc) {
              if (idPicturesDoc.id) {
                const fileUrl = api.getFilePreviewUrl('document-file', idPicturesDoc.id);
                const token = localStorage.getItem('auth.token');
                if (token) {
                  try {
                    const tokenData = JSON.parse(token);
                    const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
                    if (tokenValue) {
                      const separator = fileUrl.includes('?') ? '&' : '?';
                      setIdPictureUrl(`${fileUrl}${separator}token=${tokenValue}`);
                      return;
                    }
                  } catch (error) {
                    console.warn('Error parsing auth token:', error);
                  }
                }
                setIdPictureUrl(fileUrl);
                return;
              }
              
              const filePath = idPicturesDoc.file_path || idPicturesDoc.filePath;
              if (filePath) {
                setIdPictureUrl(api.getStorageUrl(filePath));
                return;
              }
            }
            
            if (member.idPictures) {
              let imagePath = null;
              if (Array.isArray(member.idPictures)) {
                imagePath = member.idPictures[0];
              } else if (typeof member.idPictures === 'string') {
                try {
                  const parsed = JSON.parse(member.idPictures);
                  imagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : member.idPictures;
                } catch (error) {
                  imagePath = member.idPictures;
                }
              }
              
              if (imagePath) {
                setIdPictureUrl(api.getStorageUrl(imagePath));
                return;
              }
            }
          }
          
          setIdPictureUrl(null);
        }
      } catch (error) {
        console.error('Error fetching ID picture:', error);
        setIdPictureUrl(null);
      }
    };
    
    fetchIdPicture();
  }, [selectedRow, pwdData]);

  // Generate QR code for selected member
  useEffect(() => {
    if (!selectedRow || pwdData.length === 0) return;
    
    const generateQRCode = async () => {
      try {
        const member = pwdData.find(m => m.userID === selectedRow);
        if (!member) return;
        
        const qrDataURL = await QRCodeService.generateMemberQRCode(member);
        setQrCodeDataURL(qrDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    
    generateQRCode();
  }, [selectedRow, pwdData]);

  // Card display values
  const displayName = withPlaceholder(getMemberFullName(selectedMemberData), { uppercase: true });
  const displayDisability = withPlaceholder(selectedMemberData?.disabilityType || selectedMemberData?.disability || '', { uppercase: true });
  const displayIdNumber = withPlaceholder(getMemberIdNumber(selectedMemberData), { uppercase: true });
  const displayAddress = withPlaceholder(getMemberAddressLine(selectedMemberData), { uppercase: true });
  const displayDob = withPlaceholder(formatCardDate(selectedMemberData?.birthDate || selectedMemberData?.dateOfBirth), { uppercase: true });
  const displayDateIssued = withPlaceholder(formatCardDate(selectedMemberData?.cardIssueDate || selectedMemberData?.card_issue_date), { uppercase: true });
  const displayGender = withPlaceholder(selectedMemberData?.gender || selectedMemberData?.sex || '', { uppercase: true });
  const displayBloodType = withPlaceholder(selectedMemberData?.blood_type || selectedMemberData?.bloodType || '', { uppercase: true });
  const displayContact = withPlaceholder(selectedMemberData?.contactNumber || selectedMemberData?.contact_number || '', { uppercase: true });
  const guardianValue = selectedMemberData?.guardianName || selectedMemberData?.guardian_name || '';
  const displayGuardian = withPlaceholder(guardianValue);
  const flagLogoUrl = LOGO_URLS.flag;
  const bagongLogoUrl = LOGO_URLS.bagong;
  const pdaoLogoUrl = LOGO_URLS.pdao;
  const sealLogoUrl = LOGO_URLS.seal;
  const provinceValue = selectedMemberData?.province || 'LAGUNA';
  const cityValue = selectedMemberData?.cityMunicipality || selectedMemberData?.city || 'CABUYAO';

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

  const HTML_ESCAPE_LOOKUP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  const escapeHtml = (value = '') => value.toString().replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char] || char);

  const handleDownloadPDF = async () => {
    if (!selectedMemberData) {
      alert('Please select a PWD member to generate their card PDF.');
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
      const cardSpacing = 0.25;
      const pageMargin = 0.1;
      
      const frontCardX = pageMargin;
      const frontCardY = pageMargin;
      const backCardX = frontCardX + cardWidth + cardSpacing;
      const backCardY = pageMargin;

      const margin = 0.05;
      const contentWidth = cardWidth - (margin * 2);
      const contentHeight = cardHeight - (margin * 2);

      // Draw border for front card
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

      // Logo group on the right
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

      // Photo
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

      // Bottom flag and Bagong wordmark
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

      // BACK SIDE
      const backMargin = 0.05;
      const backContentWidth = cardWidth - (backMargin * 2);
      const backContentHeight = cardHeight - (backMargin * 2);

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(backCardX, backCardY, cardWidth, cardHeight);

      // Back side logos: Bagong Cabuyao (left), City Seal (middle), PDAO (right)
      const topRightY = backCardY + backMargin + 0.05;
      const backPdaoSize = 0.24;
      const backSealSize = 0.26;
      const bagongWidthBack = 0.7;
      const bagongHeightBack = 0.22;
      const logoGap = 0.04;
      
      // Position from right to left: PDAO (rightmost), Seal (middle), Bagong (leftmost)
      const backPdaoX = backCardX + cardWidth - backMargin - backPdaoSize;
      const backSealX = backPdaoX - logoGap - backSealSize;
      const bagongX = backSealX - logoGap - bagongWidthBack;

      // Bagong Cabuyao (leftmost)
      addLogoImage(logos?.bagong, bagongX, topRightY + 0.02, bagongWidthBack, bagongHeightBack, () => {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(183, 28, 28);
        pdf.text('BAGONG CABUYAO', bagongX + bagongWidthBack, topRightY + bagongHeightBack / 2 + 0.02, { align: 'left' });
        pdf.setTextColor(0, 0, 0);
      });

      // City Seal (middle)
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

      // PDAO Logo (rightmost)
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

      // Calculate logo height to position content below it
      const logoHeight = Math.max(backPdaoSize, backSealSize, bagongHeightBack);
      const backMainContentY = topRightY + logoHeight + 0.1; // Start content below logos with spacing
      const qrCodeColumnWidth = cardWidth * 0.5;
      const backLeftColumnX = backCardX + backMargin + 0.05;
      const backRightColumnX = backLeftColumnX + qrCodeColumnWidth + 0.05;
      const backRightColumnWidth = (backCardX + cardWidth) - backRightColumnX - backMargin - 0.05;

      // QR Code (left side - vertically centered, larger size)
      const availableHeight = cardHeight - (backMargin * 2);
      const qrCodeSize = Math.min(qrCodeColumnWidth - 0.15, availableHeight * 0.75); // Use 75% of available height for larger QR
      const qrCodeX = backLeftColumnX + (qrCodeColumnWidth - qrCodeSize) / 2;
      // Center vertically in the entire card height
      const qrCodeY = backCardY + (cardHeight - qrCodeSize) / 2;

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

      // Member details (right side) - start below logos
      let detailY = backMainContentY;
      const lineHeight = 0.14;
      const fieldLabelSize = 4.5;
      const fieldValueSize = 4;

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

      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTACT NO:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayContact, backRightColumnX, detailY + 0.055);
      detailY += lineHeight;

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

      alert(`PWD ID Card PDF for ${memberName} has been generated and downloaded.`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCard = async () => {
    if (!selectedMemberData) {
      alert('Please select a PWD member to print their card.');
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
          console.error('Error generating QR code for print:', error);
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
      const cardSpacing = 0.25;
      const pageMargin = 0.1;
      
      const frontCardX = pageMargin;
      const frontCardY = pageMargin;
      const backCardX = frontCardX + cardWidth + cardSpacing;
      const backCardY = pageMargin;

      const margin = 0.05;
      const contentWidth = cardWidth - (margin * 2);
      const contentHeight = cardHeight - (margin * 2);

      // Draw border for front card
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

      // Logo group on the right
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

      // Photo
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

      // Bottom flag and Bagong wordmark
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

      // BACK SIDE
      const backMargin = 0.05;
      const backContentWidth = cardWidth - (backMargin * 2);
      const backContentHeight = cardHeight - (backMargin * 2);

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.01);
      pdf.rect(backCardX, backCardY, cardWidth, cardHeight);

      // Back side logos: Bagong Cabuyao (left), City Seal (middle), PDAO (right)
      const topRightY = backCardY + backMargin + 0.05;
      const backPdaoSize = 0.24;
      const backSealSize = 0.26;
      const bagongWidthBack = 0.7;
      const bagongHeightBack = 0.22;
      const logoGap = 0.04;
      
      // Position from right to left: PDAO (rightmost), Seal (middle), Bagong (leftmost)
      const backPdaoX = backCardX + cardWidth - backMargin - backPdaoSize;
      const backSealX = backPdaoX - logoGap - backSealSize;
      const bagongX = backSealX - logoGap - bagongWidthBack;

      // Bagong Cabuyao (leftmost)
      addLogoImage(logos?.bagong, bagongX, topRightY + 0.02, bagongWidthBack, bagongHeightBack, () => {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(183, 28, 28);
        pdf.text('BAGONG CABUYAO', bagongX + bagongWidthBack, topRightY + bagongHeightBack / 2 + 0.02, { align: 'left' });
        pdf.setTextColor(0, 0, 0);
      });

      // City Seal (middle)
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

      // PDAO Logo (rightmost)
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

      // Calculate logo height to position content below it
      const logoHeight = Math.max(backPdaoSize, backSealSize, bagongHeightBack);
      const backMainContentY = topRightY + logoHeight + 0.1; // Start content below logos with spacing
      const qrCodeColumnWidth = cardWidth * 0.5;
      const backLeftColumnX = backCardX + backMargin + 0.05;
      const backRightColumnX = backLeftColumnX + qrCodeColumnWidth + 0.05;
      const backRightColumnWidth = (backCardX + cardWidth) - backRightColumnX - backMargin - 0.05;

      // QR Code (left side - vertically centered, larger size)
      const availableHeight = cardHeight - (backMargin * 2);
      const qrCodeSize = Math.min(qrCodeColumnWidth - 0.15, availableHeight * 0.75); // Use 75% of available height for larger QR
      const qrCodeX = backLeftColumnX + (qrCodeColumnWidth - qrCodeSize) / 2;
      // Center vertically in the entire card height
      const qrCodeY = backCardY + (cardHeight - qrCodeSize) / 2;

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

      // Member details (right side) - start below logos
      let detailY = backMainContentY;
      const lineHeight = 0.14;
      const fieldLabelSize = 4.5;
      const fieldValueSize = 4;

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

      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTACT NO:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayContact, backRightColumnX, detailY + 0.055);
      detailY += lineHeight;

      pdf.setFontSize(fieldLabelSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GUARDIAN NAME:', backRightColumnX, detailY);
      pdf.line(backRightColumnX, detailY + 0.022, backRightColumnX + backRightColumnWidth * 0.95, detailY + 0.022);
      pdf.setFontSize(fieldValueSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(displayGuardian, backRightColumnX, detailY + 0.055);

      // Generate PDF with auto-print enabled
      pdf.autoPrint();
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Create an iframe to handle printing without opening a new window that might auto-close
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        try {
          // Wait a bit for PDF to render
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            // Keep iframe in DOM - don't remove it immediately
            // User can close the print dialog manually
          }, 500);
        } catch (e) {
          console.error('Error printing:', e);
          // Fallback: open in new window
          const printWindow = window.open(pdfUrl, '_blank');
          if (printWindow) {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 1000);
          }
        }
      };
      
      iframe.src = pdfUrl;
      
      // Clean up iframe and URL after a longer delay (30 seconds)
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(pdfUrl);
        } catch (e) {
          console.error('Error cleaning up:', e);
        }
      }, 30000);

    } catch (error) {
      console.error('Error generating PDF for print:', error);
      alert('Failed to generate PDF for printing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7FC' }}>
        <BarangayPresidentSidebar />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ color: '#2C3E50', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Loading PWD members for {barangay}...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7FC' }}>
        <BarangayPresidentSidebar />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Alert severity="error" sx={{ maxWidth: 500 }}>
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  if (pwdData.length === 0) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7FC' }}>
        <BarangayPresidentSidebar />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 80, color: '#BDC3C7', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              No PWD Members Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              No PWD members with accounts found in {barangay}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#F4F7FC', overflow: 'hidden', maxHeight: '100vh' }}>
      <BarangayPresidentSidebar />
      
      {/* --- Main Content --- */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        ml: '280px',
        width: 'calc(100% - 280px)',
        height: '100vh',
        overflow: 'hidden',
        maxHeight: '100vh'
      }}>
        {/* Top Bar */}
        <Box sx={{
          bgcolor: '#FFFFFF',
          p: 1.5,
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
          zIndex: 10,
          height: '64px',
          minHeight: '64px',
          maxHeight: '64px'
        }}>
          <Button
            variant="outlined"
            sx={{
              bgcolor: '#FFFFFF',
              color: '#193a52',
              borderColor: '#193a52',
              textTransform: 'none',
              fontWeight: 600,
              px: 4, py: 1,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#F8F9FA',
                borderColor: '#193a52',
                color: '#193a52'
              }
            }}
          >
            Masterlist - {barangay}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            placeholder="Search table"
            size="small"
            sx={{
              width: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#F4F7FC',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: '#BDC3C7' },
                '&.Mui-focused fieldset': { borderColor: '#3498DB' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#7F8C8D' }} />
                </InputAdornment>
              ),
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <IconButton sx={{ color: '#7F8C8D', border: '1px solid #E0E0E0', borderRadius: 2 }}>
            <FilterListIcon />
          </IconButton>
          <IconButton sx={{ color: '#7F8C8D', border: '1px solid #E0E0E0', borderRadius: 2 }}>
            <Menu />
          </IconButton>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1, p: 2, bgcolor: '#F4F7FC', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'calc(100vh - 80px)' }}>
          <Grid container spacing={2} sx={{ height: '100%', flex: 1, overflow: 'hidden', minHeight: 0, maxHeight: '100%' }}>
            {/* Left Section - PWD Masterlist (Full Height) */}
            <Grid item xs={12} lg={8} sx={{ height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <Paper elevation={0} sx={{
                p: 2,
                border: '1px solid #E0E0E0',
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                height: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#193a52', fontSize: '1.1rem', flexShrink: 0 }}>
                  PWD MASTERLIST - {barangay}
                </Typography>

                <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                  <TableContainer sx={{ 
                    flex: 1,
                    overflow: 'auto',
                    minHeight: 0,
                    maxHeight: '100%',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#c1c1c1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a8a8a8',
                    }
                  }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                          <TableCell padding="checkbox" sx={{ bgcolor: 'white' }}>
                            {/* Remove checkbox header since we're using radio buttons */}
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              color: '#0b87ac', 
                              fontWeight: 700, 
                              fontSize: '0.85rem', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px', 
                              py: 2, 
                              px: 2,
                              bgcolor: 'white',
                              cursor: 'pointer',
                              userSelect: 'none',
                              '&:hover': { bgcolor: '#F0F0F0' }
                            }}
                            onClick={() => handleRequestSort('pwd_id')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              PWD ID NO.
                              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'pwd_id' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'pwd_id' && order === 'asc' ? 1 : 0.3 }} />
                                <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'pwd_id' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'pwd_id' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              color: '#0b87ac', 
                              fontWeight: 700, 
                              fontSize: '0.85rem', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px', 
                              py: 2, 
                              px: 2,
                              bgcolor: 'white',
                              cursor: 'pointer',
                              userSelect: 'none',
                              '&:hover': { bgcolor: '#F0F0F0' }
                            }}
                            onClick={() => handleRequestSort('name')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              NAME
                              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'name' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'name' && order === 'asc' ? 1 : 0.3 }} />
                                <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'name' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'name' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              color: '#0b87ac', 
                              fontWeight: 700, 
                              fontSize: '0.85rem', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px', 
                              py: 2, 
                              px: 2,
                              bgcolor: 'white',
                              cursor: 'pointer',
                              userSelect: 'none',
                              '&:hover': { bgcolor: '#F0F0F0' }
                            }}
                            onClick={() => handleRequestSort('age')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              AGE
                              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'age' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'age' && order === 'asc' ? 1 : 0.3 }} />
                                <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'age' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'age' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              color: '#0b87ac', 
                              fontWeight: 700, 
                              fontSize: '0.85rem', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px', 
                              py: 2, 
                              px: 2,
                              bgcolor: 'white',
                              cursor: 'pointer',
                              userSelect: 'none',
                              '&:hover': { bgcolor: '#F0F0F0' }
                            }}
                            onClick={() => handleRequestSort('barangay')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              BARANGAY
                              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                                <ArrowUpwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'barangay' && order === 'asc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'barangay' && order === 'asc' ? 1 : 0.3 }} />
                                <ArrowDownwardIcon sx={{ fontSize: '0.7rem', color: orderBy === 'barangay' && order === 'desc' ? '#0b87ac' : '#BDC3C7', opacity: orderBy === 'barangay' && order === 'desc' ? 1 : 0.3, mt: '-4px' }} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#0b87ac', 
                            fontWeight: 700, 
                            fontSize: '0.85rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px', 
                            py: 2, 
                            px: 2,
                            bgcolor: 'white'
                          }}>
                            STATUS
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                         {filteredData.map((row, index) => (
                           <TableRow key={row.userID} sx={{
                             bgcolor: selectedRow === row.userID ? '#E8F4FD' : (index % 2 ? '#F7FBFF' : 'white'),
                             borderBottom: '1px solid #E0E0E0'
                           }}>
                            <TableCell padding="checkbox" sx={{ py: 2, px: 2 }}>
                              <Radio
                                color="primary"
                                size="small"
                                checked={selectedRow === row.userID}
                                onChange={() => handleRowSelect(row.userID)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#1976D2', fontSize: '0.8rem', py: 2, px: 2 }}>{row.pwd_id || `PWD-${row.userID}` || 'Not assigned'}</TableCell>
                            <TableCell sx={{ color: '#0b87ac', fontWeight: 500, fontSize: '0.8rem', py: 2, px: 2 }}>
                              {(() => {
                                const parts = [];
                                if (row.firstName) parts.push(row.firstName);
                                if (row.middleName && row.middleName.trim().toUpperCase() !== 'N/A') parts.push(row.middleName);
                                if (row.lastName) parts.push(row.lastName);
                                if (row.suffix) parts.push(row.suffix);
                                return parts.join(' ').trim() || 'Name not provided';
                              })()}
                            </TableCell>
                            <TableCell sx={{ color: '#34495E', fontWeight: 600, fontSize: '0.8rem', py: 2, px: 2 }}>
                              {row.birthDate ? getAgeFromBirthDate(row.birthDate) : 'N/A'}
                            </TableCell>
                            <TableCell sx={{ color: '#0b87ac', fontWeight: 500, fontSize: '0.8rem', py: 2, px: 2 }}>{row.barangay || 'Not specified'}</TableCell>
                            <TableCell sx={{ py: 2, px: 2 }}>{getStatusChip(row.status || 'Active')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Right Section - PWD Card Preview and Information */}
            <Grid item xs={12} lg={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'hidden', minHeight: 0 }}>
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
                        gap: 1,
                        overflow: 'hidden'
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
                          <Box sx={{ mb: 1.5, minWidth: 0, overflow: 'hidden' }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                              NAME
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.3,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                lineHeight: 1.2,
                                maxWidth: '100%'
                              }}
                            >
                              {displayName}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 1.5, minWidth: 0, overflow: 'hidden' }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                              DISABILITY
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.3,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                lineHeight: 1.2,
                                maxWidth: '100%'
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
                          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#1f2937', letterSpacing: '0.08em' }}>
                              ID NO.
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                borderBottom: '1px solid #111827',
                                pb: 0.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%'
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

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, width: '100%', mb: 0.5, flexShrink: 0 }}>
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
                          fontSize: '0.45rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          color: '#111827',
                          letterSpacing: '0.08em',
                          flexShrink: 0,
                          py: 0.25,
                          lineHeight: 1.2
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
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              ADDRESS:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                lineHeight: 1.2,
                                maxWidth: '100%'
                              }}
                            >
                              {displayAddress}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                                DATE OF BIRTH:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: '#111827',
                                  borderBottom: '1px solid #111827',
                                  pb: 0.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}
                              >
                                {displayDob}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                                DATE ISSUED:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: '#111827',
                                  borderBottom: '1px solid #111827',
                                  pb: 0.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}
                              >
                                {displayDateIssued}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                                SEX:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: '#111827',
                                  borderBottom: '1px solid #111827',
                                  pb: 0.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}
                              >
                                {displayGender}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                                BLOOD TYPE:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: '#111827',
                                  borderBottom: '1px solid #111827',
                                  pb: 0.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}
                              >
                                {displayBloodType}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              CONTACT NO:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%'
                              }}
                            >
                              {displayContact}
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#111827', letterSpacing: '0.08em' }}>
                              GUARDIAN NAME:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: '#111827',
                                borderBottom: '1px solid #111827',
                                pb: 0.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%'
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
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

export default BarangayPresidentPWDCard;
