// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { enableAccessibilityForVisualImpairment } from '../utils/accessibilityHelper';
import toastService from '../services/toastService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const rawUser = localStorage.getItem('auth.currentUser');
        const rawToken = localStorage.getItem('auth.token');
        const user = rawUser ? JSON.parse(rawUser) : null;
        const token = rawToken ? JSON.parse(rawToken) : null;
        if (user && token) {
          setCurrentUser(user);
          // Automatically enable accessibility features for visually impaired users on page load
          enableAccessibilityForVisualImpairment(user).catch(error => {
            console.error('Error enabling accessibility features:', error);
          });
        } else {
          localStorage.removeItem('auth.currentUser');
          localStorage.removeItem('auth.token');
        }
      } catch (error) {
        localStorage.removeItem('auth.currentUser');
        localStorage.removeItem('auth.token');
        console.error('Error parsing stored auth data:', error);
      }
      setLoading(false);
    };
    loadStoredAuth();
  }, []);

  const login = async ({ username, password, captcha }) => {
    try {
      console.log('Attempting login with:', { username, password, captcha });
      const loginData = { username, password };
      if (captcha) {
        loginData.captcha = captcha;
      }
      const response = await api.post('/login', loginData, { auth: false });
      console.log('Login response:', response);
      const { user, access_token: accessToken } = response;
      
      console.log('User data:', user);
      console.log('User role:', user.role);
      
      // If user is a Barangay President, extract their barangay information
      if (user.role === 'BarangayPresident') {
        // The barangay information is already included in the login response
        if (user.barangayPresident && user.barangayPresident.barangay) {
          user.barangay = user.barangayPresident.barangay;
        } else {
          // Fallback: extract barangay from username (e.g., bp_gulod -> Gulod)
          const username = user.username || '';
          if (username.startsWith('bp_')) {
            const barangayName = username.replace('bp_', '').replace(/_/g, ' ');
            // Capitalize first letter of each word
            user.barangay = barangayName.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          } else {
            user.barangay = 'Banlic'; // Default fallback
          }
        }
      }
      
      setCurrentUser(user);
      localStorage.setItem('auth.currentUser', JSON.stringify(user));
      localStorage.setItem('auth.token', JSON.stringify(accessToken));
      await api.setToken(accessToken);
      console.log('Login successful, user set:', user);
      
      // Automatically enable TTS and Read Aloud for visually impaired users
      enableAccessibilityForVisualImpairment(user).catch(error => {
        console.error('Error enabling accessibility features:', error);
      });
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      toastService.error('Login failed: ' + (error.message || error.data?.message || 'Unknown error'));
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.post('/register', payload, { auth: false });
      const { user, access_token: accessToken } = response;
      setCurrentUser(user);
      localStorage.setItem('auth.currentUser', JSON.stringify(user));
      localStorage.setItem('auth.token', JSON.stringify(accessToken));
      await api.setToken(accessToken);
      
      // Automatically enable TTS and Read Aloud for visually impaired users
      enableAccessibilityForVisualImpairment(user).catch(error => {
        console.error('Error enabling accessibility features:', error);
      });
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      toastService.error('Registration failed: ' + (error.message || error.data?.message || 'Unknown error'));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout', {});
    } catch (_) {
      // ignore network errors on logout
    }
    setCurrentUser(null);
    localStorage.removeItem('auth.currentUser');
    localStorage.removeItem('auth.token');
    await api.clearToken();
  };

  const updateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('auth.currentUser', JSON.stringify(updatedUser));
  };

  const value = useMemo(() => ({ 
    currentUser, 
    login, 
    register, 
    logout,
    updateUser,
    isAuthenticated: !!currentUser 
  }), [currentUser]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ 
          textAlign: 'center',
          color: '#253D90',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          Loading PDAO System...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}


