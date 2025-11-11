import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  QrCode as QrCodeIcon,
  Person as PersonIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import QRCode from 'qrcode';

const QRCodeDisplay = ({ open, onClose, member, onScan }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = React.useState(null);
  const [error, setError] = React.useState(null);

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

  React.useEffect(() => {
    if (member && open) {
      generateQRCode();
    }
  }, [member, open]);

  const generateQRCode = async () => {
    try {
      if (!member) return;

      // Use stored QR code data from backend if available
      let qrData;
      if (member.qr_code_data) {
        try {
          qrData = typeof member.qr_code_data === 'string' 
            ? JSON.parse(member.qr_code_data) 
            : member.qr_code_data;
        } catch (parseError) {
          console.warn('Failed to parse stored QR code data, generating new one:', parseError);
          qrData = null;
        }
      }

      // If no stored QR code data, generate new one with stable values
      if (!qrData) {
        // Use a stable timestamp - use qr_code_generated_at if available, otherwise use created_at, otherwise use a fixed date
        const stableDate = member.qr_code_generated_at 
          ? new Date(member.qr_code_generated_at).toISOString()
          : (member.created_at ? new Date(member.created_at).toISOString() : new Date('2024-01-01').toISOString());
        
        qrData = {
          type: 'PWD_BENEFIT_CLAIM',
          version: '1.0',
          pwd_id: member.pwd_id || `PWD-${member.userID}`,
          userID: member.userID,
          memberId: member.userID,
          firstName: member.firstName,
          lastName: member.lastName,
          middleName: member.middleName,
          birthDate: member.birthDate,
          disabilityType: member.disabilityType,
          barangay: member.barangay,
          generatedAt: stableDate,
          issuedDate: stableDate
        };
      }

      // Generate QR code with better mobile compatibility
      const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 400, // Increased size for better mobile scanning
        margin: 4, // Increased margin
        color: {
          dark: '#000000', // Pure black for better contrast
          light: '#FFFFFF' // Pure white background
        },
        errorCorrectionLevel: 'M', // Medium error correction for better scanning
        type: 'image/png',
        quality: 0.92,
        rendererOpts: {
          quality: 0.92
        }
      });

      setQrCodeDataURL(qrCodeURL);
      setError(null);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    }
  };

  const handleScanClick = () => {
    if (onScan) {
      onScan(member);
    }
  };

  const handleClose = () => {
    setQrCodeDataURL(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
        borderBottom: '2px solid #E8F4FD'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QrCodeIcon sx={{ mr: 1, color: '#2C3E50' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
            PWD Member QR Code
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose}
          sx={{ color: '#2C3E50' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : member ? (
          <Box>
            {/* Member Information */}
            <Card sx={{ mb: 3, border: '1px solid #E0E0E0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ color: '#2C3E50', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                    Member Information
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PWD ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {member.pwd_id || `PWD-${member.userID}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {(() => {
                        const parts = [];
                        if (member.firstName) parts.push(member.firstName);
                        if (member.middleName && member.middleName.trim().toUpperCase() !== 'N/A') parts.push(member.middleName);
                        if (member.lastName) parts.push(member.lastName);
                        if (member.suffix) parts.push(member.suffix);
                        return parts.join(' ').trim();
                      })()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Birth Date
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {member.birthDate ? formatDateMMDDYYYY(member.birthDate) : 'Not provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Disability Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {member.disabilityType || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Barangay
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {member.barangay || 'Not specified'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* QR Code Display */}
            <Card sx={{ border: '1px solid #E0E0E0', textAlign: 'center' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 3 }}>
                  QR Code for Benefit Claims
                </Typography>
                
                {qrCodeDataURL ? (
                  <Box sx={{ mb: 3 }}>
                    <img 
                      src={qrCodeDataURL} 
                      alt="PWD Member QR Code"
                      style={{
                        width: '350px',
                        height: '350px',
                        border: '2px solid #E0E0E0',
                        borderRadius: '8px',
                        padding: '10px',
                        backgroundColor: 'white',
                        maxWidth: '100%',
                        height: 'auto'
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ 
                    width: '250px', 
                    height: '250px', 
                    border: '2px dashed #E0E0E0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 3
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Generating QR Code...
                    </Typography>
                  </Box>
                )}

                <Typography variant="body2" sx={{ color: '#7F8C8D', mb: 2 }}>
                  This QR code contains the member's information for benefit claim verification.
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#95A5A6', display: 'block' }}>
                  💡 Scan this QR code with the benefit claim scanner to verify member identity
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Button
            onClick={handleScanClick}
            variant="contained"
            startIcon={<CameraIcon />}
            sx={{
              bgcolor: '#E67E22',
              '&:hover': { bgcolor: '#D35400' },
              px: 3,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Open Scanner
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderColor: '#2C3E50',
              color: '#2C3E50',
              '&:hover': {
                borderColor: '#34495E',
                backgroundColor: 'rgba(44, 62, 80, 0.1)'
              }
            }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeDisplay;
