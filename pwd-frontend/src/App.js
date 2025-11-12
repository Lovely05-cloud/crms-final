// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TranslationProvider } from './contexts/TranslationContext';
import ResourcePrefetcher from './components/optimization/ResourcePrefetcher';
import { usePageTitle } from './hooks/usePageTitle';
import LandingPage from './components/Landing/LandingPage';
import AboutUsPage from './components/Landing/AboutUsPage';
import ContactUsPage from './components/Landing/ContactUsPage';
import Login from './components/auth/login';
import Register from './components/auth/Register';
import PasswordReset from './components/auth/PasswordReset';
import PasswordChangeWrapper from './components/auth/PasswordChangeWrapper';
import AdminDashboard from './components/dashboard/AdminDashboard';
import BarangayPresidentDashboard from './components/dashboard/BarangayPresidentDashboard';
import PWDMemberDashboard from './components/dashboard/PWDMemberDashboard';
import Staff1Dashboard from './components/dashboard/Staff1Dashboard';
import Staff2Dashboard from './components/dashboard/Staff2Dashboard';
import FrontDeskDashboard from './components/dashboard/FrontDeskDashboard';

// Admin components
import PWDRecords from './components/records/PWDRecords';
import PWDCard from './components/cards/PWDCard';
import Analytics from './components/analytics/Analytics';
import Ayuda from './components/ayuda/Ayuda';
import BenefitTracking from './components/benefit/BenefitTracking';
import ClaimHistory from './components/benefit/ClaimHistory';
import Announcement from './components/announcement/Announcement';
import AdminSupportDesk from './components/support/AdminSupportDesk';

// Staff components
import Staff1Sidebar from './components/shared/Staff1Sidebar';
import Staff2Sidebar from './components/shared/Staff2Sidebar';
import FrontDeskSidebar from './components/shared/FrontDeskSidebar';

// Barangay President components
import BarangayPresidentPWDRecords from './components/records/BarangayPresidentPWDRecords';
import BarangayPresidentPWDCard from './components/cards/BarangayPresidentPWDCard';
import BarangayPresidentReports from './components/reports/BarangayPresidentReports';
import BarangayPresidentAyuda from './components/ayuda/BarangayPresidentAyuda';
import BarangayPresidentAnnouncement from './components/announcement/BarangayPresidentAnnouncement';

// PWD Member components
import PWDMemberAnnouncement from './components/announcement/PWDMemberAnnouncement';
import PWDMemberSupportDesk from './components/support/PWDMemberSupportDesk';
import PWDProfile from './components/profile/PWDProfile';
import MemberDocumentUpload from './components/documents/MemberDocumentUpload';
import PWDMemberBenefits from './components/benefit/PWDMemberBenefits';

// Application components
import ApplicationForm from './components/application/ApplicationForm';
import ApplicationStatusCheck from './components/application/ApplicationStatusCheck';
import DocumentCorrectionPage from './components/application/DocumentCorrectionPage';

// Document Management components
import DocumentManagement from './components/documents/DocumentManagement';
import AuditLogs from './components/audit/AuditLogs';
import SecurityMonitoring from './components/security/SecurityMonitoring';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
      dark: '#1565C0',
      light: '#42A5F5',
    },
    secondary: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#1976D2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#000000 !important',
        },
      },
    },
  },
});

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Debug logging
  console.log('ProtectedRoute - currentUser:', currentUser);
  console.log('ProtectedRoute - allowedRoles:', allowedRoles);
  console.log('ProtectedRoute - current pathname:', location.pathname);
  
  if (!currentUser) {
    console.log('ProtectedRoute - No currentUser, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.log('ProtectedRoute - Role not allowed:', currentUser.role, 'not in', allowedRoles);
    console.log('ProtectedRoute - Current pathname:', location.pathname);
    return <Navigate to="/unauthorized" />;
  }
  
  console.log('ProtectedRoute - Access granted for role:', currentUser.role);
  return children;
};

function AppContent() {
  const { currentUser } = useAuth();
  
  // Update page title based on current route
  usePageTitle();

  return (
    <>
      <ResourcePrefetcher />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check-status/:referenceNumber" element={<LandingPage />} />
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/contact" element={<ContactUsPage />} />
      <Route 
        path="/audit-logs" 
        element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <AuditLogs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/security-monitoring" 
        element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <SecurityMonitoring />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={currentUser ? <Navigate to="/dashboard" /> : <Register />} 
      />
      <Route 
        path="/password-reset" 
        element={currentUser ? <Navigate to="/dashboard" /> : <PasswordReset />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <PasswordChangeWrapper>
              {(() => {
                console.log('Dashboard route - currentUser:', currentUser);
                console.log('Dashboard route - currentUser.role:', currentUser?.role);
                
                if (currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') {
                  console.log('Dashboard route - Rendering AdminDashboard');
                  return <AdminDashboard />;
                }
                if (currentUser?.role === 'Staff1') {
                  console.log('Dashboard route - Rendering Staff1Dashboard');
                  return <Staff1Dashboard />;
                }
                if (currentUser?.role === 'Staff2') {
                  console.log('Dashboard route - Rendering Staff2Dashboard');
                  return <Staff2Dashboard />;
                }
                if (currentUser?.role === 'FrontDesk') {
                  console.log('Dashboard route - Rendering FrontDeskDashboard');
                  return <FrontDeskDashboard />;
                }
                if (currentUser?.role === 'BarangayPresident') {
                  console.log('Dashboard route - Rendering BarangayPresidentDashboard');
                  return <BarangayPresidentDashboard />;
                }
                if (currentUser?.role === 'PWDMember') {
                  console.log('Dashboard route - Rendering PWDMemberDashboard');
                  return <PWDMemberDashboard />;
                }
                
                console.log('Dashboard route - No matching role, currentUser:', currentUser);
                return <div>No dashboard available for role: {currentUser?.role}</div>;
              })()}
            </PasswordChangeWrapper>
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-records" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin', 'Staff1']}>
            <PWDRecords />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-card" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <PWDCard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      {/* Redirect old /reports route to /analytics */}
      <Route 
        path="/reports" 
        element={<Navigate to="/analytics" replace />}
      />
      <Route 
        path="/ayuda" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <Ayuda />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/benefit-tracking" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <BenefitTracking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/claim-history" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <ClaimHistory />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/announcement" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <Announcement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin-support" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <AdminSupportDesk />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/document-management" 
        element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <DocumentManagement />
          </ProtectedRoute>
        } 
      />
      
      {/* Staff1 Routes - PWD Masterlist and PWD Records */}
      <Route 
        path="/pwd-masterlist" 
        element={
          <ProtectedRoute allowedRoles={['Staff1']}>
            <PWDRecords />
          </ProtectedRoute>
        } 
      />
      
      {/* Staff2 Routes - Ayuda and Benefit Tracking */}
      <Route 
        path="/staff2-ayuda" 
        element={
          <ProtectedRoute allowedRoles={['Staff2']}>
            <Ayuda />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff2-benefit-tracking" 
        element={
          <ProtectedRoute allowedRoles={['Staff2']}>
            <BenefitTracking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff2-claim-history" 
        element={
          <ProtectedRoute allowedRoles={['Staff2']}>
            <ClaimHistory />
          </ProtectedRoute>
        } 
      />
      
      {/* FrontDesk Routes - PWD Card, Support Desk, Announcements */}
      <Route 
        path="/frontdesk-pwd-card" 
        element={
          <ProtectedRoute allowedRoles={['FrontDesk']}>
            <PWDCard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/frontdesk-support" 
        element={
          <ProtectedRoute allowedRoles={['FrontDesk']}>
            <AdminSupportDesk />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/frontdesk-announcement" 
        element={
          <ProtectedRoute allowedRoles={['FrontDesk']}>
            <Announcement />
          </ProtectedRoute>
        } 
      />
      
      {/* Barangay President Routes */}
      <Route 
        path="/barangay-president-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barangay-president-pwd-records" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentPWDRecords />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barangay-president-pwd-card" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentPWDCard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barangay-president-reports" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentReports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barangay-president-ayuda" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentAyuda />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barangay-president-announcement" 
        element={
          <ProtectedRoute allowedRoles={['BarangayPresident']}>
            <BarangayPresidentAnnouncement />
          </ProtectedRoute>
        } 
      />
      
      {/* PWD Member Routes */}
      <Route 
        path="/pwd-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <PWDMemberDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-announcements" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <PWDMemberAnnouncement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-support" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <PWDMemberSupportDesk />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-profile" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <PWDProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-documents" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <MemberDocumentUpload />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pwd-benefits" 
        element={
          <ProtectedRoute allowedRoles={['PWDMember']}>
            <PWDMemberBenefits />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/unauthorized" element={<div>Unauthorized access</div>} />
      <Route path="/apply" element={<div>Apply for PWD membership — Coming soon</div>} />
      
      {/* Public Document Correction Route */}
      <Route path="/document-correction/:token" element={<DocumentCorrectionPage />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TranslationProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <div className="App">
              <AppContent />
            </div>
          </Router>
        </TranslationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;