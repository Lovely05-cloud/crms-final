import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  ListItemText,
  TextField,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
// jsPDF and jspdf-autotable are dynamically imported in generatePDFReport
// to ensure they load correctly and avoid module loading issues
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Download as DownloadIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import AdminSidebar from '../shared/AdminSidebar';
import pwdMemberService from '../../services/pwdMemberService';
import { applicationService } from '../../services/applicationService';
import benefitService from '../../services/benefitService';
import { supportService } from '../../services/supportService';

// All 18 Barangays in Cabuyao
const ALL_BARANGAYS = [
  'Baclaran',
  'Banay-Banay',
  'Banlic',
  'Bigaa',
  'Butong',
  'Casile',
  'Diezmo',
  'Gulod',
  'Mamatid',
  'Marinig',
  'Niugan',
  'Pittland',
  'Pulo',
  'Sala',
  'San Isidro',
  'Barangay I Poblacion',
  'Barangay II Poblacion',
  'Barangay III Poblacion'
];

// Disability types from application form (must match exactly)
const DISABILITY_TYPES = [
  'Visual Impairment',
  'Hearing Impairment',
  'Speech and Language Impairment',
  'Intellectual Disability',
  'Mental Health Condition',
  'Learning Disability',
  'Psychosocial Disability',
  'Autism Spectrum Disorder',
  'ADHD',
  'Physical Disability',
  'Orthopedic/Physical Disability',
  'Chronic Illness',
  'Multiple Disabilities'
];

// Gauge Chart Component
const GaugeChart = ({ value, min = 0, max = 100, title, color = '#3498DB' }) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const radius = 70;
  const centerX = 100;
  const centerY = 100;
  
  // Calculate angle for needle (0 to 180 degrees for semi-circle)
  const angle = (percentage / 100) * 180;
  const angleRad = (angle - 90) * (Math.PI / 180);
  const needleX = centerX + radius * Math.cos(angleRad);
  const needleY = centerY + radius * Math.sin(angleRad);
  
  // Arc path for semi-circle
  const pathDescription = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}
  `;
  
  // Calculate stroke-dasharray and offset for the colored arc
  const circumference = Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
        {title}
      </Typography>
      <Box sx={{ position: 'relative', width: 200, height: 120 }}>
        <svg width="200" height="120" viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d={pathDescription}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={pathDescription}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke="#2C3E50"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Center circle */}
          <circle cx={centerX} cy={centerY} r="6" fill="#2C3E50" />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            top: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '2rem' }}>
            {value.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1, px: 2 }}>
        <Typography variant="caption" sx={{ color: '#7F8C8D', fontSize: '0.7rem' }}>{min}</Typography>
        <Typography variant="caption" sx={{ color: '#7F8C8D', fontSize: '0.7rem' }}>{max}</Typography>
      </Box>
    </Box>
  );
};

const Analytics = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // KPI Cards Data - PWD System Metrics
  const [kpiData, setKpiData] = useState({
    totalRegistrations: 0, // Total PWD members registered
    pendingApplications: 0, // Pending applications
    approvedApplications: 0, // Approved applications
    cardsIssued: 0, // Total cards issued/renewed
    claimedIDs: 0, // IDs that have been claimed
    renewedIDs: 0, // IDs that have been renewed
    benefitsDistributed: 0, // Total benefits distributed
    ticketsResolved: 0 // Support tickets resolved
  });

  // Monthly Registration Trends
  const [monthlyRegistrations, setMonthlyRegistrations] = useState([]);
  
  // Gauge data
  const [approvalRate, setApprovalRate] = useState(0); // Approval rate percentage
  const [resolutionRate, setResolutionRate] = useState(0); // Support ticket resolution rate
  
  // Charts data
  const [topBarangays, setTopBarangays] = useState([]);
  const [monthlyCardIssuance, setMonthlyCardIssuance] = useState([]);
  const [benefitTypeDistribution, setBenefitTypeDistribution] = useState([]);
  const [disabilityDistribution, setDisabilityDistribution] = useState([]);

  // Filters
  const [dateRange, setDateRange] = useState('all'); // all | month | quarter | year
  const [selectedBarangays, setSelectedBarangays] = useState([]);
  const [selectedDisabilities, setSelectedDisabilities] = useState([]);
  const [selectedBenefitTypes, setSelectedBenefitTypes] = useState([]);
  const [statusFilters, setStatusFilters] = useState({ pending: true, approved: true });
  const [ticketFilters, setTicketFilters] = useState({ open: true, resolved: true });

  // Filter modal and details modal
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [comparisonDateRange, setComparisonDateRange] = useState({ start: null, end: null });
  const [comparisonData, setComparisonData] = useState(null);
  const [reportTab, setReportTab] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({ 
    periodType: 'monthly', // 'weekly', 'monthly', 'annually'
    periodValue: null, // week number, month-year, or year
    start: null, 
    end: null 
  });
  const [reportSelectedBarangays, setReportSelectedBarangays] = useState([]); // Barangays for report generation
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState({
    executiveSummary: true,
    keyInsights: true,
    monthlyRegistrations: true,
    topBarangays: true,
    disabilityDistribution: true,
    benefitDistribution: true,
    ticketStatus: true
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Allowed benefit types (case-insensitive match)
  const ALLOWED_BENEFIT_TYPES = useMemo(() => ['Financial Assistance', 'Birthday Cash Gift'], []);
  const ALLOWED_BENEFIT_TYPES_LOWER = useMemo(() => ALLOWED_BENEFIT_TYPES.map(t => t.toLowerCase()), [ALLOWED_BENEFIT_TYPES]);

  // Use fixed lists for consistency
  const uniqueBarangays = useMemo(() => ALL_BARANGAYS, []);
  const uniqueDisabilities = useMemo(() => DISABILITY_TYPES, []);

  const uniqueBenefitTypes = useMemo(() => ALLOWED_BENEFIT_TYPES, [ALLOWED_BENEFIT_TYPES]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch PWD members data
      let members = [];
      let totalMembers = 0;
      try {
        const membersResp = await pwdMemberService.getAll();
        members = membersResp?.data?.members || membersResp?.data || (Array.isArray(membersResp) ? membersResp : []) || [];
        totalMembers = Array.isArray(members) ? members.length : 0;
      } catch (memberError) {
        console.warn('Error fetching PWD members, using defaults:', memberError);
        members = [];
        totalMembers = 0;
      }
      
      // Fetch applications data
      let applications = [];
      let totalApplications = 0;
      let pendingApplications = 0;
      let approvedApplications = 0;
      try {
        const appsResp = await applicationService.getAll();
        applications = appsResp?.data || (Array.isArray(appsResp) ? appsResp : []) || [];
        totalApplications = Array.isArray(applications) ? applications.length : 0;
        pendingApplications = applications.filter(app => app?.status === 'pending' || app?.status === 'Pending').length;
        approvedApplications = applications.filter(app => app?.status === 'approved' || app?.status === 'Approved').length;
      } catch (appError) {
        console.warn('Error fetching applications, using defaults:', appError);
        applications = [];
        totalApplications = 0;
        pendingApplications = 0;
        approvedApplications = 0;
      }
      
      // Fetch benefits data
      let benefits = [];
      let totalBenefits = 0;
      try {
        const benefitsResp = await benefitService.getAll();
        benefits = benefitsResp?.data || (Array.isArray(benefitsResp) ? benefitsResp : []) || [];
        // Keep only allowed benefit types
        benefits = Array.isArray(benefits)
          ? benefits.filter(b => {
              const t = (b?.benefit_type || b?.type || b?.category || '').toString().toLowerCase();
              return ALLOWED_BENEFIT_TYPES_LOWER.includes(t);
            })
          : [];
        totalBenefits = benefits.length;
      } catch (benefitError) {
        console.warn('Error fetching benefits, using defaults:', benefitError);
        benefits = [];
        totalBenefits = 0;
      }
      
      // Fetch support tickets data
      let tickets = [];
      let resolvedTickets = 0;
      try {
        const ticketsResp = await supportService.getTickets();
        tickets = ticketsResp?.data || (Array.isArray(ticketsResp) ? ticketsResp : []) || [];
        resolvedTickets = tickets.filter(ticket => ticket?.status === 'resolved' || ticket?.status === 'closed').length;
      } catch (ticketError) {
        console.warn('Error fetching support tickets, using defaults:', ticketError);
        tickets = [];
        resolvedTickets = 0;
      }
      
      // Calculate cards issued (assuming members with card numbers or card status)
      let cardsIssued = 0;
      let claimedIDs = 0;
      let renewedIDs = 0;
      if (Array.isArray(members)) {
        // Debug: Log first member to see structure
        if (members.length > 0) {
          console.log('Sample member data:', {
            pwd_id: members[0].pwd_id,
            pwd_id_generated_at: members[0].pwd_id_generated_at,
            created_at: members[0].created_at,
            has_pwd_id: !!members[0].pwd_id
          });
        }
        
        // Cards issued = members with pwd_id (card generated)
        cardsIssued = members.filter(member => 
          member?.pwd_id || member?.pwd_card_number || member?.card_number || member?.card_status === 'issued' || member?.card_status === 'active'
        ).length;
        
        console.log('Cards Issued calculation:', {
          totalMembers: members.length,
          cardsIssued: cardsIssued,
          membersWithPwdId: members.filter(m => m?.pwd_id).length
        });
        
        // Calculate claimed IDs (members with pwd_id generated - same as cards issued)
        claimedIDs = members.filter(member => 
          member?.pwd_id || member?.pwd_card_number || member?.card_number
        ).length;
        
        // Calculate renewed IDs (members with multiple approved applications)
        // This indicates they applied more than once (renewal scenario)
        const memberApplicationCounts = {};
        if (Array.isArray(applications)) {
          applications.forEach(app => {
            if ((app?.status === 'Approved' || app?.status === 'approved') && app?.pwdID) {
              memberApplicationCounts[app.pwdID] = (memberApplicationCounts[app.pwdID] || 0) + 1;
            }
          });
        }
        
        // Members with more than 1 approved application are considered renewals
        renewedIDs = Object.values(memberApplicationCounts).filter(count => count > 1).length;
      }
      
      // Expose raw data for filtering
      window.__analytics_members = members;
      window.__analytics_applications = applications;
      window.__analytics_benefits = benefits;
      window.__analytics_tickets = tickets;

      // Initial KPI compute (unfiltered)
      setKpiData(prev => ({
        ...prev,
        totalRegistrations: totalMembers,
        pendingApplications: pendingApplications,
        approvedApplications: approvedApplications,
        cardsIssued: cardsIssued || totalMembers,
        claimedIDs: claimedIDs,
        renewedIDs: renewedIDs,
        benefitsDistributed: totalBenefits,
        ticketsResolved: resolvedTickets
      }));
      
      // Calculate approval rate
      const approvalRateCalc = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;
      setApprovalRate(approvalRateCalc);
      
      // Calculate resolution rate
      const totalTickets = tickets.length;
      const resolutionRateCalc = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
      setResolutionRate(resolutionRateCalc);
      
      // Generate monthly registration trends (last 6 months)
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }
      
      const monthlyRegData = months.map(month => {
        // Count registrations per month
        let count = 0;
        if (Array.isArray(members)) {
          members.forEach(member => {
            if (member && typeof member === 'object') {
              const regDate = member.created_at || member.createdAt || member.registration_date || member.date_registered;
              if (regDate) {
                const memberDate = new Date(regDate);
                const monthStr = memberDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                if (monthStr === month) {
                  count++;
                }
              }
            }
          });
        }
        return { month, registrations: count || 0 };
      });
      setMonthlyRegistrations(monthlyRegData);
      
      // Generate monthly card issuance trends
      const monthlyCardData = months.map(month => {
        let count = 0;
        if (Array.isArray(members)) {
          members.forEach(member => {
            if (member && typeof member === 'object' && (member.pwd_id || member.pwd_card_number || member.card_number)) {
              // Use pwd_id_generated_at if available, otherwise use created_at
              const cardDate = member.pwd_id_generated_at || member.card_issued_date || member.card_date || member.created_at || member.createdAt;
              if (cardDate) {
                try {
                  const cardDateObj = new Date(cardDate);
                  if (!isNaN(cardDateObj.getTime())) {
                    const monthStr = cardDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    if (monthStr === month) {
                      count++;
                    }
                  }
                } catch (e) {
                  console.warn('Invalid card date:', cardDate, e);
                }
              }
            }
          });
        }
        return { month, cards: count || 0 };
      });
      console.log('Monthly card issuance data:', monthlyCardData);
      setMonthlyCardIssuance(monthlyCardData);
      
      // Top 5 Barangays by registrations
      const barangayCounts = {};
      if (Array.isArray(members)) {
        members.forEach(member => {
          if (member && typeof member === 'object') {
            const barangay = member.barangay || member.barangay_name || member.barangayName || 'Unknown';
            barangayCounts[barangay] = (barangayCounts[barangay] || 0) + 1;
          }
        });
      }
      const top5 = Object.entries(barangayCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({
          name: name.length > 25 ? name.substring(0, 22) + '...' : name,
          value: value
        }));
      
      if (top5.length === 0) {
        setTopBarangays([
          { name: 'No data available', value: 0 }
        ]);
      } else {
        setTopBarangays(top5);
      }
      
      // Benefit Type Distribution
      const benefitTypeCounts = {};
      if (Array.isArray(benefits)) {
        benefits.forEach(benefit => {
          if (benefit && typeof benefit === 'object') {
            const type = benefit.benefit_type || benefit.type || benefit.category || 'Other';
            benefitTypeCounts[type] = (benefitTypeCounts[type] || 0) + 1;
          }
        });
      }
      const benefitDist = Object.entries(benefitTypeCounts).map(([name, value]) => ({
        name,
        value: value
      }));
      
      if (benefitDist.length === 0) {
        setBenefitTypeDistribution([
          { name: 'No benefits data', value: 0 }
        ]);
      } else {
        setBenefitTypeDistribution(benefitDist);
      }
      
      // Disability Type Distribution
      const disabilityCounts = {};
      if (Array.isArray(members)) {
        members.forEach(member => {
          if (member && typeof member === 'object') {
            const disability = member.disability_type || member.type_of_disability || member.disability || 'Not Specified';
            disabilityCounts[disability] = (disabilityCounts[disability] || 0) + 1;
          }
        });
      }
      const disabilityDist = Object.entries(disabilityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value]) => ({
          name: name.length > 20 ? name.substring(0, 17) + '...' : name,
          value: value
        }));
      
      if (disabilityDist.length === 0) {
        setDisabilityDistribution([
          { name: 'No data available', value: 0 }
        ]);
      } else {
        setDisabilityDistribution(disabilityDist);
      }
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers for date range filtering
  const getDateRange = (range) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (range) {
      case 'month': {
        const d = new Date(startOfDay);
        d.setMonth(d.getMonth() - 1);
        return { start: d, end: now };
      }
      case 'quarter': {
        const d = new Date(startOfDay);
        d.setMonth(d.getMonth() - 3);
        return { start: d, end: now };
      }
      case 'year': {
        const d = new Date(startOfDay);
        d.setFullYear(d.getFullYear() - 1);
        return { start: d, end: now };
      }
      default:
        return null;
    }
  };

  const isInRange = (isoDate) => {
    if (!dateRange || dateRange === 'all') return true;
    const range = getDateRange(dateRange);
    if (!range) return true;
    const dt = new Date(isoDate);
    return !isNaN(dt.getTime()) && dt >= range.start && dt <= range.end;
  };

  // Apply filters and recompute KPIs/charts
  const filtered = useMemo(() => {
    const members = window.__analytics_members || [];
    const apps = window.__analytics_applications || [];
    const benefits = window.__analytics_benefits || [];
    const tickets = window.__analytics_tickets || [];

    const filteredMembers = members.filter(m => {
      const b = m?.barangay || m?.barangay_name || m?.barangayName;
      const d = m?.disability_type || m?.type_of_disability || m?.disability;
      const regDate = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
      const barangayOk = selectedBarangays.length === 0 || (b && selectedBarangays.includes(b));
      const disabilityOk = selectedDisabilities.length === 0 || (d && selectedDisabilities.includes(d));
      const dateOk = !regDate || isInRange(regDate);
      return barangayOk && disabilityOk && dateOk;
    });

    const filteredApps = apps.filter(a => {
      const statusOk = (statusFilters.pending && (a?.status === 'pending' || a?.status === 'Pending')) ||
                       (statusFilters.approved && (a?.status === 'approved' || a?.status === 'Approved'));
      const dateOk = !a?.created_at || isInRange(a?.created_at);
      return statusOk && dateOk;
    });

    const filteredBenefits = benefits.filter(b => {
      const type = b?.benefit_type || b?.type || b?.category;
      const typeLower = (type || '').toString().toLowerCase();
      const allowedOk = ALLOWED_BENEFIT_TYPES_LOWER.includes(typeLower);
      const typeOk = (selectedBenefitTypes.length === 0 || (type && selectedBenefitTypes.includes(type))) && allowedOk;
      const dateOk = !b?.created_at || isInRange(b?.created_at);
      return typeOk && dateOk;
    });

    const filteredTickets = tickets.filter(t => {
      const status = (t?.status || '').toLowerCase();
      const statusOk = (ticketFilters.open && (status === 'open' || status === 'pending')) ||
                       (ticketFilters.resolved && (status === 'resolved' || status === 'closed'));
      const dateOk = !t?.created_at || isInRange(t?.created_at);
      return statusOk && dateOk;
    });

    return { filteredMembers, filteredApps, filteredBenefits, filteredTickets };
  }, [dateRange, selectedBarangays, selectedDisabilities, selectedBenefitTypes, statusFilters, ticketFilters]);

  // Recompute KPIs and charts based on filtered data
  useEffect(() => {
    const { filteredMembers, filteredApps, filteredBenefits, filteredTickets } = filtered;
    const totalMembers = filteredMembers.length;
    const pendingApps = filteredApps.filter(a => a?.status?.toLowerCase() === 'pending').length;
    const approvedApps = filteredApps.filter(a => a?.status?.toLowerCase() === 'approved').length;
    const cardsIssued = filteredMembers.filter(m => 
      m?.pwd_id || m?.pwd_card_number || m?.card_number || m?.card_status === 'issued' || m?.card_status === 'active'
    ).length;
    
    // Calculate claimed IDs from filtered members (members with pwd_id)
    const claimedIDs = filteredMembers.filter(m => 
      m?.pwd_id || m?.pwd_card_number || m?.card_number
    ).length;
    
    // Calculate renewed IDs from filtered applications
    const memberApplicationCounts = {};
    filteredApps.forEach(app => {
      if ((app?.status === 'Approved' || app?.status === 'approved') && app?.pwdID) {
        memberApplicationCounts[app.pwdID] = (memberApplicationCounts[app.pwdID] || 0) + 1;
      }
    });
    const renewedIDs = Object.values(memberApplicationCounts).filter(count => count > 1).length;
    
    const resolvedTickets = filteredTickets.filter(t => ['resolved', 'closed'].includes((t?.status || '').toLowerCase())).length;

    setKpiData(prev => ({
      ...prev,
      totalRegistrations: totalMembers,
      pendingApplications: pendingApps,
      approvedApplications: approvedApps,
      cardsIssued: cardsIssued,
      claimedIDs: claimedIDs,
      renewedIDs: renewedIDs,
      benefitsDistributed: filteredBenefits.length,
      ticketsResolved: resolvedTickets
    }));

    // Update charts
    // Monthly registrations
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }
    setMonthlyRegistrations(months.map(month => {
      const count = filteredMembers.reduce((acc, m) => {
        const d = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
        if (d) {
          const ds = new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (ds === month) return acc + 1;
        }
        return acc;
      }, 0);
      return { month, registrations: count };
    }));

    // Monthly card issuance
    setMonthlyCardIssuance(months.map(month => {
      const count = filteredMembers.reduce((acc, m) => {
        // Check if member has a card (pwd_id)
        if (m?.pwd_id || m?.pwd_card_number || m?.card_number) {
          // Use pwd_id_generated_at if available, otherwise use created_at
          const d = m?.pwd_id_generated_at || m?.card_issued_date || m?.card_date || m?.created_at || m?.createdAt;
          if (d) {
            const ds = new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (ds === month) return acc + 1;
          }
        }
        return acc;
      }, 0);
      return { month, cards: count };
    }));

    // Top barangays
    const counts = {};
    filteredMembers.forEach(m => {
      const b = m?.barangay || m?.barangay_name || m?.barangayName || 'Unknown';
      counts[b] = (counts[b] || 0) + 1;
    });
    const top5 = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({name, value}));
    setTopBarangays(top5.length ? top5 : [{ name: 'No data', value: 0 }]);

    // Benefit type distribution
    const typeCounts = {};
    filteredBenefits.forEach(b => {
      const t = b?.benefit_type || b?.type || b?.category || 'Other';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const bd = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    setBenefitTypeDistribution(bd.length ? bd : [{ name: 'No data', value: 0 }]);

    // Disability distribution
    const disCounts = {};
    filteredMembers.forEach(m => {
      const d = m?.disability_type || m?.type_of_disability || m?.disability || 'Not Specified';
      disCounts[d] = (disCounts[d] || 0) + 1;
    });
    const dd = Object.entries(disCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name, value}));
    setDisabilityDistribution(dd.length ? dd : [{ name: 'No data', value: 0 }]);

    // Gauges
    const totalApps = filteredApps.length;
    setApprovalRate(totalApps > 0 ? (approvedApps / totalApps) * 100 : 0);
    const totalTickets = filteredTickets.length;
    setResolutionRate(totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0);
  }, [filtered]);

  const formatNumber = (value) => {
    return value.toLocaleString();
  };

  // Generate text analysis for visualizations
  const generateTextAnalysis = (chartType, data, comparisonData = null) => {
    const analysis = [];
    const insights = [];
    const trends = [];

    if (!data || data.length === 0) {
      return { analysis: ['No data available for analysis'], insights: [], trends: [] };
    }

    switch (chartType) {
      case 'monthlyRegistrations':
        const totalRegs = data.reduce((sum, d) => sum + (d.registrations || 0), 0);
        const avgRegs = totalRegs / data.length;
        const maxRegs = Math.max(...data.map(d => d.registrations || 0));
        const maxMonth = data.find(d => d.registrations === maxRegs)?.month;
        analysis.push(`Total registrations: ${totalRegs.toLocaleString()}`);
        analysis.push(`Average monthly registrations: ${avgRegs.toFixed(1)}`);
        analysis.push(`Peak month: ${maxMonth} with ${maxRegs} registrations`);
        
        if (data.length > 1) {
          const recent = data.slice(-2);
          const change = recent[1].registrations - recent[0].registrations;
          const percentChange = ((change / recent[0].registrations) * 100).toFixed(1);
          if (change > 0) {
            trends.push(`Registration increased by ${change} (${percentChange}%) from ${recent[0].month} to ${recent[1].month}`);
          } else if (change < 0) {
            trends.push(`Registration decreased by ${Math.abs(change)} (${Math.abs(percentChange)}%) from ${recent[0].month} to ${recent[1].month}`);
          }
        }
        
        if (comparisonData) {
          const compTotal = comparisonData.reduce((sum, d) => sum + (d.registrations || 0), 0);
          const diff = totalRegs - compTotal;
          const percentDiff = ((diff / compTotal) * 100).toFixed(1);
          insights.push(`Comparison period shows ${diff > 0 ? 'increase' : 'decrease'} of ${Math.abs(diff)} registrations (${Math.abs(percentDiff)}%)`);
        }
        break;

      case 'topBarangays':
        const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
        const topBarangay = data[0];
        const topPercentage = ((topBarangay.value / total) * 100).toFixed(1);
        analysis.push(`Top barangay: ${topBarangay.name} with ${topBarangay.value} registrations`);
        analysis.push(`Top barangay represents ${topPercentage}% of total registrations`);
        analysis.push(`Total registrations across top 5 barangays: ${total.toLocaleString()}`);
        
        if (data.length > 1) {
          insights.push(`Top 3 barangays account for ${((data.slice(0, 3).reduce((s, d) => s + d.value, 0) / total) * 100).toFixed(1)}% of registrations`);
        }
        break;

      case 'monthlyCardIssuance':
        const totalCards = data.reduce((sum, d) => sum + (d.cards || 0), 0);
        const avgCards = totalCards / data.length;
        const maxCards = Math.max(...data.map(d => d.cards || 0));
        const maxCardMonth = data.find(d => d.cards === maxCards)?.month;
        analysis.push(`Total cards issued: ${totalCards.toLocaleString()}`);
        analysis.push(`Average monthly issuance: ${avgCards.toFixed(1)}`);
        analysis.push(`Peak issuance month: ${maxCardMonth} with ${maxCards} cards`);
        
        if (data.length > 1) {
          const recent = data.slice(-2);
          const change = recent[1].cards - recent[0].cards;
          if (change !== 0) {
            trends.push(`Card issuance ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} from ${recent[0].month} to ${recent[1].month}`);
          }
        }
        break;

      case 'benefitTypeDistribution':
        const totalBenefits = data.reduce((sum, d) => sum + (d.value || 0), 0);
        const sortedData = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
        const topBenefit = sortedData[0];
        const topBenefitPercent = totalBenefits > 0 ? ((topBenefit.value / totalBenefits) * 100).toFixed(1) : 0;
        const top3Benefits = sortedData.slice(0, 3);
        const top3Total = top3Benefits.reduce((sum, d) => sum + (d.value || 0), 0);
        const top3Percent = totalBenefits > 0 ? ((top3Total / totalBenefits) * 100).toFixed(1) : 0;
        const uniqueTypes = data.filter(d => (d.value || 0) > 0).length;
        
        // Analysis metrics
        analysis.push(`Total benefits distributed: ${totalBenefits.toLocaleString()}`);
        analysis.push(`Unique benefit types: ${uniqueTypes}`);
        analysis.push(`Most common benefit type: ${topBenefit.name} with ${topBenefit.value} benefits (${topBenefitPercent}%)`);
        
        if (sortedData.length > 1) {
          const secondBenefit = sortedData[1];
          const secondPercent = totalBenefits > 0 ? ((secondBenefit.value / totalBenefits) * 100).toFixed(1) : 0;
          analysis.push(`Second most common: ${secondBenefit.name} with ${secondBenefit.value} benefits (${secondPercent}%)`);
        }
        
        if (sortedData.length > 2) {
          analysis.push(`Top 3 benefit types account for ${top3Total} benefits (${top3Percent}%)`);
          top3Benefits.forEach((benefit, idx) => {
            const percent = totalBenefits > 0 ? ((benefit.value / totalBenefits) * 100).toFixed(1) : 0;
            analysis.push(`  ${idx + 1}. ${benefit.name}: ${benefit.value} benefits (${percent}%)`);
          });
        }
        
        // Distribution evenness analysis
        if (sortedData.length > 1) {
          const avgPerType = totalBenefits / uniqueTypes;
          const distributionVariance = sortedData.reduce((sum, d) => {
            const deviation = Math.abs((d.value || 0) - avgPerType);
            return sum + Math.pow(deviation, 2);
          }, 0) / uniqueTypes;
          const distributionStdDev = Math.sqrt(distributionVariance).toFixed(1);
          
          if (distributionStdDev < avgPerType * 0.3) {
            insights.push(`Well-distributed benefit types: Benefits are evenly spread across types (std dev: ${distributionStdDev}).`);
          } else if (distributionStdDev < avgPerType * 0.6) {
            insights.push(`Moderate distribution: Some benefit types are more popular than others (std dev: ${distributionStdDev}).`);
          } else {
            insights.push(`Highly concentrated distribution: Benefits are concentrated in specific types (std dev: ${distributionStdDev}).`);
          }
        }
        
        // Insights
        if (sortedData.length > 1) {
          const top2Total = sortedData.slice(0, 2).reduce((s, d) => s + (d.value || 0), 0);
          const top2Percent = totalBenefits > 0 ? ((top2Total / totalBenefits) * 100).toFixed(1) : 0;
          insights.push(`Top 2 benefit types account for ${top2Percent}% of all benefits`);
          
          if (topBenefitPercent > 50) {
            insights.push(`High concentration: ${topBenefit.name} represents over half of all benefits (${topBenefitPercent}%)`);
            trends.push(`Consider diversifying benefit offerings to better serve diverse needs`);
          } else if (topBenefitPercent > 30) {
            insights.push(`Moderate concentration: ${topBenefit.name} is the dominant benefit type but others are well-represented`);
          }
        }
        
        // Trends and recommendations
        if (sortedData.length > 3) {
          const bottomTypes = sortedData.slice(-3).filter(d => (d.value || 0) > 0);
          if (bottomTypes.length > 0) {
            trends.push(`Least common benefit types: ${bottomTypes.map(b => b.name).join(', ')}`);
            insights.push(`These types may need more promotion or consideration for expansion`);
          }
        }
        
        if (totalBenefits > 0 && uniqueTypes < 3) {
          trends.push(`Limited benefit variety: Only ${uniqueTypes} benefit type(s) available`);
          insights.push(`Consider expanding benefit offerings to provide more options for members`);
        }
        
        if (topBenefitPercent > 60) {
          trends.push(`Focus area: ${topBenefit.name} benefits are highly demanded`);
          insights.push(`Ensure adequate resources and inventory for ${topBenefit.name} benefits`);
        }
        
        break;

      case 'disabilityDistribution':
        const totalDisabilities = data.reduce((sum, d) => sum + (d.value || 0), 0);
        const topDisability = data[0];
        const topDisabilityPercent = ((topDisability.value / totalDisabilities) * 100).toFixed(1);
        analysis.push(`Total members with disabilities: ${totalDisabilities.toLocaleString()}`);
        analysis.push(`Most common disability: ${topDisability.name} (${topDisabilityPercent}%)`);
        
        if (data.length > 1) {
          insights.push(`Top 3 disability types represent ${((data.slice(0, 3).reduce((s, d) => s + d.value, 0) / totalDisabilities) * 100).toFixed(1)}% of total`);
        }
        break;

      case 'approvalRate':
        analysis.push(`Current approval rate: ${data.toFixed(1)}%`);
        if (data > 80) {
          insights.push('Excellent approval rate! The system is processing applications efficiently.');
        } else if (data > 60) {
          insights.push('Good approval rate. Consider reviewing pending applications for faster processing.');
        } else {
          insights.push('Approval rate could be improved. Review application requirements and processing workflows.');
        }
        break;

      case 'resolutionRate':
        analysis.push(`Current resolution rate: ${data.toFixed(1)}%`);
        if (data > 85) {
          insights.push('Outstanding resolution rate! Support tickets are being handled efficiently.');
        } else if (data > 70) {
          insights.push('Good resolution rate. Monitor ticket response times for further improvement.');
        } else {
          insights.push('Resolution rate needs attention. Review ticket handling processes and staff allocation.');
        }
        break;

      default:
        analysis.push('Analysis data not available for this visualization type.');
    }

    return { analysis, insights, trends };
  };

  // Helper function to calculate start/end dates from period selection
  const calculatePeriodDates = (periodType, periodValue) => {
    if (!periodValue) return { start: null, end: null };
    
    const now = new Date();
    let startDate, endDate;
    
    switch (periodType) {
      case 'weekly':
        // periodValue is week number (1-52)
        const year = now.getFullYear();
        const jan1 = new Date(year, 0, 1);
        // Get the first Monday of the year (or use Jan 1 if it's a Monday)
        const firstMonday = new Date(jan1);
        const dayOfWeek = jan1.getDay();
        const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
        firstMonday.setDate(jan1.getDate() + daysToMonday);
        // Calculate start date for the selected week
        const weekNumber = parseInt(periodValue);
        startDate = new Date(firstMonday);
        startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
        
      case 'monthly':
        // periodValue is "YYYY-MM" format
        const [yearMonth, month] = periodValue.split('-').map(Number);
        startDate = new Date(yearMonth, month - 1, 1);
        endDate = new Date(yearMonth, month, 0); // Last day of the month
        break;
        
      case 'annually':
        // periodValue is year (YYYY)
        const yearValue = parseInt(periodValue);
        startDate = new Date(yearValue, 0, 1);
        endDate = new Date(yearValue, 11, 31);
        break;
        
      default:
        return { start: null, end: null };
    }
    
    return { start: startDate, end: endDate };
  };

  // Generate comprehensive analytics report
  const generateComprehensiveReport = async (dateRange, selectedBarangays = []) => {
    setGeneratingReport(true);
    try {
      // Calculate dates from period selection if needed
      let startDate, endDate;
      if (dateRange.periodType && dateRange.periodValue) {
        const calculated = calculatePeriodDates(dateRange.periodType, dateRange.periodValue);
        startDate = calculated.start;
        endDate = calculated.end;
      } else {
        startDate = dateRange.start ? new Date(dateRange.start) : null;
        endDate = dateRange.end ? new Date(dateRange.end) : null;
      }
      
      // Get all data
      const members = window.__analytics_members || [];
      const apps = window.__analytics_applications || [];
      const benefits = window.__analytics_benefits || [];
      const tickets = window.__analytics_tickets || [];
      
      // Filter by date range if provided
      let filteredMembers = members;
      let filteredApps = apps;
      let filteredBenefits = benefits;
      let filteredTickets = tickets;
      
      if (startDate && endDate) {
        filteredMembers = members.filter(m => {
          const regDate = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
          if (!regDate) return false;
          const dt = new Date(regDate);
          return dt >= startDate && dt <= endDate;
        });
        
        filteredApps = apps.filter(a => {
          const appDate = a?.created_at || a?.createdAt || a?.submissionDate;
          if (!appDate) return false;
          const dt = new Date(appDate);
          return dt >= startDate && dt <= endDate;
        });
        
        filteredBenefits = benefits.filter(b => {
          const benefitDate = b?.created_at || b?.createdAt || b?.distributionDate || b?.submittedDate;
          if (!benefitDate) return false;
          const dt = new Date(benefitDate);
          return dt >= startDate && dt <= endDate;
        });
        
        filteredTickets = tickets.filter(t => {
          const ticketDate = t?.created_at || t?.createdAt;
          if (!ticketDate) return false;
          const dt = new Date(ticketDate);
          return dt >= startDate && dt <= endDate;
        });
      }
      
      // Filter by barangay if provided
      if (selectedBarangays && selectedBarangays.length > 0) {
        filteredMembers = filteredMembers.filter(m => {
          const b = m?.barangay || m?.barangay_name || m?.barangayName;
          return b && selectedBarangays.includes(b);
        });
        
        filteredApps = filteredApps.filter(a => {
          const b = a?.barangay || a?.barangay_name || a?.barangayName;
          return b && selectedBarangays.includes(b);
        });
        
        filteredBenefits = filteredBenefits.filter(b => {
          const memberBarangay = b?.barangay || b?.barangay_name || b?.barangayName;
          // Also check if benefit is linked to a member
          if (memberBarangay) {
            return selectedBarangays.includes(memberBarangay);
          }
          // If benefit has a member reference, check that member's barangay
          if (b?.pwdID || b?.member_id) {
            const memberId = b.pwdID || b.member_id;
            const member = members.find(m => (m.userID || m.id || m.pwdID) === memberId);
            if (member) {
              const mb = member?.barangay || member?.barangay_name || member?.barangayName;
              return mb && selectedBarangays.includes(mb);
            }
          }
          return false;
        });
      }
      
      // Calculate all metrics
      const totalMembers = filteredMembers.length;
      const pendingApps = filteredApps.filter(a => a?.status?.toLowerCase() === 'pending').length;
      const approvedApps = filteredApps.filter(a => a?.status?.toLowerCase() === 'approved').length;
      const cardsIssued = filteredMembers.filter(m => 
        m?.pwd_id || m?.pwd_card_number || m?.card_number
      ).length;
      const claimedIDs = filteredMembers.filter(m => m?.cardClaimed === true).length;
      const renewedIDs = filteredMembers.filter(m => {
        if (!m?.cardClaimed || !m?.cardIssueDate || !m?.cardExpirationDate) return false;
        const issueDate = new Date(m.cardIssueDate);
        const expDate = new Date(m.cardExpirationDate);
        return expDate > issueDate;
      }).length;
      const resolvedTickets = filteredTickets.filter(t => ['resolved', 'closed'].includes((t?.status || '').toLowerCase())).length;
      
      // Generate monthly breakdown
      const months = [];
      const now = endDate || new Date();
      const start = startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1);
      for (let i = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 30)); i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }
      
      const monthlyReg = months.map(month => {
        const count = filteredMembers.reduce((acc, m) => {
          const d = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
          if (d) {
            const ds = new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (ds === month) return acc + 1;
          }
          return acc;
        }, 0);
        return { month, registrations: count };
      });
      
      // Barangay breakdown
      const barangayCounts = {};
      filteredMembers.forEach(m => {
        const b = m?.barangay || m?.barangay_name || m?.barangayName || 'Unknown';
        barangayCounts[b] = (barangayCounts[b] || 0) + 1;
      });
      const topBarangays = Object.entries(barangayCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
      
      // Disability breakdown
      const disabilityCounts = {};
      filteredMembers.forEach(m => {
        const d = m?.disability_type || m?.type_of_disability || m?.disability || 'Not Specified';
        disabilityCounts[d] = (disabilityCounts[d] || 0) + 1;
      });
      const disabilityDist = Object.entries(disabilityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));
      
      // Benefit breakdown
      const benefitTypeCounts = {};
      filteredBenefits.forEach(b => {
        const t = b?.benefit_type || b?.type || b?.category || 'Other';
        benefitTypeCounts[t] = (benefitTypeCounts[t] || 0) + 1;
      });
      const benefitDist = Object.entries(benefitTypeCounts)
        .map(([name, value]) => ({ name, value }));
      
      // Ticket breakdown
      const ticketStatusCounts = {};
      filteredTickets.forEach(t => {
        const status = (t?.status || 'unknown').toLowerCase();
        ticketStatusCounts[status] = (ticketStatusCounts[status] || 0) + 1;
      });
      
      const report = {
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate ? startDate.toISOString().split('T')[0] : 'All Time',
          end: endDate ? endDate.toISOString().split('T')[0] : 'All Time'
        },
        selectedBarangays: selectedBarangays && selectedBarangays.length > 0 ? selectedBarangays : null,
        summary: {
          totalRegistrations: totalMembers,
          pendingApplications: pendingApps,
          approvedApplications: approvedApps,
          cardsIssued,
          claimedIDs,
          renewedIDs,
          benefitsDistributed: filteredBenefits.length,
          ticketsResolved: resolvedTickets,
          totalTickets: filteredTickets.length,
          approvalRate: filteredApps.length > 0 ? ((approvedApps / filteredApps.length) * 100).toFixed(1) : 0,
          resolutionRate: filteredTickets.length > 0 ? ((resolvedTickets / filteredTickets.length) * 100).toFixed(1) : 0
        },
        breakdowns: {
          monthlyRegistrations: monthlyReg,
          topBarangays,
          disabilityDistribution: disabilityDist,
          benefitTypeDistribution: benefitDist,
          ticketStatusBreakdown: ticketStatusCounts
        },
        insights: {
          topBarangay: topBarangays[0] || { name: 'N/A', value: 0 },
          topDisability: disabilityDist[0] || { name: 'N/A', value: 0 },
          topBenefit: benefitDist[0] || { name: 'N/A', value: 0 },
          peakMonth: monthlyReg.reduce((max, m) => m.registrations > max.registrations ? m : max, monthlyReg[0] || { month: 'N/A', registrations: 0 })
        }
      };
      
      setReportData(report);
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleGenerateReport = async () => {
    // Validate period selection
    if (!reportDateRange.periodType || !reportDateRange.periodValue) {
      alert('Please select a period type and value for the report.');
      return;
    }
    
    // Calculate dates from period selection
    const calculatedDates = calculatePeriodDates(reportDateRange.periodType, reportDateRange.periodValue);
    if (!calculatedDates.start || !calculatedDates.end) {
      alert('Invalid period selection. Please try again.');
      return;
    }
    
    // Update reportDateRange with calculated dates
    const updatedDateRange = {
      ...reportDateRange,
      start: calculatedDates.start.toISOString().split('T')[0],
      end: calculatedDates.end.toISOString().split('T')[0]
    };
    
    try {
      const report = await generateComprehensiveReport(updatedDateRange, reportSelectedBarangays);
      // Report data is stored in state, dialog will show it
    } catch (error) {
      alert('Error generating report. Please try again.');
      console.error(error);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    const barangayInfo = reportData.selectedBarangays && reportData.selectedBarangays.length > 0
      ? (reportData.selectedBarangays.length === ALL_BARANGAYS.length 
          ? 'All Barangays' 
          : reportData.selectedBarangays.join(', '))
      : 'All Barangays';
    
    // Create a formatted text report
    const reportText = `
PDAO ANALYTICS REPORT
Generated: ${new Date(reportData.generatedAt).toLocaleString()}
Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}
Barangays: ${barangayInfo}

================================================================================
EXECUTIVE SUMMARY
================================================================================

Total Registrations: ${reportData.summary.totalRegistrations.toLocaleString()}
Pending Applications: ${reportData.summary.pendingApplications.toLocaleString()}
Approved Applications: ${reportData.summary.approvedApplications.toLocaleString()}
Cards Issued: ${reportData.summary.cardsIssued.toLocaleString()}
Claimed IDs: ${reportData.summary.claimedIDs.toLocaleString()}
Renewed IDs: ${reportData.summary.renewedIDs.toLocaleString()}
Benefits Distributed: ${reportData.summary.benefitsDistributed.toLocaleString()}
Total Tickets: ${reportData.summary.totalTickets.toLocaleString()}
Tickets Resolved: ${reportData.summary.ticketsResolved.toLocaleString()}
Approval Rate: ${reportData.summary.approvalRate}%
Resolution Rate: ${reportData.summary.resolutionRate}%

================================================================================
MONTHLY REGISTRATIONS BREAKDOWN
================================================================================
${reportData.breakdowns.monthlyRegistrations.map(m => `${m.month}: ${m.registrations}`).join('\n')}

================================================================================
TOP 10 BARANGAYS BY REGISTRATIONS
================================================================================
${reportData.breakdowns.topBarangays.map((b, idx) => `${idx + 1}. ${b.name}: ${b.value}`).join('\n')}

================================================================================
DISABILITY TYPE DISTRIBUTION
================================================================================
${reportData.breakdowns.disabilityDistribution.map(d => `${d.name}: ${d.value}`).join('\n')}

================================================================================
BENEFIT TYPE DISTRIBUTION
================================================================================
${reportData.breakdowns.benefitTypeDistribution.map(b => `${b.name}: ${b.value}`).join('\n')}

================================================================================
TICKET STATUS BREAKDOWN
================================================================================
${Object.entries(reportData.breakdowns.ticketStatusBreakdown).map(([status, count]) => `${status}: ${count}`).join('\n')}

================================================================================
KEY INSIGHTS
================================================================================
Top Barangay: ${reportData.insights.topBarangay.name} (${reportData.insights.topBarangay.value} registrations)
Top Disability Type: ${reportData.insights.topDisability.name} (${reportData.insights.topDisability.value} members)
Top Benefit Type: ${reportData.insights.topBenefit.name} (${reportData.insights.topBenefit.value} benefits)
Peak Registration Month: ${reportData.insights.peakMonth.month} (${reportData.insights.peakMonth.registrations} registrations)

================================================================================
END OF REPORT
================================================================================
    `.trim();
    
    // Create and download file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PDAO_Analytics_Report_${reportData.dateRange.start}_to_${reportData.dateRange.end}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to draw a simple bar chart in PDF
  const drawBarChart = (doc, data, x, y, width, height, maxValue, labelKey, valueKey) => {
    const barWidth = width / data.length;
    const barSpacing = barWidth * 0.1;
    const actualBarWidth = barWidth - barSpacing;
    const chartHeight = height - 20; // Reserve space for labels
    
    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item[valueKey] / maxValue) * chartHeight;
      const barX = x + (index * barWidth) + (barSpacing / 2);
      const barY = y + chartHeight - barHeight;
      
      // Draw bar
      doc.setFillColor(52, 152, 219);
      doc.rect(barX, barY, actualBarWidth, barHeight, 'F');
      
      // Draw value on top of bar
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(
        item[valueKey].toString(),
        barX + (actualBarWidth / 2),
        barY - 2,
        { align: 'center' }
      );
      
      // Draw label below
      doc.setFontSize(7);
      const label = item[labelKey].toString();
      const truncatedLabel = label.length > 8 ? label.substring(0, 8) + '...' : label;
      doc.text(
        truncatedLabel,
        barX + (actualBarWidth / 2),
        y + chartHeight + 5,
        { align: 'center' }
      );
    });
    
    // Draw axes
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    // Y-axis
    doc.line(x, y, x, y + chartHeight);
    // X-axis
    doc.line(x, y + chartHeight, x + width, y + chartHeight);
    
    return y + height;
  };

  const generatePDFReport = async () => {
    if (!reportData) return;
    
    setGeneratingPDF(true);
    try {
      // Dynamically import jsPDF and autoTable to ensure they load correctly
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      
      // Create jsPDF instance
      const doc = new jsPDF('portrait', 'mm', 'a4');
      
      // The autoTable plugin should extend jsPDF prototype, but if it doesn't,
      // we can use it as a function directly
      // Create wrapper function for consistent usage
      const autoTableFn = (options) => {
        if (typeof doc.autoTable === 'function') {
          // Use as method if available (plugin extended prototype)
          doc.autoTable(options);
          return doc.lastAutoTable;
        } else {
          // Use as function if method not available (fallback)
          autoTable(doc, options);
          return doc.lastAutoTable;
        }
      };
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      // Calculate available width for tables (page width - left margin - right margin)
      const availableWidth = pageWidth - 40; // 20mm left + 20mm right margin
      let yPosition = 20;
      
      // Header with background
      doc.setFillColor(52, 152, 219); // Blue
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PDAO ANALYTICS REPORT', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}`, pageWidth / 2, 28, { align: 'center' });
      
      const barangayInfo = reportData.selectedBarangays && reportData.selectedBarangays.length > 0
        ? (reportData.selectedBarangays.length === ALL_BARANGAYS.length 
            ? 'All Barangays' 
            : reportData.selectedBarangays.length > 3
              ? `${reportData.selectedBarangays.length} barangays selected`
              : reportData.selectedBarangays.join(', '))
        : 'All Barangays';
      doc.text(`Barangays: ${barangayInfo}`, pageWidth / 2, 35, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, pageWidth / 2, 42, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPosition = 55;
      
      // Executive Summary Section
      if (selectedAnalytics.executiveSummary) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('EXECUTIVE SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
        
        doc.setDrawColor(52, 152, 219);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        // Summary metrics in a table
        const summaryData = [
          ['Metric', 'Value'],
          ['Total Registrations', reportData.summary.totalRegistrations.toLocaleString()],
          ['Pending Applications', reportData.summary.pendingApplications.toLocaleString()],
          ['Approved Applications', reportData.summary.approvedApplications.toLocaleString()],
          ['Cards Issued', reportData.summary.cardsIssued.toLocaleString()],
          ['Claimed IDs', reportData.summary.claimedIDs.toLocaleString()],
          ['Renewed IDs', reportData.summary.renewedIDs.toLocaleString()],
          ['Benefits Distributed', reportData.summary.benefitsDistributed.toLocaleString()],
          ['Total Tickets', reportData.summary.totalTickets.toLocaleString()],
          ['Tickets Resolved', reportData.summary.ticketsResolved.toLocaleString()],
          ['Approval Rate', `${reportData.summary.approvalRate}%`],
          ['Resolution Rate', `${reportData.summary.resolutionRate}%`]
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [summaryData[0]],
          body: summaryData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.6, fontStyle: 'bold', halign: 'center' },
            1: { cellWidth: availableWidth * 0.4, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
        
        yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
      }
      
      // Key Insights Section
      if (selectedAnalytics.keyInsights) {
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('KEY INSIGHTS', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const insights = [
          `Top Barangay: ${reportData.insights.topBarangay.name} (${reportData.insights.topBarangay.value} registrations)`,
          `Top Disability Type: ${reportData.insights.topDisability.name} (${reportData.insights.topDisability.value} members)`,
          `Top Benefit Type: ${reportData.insights.topBenefit.name} (${reportData.insights.topBenefit.value} benefits)`,
          `Peak Registration Month: ${reportData.insights.peakMonth.month} (${reportData.insights.peakMonth.registrations} registrations)`
        ];
        
        insights.forEach((insight, idx) => {
          doc.text(insight, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;
        });
        
        yPosition += 5;
      }
      
      // Monthly Registrations Breakdown
      if (selectedAnalytics.monthlyRegistrations) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('MONTHLY REGISTRATIONS BREAKDOWN', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        const monthlyData = [
          ['Month', 'Registrations'],
          ...reportData.breakdowns.monthlyRegistrations.map(m => [m.month, m.registrations.toString()])
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [monthlyData[0]],
          body: monthlyData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.6, halign: 'center' },
            1: { cellWidth: availableWidth * 0.4, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
        
        yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
        
        // Add bar chart visualization for monthly registrations
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        if (reportData.breakdowns.monthlyRegistrations && reportData.breakdowns.monthlyRegistrations.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Monthly Registrations Chart', 20, yPosition);
          yPosition += 10;
          
          const maxRegistrations = Math.max(...reportData.breakdowns.monthlyRegistrations.map(m => m.registrations || 0));
          const chartData = reportData.breakdowns.monthlyRegistrations.slice(-6); // Last 6 months
          yPosition = drawBarChart(
            doc,
            chartData,
            20,
            yPosition,
            pageWidth - 40,
            60,
            maxRegistrations,
            'month',
            'registrations'
          );
          yPosition += 10;
        }
        
        // Add textual analysis for monthly registrations
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        const monthlyAnalysis = generateTextAnalysis('monthlyRegistrations', reportData.breakdowns.monthlyRegistrations);
        if (monthlyAnalysis.analysis.length > 0 || monthlyAnalysis.insights.length > 0 || monthlyAnalysis.trends.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Textual Analysis', 20, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          if (monthlyAnalysis.analysis.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Key Metrics:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            monthlyAnalysis.analysis.forEach(metric => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${metric}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (monthlyAnalysis.trends.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Trends:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            monthlyAnalysis.trends.forEach(trend => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${trend}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (monthlyAnalysis.insights.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Insights:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            monthlyAnalysis.insights.forEach(insight => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${insight}`, 30, yPosition);
              yPosition += 6;
            });
          }
          
          yPosition += 10;
        }
      }
      
      // Top Barangays Breakdown
      if (selectedAnalytics.topBarangays) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP 10 BARANGAYS BY REGISTRATIONS', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        const barangayData = [
          ['Rank', 'Barangay', 'Registrations'],
          ...reportData.breakdowns.topBarangays.slice(0, 10).map((b, idx) => [
            (idx + 1).toString(),
            b.name,
            b.value.toString()
          ])
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [barangayData[0]],
          body: barangayData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.15, halign: 'center' },
            1: { cellWidth: availableWidth * 0.6, halign: 'center' },
            2: { cellWidth: availableWidth * 0.25, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
        
        yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
        
        // Add bar chart visualization for top barangays
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        if (reportData.breakdowns.topBarangays && reportData.breakdowns.topBarangays.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Top Barangays Chart', 20, yPosition);
          yPosition += 10;
          
          const top5Barangays = reportData.breakdowns.topBarangays.slice(0, 5);
          const maxRegistrations = Math.max(...top5Barangays.map(b => b.value || 0));
          yPosition = drawBarChart(
            doc,
            top5Barangays,
            20,
            yPosition,
            pageWidth - 40,
            60,
            maxRegistrations,
            'name',
            'value'
          );
          yPosition += 10;
        }
        
        // Add textual analysis for top barangays
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        const barangayAnalysis = generateTextAnalysis('topBarangays', reportData.breakdowns.topBarangays);
        if (barangayAnalysis.analysis.length > 0 || barangayAnalysis.insights.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Textual Analysis', 20, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          if (barangayAnalysis.analysis.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Key Metrics:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            barangayAnalysis.analysis.forEach(metric => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${metric}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (barangayAnalysis.insights.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Insights:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            barangayAnalysis.insights.forEach(insight => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${insight}`, 30, yPosition);
              yPosition += 6;
            });
          }
          
          yPosition += 10;
        }
      }
      
      // Disability Distribution
      if (selectedAnalytics.disabilityDistribution) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('DISABILITY TYPE DISTRIBUTION', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        const disabilityData = [
          ['Disability Type', 'Count'],
          ...reportData.breakdowns.disabilityDistribution.map(d => [d.name, d.value.toString()])
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [disabilityData[0]],
          body: disabilityData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.65, halign: 'center' },
            1: { cellWidth: availableWidth * 0.35, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
        
        yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
        
        // Add bar chart visualization for disability distribution
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        if (reportData.breakdowns.disabilityDistribution && reportData.breakdowns.disabilityDistribution.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Disability Distribution Chart', 20, yPosition);
          yPosition += 10;
          
          const topDisabilities = reportData.breakdowns.disabilityDistribution.slice(0, 6);
          const maxCount = Math.max(...topDisabilities.map(d => d.value || 0));
          yPosition = drawBarChart(
            doc,
            topDisabilities,
            20,
            yPosition,
            pageWidth - 40,
            60,
            maxCount,
            'name',
            'value'
          );
          yPosition += 10;
        }
        
        // Add textual analysis for disability distribution
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        const disabilityAnalysis = generateTextAnalysis('disabilityDistribution', reportData.breakdowns.disabilityDistribution);
        if (disabilityAnalysis.analysis.length > 0 || disabilityAnalysis.insights.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Textual Analysis', 20, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          if (disabilityAnalysis.analysis.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Key Metrics:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            disabilityAnalysis.analysis.forEach(metric => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${metric}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (disabilityAnalysis.insights.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Insights:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            disabilityAnalysis.insights.forEach(insight => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${insight}`, 30, yPosition);
              yPosition += 6;
            });
          }
          
          yPosition += 10;
        }
      }
      
      // Benefit Type Distribution
      if (selectedAnalytics.benefitDistribution) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('BENEFIT TYPE DISTRIBUTION', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        const benefitData = [
          ['Benefit Type', 'Count'],
          ...reportData.breakdowns.benefitTypeDistribution.map(b => [b.name, b.value.toString()])
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [benefitData[0]],
          body: benefitData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.65, halign: 'center' },
            1: { cellWidth: availableWidth * 0.35, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
        
        yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 50;
        
        // Add bar chart visualization for benefit distribution
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        if (reportData.breakdowns.benefitTypeDistribution && reportData.breakdowns.benefitTypeDistribution.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Benefit Distribution Chart', 20, yPosition);
          yPosition += 10;
          
          const benefitData = reportData.breakdowns.benefitTypeDistribution;
          const maxCount = Math.max(...benefitData.map(b => b.value || 0));
          yPosition = drawBarChart(
            doc,
            benefitData,
            20,
            yPosition,
            pageWidth - 40,
            60,
            maxCount,
            'name',
            'value'
          );
          yPosition += 10;
        }
        
        // Add textual analysis for benefit distribution
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        const benefitAnalysis = generateTextAnalysis('benefitTypeDistribution', reportData.breakdowns.benefitTypeDistribution);
        if (benefitAnalysis.analysis.length > 0 || benefitAnalysis.insights.length > 0 || benefitAnalysis.trends.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('Textual Analysis', 20, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          if (benefitAnalysis.analysis.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Key Metrics:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            benefitAnalysis.analysis.forEach(metric => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${metric}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (benefitAnalysis.trends.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Trends:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            benefitAnalysis.trends.forEach(trend => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${trend}`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 3;
          }
          
          if (benefitAnalysis.insights.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Insights:', 25, yPosition);
            yPosition += 6;
            doc.setFont('helvetica', 'normal');
            benefitAnalysis.insights.forEach(insight => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(`• ${insight}`, 30, yPosition);
              yPosition += 6;
            });
          }
          
          yPosition += 10;
        }
      }
      
      // Ticket Status Breakdown
      if (selectedAnalytics.ticketStatus) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('TICKET STATUS BREAKDOWN', pageWidth / 2, yPosition, { align: 'center' });
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        
        yPosition += 12;
        
        const ticketData = [
          ['Status', 'Count'],
          ...Object.entries(reportData.breakdowns.ticketStatusBreakdown).map(([status, count]) => [
            status.charAt(0).toUpperCase() + status.slice(1),
            count.toString()
          ])
        ];
        
        autoTableFn({
          startY: yPosition,
          head: [ticketData[0]],
          body: ticketData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', halign: 'center' },
          columnStyles: { 
            0: { cellWidth: availableWidth * 0.65, halign: 'center' },
            1: { cellWidth: availableWidth * 0.35, halign: 'center' }
          },
          margin: { left: 20, right: 20 },
          tableWidth: availableWidth
        });
      }
      
      // Footer on last page
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      
      // Generate blob for preview
      const pdfBlob = doc.output('blob');
      setPdfBlob(pdfBlob);
      
      // Automatically download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const dateRangeStr = `${reportData.dateRange.start}_to_${reportData.dateRange.end}`;
      link.download = `PDAO_Analytics_Report_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + (error.message || 'Please try again.'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PDAO_Analytics_Report_${reportData.dateRange.start}_to_${reportData.dateRange.end}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const KPICard = ({ title, value, icon, formatFn = formatNumber }) => (
    <Card sx={{ 
      height: '100%', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
      borderRadius: 2,
      bgcolor: '#FFFFFF',
      border: '1px solid #E0E0E0',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      '&:hover': {
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        transform: 'translateY(-2px)',
        borderColor: '#0b87ac'
      }
    }}>
      <CardContent sx={{ position: 'relative', pb: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#7F8C8D', fontSize: '0.875rem' }}>
            {title}
          </Typography>
          <IconButton size="small" sx={{ p: 0.5, color: '#7F8C8D' }}>
            <InfoIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50' }}>
          {formatFn(value)}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const COLORS = ['#3498DB', '#1ABC9C', '#9B59B6', '#E74C3C', '#F39C12', '#34495E', '#E67E22'];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <Box sx={{ 
        flexGrow: 1, 
        ml: { md: sidebarOpen ? '280px' : '0', xs: 0 },
        transition: 'margin-left 0.3s ease-in-out',
        p: 3
      }}>
        {/* Header & Filters */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50' }}>
            PDAO Analytics Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => setReportDialogOpen(true)}
              sx={{
                bgcolor: '#27AE60',
                '&:hover': { bgcolor: '#229954' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Generate Report
            </Button>
            <IconButton onClick={fetchAnalyticsData} sx={{ color: '#7F8C8D' }}>
              <RefreshIcon />
            </IconButton>
            <IconButton sx={{ color: '#7F8C8D' }}>
              <FullscreenIcon />
            </IconButton>
            <IconButton sx={{ color: '#7F8C8D' }}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filter Row */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Date Range</InputLabel>
            <Select label="Date Range" value={dateRange} onChange={(e)=>setDateRange(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
              <MenuItem value="quarter">Last 90 Days</MenuItem>
              <MenuItem value="year">Last 12 Months</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Barangays</InputLabel>
            <Select
              multiple
              label="Barangays"
              value={selectedBarangays}
              onChange={(e) => {
                const value = e.target.value;
                // Filter out "All Barangays" if it was added
                const filteredValue = value.filter(v => v !== 'All Barangays');
                
                // If clicked on "All Barangays" toggle option
                if (value.includes('All Barangays') && !filteredValue.includes('All Barangays')) {
                  if (selectedBarangays.length === ALL_BARANGAYS.length) {
                    setSelectedBarangays([]);
                  } else {
                    setSelectedBarangays(ALL_BARANGAYS);
                  }
                } else {
                  // If all barangays are selected, keep all; otherwise use filtered selection
                  if (filteredValue.length === ALL_BARANGAYS.length) {
                    setSelectedBarangays(ALL_BARANGAYS);
                  } else {
                    setSelectedBarangays(filteredValue);
                  }
                }
              }}
              renderValue={(selected) => {
                if (selected.length === 0) return 'None selected';
                if (selected.length === ALL_BARANGAYS.length) return 'All Barangays';
                if (selected.length > 3) return `${selected.length} barangays selected`;
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 250,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
              }}
            >
              <MenuItem 
                value="All Barangays"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedBarangays.length === ALL_BARANGAYS.length) {
                    setSelectedBarangays([]);
                  } else {
                    setSelectedBarangays(ALL_BARANGAYS);
                  }
                }}
              >
                <Checkbox checked={selectedBarangays.length === ALL_BARANGAYS.length} />
                <ListItemText primary="All Barangays" />
              </MenuItem>
              {(uniqueBarangays || []).map(b => (
                <MenuItem key={b} value={b}>
                  <Checkbox checked={selectedBarangays.includes(b)} />
                  <ListItemText primary={b} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Disability Types</InputLabel>
            <Select
              multiple
              label="Disability Types"
              value={selectedDisabilities}
              onChange={(e)=>setSelectedDisabilities(e.target.value)}
              renderValue={(selected) => {
                if (selected.length === 0) return 'None selected';
                if (selected.length > 3) return `${selected.length} types selected`;
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 280,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
              }}
            >
              {(uniqueDisabilities || []).map(d => (
                <MenuItem key={d} value={d}>
                  <Checkbox checked={selectedDisabilities.includes(d)} />
                  <ListItemText primary={d} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={()=>setFiltersOpen(true)}>Advanced Filters</Button>
          <Button variant="text" onClick={()=>{
            setDateRange('all');
            setSelectedBarangays([]);
            setSelectedDisabilities([]);
            setSelectedBenefitTypes([]);
            setStatusFilters({ pending: true, approved: true });
            setTicketFilters({ open: true, resolved: true });
          }}>Reset Filters</Button>
        </Box>

        {/* Top Row - KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('registrations'); setDetailsOpen(true); }}>
              <KPICard title="Total Registrations" value={kpiData.totalRegistrations} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('pending'); setDetailsOpen(true); }}>
              <KPICard title="Pending Applications" value={kpiData.pendingApplications} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('approved'); setDetailsOpen(true); }}>
              <KPICard title="Approved Applications" value={kpiData.approvedApplications} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('cards'); setDetailsOpen(true); }}>
              <KPICard title="Cards Issued/Renewed" value={kpiData.cardsIssued} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('claimed'); setDetailsOpen(true); }}>
              <KPICard title="Claimed IDs" value={kpiData.claimedIDs} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('renewed'); setDetailsOpen(true); }}>
              <KPICard title="Renewed IDs" value={kpiData.renewedIDs} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('benefits'); setDetailsOpen(true); }}>
              <KPICard title="Benefits Distributed" value={kpiData.benefitsDistributed} />
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <div onClick={()=>{ setDetailType('tickets'); setDetailsOpen(true); }}>
              <KPICard title="Tickets Resolved" value={kpiData.ticketsResolved} />
            </div>
          </Grid>
        </Grid>

        {/* Advanced Filters Modal */}
        <Dialog open={filtersOpen} onClose={()=>setFiltersOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel control={<Checkbox checked={statusFilters.pending} onChange={(e)=>setStatusFilters(s=>({ ...s, pending: e.target.checked }))} />} label="Include Pending Applications" />
              <FormControlLabel control={<Checkbox checked={statusFilters.approved} onChange={(e)=>setStatusFilters(s=>({ ...s, approved: e.target.checked }))} />} label="Include Approved Applications" />
              <FormControlLabel control={<Checkbox checked={ticketFilters.open} onChange={(e)=>setTicketFilters(s=>({ ...s, open: e.target.checked }))} />} label="Include Open Tickets" />
              <FormControlLabel control={<Checkbox checked={ticketFilters.resolved} onChange={(e)=>setTicketFilters(s=>({ ...s, resolved: e.target.checked }))} />} label="Include Resolved Tickets" />

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Benefit Types</InputLabel>
                <Select
                  multiple
                  label="Benefit Types"
                  value={selectedBenefitTypes}
                  onChange={(e)=>setSelectedBenefitTypes(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 250,
                        width: 250,
                      },
                    },
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                  }}
                >
                  {(uniqueBenefitTypes || []).map(t => (
                    <MenuItem key={t} value={t}>
                      <Checkbox checked={selectedBenefitTypes.includes(t)} />
                      <ListItemText primary={t} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setFiltersOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={detailsOpen} onClose={()=>setDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Details - {detailType && detailType.toUpperCase()}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" sx={{ mb: 2 }}>
              The view reflects your current filters. Use the filter bar to refine or broaden the analysis.
            </Typography>
            {detailType === 'registrations' && (
              <Typography variant="body2">Total registrations across selected scope: {kpiData.totalRegistrations.toLocaleString()}.</Typography>
            )}
            {detailType === 'pending' && (
              <Typography variant="body2">Pending applications: {kpiData.pendingApplications.toLocaleString()}.</Typography>
            )}
            {detailType === 'approved' && (
              <Typography variant="body2">Approved applications: {kpiData.approvedApplications.toLocaleString()}.</Typography>
            )}
            {detailType === 'cards' && (
              <Typography variant="body2">Cards issued/renewed: {kpiData.cardsIssued.toLocaleString()}.</Typography>
            )}
            {detailType === 'claimed' && (
              <Typography variant="body2">Claimed IDs: {kpiData.claimedIDs.toLocaleString()}.</Typography>
            )}
            {detailType === 'renewed' && (
              <Typography variant="body2">Renewed IDs: {kpiData.renewedIDs.toLocaleString()}.</Typography>
            )}
            {detailType === 'benefits' && (
              <Typography variant="body2">Benefits distributed entries: {kpiData.benefitsDistributed.toLocaleString()}.</Typography>
            )}
            {detailType === 'tickets' && (
              <Typography variant="body2">Resolved tickets: {kpiData.ticketsResolved.toLocaleString()}.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Detailed Visualization Modal */}
        <Dialog 
          open={!!selectedChart} 
          onClose={() => {
            setSelectedChart(null);
            setComparisonDateRange({ start: null, end: null });
            setComparisonData(null);
            setReportTab(0);
          }} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: '#FFFFFF'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#F8F9FA',
            borderBottom: '2px solid #E0E0E0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssessmentIcon sx={{ color: '#3498DB', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C3E50' }}>
                {selectedChart?.type === 'monthlyRegistrations' && 'Monthly Registrations Analysis'}
                {selectedChart?.type === 'topBarangays' && 'Top Barangays Analysis'}
                {selectedChart?.type === 'monthlyCardIssuance' && 'Monthly Card Issuance Analysis'}
                {selectedChart?.type === 'benefitTypeDistribution' && 'Benefit Type Distribution Analysis'}
                {selectedChart?.type === 'disabilityDistribution' && 'Disability Distribution Analysis'}
                {selectedChart?.type === 'approvalRate' && 'Approval Rate Analysis'}
                {selectedChart?.type === 'resolutionRate' && 'Resolution Rate Analysis'}
              </Typography>
            </Box>
            <IconButton
              onClick={() => {
                setSelectedChart(null);
                setComparisonDateRange({ start: null, end: null });
                setComparisonData(null);
                setReportTab(0);
              }}
              sx={{ color: '#7F8C8D', '&:hover': { bgcolor: '#E0E0E0' } }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            <Tabs 
              value={reportTab} 
              onChange={(e, newValue) => setReportTab(newValue)}
              sx={{ 
                borderBottom: '1px solid #E0E0E0',
                bgcolor: '#F8F9FA',
                px: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#7F8C8D',
                  '&.Mui-selected': {
                    color: '#3498DB'
                  }
                }
              }}
            >
              <Tab label="Visualization" />
              <Tab label="Text Analysis" />
              <Tab label="Report" />
            </Tabs>
            
            {reportTab === 0 && (
              <Box sx={{ p: 3 }}>
                {/* Date Range Comparison */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#F8F9FA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', mb: 1.5 }}>
                    Compare with Date Range
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      type="date"
                      label="Start Date"
                      value={comparisonDateRange.start || ''}
                      onChange={(e) => setComparisonDateRange({ ...comparisonDateRange, start: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ minWidth: 200 }}
                    />
                    <TextField
                      type="date"
                      label="End Date"
                      value={comparisonDateRange.end || ''}
                      onChange={(e) => setComparisonDateRange({ ...comparisonDateRange, end: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ minWidth: 200 }}
                    />
                    {comparisonDateRange.start && comparisonDateRange.end && (
                      <>
                        <Button
                          variant="contained"
                          onClick={async () => {
                            // Generate comparison data
                            const startDate = new Date(comparisonDateRange.start);
                            const endDate = new Date(comparisonDateRange.end);
                            
                            const members = window.__analytics_members || [];
                            const compMembers = members.filter(m => {
                              const regDate = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
                              if (!regDate) return false;
                              const dt = new Date(regDate);
                              return dt >= startDate && dt <= endDate;
                            });
                            
                            if (selectedChart?.type === 'monthlyRegistrations') {
                              const months = [];
                              const monthsDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
                              for (let i = monthsDiff; i >= 0; i--) {
                                const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
                                months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                              }
                              const compData = months.map(month => {
                                const count = compMembers.reduce((acc, m) => {
                                  const d = m?.created_at || m?.createdAt || m?.registration_date || m?.date_registered;
                                  if (d) {
                                    const ds = new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                    if (ds === month) return acc + 1;
                                  }
                                  return acc;
                                }, 0);
                                return { month, registrations: count };
                              });
                              setComparisonData(compData);
                            } else if (selectedChart?.type === 'monthlyCardIssuance') {
                              const months = [];
                              const monthsDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
                              for (let i = monthsDiff; i >= 0; i--) {
                                const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
                                months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                              }
                              const compData = months.map(month => {
                                const count = compMembers.filter(m => {
                                  if (m?.pwd_id || m?.pwd_card_number || m?.card_number) {
                                    const d = m?.pwd_id_generated_at || m?.card_issued_date || m?.card_date || m?.created_at || m?.createdAt;
                                    if (d) {
                                      const ds = new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                      return ds === month;
                                    }
                                  }
                                  return false;
                                }).length;
                                return { month, cards: count };
                              });
                              setComparisonData(compData);
                            }
                          }}
                          size="small"
                          sx={{ bgcolor: '#3498DB', '&:hover': { bgcolor: '#2980B9' } }}
                        >
                          Apply Comparison
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setComparisonDateRange({ start: null, end: null });
                            setComparisonData(null);
                          }}
                          size="small"
                        >
                          Clear Comparison
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>

                {/* Enhanced Chart */}
                <Box sx={{ height: 400, mb: 2 }}>
                  {selectedChart?.type === 'monthlyRegistrations' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData ? selectedChart.data.map((d, idx) => {
                        const compItem = comparisonData[idx];
                        return {
                          month: d.month,
                          current: d.registrations,
                          comparison: compItem ? compItem.registrations : 0
                        };
                      }) : selectedChart.data.map(d => ({ month: d.month, current: d.registrations }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="month" stroke="#7F8C8D" fontSize={12} />
                        <YAxis stroke="#7F8C8D" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="current" fill="#3498DB" radius={[4, 4, 0, 0]} name="Current Period" />
                        {comparisonData && <Bar dataKey="comparison" fill="#1ABC9C" radius={[4, 4, 0, 0]} name="Comparison Period" />}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart?.type === 'topBarangays' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedChart.data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis type="number" stroke="#7F8C8D" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#7F8C8D" fontSize={12} width={120} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3498DB" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart?.type === 'monthlyCardIssuance' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData ? selectedChart.data.map((d, idx) => {
                        const compItem = comparisonData[idx];
                        return {
                          month: d.month,
                          current: d.cards,
                          comparison: compItem ? compItem.cards : 0
                        };
                      }) : selectedChart.data.map(d => ({ month: d.month, current: d.cards }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="month" stroke="#7F8C8D" fontSize={12} />
                        <YAxis stroke="#7F8C8D" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="current" stroke="#1ABC9C" strokeWidth={3} dot={{ fill: '#1ABC9C', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Current Period" />
                        {comparisonData && <Line type="monotone" dataKey="comparison" stroke="#E74C3C" strokeWidth={3} dot={{ fill: '#E74C3C', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Comparison Period" />}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart?.type === 'benefitTypeDistribution' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={selectedChart.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {selectedChart.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart?.type === 'disabilityDistribution' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedChart.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="name" stroke="#7F8C8D" fontSize={12} angle={-45} textAnchor="end" height={100} />
                        <YAxis stroke="#7F8C8D" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#9B59B6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {(selectedChart?.type === 'approvalRate' || selectedChart?.type === 'resolutionRate') && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <GaugeChart 
                          value={selectedChart.data} 
                          title={selectedChart.type === 'approvalRate' ? 'Application Approval Rate' : 'Support Ticket Resolution Rate'} 
                          color={selectedChart.type === 'approvalRate' ? '#1ABC9C' : '#3498DB'} 
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
            
            {reportTab === 1 && (
              <Box sx={{ p: 3 }}>
                {(() => {
                  const { analysis, insights, trends } = generateTextAnalysis(selectedChart?.type, selectedChart?.data, comparisonData);
                  return (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                        Key Metrics
                      </Typography>
                      <Box sx={{ mb: 3 }}>
                        {analysis.map((item, idx) => (
                          <Typography key={idx} variant="body1" sx={{ color: '#34495E', mb: 1, pl: 2, borderLeft: '3px solid #3498DB' }}>
                            • {item}
                          </Typography>
                        ))}
                      </Box>
                      
                      {insights.length > 0 && (
                        <>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2, mt: 3 }}>
                            Insights
                          </Typography>
                          <Box sx={{ mb: 3 }}>
                            {insights.map((item, idx) => (
                              <Box key={idx} sx={{ p: 2, mb: 1.5, bgcolor: '#E8F4FD', borderRadius: 2, borderLeft: '4px solid #3498DB' }}>
                                <Typography variant="body1" sx={{ color: '#2C3E50' }}>
                                  {item}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      )}
                      
                      {trends.length > 0 && (
                        <>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2, mt: 3 }}>
                            Trends
                          </Typography>
                          <Box sx={{ mb: 3 }}>
                            {trends.map((item, idx) => (
                              <Box key={idx} sx={{ p: 2, mb: 1.5, bgcolor: '#FEF5E7', borderRadius: 2, borderLeft: '4px solid #F39C12', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.includes('+') ? <TrendingUpIcon sx={{ color: '#27AE60' }} /> : <TrendingDownIcon sx={{ color: '#E74C3C' }} />}
                                <Typography variant="body1" sx={{ color: '#2C3E50' }}>
                                  {item}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      )}
                    </>
                  );
                })()}
              </Box>
            )}
            
            {reportTab === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                  Detailed Report
                </Typography>
                <Paper sx={{ p: 3, bgcolor: '#F8F9FA', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#7F8C8D', mb: 2 }}>
                    Report generated on: {new Date().toLocaleString()}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" sx={{ color: '#2C3E50', mb: 2 }}>
                    This report provides a comprehensive analysis of the selected visualization. 
                    The data reflects current filters and date range selections.
                  </Typography>
                  {(() => {
                    const { analysis, insights, trends } = generateTextAnalysis(selectedChart?.type, selectedChart?.data, comparisonData);
                    return (
                      <>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2C3E50', mt: 2, mb: 1 }}>
                          Summary
                        </Typography>
                        {analysis.map((item, idx) => (
                          <Typography key={idx} variant="body2" sx={{ color: '#34495E', mb: 0.5, pl: 2 }}>
                            • {item}
                          </Typography>
                        ))}
                      </>
                    );
                  })()}
                </Paper>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 2, bgcolor: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}>
            <Button 
              onClick={() => {
                setSelectedChart(null);
                setComparisonDateRange({ start: null, end: null });
                setComparisonData(null);
                setReportTab(0);
              }}
              variant="contained"
              sx={{ bgcolor: '#3498DB', '&:hover': { bgcolor: '#2980B9' } }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Generation Dialog */}
        <Dialog
          open={reportDialogOpen}
          onClose={() => {
            setReportDialogOpen(false);
            setReportDateRange({ periodType: 'monthly', periodValue: null, start: null, end: null });
            setReportSelectedBarangays([]);
            setReportData(null);
            setPdfBlob(null);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: '#FFFFFF'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#F8F9FA',
            borderBottom: '2px solid #E0E0E0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PictureAsPdfIcon sx={{ color: '#27AE60', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C3E50' }}>
                Generate Analytics Report
              </Typography>
            </Box>
            <IconButton
              onClick={() => {
                setReportDialogOpen(false);
                setReportDateRange({ periodType: 'monthly', periodValue: null, start: null, end: null });
                setReportData(null);
                setPdfBlob(null);
                setSelectedAnalytics({
                  executiveSummary: true,
                  keyInsights: true,
                  monthlyRegistrations: true,
                  topBarangays: true,
                  disabilityDistribution: true,
                  benefitDistribution: true,
                  ticketStatus: true
                });
              }}
              sx={{ color: '#7F8C8D', '&:hover': { bgcolor: '#E0E0E0' } }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {!reportData ? (
              <>
                <Typography variant="body1" sx={{ color: '#2C3E50', mb: 3 }}>
                  Select a period type (weekly, monthly, or annually) for the analytics report. The report will include a complete breakdown of all metrics, 
                  visualizations, and insights for the selected period.
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ p: 2, bgcolor: '#F8F9FA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                      Report Period Selection
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControl fullWidth required>
                        <InputLabel>Period Type</InputLabel>
                        <Select
                          value={reportDateRange.periodType || 'monthly'}
                          onChange={(e) => setReportDateRange({ 
                            ...reportDateRange, 
                            periodType: e.target.value,
                            periodValue: null // Reset period value when type changes
                          })}
                          label="Period Type"
                        >
                          <MenuItem value="weekly">Weekly (by Week Number)</MenuItem>
                          <MenuItem value="monthly">Monthly (by Month and Year)</MenuItem>
                          <MenuItem value="annually">Annually (by Year)</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {reportDateRange.periodType === 'weekly' && (
                        <FormControl fullWidth required>
                          <InputLabel>Week Number</InputLabel>
                          <Select
                            value={reportDateRange.periodValue || ''}
                            onChange={(e) => setReportDateRange({ ...reportDateRange, periodValue: e.target.value })}
                            label="Week Number"
                          >
                            {Array.from({ length: 52 }, (_, i) => {
                              const week = i + 1;
                              const year = new Date().getFullYear();
                              const jan1 = new Date(year, 0, 1);
                              const dayOfWeek = jan1.getDay();
                              const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
                              const firstMonday = new Date(jan1);
                              firstMonday.setDate(jan1.getDate() + daysToMonday);
                              const weekStart = new Date(firstMonday);
                              weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
                              const weekEnd = new Date(weekStart);
                              weekEnd.setDate(weekStart.getDate() + 6);
                              return (
                                <MenuItem key={week} value={week.toString()}>
                                  Week {week} ({weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      )}
                      
                      {reportDateRange.periodType === 'monthly' && (
                        <TextField
                          type="month"
                          label="Month and Year"
                          value={reportDateRange.periodValue || ''}
                          onChange={(e) => setReportDateRange({ ...reportDateRange, periodValue: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          required
                        />
                      )}
                      
                      {reportDateRange.periodType === 'annually' && (
                        <TextField
                          type="number"
                          label="Year"
                          value={reportDateRange.periodValue || ''}
                          onChange={(e) => setReportDateRange({ ...reportDateRange, periodValue: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          required
                          inputProps={{
                            min: 2020,
                            max: new Date().getFullYear() + 1
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                  
                  {/* Barangay Selection */}
                  <Box sx={{ p: 2, bgcolor: '#F8F9FA', borderRadius: 2, border: '1px solid #DEE2E6', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', mb: 1.5 }}>
                      Filter by Barangay (Optional):
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mb: 1.5 }}>
                      Select specific barangays to include in the report. Leave empty to include all barangays.
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel>Barangays</InputLabel>
                      <Select
                        multiple
                        label="Barangays"
                        value={reportSelectedBarangays}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Filter out "All Barangays" if it was added
                          const filteredValue = value.filter(v => v !== 'All Barangays');
                          
                          // If clicked on "All Barangays" toggle option
                          if (value.includes('All Barangays') && !filteredValue.includes('All Barangays')) {
                            if (reportSelectedBarangays.length === ALL_BARANGAYS.length) {
                              setReportSelectedBarangays([]);
                            } else {
                              setReportSelectedBarangays(ALL_BARANGAYS);
                            }
                          } else {
                            // If all barangays are selected, keep all; otherwise use filtered selection
                            if (filteredValue.length === ALL_BARANGAYS.length) {
                              setReportSelectedBarangays(ALL_BARANGAYS);
                            } else {
                              setReportSelectedBarangays(filteredValue);
                            }
                          }
                        }}
                        renderValue={(selected) => {
                          if (selected.length === 0) return 'All Barangays';
                          if (selected.length === ALL_BARANGAYS.length) return 'All Barangays';
                          if (selected.length > 3) return `${selected.length} barangays selected`;
                          return selected.join(', ');
                        }}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300
                            }
                          }
                        }}
                      >
                        <MenuItem
                          value="All Barangays"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (reportSelectedBarangays.length === ALL_BARANGAYS.length) {
                              setReportSelectedBarangays([]);
                            } else {
                              setReportSelectedBarangays(ALL_BARANGAYS);
                            }
                          }}
                        >
                          <Checkbox checked={reportSelectedBarangays.length === ALL_BARANGAYS.length} />
                          <ListItemText primary="All Barangays" />
                        </MenuItem>
                        {(uniqueBarangays || []).map(b => (
                          <MenuItem key={b} value={b}>
                            <Checkbox checked={reportSelectedBarangays.includes(b)} />
                            <ListItemText primary={b} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ p: 2, bgcolor: '#E8F4FD', borderRadius: 2, border: '1px solid #3498DB' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                      Select Analytics to Include:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.executiveSummary}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, executiveSummary: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Executive Summary with all KPIs
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                A comprehensive overview of all key performance indicators including total registrations, pending applications, approved applications, cards issued, claimed IDs, renewed IDs, benefits distributed, and tickets resolved. Provides a high-level snapshot of system performance.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.keyInsights}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, keyInsights: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Key Insights
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Important findings and patterns identified from the data analysis, including top performing barangays, registration trends, and significant changes in metrics. Helps identify areas of success and opportunities for improvement.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.monthlyRegistrations}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, monthlyRegistrations: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Monthly Registrations Breakdown
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Detailed monthly breakdown of PWD member registrations showing trends over time. Includes a visual chart displaying registration patterns, peak months, and growth trends to help understand registration dynamics.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.topBarangays}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, topBarangays: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Top 10 Barangays by Registrations
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Ranking of the top 10 barangays with the highest number of PWD member registrations. Includes registration counts and percentages to identify areas with the most active PWD community engagement.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.disabilityDistribution}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, disabilityDistribution: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Disability Type Distribution
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Visual breakdown of PWD members by disability type, showing the distribution and percentage of each disability category. Helps understand the composition of the PWD community and plan targeted support services.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.benefitDistribution}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, benefitDistribution: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Benefit Type Distribution
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Analysis of benefits distributed by type, showing which benefit programs are most utilized. Includes counts and percentages for each benefit category to help assess program effectiveness and resource allocation.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      
                      <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #BDC3C7' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAnalytics.ticketStatus}
                              onChange={(e) => setSelectedAnalytics({ ...selectedAnalytics, ticketStatus: e.target.checked })}
                              sx={{ color: '#3498DB', '&.Mui-checked': { color: '#3498DB' } }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                                Ticket Status Breakdown
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mt: 0.5 }}>
                                Overview of support ticket statuses including open, in-progress, and resolved tickets. Provides insights into support service efficiency, response times, and resolution rates to help improve customer service quality.
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #BDC3C7' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedAnalytics({
                            executiveSummary: true,
                            keyInsights: true,
                            monthlyRegistrations: true,
                            topBarangays: true,
                            disabilityDistribution: true,
                            benefitDistribution: true,
                            ticketStatus: true
                          });
                        }}
                        sx={{ mr: 1, textTransform: 'none' }}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedAnalytics({
                            executiveSummary: false,
                            keyInsights: false,
                            monthlyRegistrations: false,
                            topBarangays: false,
                            disabilityDistribution: false,
                            benefitDistribution: false,
                            ticketStatus: false
                          });
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Deselect All
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </>
            ) : (
              <Box>
                <Box sx={{ p: 2, bgcolor: '#E8F5E8', borderRadius: 2, border: '1px solid #27AE60', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#27AE60', mb: 1 }}>
                    Report Generated Successfully!
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2C3E50' }}>
                    Generated on: {new Date(reportData.generatedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2C3E50' }}>
                    Date Range: {reportData.dateRange.start} to {reportData.dateRange.end}
                  </Typography>
                  {reportData.selectedBarangays && reportData.selectedBarangays.length > 0 && (
                    <Typography variant="body2" sx={{ color: '#2C3E50', mt: 0.5 }}>
                      Barangays: {reportData.selectedBarangays.length === ALL_BARANGAYS.length 
                        ? 'All Barangays' 
                        : reportData.selectedBarangays.length > 3 
                          ? `${reportData.selectedBarangays.length} barangays selected`
                          : reportData.selectedBarangays.join(', ')}
                    </Typography>
                  )}
                  {(!reportData.selectedBarangays || reportData.selectedBarangays.length === 0) && (
                    <Typography variant="body2" sx={{ color: '#2C3E50', mt: 0.5 }}>
                      Barangays: All Barangays
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 2, bgcolor: '#F8F9FA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                    Executive Summary
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Total Registrations</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C3E50' }}>
                          {reportData.summary.totalRegistrations.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Approved Applications</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#27AE60' }}>
                          {reportData.summary.approvedApplications.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Claimed IDs</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#3498DB' }}>
                          {reportData.summary.claimedIDs.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Renewed IDs</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#9B59B6' }}>
                          {reportData.summary.renewedIDs.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Benefits Distributed</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F39C12' }}>
                          {reportData.summary.benefitsDistributed.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#7F8C8D' }}>Tickets Resolved</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#E74C3C' }}>
                          {reportData.summary.ticketsResolved.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                    Key Insights
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#34495E', pl: 2, borderLeft: '3px solid #3498DB' }}>
                      • Top Barangay: <strong>{reportData.insights.topBarangay.name}</strong> ({reportData.insights.topBarangay.value} registrations)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#34495E', pl: 2, borderLeft: '3px solid #1ABC9C' }}>
                      • Top Disability Type: <strong>{reportData.insights.topDisability.name}</strong> ({reportData.insights.topDisability.value} members)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#34495E', pl: 2, borderLeft: '3px solid #F39C12' }}>
                      • Top Benefit Type: <strong>{reportData.insights.topBenefit.name}</strong> ({reportData.insights.topBenefit.value} benefits)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#34495E', pl: 2, borderLeft: '3px solid #9B59B6' }}>
                      • Peak Registration Month: <strong>{reportData.insights.peakMonth.month}</strong> ({reportData.insights.peakMonth.registrations} registrations)
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                    Breakdown Details
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', mb: 1 }}>
                      Top Barangays:
                    </Typography>
                    {reportData.breakdowns.topBarangays.slice(0, 5).map((b, idx) => (
                      <Typography key={idx} variant="body2" sx={{ color: '#34495E', pl: 2 }}>
                        {idx + 1}. {b.name}: {b.value.toLocaleString()}
                      </Typography>
                    ))}
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2C3E50', mb: 1 }}>
                      Monthly Registrations:
                    </Typography>
                    {reportData.breakdowns.monthlyRegistrations.slice(-6).map((m, idx) => (
                      <Typography key={idx} variant="body2" sx={{ color: '#34495E', pl: 2 }}>
                        {m.month}: {m.registrations.toLocaleString()}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* PDF Preview Section */}
            {pdfBlob && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2C3E50', mb: 2 }}>
                  PDF Preview
                </Typography>
                <Box sx={{ 
                  border: '2px solid #E0E0E0', 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  bgcolor: '#FFFFFF'
                }}>
                  <iframe
                    src={URL.createObjectURL(pdfBlob)}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none'
                    }}
                    title="PDF Preview"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    onClick={handleDownloadPDF}
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    sx={{ bgcolor: '#E74C3C', '&:hover': { bgcolor: '#C0392B' } }}
                  >
                    Download PDF
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 2, bgcolor: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}>
            {!reportData ? (
              <>
                <Button
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportDateRange({ periodType: 'monthly', periodValue: null, start: null, end: null });
                  }}
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  variant="contained"
                  disabled={!reportDateRange.periodType || !reportDateRange.periodValue || generatingReport}
                  startIcon={generatingReport ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                  sx={{ bgcolor: '#27AE60', '&:hover': { bgcolor: '#229954' } }}
                >
                  {generatingReport ? 'Generating...' : 'Generate Report'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setReportDateRange({ periodType: 'monthly', periodValue: null, start: null, end: null });
                    setReportData(null);
                    setPdfBlob(null);
                  }}
                  variant="outlined"
                >
                  Generate New Report
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{ borderColor: '#3498DB', color: '#3498DB', '&:hover': { borderColor: '#2980B9', bgcolor: 'rgba(52, 152, 219, 0.1)' } }}
                >
                  Download TXT
                </Button>
                <Button
                  onClick={generatePDFReport}
                  variant="contained"
                  disabled={generatingPDF || Object.values(selectedAnalytics).every(v => !v)}
                  startIcon={generatingPDF ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                  sx={{ bgcolor: '#E74C3C', '&:hover': { bgcolor: '#C0392B' } }}
                >
                  {generatingPDF ? 'Generating PDF...' : 'Generate PDF'}
                </Button>
                <Button
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportDateRange({ periodType: 'monthly', periodValue: null, start: null, end: null });
                    setReportData(null);
                    setPdfBlob(null);
                  }}
                  variant="contained"
                  sx={{ bgcolor: '#7F8C8D', '&:hover': { bgcolor: '#566573' } }}
                >
                  Close
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Middle Row - Charts and Gauges */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Monthly Registrations Chart */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'monthlyRegistrations', data: monthlyRegistrations })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#3498DB'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
                Monthly Registrations
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyRegistrations} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="month" stroke="#7F8C8D" fontSize={12} />
                  <YAxis stroke="#7F8C8D" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="registrations" fill="#3498DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Approval Rate Gauge */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'approvalRate', data: approvalRate })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#1ABC9C'
                }
              }}
            >
              <GaugeChart value={approvalRate} title="Application Approval Rate" color="#1ABC9C" />
            </Paper>
          </Grid>

          {/* Resolution Rate Gauge */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'resolutionRate', data: resolutionRate })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#3498DB'
                }
              }}
            >
              <GaugeChart value={resolutionRate} title="Support Ticket Resolution Rate" color="#3498DB" />
            </Paper>
          </Grid>
        </Grid>

        {/* Bottom Row - Charts */}
        <Grid container spacing={2}>
          {/* Top 5 Barangays by Registrations */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'topBarangays', data: topBarangays })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#3498DB'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
                Top 5 Barangays by Registrations
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={topBarangays} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis type="number" stroke="#7F8C8D" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#7F8C8D" fontSize={12} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3498DB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Monthly Card Issuance */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'monthlyCardIssuance', data: monthlyCardIssuance })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#1ABC9C'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
                Monthly Card Issuance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCardIssuance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="month" stroke="#7F8C8D" fontSize={12} />
                  <YAxis stroke="#7F8C8D" fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cards" 
                    stroke="#1ABC9C" 
                    strokeWidth={3}
                    dot={{ fill: '#1ABC9C', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Benefit Type Distribution */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'benefitTypeDistribution', data: benefitTypeDistribution })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#9B59B6'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
                Benefit Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={benefitTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {benefitTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Additional Row - Disability Distribution */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper 
              onClick={() => setSelectedChart({ type: 'disabilityDistribution', data: disabilityDistribution })}
              sx={{ 
                p: 2, 
                height: '100%', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderRadius: 2, 
                bgcolor: '#FFFFFF', 
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  borderColor: '#9B59B6'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '0.95rem' }}>
                Disability Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={disabilityDistribution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="name" stroke="#7F8C8D" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#7F8C8D" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9B59B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Analytics;
