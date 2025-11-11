// pwd-frontend/src/services/documentService.js
import { api } from './api';
import toastService from './toastService';

class DocumentService {
  /**
   * Fetch all active document types from the backend
   * @returns {Promise<Array>} Array of document types
   */
  async getActiveDocumentTypes() {
    try {
      const data = await api.get('/documents/public');
      
      // Handle the expected API response structure: {success: true, documents: [...]}
      if (data && data.success && data.documents) {
        return data.documents;
      } else if (data && data.documents) {
        return data.documents;
      } else if (Array.isArray(data)) {
        return data;
      } else {
        console.warn('Unexpected API response structure:', data);
        // Return fallback document types if API structure is unexpected
        return this.getFallbackDocumentTypes();
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
      toastService.error('Failed to fetch document types: ' + (error.message || 'Unknown error'));
      // Return fallback document types if API fails
      return this.getFallbackDocumentTypes();
    }
  }

  /**
   * Get fallback document types when API is not available
   * @returns {Array} Fallback document types
   */
  getFallbackDocumentTypes() {
    return [
      {
        id: 1,
        name: 'Medical Certificate',
        description: 'Medical certificate from licensed physician',
        is_required: true,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 2,
        name: 'Clinical Abstract/Assessment',
        description: 'Clinical abstract or assessment report',
        is_required: true,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 3,
        name: 'Voter Certificate',
        description: 'Voter registration certificate',
        is_required: true,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 4,
        name: 'ID Pictures (2pcs)',
        description: 'Two pieces of 2x2 ID pictures',
        is_required: true,
        file_types: ['jpg', 'jpeg', 'png'],
        max_file_size: 2048
      },
      {
        id: 5,
        name: 'Birth Certificate',
        description: 'Birth certificate (if minor)',
        is_required: false,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 6,
        name: 'Whole Body Picture',
        description: 'Whole body picture showing apparent disability',
        is_required: true,
        file_types: ['jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 7,
        name: 'Affidavit of Guardianship/Loss',
        description: 'Affidavit of guardianship or loss of documents',
        is_required: false,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      },
      {
        id: 8,
        name: 'Barangay Certificate of Residency',
        description: 'Barangay certificate of residency',
        is_required: true,
        file_types: ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size: 5120
      }
    ];
  }

  /**
   * Get document field mapping for application fields
   * Maps backend document names to application field names
   * @param {Array} documentTypes - Array of document types from backend
   * @returns {Object} Mapping object
   */
  getDocumentFieldMapping(documentTypes) {
    const mapping = {};
    
    documentTypes.forEach(doc => {
      // Map document names to application field names
      const fieldName = this.getFieldNameFromDocumentName(doc.name);
      if (fieldName) {
        mapping[fieldName] = {
          name: doc.name,
          description: doc.description,
          isRequired: doc.is_required,
          fileTypes: doc.file_types,
          maxFileSize: doc.max_file_size
        };
      }
    });
    
    return mapping;
  }

  /**
   * Convert document name to application field name
   * @param {string} documentName - Document name from backend
   * @returns {string|null} Application field name
   */
  getFieldNameFromDocumentName(documentName) {
    const name = documentName.toLowerCase();
    
    // Map common document names to application fields
    if (name.includes('medical') && name.includes('certificate')) {
      return 'medicalCertificate';
    } else if (name.includes('clinical') || name.includes('assessment')) {
      return 'clinicalAbstract';
    } else if (name.includes('voter')) {
      return 'voterCertificate';
    } else if (name.includes('id') && (name.includes('picture') || name.includes('photo'))) {
      return 'idPictures';
    } else if (name.includes('birth') && name.includes('certificate')) {
      return 'birthCertificate';
    } else if (name.includes('whole') && name.includes('body')) {
      return 'wholeBodyPicture';
    } else if (name.includes('affidavit')) {
      return 'affidavit';
    } else if (name.includes('barangay') && name.includes('certificate')) {
      return 'barangayCertificate';
    }
    
    // For testing documents or other documents, create a field name based on the document name
    // This ensures all documents from the backend are included
    return this.createFieldNameFromDocumentName(documentName);
  }

  /**
   * Create a field name from document name for unmapped documents
   * @param {string} documentName - Document name from backend
   * @returns {string} Generated field name
   */
  createFieldNameFromDocumentName(documentName) {
    return documentName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 20); // Limit length
  }

  /**
   * Get document labels for display
   * @param {Object} documentMapping - Document field mapping
   * @returns {Object} Document labels object
   */
  getDocumentLabels(documentMapping) {
    const labels = {};
    
    Object.keys(documentMapping).forEach(fieldName => {
      labels[fieldName] = documentMapping[fieldName].name;
    });
    
    return labels;
  }

  /**
   * Check if a document exists in the application
   * @param {Object} application - Application object
   * @param {string} fieldName - Document field name
   * @returns {boolean} Whether document exists
   */
  hasDocument(application, fieldName) {
    const fieldValue = application[fieldName];
    
    // Handle null/undefined
    if (!fieldValue) return false;
    
    // Handle arrays (like idPictures)
    if (Array.isArray(fieldValue)) {
      return fieldValue.length > 0;
    }
    
    // Handle JSON strings (arrays stored as strings)
    if (typeof fieldValue === 'string') {
      try {
        const parsed = JSON.parse(fieldValue);
        if (Array.isArray(parsed)) {
          return parsed.length > 0;
        }
      } catch (e) {
        // Not JSON, treat as regular string
      }
    }
    
    // Handle strings
    if (typeof fieldValue === 'string') {
      return fieldValue.trim() !== '';
    }
    
    return false;
  }

  /**
   * Get document file URL
   * @param {string} filePath - File path from application
   * @returns {string} Full URL to the file
   */
  getDocumentUrl(filePath) {
    if (!filePath) return null;
    return api.getStorageUrl(filePath);
  }
}

export const documentService = new DocumentService();
