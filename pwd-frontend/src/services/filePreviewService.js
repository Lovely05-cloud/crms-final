import { api } from './api';
import toastService from './toastService';

class FilePreviewService {
  /**
   * Open file preview in a new tab/window
   * @param {string} type - Type of file (support-ticket, application-file, document-file)
   * @param {string|number} id - File ID
   * @param {string} fileType - File type (for application files)
   * @param {object} options - Additional options
   */
  async openPreview(type, id, fileType = null, options = {}) {
    try {
      const url = api.getFilePreviewUrl(type, id, fileType);
      if (!url) {
        throw new Error('Invalid file preview type');
      }

      console.log('Opening file preview:', { type, id, fileType, url });

      // Add authentication token to URL if available
      const token = localStorage.getItem('auth.token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          // Token is stored as a string, not an object with .token property
          const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
          if (tokenValue) {
            const separator = url.includes('?') ? '&' : '?';
            const authenticatedUrl = `${url}${separator}token=${tokenValue}`;
            
            if (options.openInNewTab !== false) {
              window.open(authenticatedUrl, '_blank', 'noopener,noreferrer');
            } else {
              return authenticatedUrl;
            }
          } else {
            if (options.openInNewTab !== false) {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              return url;
            }
          }
        } catch (error) {
          console.warn('Error parsing auth token:', error);
          if (options.openInNewTab !== false) {
            window.open(url, '_blank', 'noopener,noreferrer');
          } else {
            return url;
          }
        }
      } else {
        if (options.openInNewTab !== false) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          return url;
        }
      }

      return { success: true, url };
    } catch (error) {
      console.error('Error opening file preview:', error);
      toastService.error('Failed to open file preview: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }

  /**
   * Get file preview URL for embedding in iframe or img
   * @param {string} type - Type of file
   * @param {string|number} id - File ID
   * @param {string} fileType - File type (for application files)
   */
  getPreviewUrl(type, id, fileType = null, index = null) {
    try {
      const url = api.getFilePreviewUrl(type, id, fileType);
      if (!url) {
        toastService.error('Invalid file preview type');
        throw new Error('Invalid file preview type');
      }

      // Build URL with query parameters
      let finalUrl = url;
      const params = [];
      
      // Add authentication token to URL if available
      const token = localStorage.getItem('auth.token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          // Token is stored as a string, not an object with .token property
          const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
          if (tokenValue) {
            params.push(`token=${tokenValue}`);
          }
        } catch (error) {
          console.warn('Error parsing auth token:', error);
        }
      }
      
      // Add index parameter for idPictures arrays
      if (index !== null && index !== undefined) {
        params.push(`index=${index}`);
      }
      
      // Add cache-busting parameter to force fresh file loads (important for document corrections)
      params.push(`t=${Date.now()}`);
      
      if (params.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}${params.join('&')}`;
      }

    return finalUrl;
    } catch (error) {
      console.error('Error getting preview URL:', error);
      toastService.error('Failed to get preview URL: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }

  /**
   * Download file
   * @param {string} type - Type of file
   * @param {string|number} id - File ID
   * @param {string} fileName - File name for download
   * @param {string} fileType - File type (for application files)
   */
  async downloadFile(type, id, fileName, fileType = null) {
    try {
      const url = api.getFilePreviewUrl(type, id, fileType);
      if (!url) {
        throw new Error('Invalid file preview type');
      }

      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      link.target = '_blank';
      
      // Add authentication token to URL if available
      const token = localStorage.getItem('auth.token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          // Token is stored as a string, not an object with .token property
          const tokenValue = typeof tokenData === 'string' ? tokenData : tokenData.token;
          if (tokenValue) {
            const separator = url.includes('?') ? '&' : '?';
            link.href = `${url}${separator}token=${tokenValue}`;
          }
        } catch (error) {
          console.warn('Error parsing auth token:', error);
        }
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error('Error downloading file:', error);
      toastService.error('Failed to download file: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }

  /**
   * Check if file type is previewable
   * @param {string} mimeType - MIME type of the file
   */
  isPreviewable(mimeType) {
    if (!mimeType) return false;
    
    const previewableTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv'
    ];

    return previewableTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get file type category for UI display
   * @param {string} mimeType - MIME type of the file
   */
  getFileTypeCategory(mimeType) {
    if (!mimeType) return 'unknown';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'word';
    if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'excel';
    if (mimeType.includes('presentationml') || mimeType.includes('ms-powerpoint')) return 'powerpoint';
    
    return 'document';
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const filePreviewService = new FilePreviewService();
export default filePreviewService;
