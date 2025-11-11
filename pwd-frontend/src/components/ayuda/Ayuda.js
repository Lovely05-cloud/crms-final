import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress
} from '@mui/material';
import toastService from '../../services/toastService';
import {
  VolunteerActivism,
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Schedule,
  Warning,
  AttachMoney,
  People,
  LocalShipping,
  Print,
  PendingActions,
  Upload,
  Description,
  Approval,
  PictureAsPdf,
  Menu as MenuIcon
} from '@mui/icons-material';
import AdminSidebar from '../shared/AdminSidebar';
import Staff2Sidebar from '../shared/Staff2Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import pwdMemberService from '../../services/pwdMemberService';
import benefitService from '../../services/benefitService';
import announcementService from '../../services/announcementService';

const Ayuda = () => {
  const { currentUser } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPendingSchedule, setSelectedPendingSchedule] = useState(null);
  const [approvalFile, setApprovalFile] = useState(null);
  const [openApprovalDialog, setOpenApprovalDialog] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [loadingEligibleMembers, setLoadingEligibleMembers] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [approvingSchedule, setApprovingSchedule] = useState(false);

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

  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
    targetRecipients: '',
    distributionDate: '',
    expiryDate: '',
    birthdayMonth: '',
    barangay: '',
    selectedBarangays: [], // For Financial Assistance - multiple barangays
    quarter: '',
    quarterly: '',
    status: 'Active'
  });

  const distributionHistory = [];


  const handleStatusChange = async (benefitId, newStatus) => {
    try {
      const updatedBenefits = benefits.map(benefit => 
        benefit.id === benefitId ? { ...benefit, status: newStatus } : benefit
      );
      setBenefits(updatedBenefits);
      
      // Update in localStorage
      localStorage.setItem('benefits', JSON.stringify(updatedBenefits));
      
      // Update in database if using benefitService
      try {
        await benefitService.update(benefitId, { status: newStatus });
      } catch (dbError) {
        console.warn('Failed to update benefit status in database:', dbError);
        // Continue with localStorage update
      }
    } catch (error) {
      console.error('Error updating benefit status:', error);
    }
  };

  const handleOpenDialog = (benefit = null) => {
    if (benefit) {
      setEditingBenefit(benefit);
      setFormData({
        ...benefit
      });
    } else {
      setEditingBenefit(null);
      setFormData({
        type: '',
        amount: '',
        description: '',
        targetRecipients: '',
        distributionDate: '',
        expiryDate: '',
        birthdayMonth: '',
        barangay: '',
        selectedBarangays: [], // For Financial Assistance - multiple barangays
        quarter: '',
        quarterly: '',
        status: 'Active'
      });
    }
    setOpenDialog(true);
  };

  // Load benefits from database and pending schedules from localStorage when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load benefits from database
        const benefitsData = await benefitService.getAll();
        console.log('Loading benefits from database:', benefitsData);
        if (benefitsData && Array.isArray(benefitsData)) {
          setBenefits(benefitsData);
        } else {
          setBenefits([]);
        }

        // Load pending schedules from localStorage (for now)
        const savedPendingSchedules = localStorage.getItem('pendingSchedules');
        console.log('Loading pending schedules from localStorage:', savedPendingSchedules);
        if (savedPendingSchedules && savedPendingSchedules !== 'null' && savedPendingSchedules !== 'undefined') {
          const parsedPendingSchedules = JSON.parse(savedPendingSchedules);
          console.log('Parsed pending schedules:', parsedPendingSchedules);
          if (Array.isArray(parsedPendingSchedules)) {
            setPendingSchedules(parsedPendingSchedules);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage for benefits if database fails
        try {
          const savedBenefits = localStorage.getItem('benefits');
          if (savedBenefits && savedBenefits !== 'null' && savedBenefits !== 'undefined') {
            const parsedBenefits = JSON.parse(savedBenefits);
            if (Array.isArray(parsedBenefits)) {
              setBenefits(parsedBenefits);
            }
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
          setBenefits([]);
        }
        setPendingSchedules([]);
      }
    };
    
    loadData();
  }, []);

  // Effect to fetch eligible members when benefit type, month/quarter, and barangay change
  useEffect(() => {
    if (formData.type === 'Financial Assistance' && formData.selectedBarangays.length > 0) {
      fetchEligibleMembers('Financial Assistance', null, formData.selectedBarangays);
    } else if (formData.type === 'Birthday Cash Gift' && formData.birthdayMonth) {
      // For Birthday Cash Gift, allow selecting multiple barangays via checkboxes
      fetchEligibleMembers('Birthday Cash Gift', formData.birthdayMonth, formData.selectedBarangays);
    } else {
      setEligibleMembers([]);
    }
  }, [formData.type, formData.birthdayMonth, formData.barangay, formData.selectedBarangays]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBenefit(null);
  };

  const handleBarangaySelection = (barangay) => {
    if (formData.type === 'Financial Assistance' || formData.type === 'Birthday Cash Gift') {
      const updatedBarangays = formData.selectedBarangays.includes(barangay)
        ? formData.selectedBarangays.filter(b => b !== barangay)
        : [...formData.selectedBarangays, barangay];
      setFormData({ ...formData, selectedBarangays: updatedBarangays });
    } else {
      setFormData({ ...formData, barangay });
    }
  };

  const handleDeleteBenefit = async (benefitId) => {
    toastService.confirm(
      'Delete Benefit Program',
      'Are you sure you want to delete this benefit program? This action cannot be undone.',
      async () => {
        try {
          await benefitService.delete(benefitId);
          const updatedBenefits = benefits.filter(benefit => benefit.id !== benefitId);
          setBenefits(updatedBenefits);
          // Also update localStorage for backward compatibility
          localStorage.setItem('benefits', JSON.stringify(updatedBenefits));
          toastService.success('Benefit program deleted successfully!');
        } catch (error) {
          console.error('Error deleting benefit:', error);
          toastService.error('Failed to delete benefit program: ' + (error.message || 'Unknown error'));
        }
      }
    );
  };

  const handleDeletePendingSchedule = async (scheduleId) => {
    toastService.confirm(
      'Delete Pending Schedule',
      'Are you sure you want to delete this pending schedule? This action cannot be undone.',
      async () => {
        try {
          // For pending schedules, we'll delete from localStorage for now
          // In the future, you might want to create a separate table for pending schedules
          const updatedPendingSchedules = pendingSchedules.filter(schedule => schedule.id !== scheduleId);
          setPendingSchedules(updatedPendingSchedules);
          localStorage.setItem('pendingSchedules', JSON.stringify(updatedPendingSchedules));
          toastService.success('Pending schedule deleted successfully!');
        } catch (error) {
          console.error('Error deleting pending schedule:', error);
          toastService.error('Failed to delete pending schedule: ' + (error.message || 'Unknown error'));
        }
      }
    );
  };

  const handleSubmit = async () => {
    // Validate distribution date
    if (formData.distributionDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight for comparison
      const selectedDistributionDate = new Date(formData.distributionDate);
      selectedDistributionDate.setHours(0, 0, 0, 0); // Set to midnight
      
      if (selectedDistributionDate < today) {
        toastService.error('Distribution date cannot be in the past. Please select today or a future date.');
        return;
      }
    }
    
    // Validate expiry date
    if (formData.expiryDate) {
      const today = new Date();
      const selectedExpiryDate = new Date(formData.expiryDate);
      
      if (selectedExpiryDate <= today) {
        toastService.error('Expiry date must be at least tomorrow. Please select a future date.');
        return;
      }
    }
    
    if (editingBenefit) {
      // Update existing benefit
      try {
        // Format distribution date to include time (12:00 AM)
        const updateData = {
          ...formData,
          distributionDate: formData.distributionDate ? (() => {
            const dateObj = new Date(formData.distributionDate);
            dateObj.setHours(0, 0, 0, 0); // Set to 12:00 AM
            return dateObj.toISOString();
          })() : formData.distributionDate
        };
        await benefitService.update(editingBenefit.id, updateData);
        const updatedBenefits = benefits.map(benefit => 
          benefit.id === editingBenefit.id 
            ? { 
                ...benefit, 
                type: formData.type,
                amount: formData.amount,
                description: formData.description,
                targetRecipients: formData.targetRecipients,
                distributionDate: updateData.distributionDate,
                expiryDate: formData.expiryDate,
                barangay: formData.barangay,
                selectedBarangays: formData.selectedBarangays,
                quarter: formData.quarter,
                quarterly: formData.quarterly,
                status: formData.status
              }
            : benefit
        );
        setBenefits(updatedBenefits);
        // Save to localStorage for BenefitTracking to access
        localStorage.setItem('benefits', JSON.stringify(updatedBenefits));
        toastService.success('Benefit program updated successfully!');
      } catch (error) {
        console.error('Error updating benefit:', error);
        toastService.error('Failed to update benefit program: ' + (error.message || 'Unknown error'));
      }
    } else {
      // Add new benefit to pending schedules
      try {
        // Check if there are eligible members and generate PDF first
        if (eligibleMembers.length > 0) {
          const confirmGeneratePDF = await toastService.confirmAsync(
            'Generate PDF for Eligible Members',
            `This benefit program has ${eligibleMembers.length} eligible members. A PDF with the eligible members list and signature spaces will be generated. You must print this PDF and get signatures from the Head of PDAO Office, Barangay President, and Mayor before the program can be approved. Do you want to continue?`
          );
          
          if (!confirmGeneratePDF) {
            return; // User cancelled, don't proceed with submission
          }
          
          // Generate PDF automatically
          await generateEligibleMembersPDF();
        }
        
        // Format distribution date to include time (12:00 AM)
        let formattedDistributionDate = formData.distributionDate;
        if (formData.distributionDate) {
          const dateObj = new Date(formData.distributionDate);
          dateObj.setHours(0, 0, 0, 0); // Set to 12:00 AM
          formattedDistributionDate = dateObj.toISOString();
        }
        
        const newPendingSchedule = {
          id: pendingSchedules.length > 0 ? Math.max(...pendingSchedules.map(p => p.id), 0) + 1 : 1,
          name: formData.type, // Use type as name for backward compatibility
          type: formData.type,
          amount: formData.amount,
          description: formData.description,
          targetRecipients: formData.targetRecipients,
          distributionDate: formattedDistributionDate,
          expiryDate: formData.expiryDate,
          barangay: formData.barangay,
          selectedBarangays: formData.selectedBarangays,
          quarter: formData.quarter,
          quarterly: formData.quarterly,
          status: 'Pending Approval',
          distributed: 0,
          pending: 0,
          color: getColorForType(formData.type),
          birthdayMonth: formData.birthdayMonth,
          submittedDate: new Date().toISOString(),
          approvalFile: null
        };
        const updatedPendingSchedules = [...pendingSchedules, newPendingSchedule];
        setPendingSchedules(updatedPendingSchedules);
        // Save to localStorage
        localStorage.setItem('pendingSchedules', JSON.stringify(updatedPendingSchedules));
        
        if (eligibleMembers.length > 0) {
          toastService.success('Benefit program submitted for approval! Please print the generated PDF and get the required signatures before the program can be approved.');
        } else {
          toastService.success('Benefit program submitted for approval!');
        }
      } catch (error) {
        console.error('Error creating benefit:', error);
        toastService.error('Failed to create benefit program: ' + (error.message || 'Unknown error'));
      }
    }
    handleCloseDialog();
  };

  // Create announcement for approved benefit
  const createBenefitAnnouncement = async (benefit) => {
    try {
      // Format dates for announcement
      const distributionDate = benefit.distributionDate 
        ? new Date(benefit.distributionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      // Use expiry date if available, otherwise set to 1 year from distribution date
      let expiryDate = benefit.expiryDate 
        ? new Date(benefit.expiryDate).toISOString().split('T')[0]
        : null;
      
      if (!expiryDate) {
        const oneYearLater = new Date(distributionDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        expiryDate = oneYearLater.toISOString().split('T')[0];
      }

      // Build announcement content
      let announcementContent = `${benefit.description || 'A new benefit program is now available for claiming.'}\n\n`;
      announcementContent += `Benefit Type: ${benefit.type}\n`;
      announcementContent += `Amount: ${benefit.amount}\n\n`;
      
      // Add eligibility criteria
      if (benefit.type === 'Financial Assistance' && benefit.selectedBarangays && benefit.selectedBarangays.length > 0) {
        announcementContent += `Eligibility: This benefit is available for PWD members from the following barangays: ${benefit.selectedBarangays.join(', ')}.\n\n`;
      } else if (benefit.type === 'Birthday Cash Gift' && benefit.birthdayMonth) {
        const quarterName = getQuarterName(benefit.birthdayMonth);
        announcementContent += `Eligibility: This benefit is available for PWD members with birthdays in ${quarterName}.\n`;
        if (benefit.selectedBarangays && benefit.selectedBarangays.length > 0) {
          announcementContent += `Additionally, members must be from the following barangays: ${benefit.selectedBarangays.join(', ')}.\n\n`;
        } else {
          announcementContent += '\n';
        }
      } else if (benefit.barangay && benefit.barangay !== 'All Barangays') {
        announcementContent += `Eligibility: This benefit is available for PWD members from ${benefit.barangay}.\n\n`;
      } else {
        announcementContent += `Eligibility: This benefit is available for all eligible PWD members.\n\n`;
      }

      announcementContent += `Available for claiming from ${formatDateMMDDYYYY(distributionDate)} to ${expiryDate ? formatDateMMDDYYYY(expiryDate) : 'until further notice'}.\n\n`;
      announcementContent += `Please visit the PDAO office or use the QR code scanning feature to claim your benefit.`;

      // Determine target audience and create announcements
      const announcementsToCreate = [];

      if (benefit.type === 'Financial Assistance' && benefit.selectedBarangays && benefit.selectedBarangays.length > 0) {
        // Create one announcement per barangay for Financial Assistance
        for (const barangay of benefit.selectedBarangays) {
          announcementsToCreate.push({
            title: `New Benefit Available: ${benefit.type}`,
            content: announcementContent,
            type: 'Event',
            priority: 'High',
            targetAudience: barangay, // Target specific barangay
            status: 'Active',
            publishDate: distributionDate,
            expiryDate: expiryDate
          });
        }
      } else if (benefit.type === 'Birthday Cash Gift') {
        // For Birthday Cash Gift, use "PWD Members" as target audience
        // The eligibility criteria (quarter) is included in the content
        announcementsToCreate.push({
          title: `New Benefit Available: ${benefit.type}`,
          content: announcementContent,
          type: 'Event',
          priority: 'High',
          targetAudience: 'PWD Members', // All PWD members (eligibility in content)
          status: 'Active',
          publishDate: distributionDate,
          expiryDate: expiryDate || distributionDate
        });
      } else if (benefit.barangay && benefit.barangay !== 'All Barangays') {
        // Single barangay benefit
        announcementsToCreate.push({
          title: `New Benefit Available: ${benefit.type}`,
          content: announcementContent,
          type: 'Event',
          priority: 'High',
          targetAudience: benefit.barangay,
          status: 'Active',
          publishDate: distributionDate,
          expiryDate: expiryDate || distributionDate
        });
      } else {
        // All PWD members
        announcementsToCreate.push({
          title: `New Benefit Available: ${benefit.type}`,
          content: announcementContent,
          type: 'Event',
          priority: 'High',
          targetAudience: 'PWD Members',
          status: 'Active',
          publishDate: distributionDate,
          expiryDate: expiryDate || distributionDate
        });
      }

      // Create all announcements
      for (const announcementData of announcementsToCreate) {
        try {
          await announcementService.create(announcementData);
          console.log('Announcement created successfully:', announcementData.title);
        } catch (announcementError) {
          console.error('Error creating announcement:', announcementError);
          // Continue creating other announcements even if one fails
        }
      }

      return announcementsToCreate.length;
    } catch (error) {
      console.error('Error creating benefit announcement:', error);
      throw error;
    }
  };

  const handleApproveSchedule = async () => {
    if (!approvalFile) {
      toastService.warning('Please upload the signed letter of approval from the mayor first.');
      return;
    }

    if (selectedPendingSchedule) {
      try {
        console.log('Starting approval process...');
        setApprovingSchedule(true);
        console.log('Loading state set to true');
        
        // Create the approved benefit in the database
        const approvedBenefitData = {
          ...selectedPendingSchedule,
          status: 'Active',
          approvalFile: approvalFile.name,
          approvedDate: new Date().toISOString()
        };

        console.log('Creating benefit in database...');
        // Save to database
        const savedBenefit = await benefitService.create(approvedBenefitData);
        console.log('Benefit created successfully:', savedBenefit);
        
        // Add to active benefits with the database ID
        const approvedBenefit = {
          ...approvedBenefitData,
          id: savedBenefit.id || savedBenefit.benefitID || (benefits.length > 0 ? Math.max(...benefits.map(b => b.id), 0) + 1 : 1)
        };

        const updatedBenefits = [...benefits, approvedBenefit];
        setBenefits(updatedBenefits);
        localStorage.setItem('benefits', JSON.stringify(updatedBenefits));

        // Remove from pending schedules
        const updatedPendingSchedules = pendingSchedules.filter(p => p.id !== selectedPendingSchedule.id);
        setPendingSchedules(updatedPendingSchedules);
        localStorage.setItem('pendingSchedules', JSON.stringify(updatedPendingSchedules));

        // Create announcement for the approved benefit
        try {
          const announcementCount = await createBenefitAnnouncement(approvedBenefit);
          console.log(`Created ${announcementCount} announcement(s) for the benefit program.`);
        } catch (announcementError) {
          console.error('Error creating announcement:', announcementError);
          // Don't fail the approval if announcement creation fails
          toastService.warning('Benefit approved, but failed to create announcement. Please create it manually.');
        }

        // Close dialogs and reset
        setOpenApprovalDialog(false);
        setSelectedPendingSchedule(null);
        setApprovalFile(null);
        
        toastService.success('Benefit program approved and saved to database successfully!');
        console.log('Approval process completed successfully');
      } catch (error) {
        console.error('Error approving schedule:', error);
        toastService.error('Failed to approve benefit program: ' + (error.message || 'Unknown error'));
      } finally {
        console.log('Resetting loading state');
        setApprovingSchedule(false);
      }
    } else {
      console.warn('No selectedPendingSchedule found');
    }
  };

  // Maximum file size: 2MB
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setApprovalFile(null);
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toastService.error(`File size (${fileSizeMB}MB) exceeds the maximum limit of 2MB. Please select a smaller file.`);
      setApprovalFile(null);
      return;
    }

    // Check if it's an image or PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.type)) {
      setApprovalFile(file);
    } else {
      toastService.warning('Please upload only image files (JPG, PNG) or PDF files.');
      setApprovalFile(null);
    }
  };

  const generateEligibleMembersPDF = async () => {
    if (eligibleMembers.length === 0) {
      toastService.warning('No eligible members to generate PDF for.');
      return;
    }

    try {
      setGeneratingPDF(true);
      
      // Debug: Log the eligible members being used for PDF
      console.log('Generating PDF for eligible members:', eligibleMembers);
      console.log('Number of eligible members:', eligibleMembers.length);
      
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('portrait', 'mm', 'a4');
      
      // Add header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CABUYAO PDAO RMS', 20, 20);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Eligible Members List for Benefit Program', 20, 30);
      
      // Add benefit program details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Program: ${formData.type}`, 20, 45);
      doc.text(`Type: ${formData.type}`, 20, 52);
      doc.text(`Amount: ${formData.amount}`, 20, 59);
      if ((formData.type === 'Financial Assistance' || formData.type === 'Birthday Cash Gift') && formData.selectedBarangays.length > 0) {
        doc.text(`Barangays: ${formData.selectedBarangays.join(', ')}`, 20, 66);
      } else {
        doc.text(`Barangay: ${formData.barangay || 'All Barangays'}`, 20, 66);
      }
      
      if (formData.type === 'Birthday Cash Gift' && formData.birthdayMonth) {
        doc.text(`Birthday Quarter: ${getQuarterName(formData.birthdayMonth)}`, 20, 73);
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${formatDateMMDDYYYY(new Date().toISOString())}`, 20, 85);
      doc.text(`Total Eligible Members: ${eligibleMembers.length}`, 20, 92);
      
       // Prepare table data - ensure we're using the current eligibleMembers
       const tableData = eligibleMembers.map((member, index) => [
         index + 1,
         member.pwd_id || (member.userID ? `PWD-${member.userID}` : 'Not assigned'),
         (() => {
           const parts = [];
           if (member.firstName) parts.push(member.firstName);
           if (member.middleName && member.middleName.trim().toUpperCase() !== 'N/A') parts.push(member.middleName);
           if (member.lastName) parts.push(member.lastName);
           return parts.join(' ').trim() || 'Name not provided';
         })(),
         getMonthName(new Date(member.birthDate).getMonth() + 1),
         getAge(member.birthDate),
         member.barangay || 'Not specified',
         member.disabilityType || 'Not specified'
       ]);
       
       // Debug: Log the table data being generated
       console.log('Table data for PDF:', tableData);
       
       // Add table
       autoTable(doc, {
         startY: 100,
         head: [['#', 'PWD ID', 'Full Name', 'Birth Month', 'Age', 'Barangay', 'Disability Type']],
         body: tableData,
         theme: 'grid',
         headStyles: {
           fillColor: [39, 174, 96], // Green color
           textColor: 255,
           fontStyle: 'bold',
           fontSize: 10
         },
         bodyStyles: {
           fontSize: 9,
           textColor: [44, 62, 80]
         },
         alternateRowStyles: {
           fillColor: [248, 250, 252]
         },
         margin: { left: 20, right: 20 },
         styles: {
           cellPadding: 3,
           lineColor: [224, 224, 224],
           lineWidth: 0.5
         }
       });
      
      // Add signature section
      const finalY = doc.lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SIGNATURES REQUIRED', 20, finalY);
      
      // Add signature lines
      const signatureY = finalY + 20;
      const signatureWidth = 50;
      const signatureSpacing = 60;
      
      // Head of PDAO Office
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Head of PDAO Office', 20, signatureY);
      doc.line(20, signatureY + 2, 20 + signatureWidth, signatureY + 2);
      doc.setFont('helvetica', 'normal');
      doc.text('Signature over Printed Name', 20, signatureY + 8);
      doc.text('Date: _______________', 20, signatureY + 15);
      
      // Barangay President
      doc.setFont('helvetica', 'bold');
      doc.text('Barangay President', 20 + signatureSpacing, signatureY);
      doc.line(20 + signatureSpacing, signatureY + 2, 20 + signatureSpacing + signatureWidth, signatureY + 2);
      doc.setFont('helvetica', 'normal');
      doc.text('Signature over Printed Name', 20 + signatureSpacing, signatureY + 8);
      doc.text('Date: _______________', 20 + signatureSpacing, signatureY + 15);
      
      // Mayor
      doc.setFont('helvetica', 'bold');
      doc.text('Mayor', 20 + (signatureSpacing * 2), signatureY);
      doc.line(20 + (signatureSpacing * 2), signatureY + 2, 20 + (signatureSpacing * 2) + signatureWidth, signatureY + 2);
      doc.setFont('helvetica', 'normal');
      doc.text('Signature over Printed Name', 20 + (signatureSpacing * 2), signatureY + 8);
      doc.text('Date: _______________', 20 + (signatureSpacing * 2), signatureY + 15);
      
      // Add footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('This document must be signed by all three officials before the benefit program can be approved.', 20, signatureY + 35);
      
      // Generate PDF blob and show in new tab for preview
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF in new tab for preview
      const newWindow = window.open(pdfUrl, '_blank');
      if (newWindow) {
        newWindow.focus();
        
        // Show confirmation dialog with download option
        const userChoice = await toastService.confirmAsync(
          'PDF Generated Successfully',
          `PDF generated successfully with ${eligibleMembers.length} eligible members!\n\nThe PDF is now open in a new tab for preview.\n\nClick OK to download the PDF, or Cancel to keep it open for preview only.\n\nRemember: You must print this PDF and get signatures from the Head of PDAO Office, Barangay President, and Mayor before the program can be approved.`
        );
        
        if (userChoice) {
          // User wants to download
          const fileName = `Eligible_Members_${formData.type.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
          const downloadLink = document.createElement('a');
          downloadLink.href = pdfUrl;
          downloadLink.download = fileName;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        
        // Clean up the object URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 10000); // Clean up after 10 seconds
      } else {
        // Fallback if popup is blocked
        toastService.warning('Popup blocked! Please allow popups for this site and try again, or the PDF will be downloaded automatically.');
        const fileName = `Eligible_Members_${formData.type.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toastService.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getColorForType = (type) => {
    const colorMap = {
      'Financial Assistance': '#27AE60',
      'Birthday Cash Gift': '#E67E22'
    };
    return colorMap[type] || '#95A5A6';
  };

  const handlePrintBenefit = (benefit) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Benefit Program - ${benefit.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2C3E50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2C3E50;
              margin: 0;
              font-size: 24px;
            }
            .header h2 {
              color: #7F8C8D;
              margin: 5px 0 0 0;
              font-size: 16px;
              font-weight: normal;
            }
            .benefit-info {
              background: #F8F9FA;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              width: 150px;
              color: #2C3E50;
            }
            .info-value {
              flex: 1;
              color: #555;
            }
            .description {
              background: #FFFFFF;
              padding: 15px;
              border-left: 4px solid ${benefit.color};
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #7F8C8D;
              border-top: 1px solid #E0E0E0;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PWD Benefits Program</h1>
            <h2>City of Cabuyao - Persons with Disability Affairs Office</h2>
          </div>
          
          <div class="benefit-info">
            <div class="info-row">
              <div class="info-label">Program Name:</div>
              <div class="info-value">${benefit.name || benefit.type}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Type:</div>
              <div class="info-value">${benefit.type}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Amount:</div>
              <div class="info-value">${benefit.amount}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Target Recipients:</div>
              <div class="info-value">${benefit.targetRecipients}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Barangay:</div>
              <div class="info-value">${benefit.barangay || 'All Barangays'}</div>
            </div>
            ${benefit.type === 'Financial Assistance' ? `
            <div class="info-row">
              <div class="info-label">Barangays:</div>
              <div class="info-value">${benefit.selectedBarangays && benefit.selectedBarangays.length > 0 ? benefit.selectedBarangays.join(', ') : 'All Barangays'}</div>
            </div>
            ` : ''}
            ${benefit.type === 'Birthday Cash Gift' ? `
            <div class="info-row">
              <div class="info-label">Birthday Month Quarter:</div>
              <div class="info-value">${benefit.birthdayMonth ? getQuarterName(benefit.birthdayMonth) : 'All Quarters'}</div>
            </div>
            ` : ''}
            ${benefit.expiryDate ? `
            <div class="info-row">
              <div class="info-label">Expiry Date:</div>
              <div class="info-value">${formatDateMMDDYYYY(benefit.expiryDate)}</div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">${benefit.status}</div>
            </div>
            ${benefit.distributionDate ? `
            <div class="info-row">
              <div class="info-label">Distribution Date:</div>
              <div class="info-value">${formatDateMMDDYYYY(benefit.distributionDate)}</div>
            </div>
            ` : ''}
            ${benefit.birthdayMonth ? `
            <div class="info-row">
              <div class="info-label">Birthday Quarter:</div>
              <div class="info-value">${benefit.birthdayMonth}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="description">
            <strong>Description:</strong><br>
            ${benefit.description}
          </div>
          
          <div class="footer">
            <p>Generated on ${formatDateMMDDYYYY(new Date().toISOString())} at ${new Date().toLocaleTimeString()}</p>
            <p>City of Cabuyao - Persons with Disability Affairs Office</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    return status === 'Distributed' ? 'success' : status === 'Pending' ? 'warning' : 'error';
  };

  const getStatusIcon = (status) => {
    return status === 'Distributed' ? <CheckCircle /> : status === 'Pending' ? <Schedule /> : <Warning />;
  };

  // Fetch and filter eligible members based on benefit type, month/quarter, and barangay
  const fetchEligibleMembers = async (benefitType, monthOrQuarter, barangayOrBarangays) => {
    if (!benefitType) {
      setEligibleMembers([]);
      return;
    }

    try {
      setLoadingEligibleMembers(true);
      const response = await pwdMemberService.getAll();
      
      // Handle different response structures from the updated service
      const candidates = [
        response?.data?.members,
        response?.members,
        response?.data,
        response
      ];
      const members = candidates.find((v) => Array.isArray(v)) || [];
      
      // Debug: Log the raw data fetched
      console.log('Raw members data fetched:', members);
      console.log('Number of raw members:', members.length);
      console.log('Response structure:', response);
      
      let filteredMembers = [];

      if (benefitType === 'Financial Assistance') {
        // For Financial Assistance, filter by selected barangays (all members from those barangays)
        if (Array.isArray(barangayOrBarangays) && barangayOrBarangays.length > 0) {
          console.log('Filtering Financial Assistance by barangays:', barangayOrBarangays);
          filteredMembers = members.filter(member => {
            // Handle different field names for barangay
            const memberBarangay = (member.barangay || member.Barangay || '').toString().trim().toLowerCase();
            const isIncluded = barangayOrBarangays.some(b => 
              (b || '').toString().trim().toLowerCase() === memberBarangay
            );
            console.log(`Member ${member.firstName} ${member.lastName} from "${member.barangay || member.Barangay}": ${isIncluded ? 'INCLUDED' : 'EXCLUDED'}`);
            return isIncluded;
          });
        } else {
          filteredMembers = members; // Show all members if no specific barangays selected
        }
      } else if (benefitType === 'Birthday Cash Gift') {
        // Filter by quarter
        const quarterMonths = {
          'Q1': [1, 2, 3], // January, February, March
          'Q2': [4, 5, 6], // April, May, June
          'Q3': [7, 8, 9], // July, August, September
          'Q4': [10, 11, 12] // October, November, December
        };
        
        const eligibleMonths = quarterMonths[monthOrQuarter] || [];
        
        filteredMembers = members.filter(member => {
          if (!member.birthDate) return false;
          const birthMonth = new Date(member.birthDate).getMonth() + 1;
          const quarterMatch = eligibleMonths.includes(birthMonth);

          // Support multiple barangays for Birthday Cash Gift as well
          if (Array.isArray(barangayOrBarangays) && barangayOrBarangays.length > 0) {
            const memberBarangay = (member.barangay || member.Barangay || '').toString().trim().toLowerCase();
            const inSelected = barangayOrBarangays.some(b => (b || '').toString().trim().toLowerCase() === memberBarangay);
            return quarterMatch && inSelected;
          }

          return quarterMatch;
        });
      }

      // Debug: Log the filtered results
      console.log('Filtered members for', benefitType, ':', filteredMembers);
      console.log('Number of filtered members:', filteredMembers.length);

      setEligibleMembers(filteredMembers);
    } catch (error) {
      console.error('Error fetching eligible members:', error);
      setEligibleMembers([]);
    } finally {
      setLoadingEligibleMembers(false);
    }
  };

  // Get month name from month number
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
  };

  // Get quarter name from quarter code
  const getQuarterName = (quarter) => {
    const quarterNames = {
      'Q1': 'Q1 - January, February, March',
      'Q2': 'Q2 - April, May, June',
      'Q3': 'Q3 - July, August, September',
      'Q4': 'Q4 - October, November, December'
    };
    return quarterNames[quarter] || quarter;
  };

  // Get age from birth date
  const getAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'white' }}>
      {currentUser?.role === 'Staff2' ? <Staff2Sidebar /> : <AdminSidebar />}
      
      <Box sx={{ 
        flex: 1, 
        ml: '280px', 
        width: 'calc(100% - 280px)', 
        p: 3, 
        bgcolor: 'white'
      }}>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid #E0E0E0', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 700, 
              color: '#2C3E50',
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
            }}>
              Ayuda & Benefits Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ 
                bgcolor: '#27AE60', 
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                '&:hover': { bgcolor: '#229954' } 
              }}
            >
              + Add New Benefit
            </Button>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  color: '#2C3E50',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                },
                '& .Mui-selected': {
                  color: '#27AE60'
                },
                '& .MuiTabs-indicator': {
                  bgcolor: '#27AE60'
                }
              }}
            >
              <Tab 
                label={`Active Benefits (${benefits.length})`} 
                icon={<VolunteerActivism />}
                iconPosition="start"
              />
              <Tab 
                label={`Pending Schedules (${pendingSchedules.length})`} 
                icon={<PendingActions />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {activeTab === 0 ? (
            /* Active Benefits Tab */
            <>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                border: '1px solid #E0E0E0', 
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                '&:hover': { 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <AttachMoney sx={{ fontSize: 40, color: '#27AE60', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                    ₱{benefits.reduce((sum, benefit) => {
                      const amount = benefit.amount ? benefit.amount.replace(/[₱,]/g, '') : '0';
                      return sum + (parseInt(amount) || 0);
                    }, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                    Total Distributed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                border: '1px solid #E0E0E0', 
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                '&:hover': { 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <People sx={{ fontSize: 40, color: '#3498DB', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                    {benefits.reduce((sum, benefit) => sum + (benefit.distributed || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                    Total Recipients
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                border: '1px solid #E0E0E0', 
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                '&:hover': { 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <LocalShipping sx={{ fontSize: 40, color: '#F39C12', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                    {benefits.reduce((sum, benefit) => sum + (benefit.pending || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                    Pending Distribution
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ 
                border: '1px solid #E0E0E0', 
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                '&:hover': { 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <VolunteerActivism sx={{ fontSize: 40, color: '#9B59B6', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                    {benefits.filter(benefit => benefit.status === 'Active').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                    Active Programs
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Benefits Cards */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '1.2rem' }}>
            Available Benefits Programs
          </Typography>
          {benefits.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 6, 
              bgcolor: '#F8F9FA', 
              borderRadius: 2, 
              border: '2px dashed #E0E0E0' 
            }}>
              <VolunteerActivism sx={{ fontSize: 60, color: '#BDC3C7', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                No Benefits Programs Available
              </Typography>
              <Typography variant="body2" sx={{ color: '#95A5A6', mb: 3 }}>
                Start by adding your first benefit program to help PWD members
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ 
                  bgcolor: '#27AE60', 
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#229954' } 
                }}
              >
                Add First Benefit Program
              </Button>
            </Box>
          ) : (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {benefits.map((benefit) => (
              <Grid item xs={12} sm={6} md={4} key={benefit.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    border: '1px solid #E0E0E0',
                    borderRadius: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'white',
                    '&:hover': { 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip 
                        label={benefit.type} 
                        size="small" 
                        sx={{ 
                          bgcolor: `${benefit.color}15`, 
                          color: benefit.color,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintBenefit(benefit)}
                            sx={{ color: '#2C3E50', '&:hover': { bgcolor: 'rgba(44, 62, 80, 0.1)' } }}
                            title="Print Benefit"
                          >
                            <Print />
                          </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(benefit)}
                            sx={{ color: '#2C3E50', '&:hover': { bgcolor: 'rgba(44, 62, 80, 0.1)' } }}
                            title="Edit Benefit"
                      >
                        <Edit />
                      </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteBenefit(benefit.id)}
                            sx={{ color: '#E74C3C', '&:hover': { bgcolor: 'rgba(231, 76, 60, 0.1)' } }}
                            title="Delete Benefit"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                    </Box>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1, color: '#2C3E50', fontSize: '1rem' }}>
                      {benefit.title || benefit.benefitType || benefit.type}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                      {benefit.amount}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2C3E50', mb: 2, lineHeight: 1.5 }}>
                      {benefit.description}
                    </Typography>
                    {benefit.type === 'Financial Assistance' ? (
                      <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 1, fontWeight: 500 }}>
                        Barangays: {benefit.selectedBarangays && benefit.selectedBarangays.length > 0 ? benefit.selectedBarangays.join(', ') : 'All Barangays'}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 1, fontWeight: 500 }}>
                        Barangay: {benefit.barangay || 'All Barangays'}
                      </Typography>
                    )}
                    {benefit.type === 'Birthday Cash Gift' ? (
                      <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 2, fontWeight: 500 }}>
                        Birthday Month Quarter: {benefit.birthdayMonth ? getQuarterName(benefit.birthdayMonth) : 'All Quarters'}
                      </Typography>
                    ) : benefit.type === 'Financial Assistance' ? (
                      null
                    ) : (
                      // No additional fields for other benefit types
                      null
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#27AE60', fontWeight: 600 }}>
                          Distributed: {benefit.distributed}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#F39C12', fontWeight: 600 }}>
                          Pending: {benefit.pending}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Status Radio Buttons */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E0E0E0' }}>
                      <Typography variant="caption" sx={{ color: '#2C3E50', fontWeight: 600, mb: 1, display: 'block' }}>
                        Status:
                      </Typography>
                      <RadioGroup
                        row
                        value={benefit.status}
                        onChange={(e) => handleStatusChange(benefit.id, e.target.value)}
                        sx={{ gap: 1 }}
                      >
                        <FormControlLabel
                          value="Active"
                          control={
                            <Radio 
                              size="small" 
                              sx={{ 
                                color: '#27AE60',
                                '&.Mui-checked': { color: '#27AE60' }
                              }} 
                            />
                          }
                          label={
                            <Typography variant="caption" sx={{ 
                              color: benefit.status === 'Active' ? '#27AE60' : '#2C3E50',
                              fontWeight: benefit.status === 'Active' ? 600 : 400
                            }}>
                              Active
                            </Typography>
                          }
                        />
                        <FormControlLabel
                          value="Inactive"
                          control={
                            <Radio 
                              size="small" 
                              sx={{ 
                                color: '#E74C3C',
                                '&.Mui-checked': { color: '#E74C3C' }
                              }} 
                            />
                          }
                          label={
                            <Typography variant="caption" sx={{ 
                              color: benefit.status === 'Inactive' ? '#E74C3C' : '#2C3E50',
                              fontWeight: benefit.status === 'Inactive' ? 600 : 400
                            }}>
                              Inactive
                            </Typography>
                          }
                        />
                      </RadioGroup>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          )}

          {/* Distribution History */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '1.2rem' }}>
            Recent Distribution History
          </Typography>
          {distributionHistory.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4, 
              bgcolor: '#F8F9FA', 
              borderRadius: 2, 
              border: '2px dashed #E0E0E0' 
            }}>
              <LocalShipping sx={{ fontSize: 40, color: '#BDC3C7', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                No Distribution History
              </Typography>
              <Typography variant="body2" sx={{ color: '#95A5A6' }}>
                Distribution records will appear here once benefits are distributed
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'white', borderBottom: '2px solid #E0E0E0' }}>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Benefit</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Recipient</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Amount</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Date</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Status</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Barangay</TableCell>
                    <TableCell sx={{ color: '#0b87ac', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', py: 2, px: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {distributionHistory.map((row, index) => (
                    <TableRow key={row.id} sx={{ bgcolor: index % 2 ? '#F7FBFF' : 'white', borderBottom: '1px solid #E0E0E0' }}>
                      <TableCell sx={{ fontWeight: 500, color: '#2C3E50', fontSize: '0.8rem', py: 2, px: 2 }}>{row.benefitName}</TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 500, fontSize: '0.8rem', py: 2, px: 2 }}>{row.recipient}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#27AE60', fontSize: '0.8rem', py: 2, px: 2 }}>{row.amount}</TableCell>
                      <TableCell sx={{ color: '#34495E', fontSize: '0.8rem', py: 2, px: 2 }}>{row.date}</TableCell>
                      <TableCell sx={{ py: 2, px: 2 }}>
                        <Chip 
                          icon={getStatusIcon(row.status)}
                          label={row.status} 
                          color={getStatusColor(row.status)} 
                          size="small" 
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#0b87ac', fontWeight: 500, fontSize: '0.8rem', py: 2, px: 2 }}>{row.barangay}</TableCell>
                      <TableCell sx={{ py: 2, px: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: '#3498DB', 
                              '&:hover': { bgcolor: '#E8F4FD' } 
                            }}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: '#E74C3C', 
                              '&:hover': { bgcolor: 'rgba(231, 76, 60, 0.1)' } 
                            }}
                            title="Delete Distribution Record"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
            </>
          ) : (
            /* Pending Schedules Tab */
            <>
              {/* Pending Schedules Summary */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={0} sx={{ 
                    border: '1px solid #E0E0E0', 
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '&:hover': { 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <PendingActions sx={{ fontSize: 40, color: '#F39C12', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                        {pendingSchedules.length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                        Pending Approval
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={0} sx={{ 
                    border: '1px solid #E0E0E0', 
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '&:hover': { 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Schedule sx={{ fontSize: 40, color: '#3498DB', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                        {pendingSchedules.filter(p => p.type === 'Financial').length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                        Financial Programs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={0} sx={{ 
                    border: '1px solid #E0E0E0', 
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '&:hover': { 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <AttachMoney sx={{ fontSize: 40, color: '#27AE60', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                        ₱{pendingSchedules.reduce((sum, p) => {
                          const amount = p.amount.replace(/[₱,]/g, '');
                          return sum + (parseInt(amount) || 0);
                        }, 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                        Total Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={0} sx={{ 
                    border: '1px solid #E0E0E0', 
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '&:hover': { 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <People sx={{ fontSize: 40, color: '#9B59B6', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                        {pendingSchedules.filter(p => p.barangay === 'All Barangays').length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 500 }}>
                        City-wide Programs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Pending Schedules List */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50', fontSize: '1.2rem' }}>
                Pending Approval Schedules
              </Typography>
              {pendingSchedules.length === 0 ? (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 6, 
                  bgcolor: '#F8F9FA', 
                  borderRadius: 2, 
                  border: '2px dashed #E0E0E0' 
                }}>
                  <PendingActions sx={{ fontSize: 60, color: '#BDC3C7', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                    No Pending Schedules
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#95A5A6', mb: 3 }}>
                    All benefit programs have been approved or no new programs are pending
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {pendingSchedules.map((schedule) => (
                    <Grid item xs={12} sm={6} md={4} key={schedule.id}>
                      <Card 
                        elevation={0} 
                        sx={{ 
                          border: '1px solid #E0E0E0',
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          bgcolor: 'white',
                          '&:hover': { 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s ease'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Chip 
                              label={schedule.type} 
                              size="small" 
                              sx={{ 
                                bgcolor: `${schedule.color}15`, 
                                color: schedule.color,
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            />
                            <Chip 
                              label="Pending" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#F39C12', 
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            />
                          </Box>
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1, color: '#2C3E50', fontSize: '1rem' }}>
                            {schedule.name || schedule.type}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C3E50', mb: 1 }}>
                            {schedule.amount}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#2C3E50', mb: 2, lineHeight: 1.5 }}>
                            {schedule.description}
                          </Typography>
                          {schedule.type === 'Financial Assistance' ? (
                            <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 1, fontWeight: 500 }}>
                              Barangays: {schedule.selectedBarangays && schedule.selectedBarangays.length > 0 ? schedule.selectedBarangays.join(', ') : 'All Barangays'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 1, fontWeight: 500 }}>
                              Barangay: {schedule.barangay || 'All Barangays'}
                            </Typography>
                          )}
                          {schedule.type === 'Birthday Cash Gift' ? (
                            <Typography variant="caption" sx={{ color: '#2C3E50', display: 'block', mb: 2, fontWeight: 500 }}>
                              Birthday Month Quarter: {schedule.birthdayMonth ? getQuarterName(schedule.birthdayMonth) : 'All Quarters'}
                            </Typography>
                          ) : schedule.type === 'Financial Assistance' ? (
                            null
                          ) : (
                            // No additional fields for other benefit types
                            null
                          )}
                          <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', mb: 2, fontWeight: 500 }}>
                            Submitted: {formatDateMMDDYYYY(schedule.submittedDate)}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', gap: 1 }}>
                            <Button
                              variant="contained"
                              startIcon={<Approval />}
                              onClick={() => {
                                setSelectedPendingSchedule(schedule);
                                setOpenApprovalDialog(true);
                              }}
                              sx={{ 
                                bgcolor: '#27AE60', 
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                flex: 1,
                                '&:hover': { bgcolor: '#229954' } 
                              }}
                            >
                              Review & Approve
                            </Button>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeletePendingSchedule(schedule.id)}
                              sx={{ 
                                color: '#E74C3C', 
                                '&:hover': { bgcolor: 'rgba(231, 76, 60, 0.1)' },
                                border: '1px solid #E74C3C',
                                borderRadius: 1
                              }}
                              title="Delete Pending Schedule"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Paper>

        {/* Add/Edit Benefit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              bgcolor: 'white'
            }
          }}
        >
          <DialogTitle sx={{ 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: '#2C3E50',
            pb: 3,
            borderBottom: '2px solid #E8F4FD'
          }}>
            {editingBenefit ? 'Edit Benefit Program' : 'Add New Benefit Program'}
          </DialogTitle>
          <DialogContent sx={{ p: 4, bgcolor: 'white' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    color: '#2C3E50'
                  }}>
                    Type
                  </InputLabel>
                  <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    sx={{
                      fontSize: '1rem',
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E0E0E0',
                        borderWidth: 2
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3498DB'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#27AE60'
                      },
                      '& .MuiSelect-select': {
                        padding: '16px 14px',
                        fontSize: '1rem',
                        color: '#2C3E50'
                      },
                      '& .MuiSelect-icon': {
                        color: '#2C3E50'
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: 'white',
                          border: '1px solid #E0E0E0',
                          borderRadius: 2,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          '& .MuiMenuItem-root': {
                            color: '#2C3E50',
                            fontSize: '1rem',
                            '&:hover': {
                              bgcolor: '#f5f5f5'
                            },
                            '&.Mui-selected': {
                              bgcolor: '#E8F4FD',
                              '&:hover': {
                                bgcolor: '#E8F4FD'
                              }
                            }
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="Financial Assistance" sx={{ fontSize: '1rem' }}>Financial Assistance</MenuItem>
                    <MenuItem value="Birthday Cash Gift" sx={{ fontSize: '1rem' }}>Birthday Cash Gift</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g., ₱1,500"
                  sx={{
                    '& .MuiInputLabel-root': {
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#2C3E50'
                    },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1rem',
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#3498DB'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#27AE60'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '16px 14px',
                      color: '#2C3E50'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Distribution Date"
                  type="date"
                  value={formData.distributionDate}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (selectedDate) {
                      // Set the date to 12:00 AM (midnight) of the selected date
                      const dateObj = new Date(selectedDate);
                      dateObj.setHours(0, 0, 0, 0);
                      // Format as YYYY-MM-DD for the input (date input doesn't include time)
                      const formattedDate = dateObj.toISOString().split('T')[0];
                      setFormData({ ...formData, distributionDate: formattedDate });
                    } else {
                      setFormData({ ...formData, distributionDate: '' });
                    }
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0] // Today's date - cannot select past dates
                  }}
                  helperText="Distribution date must be today or a future date. Time will be set to 12:00 AM."
                  FormHelperTextProps={{
                    sx: {
                      color: '#B0BEC5',
                      fontSize: '0.75rem'
                    }
                  }}
                  sx={{
                    '& .MuiInputLabel-root': {
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#2C3E50'
                    },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1rem',
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#3498DB'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#27AE60'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '16px 14px',
                      color: '#2C3E50'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow's date
                  }}
                  helperText="Expiry date must be at least tomorrow (cannot be today or previous dates)"
                  FormHelperTextProps={{
                    sx: {
                      color: '#B0BEC5',
                      fontSize: '0.75rem'
                    }
                  }}
                  sx={{
                    '& .MuiInputLabel-root': {
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#2C3E50'
                    },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1rem',
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#3498DB'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#27AE60'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '16px 14px',
                      color: '#2C3E50'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={4}
                  placeholder="Describe the benefit program, eligibility criteria, and how it helps PWD members..."
                  sx={{
                    '& .MuiInputLabel-root': {
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#2C3E50'
                    },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1rem',
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E0E0E0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#3498DB'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#27AE60'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      padding: '16px 14px',
                      lineHeight: 1.5,
                      color: '#2C3E50'
                    }
                  }}
                />
              </Grid>
              {formData.type === 'Birthday Cash Gift' && (
                <Grid item xs={12} md={6}>
                  <FormControl component="fieldset" fullWidth>
                    <Typography variant="h6" sx={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 700, 
                      color: '#2C3E50',
                      mb: 2
                    }}>
                      Birthday Month Quarter
                    </Typography>
                    <RadioGroup
                      value={formData.birthdayMonth}
                      onChange={(e) => setFormData({ ...formData, birthdayMonth: e.target.value })}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1,
                        '& .MuiFormControlLabel-root': {
                          margin: 0,
                          '& .MuiRadio-root': {
                            color: '#3498DB',
                            '&.Mui-checked': {
                              color: '#27AE60'
                            }
                          },
                          '& .MuiFormControlLabel-label': {
                            fontSize: '0.9rem',
                            color: '#2C3E50',
                            fontWeight: 500
                          }
                        }
                      }}
                    >
                      <FormControlLabel 
                        value="Q1" 
                        control={<Radio />} 
                        label="Q1 - January, February, March" 
                      />
                      <FormControlLabel 
                        value="Q2" 
                        control={<Radio />} 
                        label="Q2 - April, May, June" 
                      />
                      <FormControlLabel 
                        value="Q3" 
                        control={<Radio />} 
                        label="Q3 - July, August, September" 
                      />
                      <FormControlLabel 
                        value="Q4" 
                        control={<Radio />} 
                        label="Q4 - October, November, December" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}
              {(formData.type === 'Financial Assistance' || formData.type === 'Birthday Cash Gift') ? (
                // Show checkboxes for Financial Assistance and Birthday Cash Gift
                <Grid item xs={12} md={6}>
                  <FormControl component="fieldset" fullWidth>
                    <Typography variant="h6" sx={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 700, 
                      color: '#2C3E50',
                      mb: 2
                    }}>
                      Select Barangays (Choose one or more barangays)
                    </Typography>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 1,
                      maxHeight: 200,
                      overflow: 'auto',
                      border: '1px solid #E0E0E0',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: '#F8F9FA'
                    }}>
                      {['Banlic', 'Bigaa', 'Butong', 'Casile', 'Diezmo', 'Gulod', 'Mamatid', 'Marinig', 'Niugan', 'Pittland', 'Pulo', 'Sala', 'San Isidro'].map((barangay) => (
                        <FormControlLabel
                          key={barangay}
                          control={
                            <Checkbox
                              checked={formData.selectedBarangays.includes(barangay)}
                              onChange={() => handleBarangaySelection(barangay)}
                              sx={{
                                color: '#3498DB',
                                '&.Mui-checked': {
                                  color: '#27AE60'
                                }
                              }}
                            />
                          }
                          label={barangay}
                          sx={{
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.9rem',
                              color: '#2C3E50',
                              fontWeight: 500
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {formData.selectedBarangays.length > 0 && (
                      <Typography variant="body2" sx={{ color: '#27AE60', fontWeight: 600, mt: 1 }}>
                        Selected: {formData.selectedBarangays.join(', ')}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              ) : (
                // Show dropdown for other benefit types
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 700, 
                      color: '#2C3E50'
                    }}>
                      Barangay
                    </InputLabel>
                    <Select
                      value={formData.barangay}
                      label="Barangay"
                      onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                      sx={{
                        fontSize: '1rem',
                        borderRadius: 2,
                        backgroundColor: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#E0E0E0',
                          borderWidth: 2
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3498DB'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#27AE60'
                        },
                        '& .MuiSelect-select': {
                          padding: '16px 14px',
                          fontSize: '1rem',
                          color: '#2C3E50'
                        },
                        '& .MuiSelect-icon': {
                          color: '#2C3E50'
                        }
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: 'white',
                            border: '1px solid #E0E0E0',
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            '& .MuiMenuItem-root': {
                              color: '#2C3E50',
                              fontSize: '1rem',
                              '&:hover': {
                                bgcolor: '#f5f5f5'
                              },
                              '&.Mui-selected': {
                                bgcolor: '#E8F4FD',
                                '&:hover': {
                                  bgcolor: '#E8F4FD'
                                }
                              }
                            }
                          }
                        }
                      }}
                    >
                      <MenuItem value="All Barangays" sx={{ fontSize: '1rem' }}>All Barangays</MenuItem>
                      <MenuItem value="Banlic" sx={{ fontSize: '1rem' }}>Banlic</MenuItem>
                      <MenuItem value="Bigaa" sx={{ fontSize: '1rem' }}>Bigaa</MenuItem>
                      <MenuItem value="Butong" sx={{ fontSize: '1rem' }}>Butong</MenuItem>
                      <MenuItem value="Casile" sx={{ fontSize: '1rem' }}>Casile</MenuItem>
                      <MenuItem value="Diezmo" sx={{ fontSize: '1rem' }}>Diezmo</MenuItem>
                      <MenuItem value="Gulod" sx={{ fontSize: '1rem' }}>Gulod</MenuItem>
                      <MenuItem value="Mamatid" sx={{ fontSize: '1rem' }}>Mamatid</MenuItem>
                      <MenuItem value="Marinig" sx={{ fontSize: '1rem' }}>Marinig</MenuItem>
                      <MenuItem value="Niugan" sx={{ fontSize: '1rem' }}>Niugan</MenuItem>
                      <MenuItem value="Pittland" sx={{ fontSize: '1rem' }}>Pittland</MenuItem>
                      <MenuItem value="Pulo" sx={{ fontSize: '1rem' }}>Pulo</MenuItem>
                      <MenuItem value="Sala" sx={{ fontSize: '1rem' }}>Sala</MenuItem>
                      <MenuItem value="San Isidro" sx={{ fontSize: '1rem' }}>San Isidro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            {/* Eligible Members Table */}
            {(formData.type === 'Financial Assistance' && formData.selectedBarangays.length > 0) ||
             (formData.type === 'Birthday Cash Gift' && formData.birthdayMonth) ? (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 2, 
                  color: '#2C3E50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <People />
                  Eligible Members Preview
                  {formData.type === 'Financial Assistance' && formData.selectedBarangays.length > 0 && (
                    <Chip 
                      label={`From ${formData.selectedBarangays.join(', ')}`} 
                      size="small" 
                      sx={{ 
                        bgcolor: '#E8F4FD', 
                        color: '#2C3E50',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    />
                  )}
                  {formData.type === 'Birthday Cash Gift' && (
                    <Chip 
                      label={getQuarterName(formData.birthdayMonth)} 
                      size="small" 
                      sx={{ 
                        bgcolor: '#E8F4FD', 
                        color: '#2C3E50',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    />
                  )}
                </Typography>
                
                {loadingEligibleMembers ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    py: 4,
                    bgcolor: '#F8F9FA',
                    borderRadius: 2,
                    border: '1px solid #E0E0E0'
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CircularProgress size={40} sx={{ color: '#27AE60', mb: 2 }} />
                      <Typography variant="body2" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                        Loading eligible members...
                      </Typography>
                    </Box>
                  </Box>
                ) : eligibleMembers.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} sx={{ 
                    border: '1px solid #E0E0E0', 
                    borderRadius: 2,
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    <Table size="small">
                       <TableHead>
                         <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             PWD ID
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             Full Name
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             Birth Month
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             Age
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             Barangay
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.875rem' }}>
                             Disability Type
                           </TableCell>
                         </TableRow>
                       </TableHead>
                      <TableBody>
                        {eligibleMembers.map((member, index) => {
                          // Debug: Log each member being rendered in the table
                          console.log(`Rendering member ${index + 1}:`, member);
                          return (
                          <TableRow 
                            key={member.id} 
                            sx={{ 
                              bgcolor: index % 2 ? '#F8FAFC' : '#FFFFFF',
                              '&:hover': {
                                bgcolor: '#E8F4FD'
                              }
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500, color: '#2C3E50', fontSize: '0.8rem' }}>
                              {member.pwd_id || (member.userID ? `PWD-${member.userID}` : 'Not assigned')}
                            </TableCell>
                            <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                              {(() => {
                                const parts = [];
                                if (member.firstName) parts.push(member.firstName);
                                if (member.middleName && member.middleName.trim().toUpperCase() !== 'N/A') parts.push(member.middleName);
                                if (member.lastName) parts.push(member.lastName);
                                if (member.suffix) parts.push(member.suffix);
                                return parts.join(' ').trim() || 'Name not provided';
                              })()}
                            </TableCell>
                            <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                              {getMonthName(new Date(member.birthDate).getMonth() + 1)}
                            </TableCell>
                            <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                              {getAge(member.birthDate)}
                            </TableCell>
                            <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                              {member.barangay || 'Not specified'}
                            </TableCell>
                             <TableCell sx={{ color: '#2C3E50', fontSize: '0.8rem' }}>
                               {member.disabilityType || 'Not specified'}
                             </TableCell>
                           </TableRow>
                           );
                         })}
                       </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    bgcolor: '#F8F9FA', 
                    borderRadius: 2, 
                    border: '2px dashed #E0E0E0' 
                  }}>
                    <People sx={{ fontSize: 40, color: '#BDC3C7', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#7F8C8D', mb: 1, fontWeight: 600 }}>
                      No Eligible Members Found
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#95A5A6' }}>
                      {formData.type === 'Financial Assistance' 
                        ? `No PWD members found in selected barangays: ${formData.selectedBarangays.join(', ')}`
                        : `No PWD members have birthdays in ${getQuarterName(formData.birthdayMonth)}${formData.barangay && formData.barangay !== 'All Barangays' ? ` from ${formData.barangay}` : ''}`
                      }
                    </Typography>
                  </Box>
                )}
                
                {eligibleMembers.length > 0 && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: '#E8F5E8', 
                    borderRadius: 2, 
                    border: '1px solid #27AE60' 
                  }}>
                    <Typography variant="body2" sx={{ color: '#27AE60', fontWeight: 600, textAlign: 'center' }}>
                      📊 Total Eligible Members: {eligibleMembers.length}
                      {formData.type === 'Financial Assistance' && formData.selectedBarangays.length > 0 && (
                        <span> • From {formData.selectedBarangays.join(', ')}</span>
                      )}
                      {formData.type === 'Birthday Cash Gift' && formData.barangay && formData.barangay !== 'All Barangays' && (
                        <span> • From {formData.barangay}</span>
                      )}
                      {formData.amount && (
                        <span> • Estimated Total Cost: ₱{(parseInt(formData.amount.replace(/[₱,]/g, '')) * eligibleMembers.length).toLocaleString()}</span>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* PDF Generation Button */}
                {eligibleMembers.length > 0 && (
                  <Box sx={{ 
                    mt: 3, 
                    display: 'flex', 
                    justifyContent: 'center',
                    gap: 2
                  }}>
                    <Button
                      variant="contained"
                      startIcon={<PictureAsPdf />}
                      onClick={generateEligibleMembersPDF}
                      disabled={generatingPDF}
                      sx={{ 
                        bgcolor: '#E74C3C',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: '1rem',
                        '&:hover': { 
                          bgcolor: '#C0392B' 
                        },
                        '&:disabled': {
                          bgcolor: '#BDC3C7',
                          color: '#7F8C8D'
                        }
                      }}
                    >
                      {generatingPDF ? 'Generating PDF...' : 'Generate PDF for Signatures'}
                    </Button>
                  </Box>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ 
            p: 4, 
            pt: 2, 
            borderTop: '2px solid #E8F4FD',
            bgcolor: 'white',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                color: '#7F8C8D',
                border: '2px solid #E0E0E0',
                '&:hover': { 
                  bgcolor: '#E8F4FD',
                  color: '#2C3E50',
                  borderColor: '#3498DB'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                bgcolor: '#27AE60',
                '&:hover': { 
                  bgcolor: '#229954' 
                }
              }}
            >
              {editingBenefit ? 'Update Benefit' : 'Add Benefit'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog 
          open={openApprovalDialog} 
          onClose={() => {
            setOpenApprovalDialog(false);
            setSelectedPendingSchedule(null);
            setApprovalFile(null);
          }} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              bgcolor: 'white'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#27AE60', 
            color: 'white', 
            fontWeight: 700, 
            fontSize: '1.3rem',
            textAlign: 'center',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Approval />
              Review & Approve Benefit Program
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, bgcolor: 'white' }}>
            {selectedPendingSchedule && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#2C3E50' }}>
                  Program Details
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Program Title
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.name || selectedPendingSchedule.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Type
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Amount
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.amount}
                    </Typography>
                  </Grid>
                  {selectedPendingSchedule.type === 'Financial Assistance' ? (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                        Barangays
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                        {selectedPendingSchedule.selectedBarangays && selectedPendingSchedule.selectedBarangays.length > 0 ? selectedPendingSchedule.selectedBarangays.join(', ') : 'All Barangays'}
                      </Typography>
                    </Grid>
                  ) : (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                        Barangay
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                        {selectedPendingSchedule.barangay || 'All Barangays'}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPendingSchedule.type === 'Birthday Cash Gift' ? (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                        Birthday Month Quarter
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                        {selectedPendingSchedule.birthdayMonth ? getQuarterName(selectedPendingSchedule.birthdayMonth) : 'All Quarters'}
                      </Typography>
                    </Grid>
                  ) : selectedPendingSchedule.type === 'Financial Assistance' ? (
                    null
                  ) : (
                    // No additional fields for other benefit types
                    null
                  )}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.description}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Distribution Date
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.distributionDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#7F8C8D', fontWeight: 600, mb: 0.5 }}>
                      Expiry Date
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2C3E50', fontWeight: 500 }}>
                      {selectedPendingSchedule.expiryDate || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2C3E50' }}>
                  Upload Approval Document
                </Typography>
                <Typography variant="body2" sx={{ color: '#7F8C8D', mb: 3 }}>
                  Please upload the signed letter of approval from the mayor to proceed with the approval.
                </Typography>

                <Box sx={{ 
                  border: '2px dashed #E0E0E0', 
                  borderRadius: 2, 
                  p: 3, 
                  textAlign: 'center',
                  bgcolor: '#F8F9FA',
                  mb: 2
                }}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="approval-file-upload"
                  />
                  <label htmlFor="approval-file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Upload />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                        borderRadius: 2,
                        borderColor: '#27AE60',
                        color: '#27AE60',
                        '&:hover': {
                          borderColor: '#229954',
                          bgcolor: '#E8F5E8'
                        }
                      }}
                    >
                      Choose File
                    </Button>
                  </label>
                  {approvalFile && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#27AE60', fontWeight: 600 }}>
                        Selected: {approvalFile.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            p: 4, 
            pt: 2, 
            borderTop: '2px solid #E8F4FD',
            bgcolor: 'white',
            gap: 2
          }}>
            <Button 
              onClick={() => {
                setOpenApprovalDialog(false);
                setSelectedPendingSchedule(null);
                setApprovalFile(null);
              }}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                color: '#7F8C8D',
                border: '1px solid #E0E0E0',
                '&:hover': {
                  borderColor: '#BDC3C7',
                  bgcolor: '#F8F9FA'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApproveSchedule} 
              variant="contained"
              disabled={!approvalFile || approvingSchedule}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                bgcolor: approvingSchedule ? '#BDC3C7' : '#27AE60',
                '&:hover': { 
                  bgcolor: approvingSchedule ? '#BDC3C7' : '#229954' 
                },
                '&:disabled': {
                  bgcolor: '#BDC3C7',
                  color: 'white'
                }
              }}
            >
              {approvingSchedule ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1, color: '#FFFFFF' }} />
                  Approving...
                </>
              ) : (
                'Approve Program'
              )}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  </Box>
  );
};

export default Ayuda;
