// WebSocket service for real-time messaging
import { API_CONFIG, FALLBACK_CONFIG } from '../config/production';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
  }

  // Get WebSocket URL based on environment with fallback support
  getWebSocketUrl() {
    // Check if WebSocket URL is set in environment/localStorage (for Cloudflare tunnel)
    const customWsUrl = localStorage.getItem('websocket.url');
    if (customWsUrl) {
      return customWsUrl;
    }

    // Check if we're using fallback (from sessionStorage)
    const usingFallback = sessionStorage.getItem('api.usingFallback') === 'true';
    const config = usingFallback ? FALLBACK_CONFIG : API_CONFIG;

    // Extract base URL from API config
    let baseUrl = config.API_BASE_URL.replace('/api', '');
    
    // Check if it's a Cloudflare tunnel (trycloudflare.com)
    const isCloudflareTunnel = baseUrl.includes('trycloudflare.com');
    
    // For HTTPS, use WSS; for HTTP, use WS
    if (baseUrl.startsWith('https://')) {
      // For Cloudflare tunnels, don't add port number (tunnels handle it)
      if (isCloudflareTunnel) {
        try {
          const url = new URL(baseUrl);
          // Cloudflare tunnels don't use port numbers in URL
          // User must set websocket.url in localStorage with the WebSocket tunnel URL
          console.warn('Cloudflare tunnel detected. Please set websocket.url in localStorage.');
          console.warn('Run: localStorage.setItem("websocket.url", "wss://your-websocket-tunnel-url.trycloudflare.com")');
          // Return a placeholder that will fail gracefully
          return `wss://${url.hostname}`;
        } catch (e) {
          return baseUrl.replace('https://', 'wss://').replace(/\/$/, '');
        }
      } else {
        // For regular HTTPS (not Cloudflare), use port 8080
        try {
          const url = new URL(baseUrl);
          return `wss://${url.hostname}:8080`;
        } catch (e) {
          return baseUrl.replace('https://', 'wss://').replace(/\/$/, '') + ':8080';
        }
      }
    } else if (baseUrl.startsWith('http://')) {
      // For development/HTTP, WebSocket server runs on port 8080
      try {
        const url = new URL(baseUrl);
        return `ws://${url.hostname}:8080`;
      } catch (e) {
        // Fallback if URL parsing fails
        return baseUrl.replace('http://', 'ws://').replace(/\/$/, '') + ':8080';
      }
    } else {
      // Fallback
      return baseUrl.replace('http', 'ws').replace('https', 'wss') + ':8080';
    }
  }

  // Get authentication token
  async getAuthToken() {
    try {
      const raw = localStorage.getItem('auth.token');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error parsing auth token:', error);
      return null;
    }
  }

  // Connect to WebSocket
  async connect() {
    // Disabled - return early to prevent connection attempts
    return;
    
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';

    try {
      const tokenData = await this.getAuthToken();
      if (!tokenData) {
        throw new Error('No authentication token found');
      }

      // Extract token string if it's an object
      const token = typeof tokenData === 'string' ? tokenData : (tokenData.token || tokenData);
      
      const wsUrl = `${this.getWebSocketUrl()}?token=${encodeURIComponent(token)}`;
      // Silent connection attempt - no console logs

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // Silent connection - no console logs
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connection', { status: 'connected' });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Silent message handling - no console logs
          this.handleMessage(data);
        } catch (error) {
          // Silent error - no console logs
        }
      };

      this.socket.onclose = (event) => {
        // Silent disconnect - no console logs
        this.connectionStatus = 'disconnected';
        this.isConnecting = false;
        this.emit('connection', { status: 'disconnected', code: event.code, reason: event.reason });
        
        // Disable auto-reconnect
        // if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        //   this.scheduleReconnect();
        // }
      };

      this.socket.onerror = (error) => {
        // Silently fail - no console warnings
        this.connectionStatus = 'disconnected';
        this.isConnecting = false;
        this.emit('connection', { status: 'disconnected', error: 'WebSocket server not available' });
      };

    } catch (error) {
      // Silent failure - no console warnings
      this.connectionStatus = 'disconnected';
      this.isConnecting = false;
      this.emit('connection', { status: 'disconnected', error: error.message });
    }
  }

  // Schedule reconnection attempt - DISABLED
  scheduleReconnect() {
    // Auto-reconnect disabled
    // this.reconnectAttempts++;
    // const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    // setTimeout(() => {
    //   if (this.connectionStatus === 'disconnected') {
    //     this.connect();
    //   }
    // }, delay);
  }

  // Handle incoming messages
  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'new_message':
        this.emit('new_message', payload);
        break;
      case 'message_status_update':
        this.emit('message_status_update', payload);
        break;
      case 'ticket_status_update':
        this.emit('ticket_status_update', payload);
        break;
      case 'typing_indicator':
        this.emit('typing_indicator', payload);
        break;
      case 'user_online':
        this.emit('user_online', payload);
        break;
      case 'user_offline':
        this.emit('user_offline', payload);
        break;
      default:
        // Silent - unknown message type
        break;
    }
  }

  // Send message through WebSocket
  sendMessage(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type,
        payload,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify(message));
      return true;
    } else {
      // Silent - WebSocket not connected
      return false;
    }
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unsubscribe from events
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit events to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Send typing indicator
  sendTypingIndicator(ticketId, isTyping) {
    return this.sendMessage('typing_indicator', {
      ticket_id: ticketId,
      is_typing: isTyping
    });
  }

  // Mark message as seen
  markMessageAsSeen(messageId) {
    return this.sendMessage('message_seen', {
      message_id: messageId
    });
  }

  // Join ticket room
  joinTicketRoom(ticketId) {
    return this.sendMessage('join_ticket', {
      ticket_id: ticketId
    });
  }

  // Leave ticket room
  leaveTicketRoom(ticketId) {
    return this.sendMessage('leave_ticket', {
      ticket_id: ticketId
    });
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
  }

  // Get connection status
  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Check if connected
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
