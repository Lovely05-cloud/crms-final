// Network Development Configuration
// This configuration allows the frontend to connect to the backend from other PCs on the network

const NETWORK_CONFIG = {
  // Backend API URL accessible from network
  API_BASE_URL: 'http://192.168.0.126:8000/api',
  STORAGE_BASE_URL: 'http://192.168.0.126:8000',
};

// Development Configuration (localhost)
const DEVELOPMENT_CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000/api',
  STORAGE_BASE_URL: 'http://127.0.0.1:8000',
};

// Production Configuration (Hostinger)
const PRODUCTION_CONFIG = {
  API_BASE_URL: 'https://lightgoldenrodyellow-ibis-644404.hostingersite.com/api',
  STORAGE_BASE_URL: 'https://lightgoldenrodyellow-ibis-644404.hostingersite.com',
};

// Cloudflare Tunnel Configuration
const CLOUDFLARE_TUNNEL_CONFIG = {
  // Backend API through Cloudflare tunnel
  API_BASE_URL: 'https://examines-electric-kim-took.trycloudflare.com/api',
  STORAGE_BASE_URL: 'https://examines-electric-kim-took.trycloudflare.com',
};

// Auto-detect environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1';

const isNetworkMode = process.env.REACT_APP_NETWORK_MODE === 'true' ||
                     window.location.hostname === '192.168.0.126' ||
                     window.location.hostname.includes('192.168.');

// Export the appropriate configuration
export const API_CONFIG = isProduction 
  ? PRODUCTION_CONFIG 
  : isNetworkMode 
    ? NETWORK_CONFIG 
    : DEVELOPMENT_CONFIG;

// Instructions for network access:
// 1. Make sure the backend is running on 192.168.0.126:8000
// 2. Start the frontend with network mode enabled
// 3. Access from other PCs using: http://192.168.0.126:3000
// 4. Update the IP address in this file if your network IP changes
