import QRCode from 'qrcode';
import toastService from './toastService';

class QRCodeService {
  /**
   * Generate QR code for PWD member benefit claims
   * Uses stored qr_code_data from backend if available, otherwise generates new one
   * @param {Object} member - PWD member data (should include qr_code_data if available)
   * @returns {Promise<string>} - Data URL of generated QR code
   */
  static async generateMemberQRCode(member) {
    try {
      if (!member) {
        toastService.error('Member data is required to generate QR code');
        throw new Error('Member data is required');
      }

      // Use stored QR code data from backend if available
      let qrData;
      if (member.qr_code_data) {
        try {
          // Parse stored QR code data from backend
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
          memberId: member.userID || member.id,
          pwdId: member.pwd_id || `PWD-${member.userID?.toString().padStart(6, '0')}`,
          firstName: member.firstName,
          lastName: member.lastName,
          disabilityType: member.disabilityType,
          barangay: member.barangay,
          generatedAt: stableDate,
          issuedDate: stableDate,
          // Security features - checksum is based on stable member data, so it will be consistent
          checksum: this.generateChecksum(member),
          // Alternative formats for better scanner compatibility
          simpleId: `PWD-${member.userID}`,
          fullId: member.pwd_id
        };
      }

      // Generate QR code with optimal settings for mobile scanning
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M', // Medium error correction for balance of size and reliability
        type: 'image/png',
        quality: 0.92,
        rendererOpts: {
          quality: 0.92
        }
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toastService.error('Failed to generate QR code: ' + (error.message || 'Unknown error'));
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a simple checksum for data integrity
   * @param {Object} member - Member data
   * @returns {string} - Simple checksum
   */
  static generateChecksum(member) {
    const data = `${member.userID}${member.firstName}${member.lastName}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Validate QR code data
   * @param {Object} qrData - Parsed QR code data
   * @returns {Object} - Validation result
   */
  static validateQRCode(qrData) {
    try {
      if (!qrData || typeof qrData !== 'object') {
        return { valid: false, error: 'Invalid QR code format' };
      }

      if (qrData.type !== 'PWD_BENEFIT_CLAIM') {
        return { valid: false, error: 'Invalid QR code type' };
      }

      if (!qrData.memberId || !qrData.pwdId) {
        // Try alternative field names
        if (!qrData.memberId && !qrData.userID) {
          return { valid: false, error: 'Missing member identification' };
        }
        if (!qrData.pwdId && !qrData.pwd_id) {
          return { valid: false, error: 'Missing PWD ID' };
        }
      }

      // QR codes for benefit claims do not expire - they are permanent and unique per member
      // Ignore validUntil field if present (old format) - QR codes never expire
      // Remove validUntil from data if it exists to prevent any expiration checks
      if (qrData.validUntil) {
        delete qrData.validUntil;
      }

      return { valid: true, data: qrData };
    } catch (error) {
      return { valid: false, error: 'Invalid QR code data' };
    }
  }

  /**
   * Parse QR code text data
   * @param {string} qrText - Raw QR code text
   * @returns {Object} - Parsed and validated data
   */
  static parseQRCode(qrText) {
    try {
      const qrData = JSON.parse(qrText);
      return this.validateQRCode(qrData);
    } catch (error) {
      return { valid: false, error: 'Failed to parse QR code' };
    }
  }
}

export default QRCodeService;
