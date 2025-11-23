// src/services/api.js

// Import production configuration with fallback
import { API_CONFIG, FALLBACK_CONFIG } from '../config/production';

// Use environment-appropriate configuration with fallback support
let API_BASE_URL = API_CONFIG.API_BASE_URL;
let STORAGE_BASE_URL = API_CONFIG.STORAGE_BASE_URL;
let usingFallback = false;

// Function to test if a URL is reachable
async function testUrlReachability(url, timeout = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}

// Initialize and test primary URL, fallback to localhost if needed
async function initializeApiConfig() {
  // Check if we're already using fallback (stored in sessionStorage)
  const storedFallback = sessionStorage.getItem('api.usingFallback');
  if (storedFallback === 'true') {
    API_BASE_URL = FALLBACK_CONFIG.API_BASE_URL;
    STORAGE_BASE_URL = FALLBACK_CONFIG.STORAGE_BASE_URL;
    usingFallback = true;
    console.log('Using localhost fallback (from previous session)');
    return;
  }

  // Test primary URL (Cloudflare) - use health check endpoint or base URL
  const testUrl = API_CONFIG.API_BASE_URL.replace('/api', '') || API_CONFIG.STORAGE_BASE_URL;
  const isReachable = await testUrlReachability(testUrl, 3000);
  
  if (!isReachable) {
    // Primary URL not reachable, switch to fallback
    API_BASE_URL = FALLBACK_CONFIG.API_BASE_URL;
    STORAGE_BASE_URL = FALLBACK_CONFIG.STORAGE_BASE_URL;
    usingFallback = true;
    sessionStorage.setItem('api.usingFallback', 'true');
    console.log('Cloudflare tunnel unavailable, falling back to localhost');
  } else {
    // Primary URL is reachable
    API_BASE_URL = API_CONFIG.API_BASE_URL;
    STORAGE_BASE_URL = API_CONFIG.STORAGE_BASE_URL;
    usingFallback = false;
    sessionStorage.setItem('api.usingFallback', 'false');
  }
}

// Initialize on module load (non-blocking)
initializeApiConfig();

async function getStoredToken() {
  try {
    const raw = localStorage.getItem('auth.token');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    localStorage.removeItem('auth.token');
    return null;
  }
}

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function request(path, { method = 'GET', headers = {}, body, auth = true } = {}) {
  const token = auth ? await getStoredToken() : null;

  const finalHeaders = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers };

  // If sending FormData, let React Native handle the Content-Type
  const usingFormData = isFormData(body);
  if (!usingFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (usingFormData && finalHeaders['Content-Type']) {
    // Remove any manually set content type for FormData
    delete finalHeaders['Content-Type'];
  }

  // Create AbortController for timeout handling (especially important for mobile)
  const controller = new AbortController();
  let timeoutId = null;
  
  try {
    timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout for large file uploads
    
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: usingFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    if (timeoutId) clearTimeout(timeoutId);

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    
    if (!res.ok) {
      const error = new Error((data && data.message) || res.statusText);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    
    return data;
    
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    
    // If primary URL failed and we're not already using fallback, try fallback
    if (!usingFallback && (error.message && error.message.includes('Failed to fetch') || error.name === 'AbortError')) {
      console.log('Primary URL failed, attempting fallback to localhost...');
      
      // Switch to fallback
      const originalApiBaseUrl = API_BASE_URL;
      const originalStorageBaseUrl = STORAGE_BASE_URL;
      API_BASE_URL = FALLBACK_CONFIG.API_BASE_URL;
      STORAGE_BASE_URL = FALLBACK_CONFIG.STORAGE_BASE_URL;
      usingFallback = true;
      sessionStorage.setItem('api.usingFallback', 'true');
      
      try {
        // Retry with fallback URL
        timeoutId = setTimeout(() => controller.abort(), 300000);
        
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method,
          headers: finalHeaders,
          body: usingFormData ? body : body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        
        if (timeoutId) clearTimeout(timeoutId);
        
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
        
        if (!res.ok) {
          const error = new Error((data && data.message) || res.statusText);
          error.status = res.status;
          error.data = data;
          throw error;
        }
        
        console.log('Successfully using localhost fallback');
        return data;
      } catch (fallbackError) {
        // Fallback also failed, restore original URLs
        API_BASE_URL = originalApiBaseUrl;
        STORAGE_BASE_URL = originalStorageBaseUrl;
        usingFallback = false;
        sessionStorage.setItem('api.usingFallback', 'false');
        throw fallbackError;
      }
    }
    
    console.error(`Failed with URL ${API_BASE_URL}${path}:`, error.message);
    
    // Provide more specific error messages for mobile
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. The file upload may be too large or your connection is slow. Please try again with a smaller file or better connection.');
      timeoutError.status = 408;
      throw timeoutError;
    }
    
    if (error.message && error.message.includes('Failed to fetch')) {
      const networkError = new Error('Network error. Please check your internet connection and try again.');
      networkError.status = 0;
      throw networkError;
    }
    
    throw error;
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  setToken: (token) => localStorage.setItem('auth.token', JSON.stringify(token)),
  clearToken: () => localStorage.removeItem('auth.token'),
  getStorageUrl: (path) => `${STORAGE_BASE_URL}/storage/${path}`,
  getBaseUrl: () => API_BASE_URL,
  getFilePreviewUrl: (type, id, fileType = null) => {
    const baseUrl = API_BASE_URL;
    switch (type) {
      case 'support-ticket':
        return `${baseUrl}/support-tickets/messages/${id}/download`;
      case 'application-file':
        return `${baseUrl}/application-file/${id}/${fileType}`;
      case 'document-file':
        return `${baseUrl}/documents/file/${id}`;
      default:
        return null;
    }
  },
};

export default api;
