// Tagalog translations
export const tl = {
  // Common
  common: {
    dashboard: 'Dashboard',
    announcements: 'Mga Anunsyo',
    support: 'Suporta',
    profile: 'Profile',
    documents: 'Mga Dokumento',
    loading: 'Naglo-load...',
    error: 'May Mali',
    success: 'Tagumpay',
    save: 'I-save',
    cancel: 'Kanselahin',
    close: 'Isara',
    edit: 'I-edit',
    delete: 'Tanggalin',
    view: 'Tingnan',
    create: 'Gumawa',
    update: 'I-update',
    search: 'Maghanap',
    filter: 'I-filter',
    reset: 'I-reset',
    submit: 'Ipasa',
    back: 'Bumalik',
    next: 'Susunod',
    previous: 'Nakaraan',
    yes: 'Oo',
    no: 'Hindi',
    ok: 'OK',
    apply: 'Mag-apply',
    approved: 'Naaprubahan',
    pending: 'Naghihintay',
    rejected: 'Tinanggihan',
    active: 'Aktibo',
    inactive: 'Hindi Aktibo',
    phone: 'Telepono',
    email: 'Email',
    address: 'Address',
    date: 'Petsa',
    time: 'Oras',
    status: 'Status',
    name: 'Pangalan',
    description: 'Paglalarawan',
    title: 'Pamagat',
    content: 'Nilalaman',
    message: 'Mensahe',
    reply: 'Tumugon',
    upload: 'I-upload',
    download: 'I-download',
    refresh: 'I-refresh',
    tryAgain: 'Subukan Muli',
    optional: 'Opsyonal',
    submitting: 'Ipinapadala...'
  },
  buttons: {
    viewSupportTickets: 'Tingnan ang Mga Support Ticket',
    readAloud: 'Basahin Nang Malakas',
    reading: 'Binabasa...'
  },

  // Accessibility
  accessibility: {
    title: 'Mga Setting ng Accessibility',
    description: 'I-customize ang inyong karanasan upang gawing mas accessible at komportable ang aplikasyon.',
    screenReader: 'Suporta sa Screen Reader',
    screenReaderLabel: 'I-enable ang mga anunsyo ng screen reader',
    screenReaderDescription: 'Nagbibigay ng mga audio announcement para sa mahahalagang pagbabago at navigation',
    visualSettings: 'Mga Visual Setting',
    highContrast: 'High Contrast Mode',
    highContrastDescription: 'Pinapataas ang color contrast para sa mas mabuting visibility',
    textSize: 'Laki ng Teksto',
    textSizeDescription: 'I-adjust ang laki ng teksto para sa mas mabuting pagbabasa',
    focusIndicator: 'Enhanced Focus Indicators',
    focusIndicatorDescription: 'Nagpapakita ng malinaw na focus outlines para sa keyboard navigation',
    languageSettings: 'Mga Setting ng Wika',
    selectLanguage: 'Piliin ang Wika',
    languageDescription: 'Piliin ang inyong preferred na wika para sa interface',
    motionSettings: 'Mga Setting ng Motion',
    reduceMotion: 'Bawasan ang Motion',
    reduceMotionDescription: 'Binabawasan ang mga animation at transition para sa mga user na sensitive sa motion',
    resetToDefault: 'I-reset sa Default',
    close: 'Isara',
    settingsUpdated: 'Na-update ang mga accessibility setting',
    screenReaderEnabled: 'Na-enable ang screen reader mode',
    screenReaderDisabled: 'Na-disable ang screen reader mode',
    highContrastEnabled: 'Na-enable ang high contrast mode',
    textSizeSet: 'Naitakda ang laki ng teksto sa {size} porsyento',
    languageChanged: 'Nabago ang wika sa {language}',
    settingsReset: 'Na-reset ang mga accessibility setting sa default',
    dialogOpened: 'Binuksan ang accessibility settings dialog',
    dialogClosed: 'Isinara ang accessibility settings dialog',
    // Text-to-Speech settings
    ttsSettings: 'Mga Setting ng Text-to-Speech',
    ttsEnabled: 'Paganahin ang Text-to-Speech',
    ttsEnabledLabel: 'Paganahin ang Text-to-Speech',
    ttsEnabledDescription: 'I-convert ang text sa speech para sa audio feedback',
    speechRate: 'Bilis ng Pagsasalita',
    speechRateLabel: 'Bilis ng Pagsasalita',
    speechRateDescription: 'I-adjust ang bilis ng pagsasalita',
    speechPitch: 'Tono ng Boses',
    speechPitchLabel: 'Tono ng Boses',
    speechPitchDescription: 'I-adjust ang tono ng boses',
    speechVolume: 'Lakas ng Tunog',
    speechVolumeLabel: 'Lakas ng Tunog',
    speechVolumeDescription: 'I-adjust ang lakas ng tunog',
    voiceSelection: 'Pagpili ng Boses',
    voiceSelectionLabel: 'Pumili ng Boses',
    voiceSelectionDescription: 'Pumili ng boses para sa text-to-speech',
    testVoice: 'Subukan ang Boses',
    testVoiceLabel: 'Subukan ang Napiling Boses',
    testVoiceDescription: 'I-preview ang napiling boses',
    recommendedVoice: 'Inirerekomendang Boses',
    defaultVoice: 'Default na Boses'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Maligayang pagbabalik, {name}. Narito ang inyong personal dashboard.',
    applicationStatus: 'Status ng Application',
    memberSince: 'Kasapi Mula Noong',
    latestAnnouncements: 'Pinakabagong Mga Anunsyo',
    announcements: 'Mga Anunsyo',
    supportDesk: 'Support Desk',
    supportDescription: 'Kailangan ng tulong? Narito ang aming support team para tumulong sa inyong mga katanungan o alalahanin.',
    createSupportTicket: 'Gumawa ng Support Ticket',
    viewMyTickets: 'Tingnan ang Aking Mga Ticket',
    supportHours: 'Oras: Lunes-Biyernes, 8AM-5PM',
    noAnnouncements: 'Walang mga anunsyo sa ngayon',
    checkBackLater: 'Balikan mamaya para sa mahahalagang updates'
  },

  guide: {
    dashboard: {
      title: 'Paano Gamitin ang Iyong Dashboard',
      steps: {
        understand: {
          title: 'Pag-unawa sa Iyong Dashboard',
          description: 'Ipinapakita ng dashboard ang iyong status, mga pinakabagong anunsyo, at mga support ticket. Makikita sa itaas ang status ng application, petsa ng pagiging kasapi, bilang ng mga anunsyo, at mga ticket.'
        },
        announcements: {
          title: 'Pagtingin ng Mga Anunsyo',
          description: "Tingnan ang seksyong 'Mga Anunsyo' para sa mahahalagang update mula sa PDAO. I-click ang 'Tingnan Lahat ng Anunsyo' para makita ang lahat para sa iyong barangay."
        },
        tickets: {
          title: 'Pamamahala ng Support Tickets',
          description: "Ipinapakita ng seksyong 'Aking Mga Ticket' ang lahat ng iyong ticket. I-click ang 'Gumawa ng Bagong Ticket' para humingi ng tulong, o i-click ang umiiral na ticket para makita at makasagot sa mga mensahe."
        },
        sections: {
          title: 'Pag-access ng Ibang Seksyon',
          description: 'Gamitin ang menu sa kaliwa (o hamburger menu sa mobile) para pumunta sa: Aking Mga Dokumento, Support Desk, at Profile.'
        },
        help: {
          title: 'Karagdagang Tulong',
          description: "Kung kailangan ng tulong, i-click ang 'Gumawa ng Bagong Ticket' o pumunta sa Support Desk. Tutulungan ka ng aming staff."
        }
      }
    },
    support: {
      title: 'Paano Gamitin ang Support Desk',
      steps: {
        creating: {
          title: 'Paglikha ng Support Ticket',
          description: "I-click ang button na 'Gumawa ng Bagong Ticket'. Punan ang subject (maikling buod ng inyong isyu), category, at detalyadong paglalarawan. Mag-attach ng mga file kung kailangan (tulad ng mga dokumento o screenshots). I-click ang 'Ipasa' para ipadala ang inyong ticket."
        },
        viewing: {
          title: 'Pagtingin ng Inyong Mga Ticket',
          description: 'Nakalista sa ibaba ang lahat ng inyong ticket. Ipinapakita ng active tickets ang kasalukuyang mga pag-uusap. I-click ang anumang ticket para makita ang kasaysayan ng pag-uusap at tumugon sa mga mensahe mula sa staff.'
        },
        replying: {
          title: 'Pagtugon sa Mga Ticket',
          description: "Buksan ang isang ticket para makita ang lahat ng mensahe. I-type ang inyong tugon sa message box sa ibaba. Maaari kayong mag-attach ng mga file kung kailangan. I-click ang 'Ipadala' para tumugon. Tugon ng staff at makikita ninyo ang kanilang mga mensahe."
        },
        status: {
          title: 'Pag-unawa sa Status ng Ticket',
          description: "Ipinapakita ng status: 'BAGO' (kakagawa lang), 'NAGHIHINTAY NG SAGOT' (kailangan ng inyong tugon), 'GINAGAWA' (ginagawa ng staff), o 'NARESOLBA' (natapos). Ang mga resolved ticket ay lilipat sa archived section."
        },
        attaching: {
          title: 'Pag-attach ng Mga File',
          description: 'Maaari kayong mag-attach ng mga file tulad ng dokumento, larawan, o PDF sa inyong mga ticket. I-click ang attachment icon, piliin ang inyong file, o i-drag at drop ito. Tumutulong ito sa staff na maintindihan ang inyong isyu nang mas mabuti.'
        },
        gettingHelp: {
          title: 'Pagkuha ng Tulong',
          description: 'Kung nahihirapan kayo sa paggamit ng support desk, maaari kayong makipag-ugnayan sa PDAO nang direkta sa pamamagitan ng telepono o bisitahin ang opisina. Available ang staff para tumulong sa parehong technical issues at general questions.'
        }
      }
    },
    profile: {
      title: 'Paano Pamahalaan ang Inyong Profile',
      steps: {
        viewing: {
          title: 'Pagtingin ng Inyong Profile',
          description: 'Ipinapakita ng inyong profile ang inyong personal na impormasyon, contact details, at PWD ID. Maaaring i-scan ang QR code para i-verify ang inyong pagkakakilanlan sa mga opisina ng PDAO.'
        },
        editing: {
          title: 'Pag-edit ng Inyong Impormasyon',
          description: "I-click ang button na 'I-edit ang Profile' para i-update ang inyong personal na impormasyon. Maaari ninyong baguhin ang inyong contact number, address, at iba pang detalye. Siguraduhing tumpak ang lahat ng impormasyon bago i-save."
        },
        changingPassword: {
          title: 'Pagpapalit ng Inyong Password',
          description: "I-click ang button na 'Palitan ang Password' para i-update ang inyong password. Kailangan ninyong i-enter ang inyong kasalukuyang password at pagkatapos ang inyong bagong password nang dalawang beses para kumpirmahin ito. Siguraduhing hindi bababa sa 6 na character ang inyong bagong password."
        },
        saving: {
          title: 'Pag-save ng Mga Pagbabago',
          description: "Pagkatapos gumawa ng mga pagbabago, i-click ang 'I-save' para i-update ang inyong profile. Lilitaw ang success message na nagkokumpirma na na-save ang inyong mga pagbabago. Maaari din ninyong i-click ang 'Kanselahin' para itapon ang anumang pagbabago na ginawa ninyo."
        },
        importantNotes: {
          title: 'Mahahalagang Tala',
          description: 'Ang ilang impormasyon tulad ng inyong pangalan, petsa ng kapanganakan, at uri ng disability ay maaaring mangailangan ng espesyal na approval para baguhin. Kung kailangan ninyong i-update ang mga ito, mangyaring makipag-ugnayan sa support sa pamamagitan ng Support Desk.'
        }
      }
    },
    documents: {
      title: 'Paano Mag-upload ng Mga Dokumento',
      steps: {
        understanding: {
          title: 'Pag-unawa sa Mga Kinakailangan sa Dokumento',
          description: 'Ipinapakita ng bawat document card ang pangalan ng dokumento, kung ito ay kinakailangan o opsyonal, tinatanggap na mga uri ng file (PDF, JPG, PNG), at pinakamalaking laki ng file. Dapat ma-upload ang mga kinakailangang dokumento para maproseso ang inyong application.'
        },
        uploading: {
          title: 'Pag-upload ng Dokumento',
          description: 'I-click ang button na \'I-upload ang Dokumento\' sa document card. Piliin ang file mula sa inyong device. Siguraduhing tumugma ang file sa kinakailangang format at laki. Maghintay hanggang matapos ang upload - makikita ninyo ang success message.'
        },
        checkingStatus: {
          title: 'Pag-check ng Status ng Dokumento',
          description: 'Pagkatapos mag-upload, ipapakita ng mga dokumento ang status: \'Naghihintay\' (naghihintay ng review), \'Naaprubahan\' (tinanggap), o \'Tinanggihan\' (kailangan ng correction). Makakatanggap kayo ng notifications tungkol sa mga pagbabago sa status ng dokumento.'
        },
        viewingReplacing: {
          title: 'Pagtingin o Pagpalit ng Mga Dokumento',
          description: 'I-click ang \'Tingnan\' para makita ang inyong na-upload na dokumento. I-click ang \'Palitan\' para mag-upload ng bagong bersyon kung kailangan. Maaari din ninyong i-check ang upload date at anumang notes mula sa reviewers.'
        },
        ifRejected: {
          title: 'Kung Tinanggihan ang Inyong Dokumento',
          description: 'Kung tinanggihan ang isang dokumento, tingnan ang notes section para sa mga detalye tungkol sa kung ano ang kailangang i-correct. Mag-upload ng corrected version sa pamamagitan ng pag-click sa \'Palitan\'. Maaari din kayong makipag-ugnayan sa support para sa tulong.'
        }
      }
    }
  },

  // Announcements
  announcements: {
    title: 'Mga Anunsyo',
    noAnnouncements: 'Walang mga anunsyo na available',
    noAnnouncementsDescription: 'Walang mga anunsyo sa ngayon. Balikan mamaya para sa mahahalagang updates.',
    priority: 'Priority',
    urgent: 'Urgent',
    high: 'Mataas',
    medium: 'Katamtaman',
    low: 'Mababa',
    publishedOn: 'Nai-publish noong',
    targetAudience: 'Target Audience'
  },

  // Support
  support: {
    title: 'Support Desk',
    createTicket: 'Gumawa ng Support Ticket',
    myTickets: 'Aking Mga Ticket',
    ticketNumber: 'Ticket Number',
    subject: 'Paksa',
    category: 'Kategorya',
    priority: 'Priority',
    status: 'Status',
    createdAt: 'Ginawa Noong',
    lastUpdated: 'Huling Na-update',
    messages: 'Mga Mensahe',
    addMessage: 'Magdagdag ng Mensahe',
    attachFile: 'I-attach ang File',
    send: 'Ipadala',
    open: 'Bago',
    waitingForReply: 'Naghihintay ng Sagot',
    closed: 'Isinara',
    inProgress: 'Ginagawa',
    resolved: 'Naresolba',
    technical: 'Teknikal',
    general: 'Pangkalahatan',
    billing: 'Billing',
    other: 'Iba pa',
    createAndManage: 'Gumawa at pamahalaan ang inyong mga support ticket',
    totalTickets: 'Kabuuang Mga Ticket',
    waitingFor: 'Naghihintay',
    activeTickets: 'Aktibong Mga Ticket',
    archive: 'Archive',
    reply: 'Tumugon',
    typeYourReply: 'I-type ang inyong tugon...',
    dropFileHere: 'I-drop ang file dito...',
    readyToSend: 'handa nang ipadala',
    chooseFile: 'Pumili ng File',
    fileFormats: 'PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF (Max 10MB)',
    noTickets: 'Walang nahanap na ticket',
    noTicketsDescription: 'Wala pa kayong gumawa ng anumang support ticket. I-click ang "Gumawa ng Support Ticket" para magsimula.'
  },

  // Profile
  profile: {
    title: 'Profile',
    personalInfo: 'Personal na Impormasyon',
    contactInfo: 'Contact Information',
    disabilityInfo: 'Impormasyon sa Disability',
    firstName: 'Unang Pangalan',
    lastName: 'Apelyido',
    middleName: 'Gitnang Pangalan',
    birthDate: 'Petsa ng Kapanganakan',
    gender: 'Kasarian',
    civilStatus: 'Civil Status',
    contactNumber: 'Contact Number',
    barangay: 'Barangay',
    city: 'Lungsod',
    province: 'Lalawigan',
    zipCode: 'Zip Code',
    disabilityType: 'Uri ng Disability',
    disabilityDescription: 'Paglalarawan ng Disability',
    editProfile: 'I-edit ang Profile',
    saveChanges: 'I-save ang Mga Pagbabago',
    cancelEdit: 'Kanselahin ang Edit',
    profileUpdated: 'Matagumpay na na-update ang profile',
    updateFailed: 'Nabigo ang pag-update ng profile'
  },

  // Documents
  documents: {
    title: 'Document Management',
    uploadDocument: 'I-upload ang Dokumento',
    requiredDocuments: 'Mga Kinakailangang Dokumento',
    uploadedDocuments: 'Mga Na-upload na Dokumento',
    documentType: 'Uri ng Dokumento',
    fileName: 'Pangalan ng File',
    fileSize: 'Laki ng File',
    uploadDate: 'Petsa ng Upload',
    status: 'Status',
    actions: 'Mga Aksyon',
    download: 'I-download',
    view: 'Tingnan',
    delete: 'Tanggalin',
    replace: 'Palitan',
    medicalCertificate: 'Medical Certificate',
    birthCertificate: 'Birth Certificate',
    validId: 'Valid ID',
    barangayClearance: 'Barangay Clearance',
    photo: 'Larawan',
    other: 'Iba pa',
    uploadSuccess: 'Matagumpay na na-upload ang dokumento',
    uploadFailed: 'Nabigo ang pag-upload ng dokumento',
    deleteSuccess: 'Matagumpay na natanggal ang dokumento',
    deleteFailed: 'Nabigo ang pagtanggal ng dokumento',
    required: 'Kinakailangan',
    fileTypes: 'Mga uri ng file',
    maxSize: 'Pinakamalaking laki',
    notes: 'Mga tala',
    noDescription: 'Walang paglalarawan na ibinigay',
    documentPreview: 'Preview ng Dokumento',
    preview: 'Preview',
    howToUpload: 'Paano Mag-upload ng Mga Dokumento',
    understandingRequirements: 'Pag-unawa sa Mga Kinakailangan sa Dokumento',
    understandingRequirementsDesc: 'Ipinapakita ng bawat document card ang pangalan ng dokumento, kung ito ay kinakailangan o opsyonal, tinatanggap na mga uri ng file (PDF, JPG, PNG), at pinakamalaking laki ng file. Dapat ma-upload ang mga kinakailangang dokumento para maproseso ang inyong application.',
    uploadingDocument: 'Pag-upload ng Dokumento',
    uploadingDocumentDesc: 'I-click ang button na \'I-upload ang Dokumento\' sa document card. Piliin ang file mula sa inyong device. Siguraduhing tumugma ang file sa kinakailangang format at laki. Maghintay hanggang matapos ang upload - makikita ninyo ang success message.',
    checkingStatus: 'Pag-check ng Status ng Dokumento',
    checkingStatusDesc: 'Pagkatapos mag-upload, ipapakita ng mga dokumento ang status: \'Naghihintay\' (naghihintay ng review), \'Naaprubahan\' (tinanggap), o \'Tinanggihan\' (kailangan ng correction). Makakatanggap kayo ng notifications tungkol sa mga pagbabago sa status ng dokumento.',
    viewingReplacing: 'Pagtingin o Pagpalit ng Mga Dokumento',
    viewingReplacingDesc: 'I-click ang \'Tingnan\' para makita ang inyong na-upload na dokumento. I-click ang \'Palitan\' para mag-upload ng bagong bersyon kung kailangan. Maaari din ninyong i-check ang upload date at anumang notes mula sa reviewers.',
    ifRejected: 'Kung Tinanggihan ang Inyong Dokumento',
    ifRejectedDesc: 'Kung tinanggihan ang isang dokumento, tingnan ang notes section para sa mga detalye tungkol sa kung ano ang kailangang i-correct. Mag-upload ng corrected version sa pamamagitan ng pag-click sa \'Palitan\'. Maaari din kayong makipag-ugnayan sa support para sa tulong.',
    newDocumentRequirements: 'Mga Bagong Kinakailangan sa Dokumento',
    selectFile: 'Pumili ng File',
    selected: 'Napili',
    size: 'Laki',
    missing: 'Nawawala',
    approved: 'Naaprubahan',
    rejected: 'Tinanggihan'
  }
};
