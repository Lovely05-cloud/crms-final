import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Container,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

// Maximum file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes

const DocumentCorrectionPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [correctionRequest, setCorrectionRequest] = useState(null);
  const [application, setApplication] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [fileErrors, setFileErrors] = useState({});

  // Document type labels mapping
  const documentLabels = {
    medicalCertificate: 'Medical Certificate',
    clinicalAbstract: 'Clinical Abstract/Assessment',
    voterCertificate: 'Voter Certificate',
    idPictures: 'ID Pictures (1pc)',
    birthCertificate: 'Birth Certificate',
    wholeBodyPicture: 'Whole Body Picture',
    affidavit: 'Affidavit of Guardianship/Loss',
    barangayCertificate: 'Barangay Certificate of Residency'
  };

  useEffect(() => {
    fetchCorrectionRequest();
  }, [token]);

  const fetchCorrectionRequest = async () => {
    try {
      setLoading(true);
      console.log('Fetching correction request for token:', token);
      
      // Make request without authentication since this is a public token-based endpoint
      const response = await api.get(`/applications/correction-request/${token}`, { auth: false });
      
      console.log('API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Response data:', response);
      
      // Handle different response structures
      if (response) {
        if (response.success === true) {
          setCorrectionRequest(response.correction_request);
          setApplication(response.application);
          
          // Initialize uploaded files state
          const initialFiles = {};
          if (response.correction_request && response.correction_request.documents_to_correct) {
            // Parse JSON string if needed
            const documentsToCorrect = typeof response.correction_request.documents_to_correct === 'string' 
              ? JSON.parse(response.correction_request.documents_to_correct)
              : response.correction_request.documents_to_correct;
            
            documentsToCorrect.forEach(docType => {
              initialFiles[docType] = null;
            });
          }
          setUploadedFiles(initialFiles);
        } else {
          setError(response.message || 'Invalid or expired correction request');
        }
      } else {
        console.error('Response is null or undefined');
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Error fetching correction request:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error data:', err.data);
      console.error('Full error:', err);
      
      // Provide more specific error messages
      if (err.status === 404) {
        setError(err.data?.message || 'Invalid, expired, or completed correction request. Please contact support if you believe this is an error.');
      } else if (err.status === 500) {
        setError(err.data?.message || 'Server error occurred. Please try again later or contact support.');
      } else if (err.message && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.data?.message || err.message || 'Failed to load correction request. Please check your link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (documentType, file) => {
    // Clear previous error for this field
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    if (!file) {
      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: null
      }));
      // Clear validation errors when user removes a file
      if (validationErrors[documentType]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[documentType];
          return newErrors;
        });
      }
      return;
    }

    // Validate file size (15MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileErrors(prev => ({
        ...prev,
        [documentType]: `File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB. Please select a smaller file.`
      }));
      setError(`File "${file.name}" is too large. Maximum file size is 15MB.`);
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: file
    }));
    // Clear validation errors when user uploads a file
    if (validationErrors[documentType]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[documentType];
        return newErrors;
      });
    }
    setError(null);
  };
  
  const handleMultipleFileUpload = (documentType, files) => {
    // Clear previous error for this field
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    if (!files || files.length === 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: null
      }));
      // Clear validation errors when user removes files
      if (validationErrors[documentType]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[documentType];
          return newErrors;
        });
      }
      return;
    }

    const filesArray = Array.from(files);
    // Validate all files for size
    const oversizedFiles = filesArray.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileSizeMB = (oversizedFiles[0].size / (1024 * 1024)).toFixed(2);
      setFileErrors(prev => ({
        ...prev,
        [documentType]: `${oversizedFiles.length} file(s) exceed the 15MB limit. Largest file: ${fileSizeMB}MB. Please select smaller files.`
      }));
      setError(`One or more files are too large. Maximum file size is 15MB per file.`);
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: filesArray
    }));
    // Clear validation errors when user uploads files
    if (validationErrors[documentType]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[documentType];
        return newErrors;
      });
    }
    setError(null);
  };

  const handleFilePreview = (file) => {
    if (file) {
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  };

  const handleSubmitCorrections = async () => {
    // Validate all files before submission
    const fileSizeErrors = {};
    Object.entries(uploadedFiles).forEach(([docType, file]) => {
      if (file) {
        if (Array.isArray(file)) {
          file.forEach((f, index) => {
            if (f && f.size > MAX_FILE_SIZE) {
              const fileSizeMB = (f.size / (1024 * 1024)).toFixed(2);
              fileSizeErrors[`${docType}_${index}`] = `File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB.`;
            }
          });
        } else if (file.size > MAX_FILE_SIZE) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          fileSizeErrors[docType] = `File size (${fileSizeMB}MB) exceeds the maximum limit of 15MB.`;
        }
      }
    });

    if (Object.keys(fileSizeErrors).length > 0) {
      setFileErrors(fileSizeErrors);
      setError('One or more files exceed the 15MB size limit. Please compress or select smaller files.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setValidationErrors({});
      
      const formData = new FormData();
      formData.append('correction_token', token);
      
      // Add uploaded files (all documents including idPictures are now single files)
      Object.entries(uploadedFiles).forEach(([docType, file]) => {
        if (file) {
          // Handle both array (backward compatibility) and single file
          if (Array.isArray(file) && file.length > 0) {
            // If it's an array, take the first file (for backward compatibility)
            formData.append(docType, file[0]);
          } else if (file) {
            // Single file for all document types
            formData.append(docType, file);
          }
        }
      });

      // Don't set Content-Type manually - browser will set it with boundary automatically
      // Make request without authentication since this is a public token-based endpoint
      const response = await api.post('/applications/submit-corrections', formData, { auth: false });

      console.log('Submit corrections response:', response);
      
      if (response && response.success) {
        setSubmitSuccess(true);
      } else {
        setError(response?.message || 'Failed to submit corrections');
      }
    } catch (err) {
      console.error('Error submitting corrections:', err);
      console.error('Error details:', err.message);
      console.error('Error status:', err.status);
      console.error('Error data:', err.data);
      
      // Handle validation errors
      if (err.status === 422 && err.data?.errors) {
        setValidationErrors(err.data.errors);
        const errorMessages = Object.entries(err.data.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setError(`Validation errors:\n${errorMessages}`);
      } else if (err.status === 408 || (err.message && err.message.includes('timed out'))) {
        setError('Upload timed out. Your connection may be slow or the files are too large. Please try again with a better connection or compress your files.');
      } else if (err.status === 0 || (err.message && err.message.includes('Failed to fetch'))) {
        setError('Network error. Please check your internet connection and try again. If the problem persists, try using Wi-Fi instead of mobile data.');
      } else {
        setError(err.data?.message || err.message || 'Failed to submit corrections. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const isAllDocumentsUploaded = () => {
    if (!correctionRequest?.documents_to_correct) return false;
    
    const documentsToCorrect = typeof correctionRequest.documents_to_correct === 'string' 
      ? JSON.parse(correctionRequest.documents_to_correct)
      : correctionRequest.documents_to_correct;
    
    return Array.isArray(documentsToCorrect) && documentsToCorrect.every(docType => {
      const file = uploadedFiles[docType];
      // All documents including idPictures are now single files (standardized)
      // Support backward compatibility: if it's an array (old format), check if it has files
      if (Array.isArray(file)) {
        return file.length > 0;
      }
      // Single file (new format)
      return file !== null && file !== undefined;
    });
  };

  const getFileIcon = (fileOrFiles) => {
    if (!fileOrFiles) return <DocumentIcon />;
    // Support both a single File and an array of Files (e.g., idPictures)
    const candidate = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!candidate) return <DocumentIcon />;

    const fileType = candidate.type || '';
    if (fileType.includes('pdf')) return <PdfIcon />;
    if (fileType.includes('image')) return <ImageIcon />;
    return <DocumentIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#f5f5f5'
      }}>
        <CircularProgress size={60} sx={{ color: '#0b87ac' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 60, color: '#e74c3c', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, color: '#2c3e50' }}>
            Error Loading Correction Request
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: '#7f8c8d' }}>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ bgcolor: '#0b87ac' }}
          >
            Return to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  if (submitSuccess) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 60, color: '#27ae60', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, color: '#2c3e50' }}>
            Documents Submitted Successfully!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: '#7f8c8d' }}>
            Your corrected documents have been submitted and are now under review. 
            You will be notified once the review is complete.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ bgcolor: '#27ae60' }}
          >
            Return to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#0b87ac', color: 'white' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            📋 Document Correction Required
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Cabuyao PDAO RMS
          </Typography>
        </Paper>

        {/* Application Info */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
            Application Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7f8c8d' }}>
                Applicant Name:
              </Typography>
              <Typography variant="body1" sx={{ color: '#2c3e50' }}>
                {application?.firstName} {application?.lastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7f8c8d' }}>
                Application ID:
              </Typography>
              <Typography variant="body1" sx={{ color: '#2c3e50' }}>
                {application?.applicationID}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Instructions */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#856404' }}>
            📝 Instructions
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#856404' }}>
            Please re-upload the following documents that require correction:
          </Typography>
          {correctionRequest?.notes && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f4fd', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2c3e50', mb: 1 }}>
                Additional Notes:
              </Typography>
              <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                {correctionRequest.notes}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Document Upload Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50' }}>
            📄 Upload Corrected Documents
          </Typography>
          
          <Grid container spacing={3}>
            {(correctionRequest?.documents_to_correct ? 
              (typeof correctionRequest.documents_to_correct === 'string' 
                ? JSON.parse(correctionRequest.documents_to_correct)
                : correctionRequest.documents_to_correct
              ) : []
            ).map((docType) => (
              <Grid item xs={12} md={6} key={docType}>
                <Card sx={{ 
                  border: uploadedFiles[docType] ? '2px solid #27ae60' : '1px solid #dee2e6',
                  bgcolor: uploadedFiles[docType] ? '#f8fff8' : '#ffffff'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getFileIcon(uploadedFiles[docType])}
                      <Typography variant="h6" sx={{ ml: 1, color: '#2c3e50' }}>
                        {documentLabels[docType]}
                      </Typography>
                      {uploadedFiles[docType] && (
                        <CheckIcon sx={{ ml: 'auto', color: '#27ae60' }} />
                      )}
                    </Box>
                    
                    {uploadedFiles[docType] ? (
                      <Box>
                        <Typography variant="body2" sx={{ color: '#27ae60', fontWeight: 'bold' }}>
                          {Array.isArray(uploadedFiles[docType]) 
                            ? `✓ ${uploadedFiles[docType].length} File(s) Uploaded`
                            : '✓ File Uploaded'}
                        </Typography>
                        {/* A4-aspect thumbnails */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                          {Array.isArray(uploadedFiles[docType]) ? (
                            uploadedFiles[docType].map((file, idx) => (
                              <Box
                                key={idx}
                                onClick={() => handleFilePreview(file)}
                                sx={{
                                  width: 120, // A4 aspect ratio: 210x297 → height ≈ width * 1.414
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
                                title={`Preview ${file.name}`}
                              >
                                {file.type?.includes('image') ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                  />
                                ) : (
                                  <PdfIcon sx={{ fontSize: 36, color: '#7f8c8d' }} />
                                )}
                              </Box>
                            ))
                          ) : (
                            <Box
                              onClick={() => handleFilePreview(uploadedFiles[docType])}
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
                              title={`Preview ${uploadedFiles[docType].name}`}
                            >
                              {uploadedFiles[docType].type?.includes('image') ? (
                                <img
                                  src={URL.createObjectURL(uploadedFiles[docType])}
                                  alt={uploadedFiles[docType].name}
                                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                                />
                              ) : (
                                <PdfIcon sx={{ fontSize: 36, color: '#7f8c8d' }} />
                              )}
                            </Box>
                          )}
                        </Box>
                        {Array.isArray(uploadedFiles[docType]) ? (
                          <Box>
                            {uploadedFiles[docType].map((file, idx) => (
                              <Typography key={idx} variant="body2" sx={{ color: '#7f8c8d' }}>
                                • {file.name} ({formatFileSize(file.size)})
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                            {uploadedFiles[docType].name} ({formatFileSize(uploadedFiles[docType].size)})
                          </Typography>
                        )}
                        <Box sx={{ mt: 1 }}>
                          {Array.isArray(uploadedFiles[docType]) ? (
                            <>
                              {uploadedFiles[docType].map((file, idx) => (
                                <Button
                                  key={idx}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleFilePreview(file)}
                                  sx={{ mr: 1, mb: 1 }}
                                >
                                  Preview {idx + 1}
                                </Button>
                              ))}
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleFileUpload(docType, null)}
                                sx={{ mb: 1 }}
                              >
                                Remove All
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleFilePreview(uploadedFiles[docType])}
                                sx={{ mr: 1 }}
                              >
                                Preview
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleFileUpload(docType, null)}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <input
                          accept={docType === 'idPictures' ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
                          style={{ display: 'none' }}
                          id={`file-upload-${docType}`}
                          type="file"
                          multiple={false}
                          onChange={(e) => {
                            if (docType === 'idPictures') {
                              // Handle single file for ID picture
                              const file = e.target.files[0];
                              if (file) {
                                handleFileUpload(docType, file);
                              }
                            } else {
                              // Single file for other document types
                              const file = e.target.files[0];
                              if (file) {
                                handleFileUpload(docType, file);
                              }
                            }
                          }}
                        />
                        <label htmlFor={`file-upload-${docType}`}>
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            sx={{ 
                              borderColor: validationErrors[docType] ? '#e74c3c' : '#0b87ac',
                              color: validationErrors[docType] ? '#e74c3c' : '#0b87ac',
                              '&:hover': {
                                borderColor: validationErrors[docType] ? '#c0392b' : '#0a6b8a',
                                bgcolor: '#f0f8ff'
                              }
                            }}
                          >
                            Choose File
                          </Button>
                        </label>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: (validationErrors[docType] || fileErrors[docType]) ? '#e74c3c' : '#7f8c8d' }}>
                          {docType === 'idPictures' 
                            ? 'Accepted formats: JPG, JPEG, PNG (Max 1 file, 15MB)'
                            : 'Accepted formats: PDF, JPG, JPEG, PNG (Max 15MB)'}
                        </Typography>
                        {fileErrors[docType] && (
                          <Alert severity="error" sx={{ mt: 0.5, py: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                              {fileErrors[docType]}
                            </Typography>
                          </Alert>
                        )}
                        {validationErrors[docType] && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#e74c3c' }}>
                            {Array.isArray(validationErrors[docType]) 
                              ? validationErrors[docType].join(', ') 
                              : validationErrors[docType]}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Submit Section */}
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#7f8c8d' }}>
            {isAllDocumentsUploaded() 
              ? 'All required documents have been uploaded. You can now submit your corrections.'
              : `Please upload all ${correctionRequest?.documents_to_correct ? 
                  (typeof correctionRequest.documents_to_correct === 'string' 
                    ? JSON.parse(correctionRequest.documents_to_correct).length
                    : correctionRequest.documents_to_correct.length
                  ) : 0} required documents before submitting.`
            }
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmitCorrections}
            disabled={!isAllDocumentsUploaded() || uploading || Object.keys(fileErrors).length > 0}
            startIcon={uploading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CheckIcon />}
            sx={{
              bgcolor: isAllDocumentsUploaded() ? '#27ae60' : '#95a5a6',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: isAllDocumentsUploaded() ? '#229954' : '#95a5a6'
              }
            }}
          >
            {uploading ? 'Submitting...' : 'Submit Corrections'}
          </Button>
        </Paper>

        {/* File Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: '#2C3E50',
            color: 'white'
          }}>
            <Typography variant="h2" component="div" sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              File Preview: {previewFile?.name}
            </Typography>
            <IconButton
              onClick={() => setPreviewOpen(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, bgcolor: '#F5F5F5' }}>
            {previewFile && (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                {previewFile.type.includes('image') ? (
                  <img
                    src={URL.createObjectURL(previewFile)}
                    alt="Preview"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '70vh',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <Box sx={{ py: 4 }}>
                    <PdfIcon sx={{ fontSize: 60, color: '#7f8c8d', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#7f8c8d' }}>
                      PDF Preview not available
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                      File: {previewFile.name}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default DocumentCorrectionPage;
