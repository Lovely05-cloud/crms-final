// src/components/application/ApplicationForm.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Paper,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  InputAdornment,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  ContentCopy as ContentCopyIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { api } from '../../services/api';
import applicationService from '../../services/applicationService';
import EmailVerificationModal from './EmailVerificationModal';
import SuccessModal from '../shared/SuccessModal';
import { useModal } from '../../hooks/useModal';
import { saveFileToStorage, getFileFromStorage, removeFileFromStorage, clearAllFilesFromStorage } from '../../utils/fileStorage';

const steps = [
  'Personal Information',
  'Address',
  'Disability Details',
  'Documents'
];

// Maximum file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

function ApplicationForm() {
  const navigate = useNavigate();
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [fileErrors, setFileErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
  const [duplicateErrors, setDuplicateErrors] = useState({});
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Success modal
  const { modalOpen, modalConfig, showModal, hideModal } = useModal();
  
  // Generate reference number
  const generateReferenceNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PWD-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}-${random}`;
  };

  // Reusable styling for form fields
  const getTextFieldStyles = (hasError = false) => ({
    '& .MuiInputLabel-root': {
      color: hasError ? '#E74C3C' : '#000000',
      fontWeight: 500,
      fontSize: '0.9rem'
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
      '& fieldset': {
        borderColor: hasError ? '#E74C3C' : '#CCCCCC',
      },
      '&:hover fieldset': {
        borderColor: hasError ? '#E74C3C' : '#999999',
      },
      '&.Mui-focused fieldset': {
        borderColor: hasError ? '#E74C3C' : '#000000',
        borderWidth: 2,
      },
    },
    '& .MuiInputBase-input': {
      color: '#000000',
      py: 1.2,
      fontSize: '0.95rem'
    },
    '& .MuiFormHelperText-root': {
      color: '#E74C3C',
      fontSize: '0.8rem',
      fontWeight: 500
    }
  });

  // Format date as DD/MM/YYYY for disability onset
  const formatDateDDMMYYYY = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };


  // Reusable styling for select fields
  const getSelectStyles = (hasError = false) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
      '& fieldset': {
        borderColor: hasError ? '#E74C3C' : '#CCCCCC',
      },
      '&:hover fieldset': {
        borderColor: hasError ? '#E74C3C' : '#999999',
      },
      '&.Mui-focused fieldset': {
        borderColor: hasError ? '#E74C3C' : '#000000',
        borderWidth: 2,
      },
    },
    '& .MuiSelect-select': {
      color: '#000000',
      py: 1.2,
      fontSize: '0.95rem'
    },
    '& .MuiPaper-root': {
      backgroundColor: '#FFFFFF',
      border: '1px solid #CCCCCC',
      borderRadius: 3,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      '& .MuiMenuItem-root': {
        color: '#000000',
        fontSize: '0.95rem',
        '&:hover': {
          backgroundColor: '#F5F5F5',
        },
        '&.Mui-selected': {
          backgroundColor: '#E0E0E0',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#D0D0D0',
          },
        },
      },
    }
  });

  // Initialize form data from localStorage or default values
  const getInitialFormData = () => {
    // Default form data structure
    const defaultFormData = {
      firstName: '',
      lastName: '',
      middleName: '',
      suffix: '',
      dateOfBirth: '',
      gender: '',
      civilStatus: '',
      nationality: '',
      disabilityType: '',
      disabilityCause: '',
      disabilityDate: '',
      address: '',
      barangay: '',
      city: 'Cabuyao', // Hardcoded
      province: 'Laguna', // Hardcoded
      postalCode: '4025', // Hardcoded
      phoneNumber: '',
      email: '',
      confirmEmail: '',
      emergencyContact: '',
      emergencyPhone: '',
      emergencyRelationship: '',
      // Document fields - will be populated dynamically
      documents: {}
    };

    const savedData = localStorage.getItem('pwd_application_form');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Ensure documents property exists and is an object
        if (!parsedData.documents || typeof parsedData.documents !== 'object') {
          parsedData.documents = {};
        }
        // Merge with defaults to ensure all fields are defined (not undefined)
        return {
          ...defaultFormData,
          ...parsedData,
          // Ensure all string fields are strings, not undefined
          firstName: parsedData.firstName ?? '',
          lastName: parsedData.lastName ?? '',
          middleName: parsedData.middleName ?? '',
          suffix: parsedData.suffix ?? '',
          dateOfBirth: parsedData.dateOfBirth ?? '',
          gender: parsedData.gender ?? '',
          civilStatus: parsedData.civilStatus ?? '',
          nationality: parsedData.nationality ?? '',
          disabilityType: parsedData.disabilityType ?? '',
          disabilityCause: parsedData.disabilityCause ?? '',
          disabilityDate: parsedData.disabilityDate ?? '',
          address: parsedData.address ?? '',
          barangay: parsedData.barangay ?? '',
          city: parsedData.city ?? 'Cabuyao',
          province: parsedData.province ?? 'Laguna',
          postalCode: parsedData.postalCode ?? '4025',
          phoneNumber: parsedData.phoneNumber ?? '',
          email: parsedData.email ?? '',
          confirmEmail: parsedData.confirmEmail ?? '',
          emergencyContact: parsedData.emergencyContact ?? '',
          emergencyPhone: parsedData.emergencyPhone ?? '',
          emergencyRelationship: parsedData.emergencyRelationship ?? '',
        };
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
    return defaultFormData;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [savedActiveStep, setSavedActiveStep] = useState(() => {
    const savedStep = localStorage.getItem('pwd_application_step');
    return savedStep ? parseInt(savedStep) : 0;
  });

  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(savedActiveStep);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pwd_application_form', JSON.stringify(formData));
  }, [formData]);

  // Save active step to localStorage
  useEffect(() => {
    localStorage.setItem('pwd_application_step', activeStep.toString());
  }, [activeStep]);

  // Clear saved data after successful submission
  const clearSavedFormData = async () => {
    localStorage.removeItem('pwd_application_form');
    localStorage.removeItem('pwd_application_step');
    await clearAllFilesFromStorage();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear duplicate errors for this field
    if (duplicateErrors[field]) {
      setDuplicateErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for date of birth
    if (field === 'dateOfBirth' && value) {
      const dateError = validateDateOfBirth(value);
      if (dateError) {
        setErrors(prev => ({ ...prev, [field]: dateError }));
      }
    }
    
    // Real-time validation for disability date
    if (field === 'disabilityDate' && value) {
      const disabilityDateError = validateDisabilityDate(value);
      if (disabilityDateError) {
        setErrors(prev => ({ ...prev, [field]: disabilityDateError }));
      }
    }
    
    // Check for duplicates on key fields
    if (['email', 'phoneNumber'].includes(field) && value) {
      checkForDuplicates(field, value);
    }
  };

  // Function to check for duplicates
  const checkForDuplicates = async (field, value) => {
    if (!value || value.length < 3) return; // Don't check for very short values
    
    setDuplicateCheckLoading(true);
    try {
      const checkData = { [field]: value };
      
      // Note: Removed name and birth date from duplicate checking as members can have identical birth dates
      
      const response = await api.post('/applications/check-duplicates', checkData, { auth: false });
      
      if (response.has_duplicates) {
        setDuplicateErrors(prev => ({
          ...prev,
          [field]: `This ${field} is already associated with an existing application. Please check your application status or contact support.`
        }));
      } else {
        setDuplicateErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Don't show error to user for duplicate check failures
    } finally {
      setDuplicateCheckLoading(false);
    }
  };

  const handleFileChange = async (field, file) => {
    // Clear previous error for this field
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    if (!file) {
      setFormData(prev => ({ 
        ...prev, 
        documents: { 
          ...prev.documents, 
          [field]: null 
        } 
      }));
      await removeFileFromStorage(field);
      return;
    }

    // Validate file size (15MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileErrors(prev => ({
        ...prev,
        [field]: `File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB. Please select a smaller file.`
      }));
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      documents: { 
        ...prev.documents, 
        [field]: file 
      } 
    }));
    
    // Save file to IndexedDB for persistence
    await saveFileToStorage(field, file);
  };

  // Helper function to get file type
  const getFileType = (file) => {
    if (!file) return 'unknown';
    if (!file.type) return 'document';
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    return 'document';
  };

  // Helper function to get file icon
  const getFileIcon = (file) => {
    const fileType = getFileType(file);
    switch (fileType) {
      case 'image':
        return <ImageIcon sx={{ color: '#4CAF50' }} />;
      case 'pdf':
        return <PdfIcon sx={{ color: '#F44336' }} />;
      default:
        return <DocumentIcon sx={{ color: '#2196F3' }} />;
    }
  };

  // Helper function to check if file is an image
  const isImageFile = (file) => {
    if (!file) return false;
    if (file.type) {
      return file.type.startsWith('image/');
    }
    if (file.name) {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    }
    return false;
  };

  // Helper function to create preview URL
  const createPreviewUrl = (file) => {
    if (!file || !file.type) return null;
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.error('Error creating preview URL:', error);
      return null;
    }
  };

  // Handle file preview
  const handlePreviewFile = (file, fileName) => {
    if (!file || !fileName) return;
    setPreviewFile(file);
    setPreviewFileName(fileName);
    setPreviewOpen(true);
  };

  // Close preview modal
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewFileName('');
    // Clean up object URL to prevent memory leaks
    if (previewFile && previewFile.type) {
      try {
        URL.revokeObjectURL(createPreviewUrl(previewFile));
      } catch (error) {
        console.error('Error revoking preview URL:', error);
      }
    }
  };

  // Fetch required documents on component mount
  useEffect(() => {
    const fetchRequiredDocuments = async () => {
      try {
        // Fetch documents from public endpoint (active documents only)
        const response = await api.get('/documents/public', { auth: false });
        if (response.success) {
          // Backend returns only active documents within effective date range for public access
          setRequiredDocuments(response.documents);
        }
      } catch (error) {
        console.error('Error fetching required documents:', error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    fetchRequiredDocuments();

    // Restore uploaded files from IndexedDB
    const restoreFilesFromStorage = async () => {
      try {
        const savedData = localStorage.getItem('pwd_application_form');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.documents) {
            const restoredDocuments = {};
            for (const [key, value] of Object.entries(parsedData.documents)) {
              if (value && typeof value === 'object' && value.name) {
                // File exists in memory from localStorage
                const file = await getFileFromStorage(key);
                if (file) {
                  restoredDocuments[key] = file;
                }
              }
            }
            if (Object.keys(restoredDocuments).length > 0) {
              setFormData(prev => ({ ...prev, documents: restoredDocuments }));
            }
          }
        }
      } catch (error) {
        console.error('Error restoring files from IndexedDB:', error);
      }
    };

    restoreFilesFromStorage();
  }, []);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up any object URLs when component unmounts
      if (formData.documents && typeof formData.documents === 'object') {
        Object.values(formData.documents).forEach(file => {
          if (file && file.type) {
            URL.revokeObjectURL(createPreviewUrl(file));
          }
        });
      }
    };
  }, [formData.documents]);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Check if applicant is a minor (under 18)
  const isMinor = () => {
    const age = calculateAge(formData.dateOfBirth);
    return age !== null && age < 18;
  };

  // Validate date of birth
  const validateDateOfBirth = (dateOfBirth) => {
    if (!dateOfBirth) return 'Date of Birth is required';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    // Check if date is in the future
    if (birthDate > today) {
      return 'Date of birth cannot be in the future';
    }
    
    // Check if person is too young (less than 1 year old)
    if (birthDate > oneYearAgo) {
      return 'Must be at least 1 year old to apply for PWD ID';
    }
    
    // Check if person is too old (more than 120 years)
    const age = calculateAge(dateOfBirth);
    if (age > 120) {
      return 'Please enter a valid date of birth (maximum age is 120 years)';
    }
    
    return null; // No error
  };

  // Validate disability date
  const validateDisabilityDate = (disabilityDate) => {
    if (!disabilityDate) return null; // Optional field
    
    const today = new Date();
    const disabilityOnsetDate = new Date(disabilityDate);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Check if date is in the future
    if (disabilityOnsetDate > today) {
      return 'Date of disability onset cannot be in the future';
    }
    
    // Check if date is within 1 week of current date
    if (disabilityOnsetDate > oneWeekAgo) {
      return 'Date of disability onset must be at least 1 week before the current date';
    }
    
    return null; // No error
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (!validateCurrentStep()) {
      return;
    }
    
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const validateCurrentStep = () => {
    const currentErrors = {};
    
    switch (activeStep) {
       case 0: // Personal Information
         if (!formData.firstName) currentErrors.firstName = 'First Name is required';
         if (!formData.middleName || formData.middleName.trim() === '') {
           currentErrors.middleName = 'Middle Name is required (enter "N/A" if not applicable)';
         }
         if (!formData.lastName) currentErrors.lastName = 'Last Name is required';
         if (!formData.phoneNumber) currentErrors.phoneNumber = 'Phone Number is required';
         if (!formData.email) currentErrors.email = 'Email is required';
         if (!formData.confirmEmail) currentErrors.confirmEmail = 'Please confirm your email';
         if (formData.email && formData.confirmEmail && formData.email !== formData.confirmEmail) {
           currentErrors.confirmEmail = 'Email addresses do not match';
         }
         if (!formData.emergencyContact) currentErrors.emergencyContact = 'Guardian Name is required';
        if (!formData.emergencyPhone) currentErrors.emergencyPhone = 'Guardian Phone Number is required';
        if (!formData.emergencyRelationship) currentErrors.emergencyRelationship = 'Relationship to Guardian is required';
         
         // Validate date of birth with comprehensive checks
         const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);
         if (dateOfBirthError) currentErrors.dateOfBirth = dateOfBirthError;
         
         if (!formData.gender) currentErrors.gender = 'Gender is required';
         break;
        
      case 1: // Address
        if (!formData.address) currentErrors.address = 'Home Number/Street is required';
        break;
        
      case 2: // Disability Details
        if (!formData.disabilityType) currentErrors.disabilityType = 'Type of Disability is required';
        
        // Validate disability date if provided
        if (formData.disabilityDate) {
          const disabilityDateError = validateDisabilityDate(formData.disabilityDate);
          if (disabilityDateError) currentErrors.disabilityDate = disabilityDateError;
        }
        break;
        
      case 3: // Documents
        // Validate required documents dynamically
        if (requiredDocuments) {
          requiredDocuments.forEach(doc => {
            if (doc.is_required && (!formData.documents || !formData.documents[`doc_${doc.id}`])) {
              currentErrors[`doc_${doc.id}`] = `${doc.name} is required`;
            }
          });
        }
        break;
    }
    
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return false;
    }
    
    // Clear errors if validation passes
    setErrors({});
    return true;
  };

  const handleBack = () => {
    if (activeStep === 0) {
      navigate('/');
      return;
    }
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Open email verification modal first
    setVerificationModalOpen(true);
  };

  const handleVerified = (code) => {
    setVerificationCode(code);
    setVerificationModalOpen(false);
    // Proceed with actual submission
    submitApplication(code);
  };

  const handleVerificationCancel = () => {
    setVerificationModalOpen(false);
  };

  const submitApplication = async (code) => {
    try {
      setSubmitting(true);
      
      // Validate all files before submission
      if (formData.documents) {
        const fileSizeErrors = {};
        Object.keys(formData.documents).forEach(key => {
          const file = formData.documents[key];
          if (file && file.size > MAX_FILE_SIZE) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileSizeErrors[key] = `File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB.`;
          }
        });
        
        if (Object.keys(fileSizeErrors).length > 0) {
          setFileErrors(fileSizeErrors);
          showModal({
            type: 'error',
            title: 'File Size Error',
            message: 'One or more files exceed the 15MB size limit. Please compress or select smaller files.',
            buttonText: 'OK'
          });
          setSubmitting(false);
          return;
        }
      }

      const formDataToSend = new FormData();
      
      // Map frontend fields to backend expected fields
      const fieldMapping = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        suffix: formData.suffix,
        // Send both keys to satisfy different backend validators
        birthDate: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().slice(0,10) : '',
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().slice(0,10) : '',
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        nationality: formData.nationality,
        disabilityType: formData.disabilityType,
        disabilityCause: formData.disabilityCause,
        disabilityDate: formData.disabilityDate,
        address: formData.address,
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        email: formData.email,
        // Ensure contact number is a trimmed string; send both keys used by backend
        contactNumber: (formData.phoneNumber ?? '').toString().trim(),
        phoneNumber: (formData.phoneNumber ?? '').toString().trim(),
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        emergencyRelationship: formData.emergencyRelationship,
        idType: 'PWD ID', // Default value
        idNumber: 'TEMP-' + Date.now(), // Temporary ID
        submissionDate: new Date().toISOString().split('T')[0], // Current date
        verification_code: code, // Add verification code
      };

      // Check for required fields - only the fields that backend expects
      const requiredFields = [
        'firstName', 'middleName', 'lastName', 'birthDate', 'gender', 'disabilityType', 
        'address', 'email', 'contactNumber', 'idType', 'idNumber'
      ];
      const missingFields = requiredFields.filter(field => !fieldMapping[field]);
      
      if (missingFields.length > 0) {
        showModal({
          type: 'warning',
          title: 'Missing Information',
          message: `Please fill in all required fields: ${missingFields.join(', ')}`,
          buttonText: 'OK'
        });
        setSubmitting(false);
        return;
      }

      // Add all form fields to FormData
      Object.keys(fieldMapping).forEach(key => {
        if (fieldMapping[key] !== null && fieldMapping[key] !== '') {
          formDataToSend.append(key, fieldMapping[key]);
        }
      });

      // Add file uploads to FormData dynamically
      if (formData.documents) {
        Object.keys(formData.documents).forEach(key => {
          const file = formData.documents[key];
          if (file) {
            // Extract document ID from key (doc_123 -> 123)
            const docId = key.replace('doc_', '');
            formDataToSend.append(`document_${docId}`, file);
          }
        });
      }

      // Also map known document names to backend's expected fixed keys
      // so the API can process them even if it doesn't use dynamic document_{id} keys
      if (requiredDocuments) {
        requiredDocuments.forEach((doc) => {
        const file = formData.documents && formData.documents[`doc_${doc.id}`];
        if (!file) return;
        const name = (doc.name || '').toString().toLowerCase();
        if (name.includes('medical')) {
          formDataToSend.append('medicalCertificate', file);
        } else if (name.includes('clinical') || name.includes('abstract') || name.includes('assessment')) {
          formDataToSend.append('clinicalAbstract', file);
        } else if (name.includes('voter')) {
          formDataToSend.append('voterCertificate', file);
        } else if ((name.includes('id') && name.includes('picture')) || name.includes('1"x1"') || name.includes('1\"x1\"')) {
          // Send idPictures as single file (standardized to match other documents)
          formDataToSend.append('idPictures', file);
        } else if (name.includes('birth')) {
          formDataToSend.append('birthCertificate', file);
        } else if (name.includes('whole') && name.includes('body')) {
          formDataToSend.append('wholeBodyPicture', file);
        } else if (name.includes('affidavit')) {
          formDataToSend.append('affidavit', file);
        } else if (name.includes('barangay') && (name.includes('certificate') || name.includes('residency'))) {
          formDataToSend.append('barangayCertificate', file);
        }
        });
      }

      // Debug: Log what we're sending
      console.log('Sending FormData with fields:', Object.fromEntries(formDataToSend.entries()));

      // Generate reference number
      const referenceNumber = generateReferenceNumber();
      
      // Add reference number to form data
      formDataToSend.append('referenceNumber', referenceNumber);

      const response = await applicationService.create(formDataToSend);

      if (response) {
        showModal({
          type: 'success',
          title: 'Application Submitted Successfully!',
          message: (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Your PWD application has been submitted successfully!
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="body1">
                  <strong>Reference Number: {referenceNumber}</strong>
                </Typography>
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      // Try modern Clipboard API first
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(referenceNumber);
                        alert('Reference number copied to clipboard!');
                      } else {
                        // Fallback for browsers without Clipboard API (HTTP, older browsers)
                        const textArea = document.createElement('textarea');
                        textArea.value = referenceNumber;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          const successful = document.execCommand('copy');
                          if (successful) {
                            alert('Reference number copied to clipboard!');
                          } else {
                            // Final fallback: select the text for manual copy
                            const selection = window.getSelection();
                            const range = document.createRange();
                            const textNode = document.createTextNode(referenceNumber);
                            document.body.appendChild(textNode);
                            range.selectNodeContents(textNode);
                            selection.removeAllRanges();
                            selection.addRange(range);
                            alert('Please manually copy the reference number (Ctrl+C or Cmd+C)');
                            document.body.removeChild(textNode);
                          }
                        } catch (err) {
                          // Final fallback: show in alert for manual copy
                          alert(`Please copy this reference number manually: ${referenceNumber}`);
                        }
                        document.body.removeChild(textArea);
                      }
                    } catch (err) {
                      // If all methods fail, show the reference number in an alert
                      alert(`Please copy this reference number manually: ${referenceNumber}`);
                    }
                  }}
                  sx={{
                    color: '#27AE60',
                    '&:hover': {
                      backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    },
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body1">
                Please save this reference number to check your application status.
              </Typography>
            </Box>
          ),
          buttonText: 'Continue to Login',
          requireCheckbox: true,
          checkboxLabel: 'I have copied the reference number',
          onClose: () => {
            // Clear saved form data
            clearSavedFormData();
            // Redirect to login page only after user closes the modal
            navigate('/login');
          }
        });
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          suffix: '',
          dateOfBirth: '',
          gender: '',
          civilStatus: '',
          nationality: '',
          disabilityType: '',
          disabilityCause: '',
          disabilityDate: '',
          address: '',
          barangay: '',
          city: 'Cabuyao', // Hardcoded
          province: 'Laguna', // Hardcoded
          postalCode: '4025', // Hardcoded
          phoneNumber: '',
          email: '',
          emergencyContact: '',
          emergencyPhone: '',
          emergencyRelationship: '',
          // Document fields
          medicalCertificate: null,
          clinicalAbstract: null,
          voterCertificate: null,
          idPictures: null,
          birthCertificate: null,
          wholeBodyPicture: null,
          affidavit: null,
          barangayCertificate: null
        });
        setActiveStep(0);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitting(false);
      const data = error.data || {};
      console.log('Error data:', data);
      
      if (data.duplicates) {
        const d = data.duplicates;
        const lines = [];
        if (d.email) {
          lines.push(`Email already used by ${d.email.existing_application?.name || d.email.existing_user?.email || ''}`);
        }
        if (d.phoneNumber) {
          lines.push(`Phone number already used by ${d.phoneNumber.existing_application?.name || ''}`);
        }
        // Note: Removed name_birth duplicate check as members can have identical birth dates
        if (d.idNumber) {
          lines.push(`ID number already used by ${d.idNumber.existing_application?.name || ''}`);
        }
        showModal({
          type: 'warning',
          title: 'Duplicate Application',
          message: `Duplicate application detected:\n${lines.join('\n') || 'See network response for details.'}`,
          buttonText: 'OK'
        });
      } else if (data.messages) {
        const errorMessages = Object.values(data.messages).flat().join('\n');
        showModal({
          type: 'error',
          title: 'Validation Error',
          message: `Validation errors:\n${errorMessages}`,
          buttonText: 'OK'
        });
      } else if (data.errors) {
        const errorMessages = Object.values(data.errors).flat().join('\n');
        showModal({
          type: 'error',
          title: 'Validation Error',
          message: `Validation errors:\n${errorMessages}`,
          buttonText: 'OK'
        });
      } else if (data.message) {
        showModal({
          type: 'error',
          title: 'Error',
          message: `Error: ${data.message}`,
          buttonText: 'OK'
        });
      } else if (error.message) {
        showModal({
          type: 'error',
          title: 'Error',
          message: `Error: ${error.message}`,
          buttonText: 'OK'
        });
      } else {
        showModal({
          type: 'error',
          title: 'Error',
          message: 'Error submitting application. Please try again.',
          buttonText: 'OK'
        });
      }
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ 
              mb: 1, 
              color: '#000000',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Personal Information
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName ?? ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={getTextFieldStyles(!!errors.firstName)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName ?? ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={getTextFieldStyles(!!errors.lastName)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={getSelectStyles()}>
                  <InputLabel shrink>Suffix</InputLabel>
                  <Select
                    value={formData.suffix ?? ''}
                    onChange={(e) => handleInputChange('suffix', e.target.value)}
                    label="Suffix"
                    displayEmpty
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
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="Jr.">Jr.</MenuItem>
                    <MenuItem value="Sr.">Sr.</MenuItem>
                    <MenuItem value="I">I</MenuItem>
                    <MenuItem value="II">II</MenuItem>
                    <MenuItem value="III">III</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="Middle Name"
                   value={formData.middleName ?? ''}
                   onChange={(e) => handleInputChange('middleName', e.target.value)}
                   InputLabelProps={{
                     shrink: true,
                   }}
                   required
                   error={!!errors.middleName}
                   helperText={errors.middleName || 'Enter your middle name or "N/A" if not applicable'}
                   placeholder="Enter middle name or N/A"
                   sx={getTextFieldStyles(!!errors.middleName)}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="Phone Number"
                   value={formData.phoneNumber ?? ''}
                   onChange={(e) => {
                     // Only allow numbers
                     const numericValue = e.target.value.replace(/\D/g, '');
                     handleInputChange('phoneNumber', numericValue);
                   }}
                   error={!!errors.phoneNumber || !!duplicateErrors.phoneNumber}
                   helperText={errors.phoneNumber || duplicateErrors.phoneNumber}
                   required
                   InputLabelProps={{
                     shrink: true,
                   }}
                   sx={getTextFieldStyles(!!errors.phoneNumber || !!duplicateErrors.phoneNumber)}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="Email Address"
                   type="email"
                   value={formData.email ?? ''}
                   onChange={(e) => handleInputChange('email', e.target.value)}
                   error={!!errors.email || !!duplicateErrors.email}
                   helperText={errors.email || duplicateErrors.email}
                   required
                   InputLabelProps={{
                     shrink: true,
                   }}
                   sx={getTextFieldStyles(!!errors.email || !!duplicateErrors.email)}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="Confirm Email Address"
                   type="email"
                   value={formData.confirmEmail ?? ''}
                   onChange={(e) => handleInputChange('confirmEmail', e.target.value)}
                   error={!!errors.confirmEmail}
                   helperText={errors.confirmEmail}
                   required
                   InputLabelProps={{
                     shrink: true,
                   }}
                   sx={getTextFieldStyles(!!errors.confirmEmail)}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   type="date"
                   label="Date of Birth"
                   value={formData.dateOfBirth ?? ''}
                   onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                   InputLabelProps={{ shrink: true }}
                   error={!!errors.dateOfBirth}
                   helperText={errors.dateOfBirth || "Must be at least 1 year old (cannot be today or future dates)"}
                   required
                   inputProps={{
                     max: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Exactly 1 year ago
                     min: new Date(new Date().getFullYear() - 120, 0, 1).toISOString().split('T')[0] // First day 120 years ago
                   }}
                   sx={getTextFieldStyles(!!errors.dateOfBirth)}
                 />
               </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.gender}>
                   <InputLabel 
                     shrink={true}
                     sx={{ 
                        color: errors.gender ? '#E74C3C' : '#000000',
                       fontWeight: 500,
                       fontSize: '0.95rem',
                       backgroundColor: 'white',
                       px: 1,
                       transform: 'translate(14px, -9px) scale(0.75)',
                       '&.Mui-focused': {
                         color: errors.gender ? '#E74C3C' : '#0b87ac'
                       }
                     }}
                   >
                     Gender
                   </InputLabel>
                   <Select
                     value={formData.gender ?? ''}
                     onChange={(e) => handleInputChange('gender', e.target.value)}
                     sx={getSelectStyles(!!errors.gender)}
                     MenuProps={{
                       PaperProps: {
                         sx: {
                           backgroundColor: '#FFFFFF',
                           border: '1px solid #e9ecef',
                           borderRadius: 3,
                           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                           '& .MuiMenuItem-root': {
                             color: '#2C3E50',
                             fontSize: '0.95rem',
                             '&:hover': {
                               backgroundColor: '#f8f9fa',
                             },
                             '&.Mui-selected': {
                               backgroundColor: '#0b87ac',
                               color: '#FFFFFF',
                               '&:hover': {
                                 backgroundColor: '#0a6b8a',
                               },
                             },
                           },
                         }
                       }
                     }}
                   >
                     <MenuItem value="male">Male</MenuItem>
                     <MenuItem value="female">Female</MenuItem>
                   </Select>
                   {errors.gender && (
                     <FormHelperText sx={{ color: '#E74C3C', fontSize: '0.8rem', fontWeight: 500 }}>
                       {errors.gender}
                     </FormHelperText>
                   )}
                 </FormControl>
               </Grid>
                                                           <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel 
                      shrink={true}
                      sx={{ 
                        color: '#000000',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        backgroundColor: 'white',
                        px: 1,
                        transform: 'translate(14px, -9px) scale(0.75)',
                        '&.Mui-focused': {
                          color: '#0b87ac'
                        }
                      }}
                    >
                      Civil Status
                    </InputLabel>
                    <Select
                      value={formData.civilStatus ?? ''}
                      onChange={(e) => handleInputChange('civilStatus', e.target.value)}
                      sx={getSelectStyles()}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #e9ecef',
                            borderRadius: 3,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            '& .MuiMenuItem-root': {
                              color: '#2C3E50',
                              fontSize: '0.95rem',
                              '&:hover': {
                                backgroundColor: '#f8f9fa',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#0b87ac',
                                color: '#FFFFFF',
                                '&:hover': {
                                  backgroundColor: '#0a6b8a',
                                },
                              },
                            },
                          }
                        }
                      }}
                    >
                      <MenuItem value="single">Single</MenuItem>
                      <MenuItem value="married">Married</MenuItem>
                      <MenuItem value="widowed">Widowed</MenuItem>
                      <MenuItem value="divorced">Divorced</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                               <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nationality"
                    value={formData.nationality ?? ''}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={getTextFieldStyles()}
                  />
                 </Grid>
                 
                 {/* Guardian/Emergency Contact Information Section Header */}
                 <Grid item xs={12}>
                   <Box sx={{ 
                     mt: 1.5, 
                     mb: 1,
                     pt: 1.5,
                     borderTop: '2px solid #E9ECEF'
                   }}>
                     <Typography variant="subtitle1" sx={{ 
                       color: '#2C3E50',
                       fontWeight: 700,
                       fontSize: '0.95rem',
                       mb: 0.5,
                       display: 'flex',
                       alignItems: 'center',
                       gap: 0.5
                     }}>
                       🚨 Guardian / Emergency Contact Information
                     </Typography>
                     <Typography variant="caption" sx={{ 
                       color: '#6C757D',
                       fontSize: '0.75rem'
                     }}>
                       Please provide contact information for your guardian or emergency contact person
                     </Typography>
                   </Box>
                 </Grid>
                 
                 <Grid item xs={12} sm={6}>
                   <TextField
                     fullWidth
                     label="Guardian Name"
                     value={formData.emergencyContact ?? ''}
                     onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                     error={!!errors.emergencyContact}
                     helperText={errors.emergencyContact}
                     required
                     InputLabelProps={{
                       shrink: true,
                     }}
                     sx={getTextFieldStyles(!!errors.emergencyContact)}
                   />
                 </Grid>
                 <Grid item xs={12} sm={6}>
                   <TextField
                     fullWidth
                     label="Guardian Phone Number"
                     value={formData.emergencyPhone ?? ''}
                     onChange={(e) => {
                       // Only allow numbers
                       const numericValue = e.target.value.replace(/\D/g, '');
                       handleInputChange('emergencyPhone', numericValue);
                     }}
                     error={!!errors.emergencyPhone}
                     helperText={errors.emergencyPhone || "Contact number of guardian/emergency contact"}
                     required
                     InputLabelProps={{
                       shrink: true,
                     }}
                     sx={getTextFieldStyles(!!errors.emergencyPhone)}
                   />
                 </Grid>
                 <Grid item xs={12} sm={6}>
                   <FormControl fullWidth required error={!!errors.emergencyRelationship}>
                     <InputLabel 
                       shrink={true}
                       sx={{ 
                         color: errors.emergencyRelationship ? '#E74C3C' : '#2C3E50',
                         fontWeight: 500,
                         fontSize: '0.95rem',
                         backgroundColor: 'white',
                         px: 1,
                         transform: 'translate(14px, -9px) scale(0.75)',
                         '&.Mui-focused': {
                           color: errors.emergencyRelationship ? '#E74C3C' : '#0b87ac'
                         }
                       }}
                     >
                       Relationship to Guardian
                     </InputLabel>
                     <Select
                       value={formData.emergencyRelationship ?? ''}
                       onChange={(e) => handleInputChange('emergencyRelationship', e.target.value)}
                       sx={getSelectStyles(!!errors.emergencyRelationship)}
                       MenuProps={{
                         PaperProps: {
                           sx: {
                             backgroundColor: '#FFFFFF',
                             border: '1px solid #e9ecef',
                             borderRadius: 3,
                             boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                             '& .MuiMenuItem-root': {
                               color: '#2C3E50',
                               fontSize: '0.95rem',
                               '&:hover': {
                                 backgroundColor: '#f8f9fa',
                               },
                               '&.Mui-selected': {
                                 backgroundColor: '#0b87ac',
                                 color: '#FFFFFF',
                                 '&:hover': {
                                   backgroundColor: '#0a6b8a',
                                 },
                               },
                             },
                           }
                         }
                       }}
                     >
                       <MenuItem value="Parent">Parent</MenuItem>
                       <MenuItem value="Sibling">Sibling</MenuItem>
                       <MenuItem value="Spouse">Spouse</MenuItem>
                       <MenuItem value="Child">Child</MenuItem>
                       <MenuItem value="Relative">Relative</MenuItem>
                       <MenuItem value="Friend">Friend</MenuItem>
                       <MenuItem value="Colleague">Colleague</MenuItem>
                       <MenuItem value="Guardian">Legal Guardian</MenuItem>
                       <MenuItem value="Other">Other</MenuItem>
                     </Select>
                     {errors.emergencyRelationship && (
                       <FormHelperText sx={{ color: '#E74C3C', fontSize: '0.8rem', fontWeight: 500 }}>
                         {errors.emergencyRelationship}
                       </FormHelperText>
                     )}
                   </FormControl>
                 </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ 
              mb: 1, 
              color: '#000000',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Address
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Home Number/Street"
                  value={formData.address ?? ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  multiline
                  rows={3}
                  error={!!errors.address}
                  helperText={errors.address}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={getTextFieldStyles(!!errors.address)}
                />
              </Grid>
                             <Grid item xs={12} sm={6}>
                 <FormControl fullWidth>
                   <InputLabel 
                     shrink={true}
                     sx={{ 
                       color: '#2C3E50',
                       fontWeight: 500,
                       fontSize: '0.95rem',
                       backgroundColor: 'white',
                       px: 1,
                       transform: 'translate(14px, -9px) scale(0.75)',
                       '&.Mui-focused': {
                         color: '#0b87ac'
                       }
                     }}
                   >
                     Barangay
                   </InputLabel>
                   <Select
                     value={formData.barangay ?? ''}
                     onChange={(e) => handleInputChange('barangay', e.target.value)}
                     sx={getSelectStyles()}
                     MenuProps={{
                       PaperProps: {
                         sx: {
                           backgroundColor: '#FFFFFF',
                           border: '1px solid #e9ecef',
                           borderRadius: 3,
                           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                           '& .MuiMenuItem-root': {
                             color: '#2C3E50',
                             fontSize: '0.95rem',
                             '&:hover': {
                               backgroundColor: '#f8f9fa',
                             },
                             '&.Mui-selected': {
                               backgroundColor: '#0b87ac',
                               color: '#FFFFFF',
                               '&:hover': {
                                 backgroundColor: '#0a6b8a',
                               },
                             },
                           },
                         }
                       }
                     }}
                   >
                     <MenuItem value="Baclaran">Baclaran</MenuItem>
                     <MenuItem value="Banay-Banay">Banay-Banay</MenuItem>
                     <MenuItem value="Banlic">Banlic</MenuItem>
                     <MenuItem value="Bigaa">Bigaa</MenuItem>
                     <MenuItem value="Butong">Butong</MenuItem>
                     <MenuItem value="Casile">Casile</MenuItem>
                     <MenuItem value="Diezmo">Diezmo</MenuItem>
                     <MenuItem value="Gulod">Gulod</MenuItem>
                     <MenuItem value="Mamatid">Mamatid</MenuItem>
                     <MenuItem value="Marinig">Marinig</MenuItem>
                     <MenuItem value="Niugan">Niugan</MenuItem>
                     <MenuItem value="Pittland">Pittland</MenuItem>
                     <MenuItem value="Pulo">Pulo</MenuItem>
                     <MenuItem value="Sala">Sala</MenuItem>
                     <MenuItem value="San Isidro">San Isidro</MenuItem>
                     <MenuItem value="Barangay I Poblacion">Barangay I Poblacion</MenuItem>
                     <MenuItem value="Barangay II Poblacion">Barangay II Poblacion</MenuItem>
                     <MenuItem value="Barangay III Poblacion">Barangay III Poblacion</MenuItem>
                   </Select>
                 </FormControl>
               </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ 
              mb: 1, 
              color: '#000000',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Disability Details
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <FormControl fullWidth required error={!!errors.disabilityType}>
                  <InputLabel 
                    shrink={true}
                    sx={{ 
                      color: errors.disabilityType ? '#E74C3C' : '#2C3E50',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      backgroundColor: 'white',
                      px: 1,
                      transform: 'translate(14px, -9px) scale(0.75)',
                      '&.Mui-focused': {
                        color: errors.disabilityType ? '#E74C3C' : '#0b87ac'
                      }
                    }}
                  >
                    Type of Disability
                  </InputLabel>
                  <Select
                    value={formData.disabilityType ?? ''}
                    onChange={(e) => handleInputChange('disabilityType', e.target.value)}
                    sx={getSelectStyles(!!errors.disabilityType)}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #e9ecef',
                          borderRadius: 3,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          '& .MuiMenuItem-root': {
                            color: '#2C3E50',
                            fontSize: '0.95rem',
                            '&:hover': {
                              backgroundColor: '#f8f9fa',
                            },
                            '&.Mui-selected': {
                              backgroundColor: '#0b87ac',
                              color: '#FFFFFF',
                              '&:hover': {
                                backgroundColor: '#0a6b8a',
                              },
                            },
                          },
                        }
                      }
                    }}
                  >
                    <MenuItem value="Visual Impairment">Visual Impairment</MenuItem>
                    <MenuItem value="Hearing Impairment">Hearing Impairment</MenuItem>
                    <MenuItem value="Speech and Language Impairment">Speech and Language Impairment</MenuItem>
                    <MenuItem value="Intellectual Disability">Intellectual Disability</MenuItem>
                    <MenuItem value="Mental Health Condition">Mental Health Condition</MenuItem>
                    <MenuItem value="Learning Disability">Learning Disability</MenuItem>
                    <MenuItem value="Psychosocial Disability">Psychosocial Disability</MenuItem>
                    <MenuItem value="Autism Spectrum Disorder">Autism Spectrum Disorder</MenuItem>
                    <MenuItem value="ADHD">ADHD</MenuItem>
                    <MenuItem value="Physical Disability">Physical Disability</MenuItem>
                    <MenuItem value="Orthopedic/Physical Disability">Orthopedic/Physical Disability</MenuItem>
                    <MenuItem value="Chronic Illness">Chronic Illness</MenuItem>
                    <MenuItem value="Multiple Disabilities">Multiple Disabilities</MenuItem>
                  </Select>
                  {errors.disabilityType && (
                    <FormHelperText sx={{ color: '#E74C3C', fontSize: '0.8rem', fontWeight: 500 }}>
                      {errors.disabilityType}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
                             <Grid item xs={12}>
                 <TextField
                   fullWidth
                   label="Cause of Disability"
                   value={formData.disabilityCause ?? ''}
                   onChange={(e) => handleInputChange('disabilityCause', e.target.value)}
                   multiline
                   rows={3}
                   InputLabelProps={{
                     shrink: true,
                   }}
                   sx={getTextFieldStyles()}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   type="date"
                   label="Date of Disability Onset"
                   value={formData.disabilityDate ?? ''}
                   onChange={(e) => handleInputChange('disabilityDate', e.target.value)}
                   InputLabelProps={{ shrink: true }}
                   error={!!errors.disabilityDate}
                   helperText={errors.disabilityDate || "Date must be at least 1 week ago (no maximum limit)"}
                   inputProps={{
                     max: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week ago
                   }}
                   sx={getTextFieldStyles(!!errors.disabilityDate)}
                 />
               </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ 
              mb: 1, 
              color: '#000000',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Required Documents
            </Typography>
            

            <Alert severity="info" sx={{ 
              mb: 0.5, 
              bgcolor: '#E3F2FD', 
              color: '#1565C0',
              borderRadius: 2,
              border: '1px solid #BBDEFB',
              p: 0.5,
              py: 0.75
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                📄 File Requirements:
              </Typography>
              <Typography variant="body2">
                • Allowed formats: PDF, JPG, JPEG, PNG<br/>
                • Maximum file size: 15MB per document<br/>
                • Upload clear, readable copies of your documents
              </Typography>
            </Alert>
            
            {documentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1 }}>
                <CircularProgress size={24} />
                <Typography variant="caption" sx={{ ml: 1.5, fontSize: '0.75rem' }}>
                  Loading required documents...
                </Typography>
              </Box>
            ) : (
              <Paper
                sx={{
                  p: 2,
                  border: '1px solid #DEE2E6',
                  borderRadius: 2,
                  bgcolor: '#FFFFFF',
                  maxHeight: '500px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AttachFileIcon sx={{ color: '#0b87ac', fontSize: '1.5rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0b87ac', flex: 1 }}>
                    Required Documents
                  </Typography>
                  <Chip 
                    label={`${requiredDocuments.length} Document${requiredDocuments.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ bgcolor: '#0b87ac', color: '#FFFFFF' }}
                  />
                </Box>
                <Box sx={{ 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  flex: 1,
                  pr: 1,
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
                  <Grid container spacing={1.5}>
                    {requiredDocuments && requiredDocuments.map((document) => (
                      <Grid item xs={12} sm={6} key={document.id}>
                    <Box sx={{ 
                      p: 0.5, 
                      border: '1px solid #CCCCCC', 
                      borderRadius: 1, 
                      backgroundColor: '#FAFAFA',
                      height: '100%'
                    }}>
                      <Typography variant="subtitle2" sx={{ 
                        mb: 0.5, 
                        color: '#000000', 
                        fontWeight: 600, 
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        flexWrap: 'wrap'
                      }}>
                        {document.name}
                        {document.is_required && (
                          <Chip 
                            label="Required" 
                            size="small" 
                            color="error" 
                            sx={{ fontSize: '0.65rem', height: '16px' }}
                          />
                        )}
                        <Chip 
                          label={document.file_types?.map(type => type.toUpperCase()).join(', ') || 'PDF, JPG, JPEG, PNG'}
                          size="small" 
                          sx={{ fontSize: '0.6rem', height: '14px', backgroundColor: '#E0E0E0', color: '#000000' }}
                        />
                      </Typography>
                      
                      {document.description && (
                        <Typography variant="caption" sx={{ 
                          mb: 0.5, 
                          color: '#666', 
                          fontStyle: 'italic',
                          fontSize: '0.7rem'
                        }}>
                          {document.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ 
                        border: fileErrors[`doc_${document.id}`] ? '1px dashed #E74C3C' : '1px dashed #CCCCCC', 
                        borderRadius: '4px', 
                        backgroundColor: '#FFFFFF',
                        p: 0.75,
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: fileErrors[`doc_${document.id}`] ? '#E74C3C' : '#000000'
                        }
                      }}>
                        <input
                          type="file"
                          accept={document.file_types?.map(type => `.${type}`).join(',') || '.pdf,image/*'}
                          onChange={(e) => handleFileChange(`doc_${document.id}`, e.target.files[0])}
                          required={document.is_required}
                          disabled={submitting}
                          style={{ 
                            width: '100%', 
                            color: '#000000', 
                            fontSize: '0.8rem',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1
                          }}
                        />
                      </Box>
                      
                      {fileErrors[`doc_${document.id}`] && (
                        <Alert severity="error" sx={{ mt: 0.5, py: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {fileErrors[`doc_${document.id}`]}
                          </Typography>
                        </Alert>
                      )}
                      
                      {formData.documents && formData.documents[`doc_${document.id}`] && (
                        <Box sx={{ mt: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#4CAF50',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {getFileIcon(formData.documents[`doc_${document.id}`])}
                              ✓ {formData.documents[`doc_${document.id}`].name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleFileChange(`doc_${document.id}`, null);
                              }}
                              sx={{
                                color: '#E74C3C',
                                padding: '4px',
                                '&:hover': {
                                  backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                  color: '#C0392B'
                                }
                              }}
                              disabled={submitting}
                              title="Remove file"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box 
                            sx={{ 
                              cursor: 'pointer',
                              border: '2px solid #0b87ac',
                              borderRadius: 1,
                              p: 0.5,
                              bgcolor: '#f8f9fa',
                              width: 70,
                              height: 100,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              '&:hover': {
                                borderColor: '#8E44AD',
                                bgcolor: '#f0f0f0'
                              }
                            }}
                            onClick={() => handlePreviewFile(
                              formData.documents[`doc_${document.id}`], 
                              formData.documents[`doc_${document.id}`].name
                            )}
                          >
                            {isImageFile(formData.documents[`doc_${document.id}`]) ? (
                              <img 
                                src={createPreviewUrl(formData.documents[`doc_${document.id}`])} 
                                alt="Preview" 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover' 
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: '100%', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                bgcolor: '#0b87ac',
                                color: 'white',
                                fontSize: '1.5rem'
                              }}>
                                {getFileIcon(formData.documents[`doc_${document.id}`])}
                              </Box>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ 
                            color: '#666',
                            fontSize: '0.7rem',
                            mt: 0.5,
                            display: 'block'
                          }}>
                            Size: {(formData.documents[`doc_${document.id}`].size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
                
                    {requiredDocuments.length === 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ textAlign: 'center' }}>
                          No required documents are currently configured. Please contact the administrator.
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Paper>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      height: '100vh',
      backgroundColor: '#FFFFFF',
      py: 1,
      px: 2,
      overflow: 'auto'
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 1,
          color: '#000000'
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            mb: 0.5,
            color: '#000000',
            fontSize: '1.8rem'
          }}>
            PWD Application Form
          </Typography>
          <Typography variant="h6" sx={{ 
            fontWeight: 500,
            color: '#000000',
            mb: 0.5,
            fontSize: '1rem'
          }}>
            Cabuyao City
          </Typography>
          <Typography variant="body2" sx={{ 
            color: '#666666',
            maxWidth: 600,
            mx: 'auto',
            lineHeight: 1.4,
            fontSize: '0.85rem'
          }}>
            Complete all required information to apply for PWD identification
          </Typography>
        </Box>

        {/* Main Card */}
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid #E0E0E0',
            mb: 1
          }}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Stepper */}
            <Box sx={{ mb: 1.5 }}>
              <Stepper activeStep={activeStep} sx={{ 
                '& .MuiStepLabel-root .Mui-completed': {
                  color: '#000000'
                },
                '& .MuiStepLabel-root .Mui-active': {
                  color: '#000000'
                },
                '& .MuiStepLabel-label': {
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                },
                '& .MuiStepIcon-root.Mui-completed': {
                  color: '#000000'
                },
                '& .MuiStepIcon-root.Mui-active': {
                  color: '#000000',
                  borderColor: '#000000'
                },
                '& .MuiStepIcon-root': {
                  color: '#CCCCCC'
                }
              }}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Step Content */}
            <Box sx={{ mb: 1 }}>
              {renderStepContent(activeStep)}
            </Box>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: 2
        }}>
          {(() => {
            // Compute canProceed without setting errors
            const canProceed = (() => {
              switch (activeStep) {
                case 0: // Personal Information
                  if (!formData.firstName) return false;
                  if (!formData.middleName || formData.middleName.trim() === '') return false;
                  if (!formData.lastName) return false;
                  if (!formData.phoneNumber) return false;
                  if (!formData.email) return false;
                  if (!formData.confirmEmail) return false;
                  if (formData.email && formData.confirmEmail && formData.email !== formData.confirmEmail) return false;
                  if (!formData.emergencyContact) return false;
                  if (!formData.emergencyPhone) return false;
                  if (!formData.emergencyRelationship) return false;
                  if (validateDateOfBirth(formData.dateOfBirth)) return false;
                  if (!formData.gender) return false;
                  break;
                case 1: // Address
                  if (!formData.address) return false;
                  break;
                case 2: // Disability Details
                  if (!formData.disabilityType) return false;
                  break;
                case 3: // Documents
                  if (requiredDocuments) {
                    for (const doc of requiredDocuments) {
                      if (doc.is_required && (!formData.documents || !formData.documents[`doc_${doc.id}`])) {
                        return false;
                      }
                    }
                  }
                  break;
              }
              return true;
            })();

            return (
              <>
                <Button
                  onClick={handleBack}
                  variant="outlined"
                  sx={{
                    color: '#0b87ac',
                    borderColor: '#0b87ac',
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '16px',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#0a6b8a',
                      backgroundColor: 'rgba(11, 135, 172, 0.1)',
                    },
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={submitting || !canProceed}
                  startIcon={submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
                  sx={{
                    backgroundColor: submitting ? '#95a5a6' : '#0b87ac',
                    color: 'white',
                    py: 1.5,
                    px: 4,
                    borderRadius: 3,
                    fontWeight: 600,
                    fontSize: '16px',
                    textTransform: 'none',
                    boxShadow: submitting ? 'none' : '0 4px 12px rgba(11, 135, 172, 0.3)',
                    '&:hover': {
                      backgroundColor: submitting ? '#95a5a6' : '#0a6b8a',
                      boxShadow: submitting ? 'none' : '0 6px 16px rgba(11, 135, 172, 0.4)',
                      transform: submitting ? 'none' : 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {submitting ? 'Submitting...' : (activeStep === steps.length - 1 ? 'Submit Application' : 'Next')}
                </Button>
              </>
            );
          })()}
        </Box>
      </Container>

      {/* File Preview Modal - A4 Paper Shape */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
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
            onClick={handleClosePreview}
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
          {previewFile && (
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
              {getFileType(previewFile) === 'image' ? (
                <img
                  src={createPreviewUrl(previewFile)}
                  alt={previewFileName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onError={(e) => {
                    console.error('Error loading image:', createPreviewUrl(previewFile));
                    e.target.style.display = 'none';
                  }}
                />
              ) : getFileType(previewFile) === 'pdf' ? (
                <Box sx={{ 
                  width: '100%',
                  height: '100%',
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  <iframe
                    src={createPreviewUrl(previewFile)}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                    title={previewFileName}
                  />
                </Box>
              ) : (
                <Box sx={{ 
                  textAlign: 'center',
                  p: 4,
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <DocumentIcon sx={{ fontSize: 80, color: '#2196F3', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1, color: '#2C3E50' }}>
                    Document File
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                    {previewFileName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#999' }}>
                    Preview is not available for this file type.
                    <br />
                    Please download the file to view its contents.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          bgcolor: '#f8f9fa', 
          px: 3, 
          py: 2,
          flexShrink: 0,
          justifyContent: 'space-between'
        }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontStyle: 'italic' }}>
            {previewFileName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => {
                if (previewFile) {
                  const url = createPreviewUrl(previewFile);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewFileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
              }}
              variant="outlined"
              sx={{
                color: '#0b87ac',
                borderColor: '#0b87ac',
                borderRadius: 2,
                px: 2,
                py: 0.75,
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#0a6b8a',
                  backgroundColor: 'rgba(11, 135, 172, 0.1)',
                },
              }}
            >
              Download
            </Button>
            <Button
              onClick={handleClosePreview}
              variant="contained"
              sx={{
                backgroundColor: '#0b87ac',
                color: 'white',
                py: 0.75,
                px: 2,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(11, 135, 172, 0.3)',
                '&:hover': {
                  backgroundColor: '#0a6b8a',
                  boxShadow: '0 6px 16px rgba(11, 135, 172, 0.4)',
                },
              }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        open={verificationModalOpen}
        onClose={handleVerificationCancel}
        email={formData.email}
        onVerified={handleVerified}
        onCancel={handleVerificationCancel}
      />
      
      <SuccessModal
        open={modalOpen}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttonText={modalConfig.buttonText}
        onButtonClick={modalConfig.onClose}
        requireCheckbox={modalConfig.requireCheckbox}
        checkboxLabel={modalConfig.checkboxLabel}
        checkboxChecked={modalConfig.checkboxChecked}
        onCheckboxChange={modalConfig.onCheckboxChange}
      />
    </Box>
  );
}

export default ApplicationForm;