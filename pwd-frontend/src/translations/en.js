// English translations
export const en = {
  // Common
  common: {
    dashboard: 'Dashboard',
    announcements: 'Announcements',
    support: 'Support',
    profile: 'Profile',
    documents: 'Documents',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    apply: 'Apply',
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    active: 'Active',
    inactive: 'Inactive',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    name: 'Name',
    description: 'Description',
    title: 'Title',
    content: 'Content',
    message: 'Message',
    reply: 'Reply',
    upload: 'Upload',
    download: 'Download',
    refresh: 'Refresh',
    tryAgain: 'Try Again',
    optional: 'Optional',
    submitting: 'Submitting...'
  },
  buttons: {
    viewSupportTickets: 'View Support Tickets',
    readAloud: 'Read Aloud',
    reading: 'Reading...'
  },

  // Accessibility
  accessibility: {
    title: 'Accessibility Settings',
    description: 'Customize your experience to make the application more accessible and comfortable to use.',
    screenReader: 'Screen Reader Support',
    screenReaderLabel: 'Enable screen reader announcements',
    screenReaderDescription: 'Provides audio announcements for important changes and navigation',
    visualSettings: 'Visual Settings',
    highContrast: 'High Contrast Mode',
    highContrastDescription: 'Increases color contrast for better visibility',
    textSize: 'Text Size',
    textSizeDescription: 'Adjust text size for better readability',
    focusIndicator: 'Enhanced Focus Indicators',
    focusIndicatorDescription: 'Shows clear focus outlines for keyboard navigation',
    languageSettings: 'Language Settings',
    selectLanguage: 'Select Language',
    languageDescription: 'Choose your preferred language for the interface',
    motionSettings: 'Motion Settings',
    reduceMotion: 'Reduce Motion',
    reduceMotionDescription: 'Minimizes animations and transitions for users sensitive to motion',
    resetToDefault: 'Reset to Default',
    close: 'Close',
    settingsUpdated: 'Accessibility settings updated',
    screenReaderEnabled: 'Screen reader mode enabled',
    screenReaderDisabled: 'Screen reader mode disabled',
    highContrastEnabled: 'High contrast mode enabled',
    textSizeSet: 'Text size set to {size} percent',
    languageChanged: 'Language changed to {language}',
    settingsReset: 'Accessibility settings reset to default',
    dialogOpened: 'Accessibility settings dialog opened',
    // Text-to-Speech settings
    ttsSettings: 'Text-to-Speech Settings',
    ttsEnabled: 'Enable Text-to-Speech',
    ttsEnabledLabel: 'Enable Text-to-Speech',
    ttsEnabledDescription: 'Convert text to speech for audio feedback',
    speechRate: 'Speech Rate',
    speechRateLabel: 'Speech Rate',
    speechRateDescription: 'Adjust the speed of speech',
    speechPitch: 'Speech Pitch',
    speechPitchLabel: 'Speech Pitch',
    speechPitchDescription: 'Adjust the pitch of the voice',
    speechVolume: 'Speech Volume',
    speechVolumeLabel: 'Speech Volume',
    speechVolumeDescription: 'Adjust the volume of speech',
    voiceSelection: 'Voice Selection',
    voiceSelectionLabel: 'Select Voice',
    voiceSelectionDescription: 'Choose a voice for text-to-speech',
    testVoice: 'Test Voice',
    testVoiceLabel: 'Test Selected Voice',
    testVoiceDescription: 'Preview the selected voice',
    recommendedVoice: 'Recommended Voice',
    defaultVoice: 'Default Voice',
    dialogClosed: 'Accessibility settings dialog closed'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome back, {name}. Here\'s your personal dashboard.',
    applicationStatus: 'Application Status',
    memberSince: 'Member Since',
    latestAnnouncements: 'Latest Announcements',
    announcements: 'Announcements',
    supportDesk: 'Support Desk',
    supportDescription: 'Need help? Our support team is here to assist you with any questions or concerns.',
    createSupportTicket: 'Create Support Ticket',
    viewMyTickets: 'View My Tickets',
    supportHours: 'Hours: Mon-Fri, 8AM-5PM',
    noAnnouncements: 'No announcements at the moment',
    checkBackLater: 'Check back later for important updates'
  },

  guide: {
    dashboard: {
      title: 'How to Use Your Dashboard',
      steps: {
        understand: {
          title: 'Understanding Your Dashboard',
          description: 'Your dashboard shows your status, recent announcements, and support tickets. The status cards at the top show your application status, member since date, number of announcements, and support tickets.'
        },
        announcements: {
          title: 'Viewing Announcements',
          description: "Check the 'Announcements' section to see important updates from PDAO. Click 'View All Announcements' to see all available announcements for your barangay."
        },
        tickets: {
          title: 'Managing Support Tickets',
          description: "The 'My Support Tickets' section shows all your tickets. Click 'Create New Ticket' to ask for help, or click on an existing ticket to view and reply to messages."
        },
        sections: {
          title: 'Accessing Other Sections',
          description: 'Use the menu on the left (or hamburger menu on mobile) to navigate to: My Documents (upload required documents), Support Desk (create and manage tickets), and Profile (update your information).'
        },
        help: {
          title: 'Getting More Help',
          description: "If you need assistance, click the 'Create New Ticket' button or go to Support Desk from the menu. Our staff will help you with any questions or issues."
        }
      }
    },
    support: {
      title: 'How to Use Support Desk',
      steps: {
        creating: {
          title: 'Creating a Support Ticket',
          description: "Click 'Create New Ticket' button. Fill in the subject (brief summary of your issue), category, and a detailed description. Attach any files if needed (like documents or screenshots). Click 'Submit' to send your ticket."
        },
        viewing: {
          title: 'Viewing Your Tickets',
          description: "All your tickets are listed below. Active tickets show current conversations. Click on any ticket to see the conversation history and reply to messages from staff."
        },
        replying: {
          title: 'Replying to Tickets',
          description: "Open a ticket to see all messages. Type your reply in the message box at the bottom. You can attach files if needed. Click 'Send' to reply. Staff will respond and you'll see their messages appear."
        },
        status: {
          title: 'Understanding Ticket Status',
          description: "Status shows: 'NEW' (just created), 'WAITING FOR REPLY' (needs your response), 'IN PROGRESS' (staff is working on it), or 'RESOLVED' (completed). Resolved tickets move to archived section."
        },
        attaching: {
          title: 'Attaching Files',
          description: "You can attach files like documents, photos, or PDFs to your tickets. Click the attachment icon, select your file, or drag and drop it. This helps staff understand your issue better."
        },
        gettingHelp: {
          title: 'Getting Help',
          description: "If you're having trouble using the support desk, you can contact PDAO directly by phone or visit the office. Staff are available to help with both technical issues and general questions."
        }
      }
    },
    profile: {
      title: 'How to Manage Your Profile',
      steps: {
        viewing: {
          title: 'Viewing Your Profile',
          description: 'Your profile shows your personal information, contact details, and PWD ID. The QR code can be scanned to verify your identity at PDAO offices.'
        },
        editing: {
          title: 'Editing Your Information',
          description: "Click the 'Edit Profile' button to update your personal information. You can change your contact number, address, and other details. Make sure all information is accurate before saving."
        },
        changingPassword: {
          title: 'Changing Your Password',
          description: "Click the 'Change Password' button to update your password. You'll need to enter your current password and then your new password twice to confirm it. Make sure your new password is at least 6 characters long."
        },
        saving: {
          title: 'Saving Changes',
          description: "After making changes, click 'Save' to update your profile. A success message will appear confirming your changes were saved. You can also click 'Cancel' to discard any changes you made."
        },
        importantNotes: {
          title: 'Important Notes',
          description: "Some information like your name, birth date, and disability type may require special approval to change. If you need to update these, please contact support through the Support Desk."
        }
      }
    },
    documents: {
      title: 'How to Upload Documents',
      steps: {
        understanding: {
          title: 'Understanding Document Requirements',
          description: 'Each document card shows the document name, whether it\'s required or optional, accepted file types (PDF, JPG, PNG), and maximum file size. Required documents must be uploaded for your application to be processed.'
        },
        uploading: {
          title: 'Uploading a Document',
          description: 'Click the \'Upload Document\' button on a document card. Select the file from your device. Make sure the file matches the required format and size. Wait for the upload to complete - you\'ll see a success message.'
        },
        checkingStatus: {
          title: 'Checking Document Status',
          description: 'After uploading, documents will show status: \'Pending\' (waiting for review), \'Approved\' (accepted), or \'Rejected\' (needs correction). You\'ll receive notifications about document status changes.'
        },
        viewingReplacing: {
          title: 'Viewing or Replacing Documents',
          description: 'Click \'View\' to see your uploaded document. Click \'Replace\' to upload a new version if needed. You can also check upload date and any notes from reviewers.'
        },
        ifRejected: {
          title: 'If Your Document is Rejected',
          description: 'If a document is rejected, check the notes section for details about what needs to be corrected. Upload a corrected version by clicking \'Replace\'. You can also contact support for help.'
        }
      }
    }
  },

  // Announcements
  announcements: {
    title: 'Announcements',
    noAnnouncements: 'No announcements available',
    noAnnouncementsDescription: 'There are no announcements at the moment. Check back later for important updates.',
    priority: 'Priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    publishedOn: 'Published on',
    targetAudience: 'Target Audience'
  },

  // Support
  support: {
    title: 'Support Desk',
    createTicket: 'Create Support Ticket',
    myTickets: 'My Tickets',
    ticketNumber: 'Ticket Number',
    subject: 'Subject',
    category: 'Category',
    priority: 'Priority',
    status: 'Status',
    createdAt: 'Created At',
    lastUpdated: 'Last Updated',
    messages: 'Messages',
    addMessage: 'Add Message',
    attachFile: 'Attach File',
    send: 'Send',
    open: 'New',
    waitingForReply: 'Waiting for Reply',
    closed: 'Closed',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    technical: 'Technical',
    general: 'General',
    billing: 'Billing',
    other: 'Other',
    createAndManage: 'Create and manage your support tickets',
    totalTickets: 'Total Tickets',
    waitingFor: 'Waiting for',
    activeTickets: 'Active Tickets',
    archive: 'Archive',
    reply: 'Reply',
    typeYourReply: 'Type your reply...',
    dropFileHere: 'Drop file here...',
    readyToSend: 'ready to send',
    chooseFile: 'Choose File',
    fileFormats: 'PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF (Max 10MB)',
    noTickets: 'No tickets found',
    noTicketsDescription: 'You haven\'t created any support tickets yet. Click "Create Support Ticket" to get started.'
  },

  // Profile
  profile: {
    title: 'Profile',
    personalInfo: 'Personal Information',
    contactInfo: 'Contact Information',
    disabilityInfo: 'Disability Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    middleName: 'Middle Name',
    birthDate: 'Birth Date',
    gender: 'Gender',
    civilStatus: 'Civil Status',
    contactNumber: 'Contact Number',
    barangay: 'Barangay',
    city: 'City',
    province: 'Province',
    zipCode: 'Zip Code',
    disabilityType: 'Disability Type',
    disabilityDescription: 'Disability Description',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    cancelEdit: 'Cancel Edit',
    profileUpdated: 'Profile updated successfully',
    updateFailed: 'Failed to update profile'
  },

  // Documents
  documents: {
    title: 'Document Management',
    uploadDocument: 'Upload Document',
    requiredDocuments: 'Required Documents',
    uploadedDocuments: 'Uploaded Documents',
    documentType: 'Document Type',
    fileName: 'File Name',
    fileSize: 'File Size',
    uploadDate: 'Upload Date',
    status: 'Status',
    actions: 'Actions',
    download: 'Download',
    view: 'View',
    delete: 'Delete',
    replace: 'Replace',
    medicalCertificate: 'Medical Certificate',
    birthCertificate: 'Birth Certificate',
    validId: 'Valid ID',
    barangayClearance: 'Barangay Clearance',
    photo: 'Photo',
    other: 'Other',
    uploadSuccess: 'Document uploaded successfully',
    uploadFailed: 'Failed to upload document',
    deleteSuccess: 'Document deleted successfully',
    deleteFailed: 'Failed to delete document',
    required: 'Required',
    fileTypes: 'File types',
    maxSize: 'Max size',
    notes: 'Notes',
    noDescription: 'No description provided',
    documentPreview: 'Document Preview',
    preview: 'Preview',
    howToUpload: 'How to Upload Documents',
    understandingRequirements: 'Understanding Document Requirements',
    understandingRequirementsDesc: 'Each document card shows the document name, whether it\'s required or optional, accepted file types (PDF, JPG, PNG), and maximum file size. Required documents must be uploaded for your application to be processed.',
    uploadingDocument: 'Uploading a Document',
    uploadingDocumentDesc: 'Click the \'Upload Document\' button on a document card. Select the file from your device. Make sure the file matches the required format and size. Wait for the upload to complete - you\'ll see a success message.',
    checkingStatus: 'Checking Document Status',
    checkingStatusDesc: 'After uploading, documents will show status: \'Pending\' (waiting for review), \'Approved\' (accepted), or \'Rejected\' (needs correction). You\'ll receive notifications about document status changes.',
    viewingReplacing: 'Viewing or Replacing Documents',
    viewingReplacingDesc: 'Click \'View\' to see your uploaded document. Click \'Replace\' to upload a new version if needed. You can also check upload date and any notes from reviewers.',
    ifRejected: 'If Your Document is Rejected',
    ifRejectedDesc: 'If a document is rejected, check the notes section for details about what needs to be corrected. Upload a corrected version by clicking \'Replace\'. You can also contact support for help.',
    newDocumentRequirements: 'New Document Requirements',
    selectFile: 'Select File',
    selected: 'Selected',
    size: 'Size',
    missing: 'Missing',
    approved: 'Approved',
    rejected: 'Rejected'
  }
};
