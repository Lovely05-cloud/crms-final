# Error Handlers Summary

This document lists all error handlers that have been added to the codebase using `toastService.error()` for user-friendly error notifications.

## Services

### 1. applicationService.js
- **getAll()** - Error handler: "Failed to fetch applications"
- **create()** - Error handler: "Failed to create application"
- **update()** - Error handler: "Failed to update application"
- **delete()** - Error handler: "Failed to delete application"
- **getById()** - Error handler: "Failed to fetch application"
- **updateStatus()** - Error handler: "Failed to update application status"
- **getByStatus()** - Error handler: "Failed to fetch applications by status"

### 2. announcementService.js
- **getAll()** - Error handler: "Failed to fetch announcements"
- **getAdminAnnouncements()** - Error handler: "Failed to fetch admin announcements"
- **create()** - Error handler: "Failed to create announcement"
- **update()** - Error handler: "Failed to update announcement"
- **delete()** - Error handler: "Failed to delete announcement"
- **getById()** - Error handler: "Failed to fetch announcement"
- **getByAudience()** - Error handler: "Failed to fetch announcements by audience"
- **getFilteredForPWDMember()** - Error handler: "Failed to fetch announcements"

### 3. benefitService.js
- **getAll()** - Error handler: "Failed to fetch benefits"
- **getById()** - Error handler: "Failed to fetch benefit"
- **create()** - Error handler: "Failed to create benefit"
- **update()** - Error handler: "Failed to update benefit"
- **delete()** - Error handler: "Failed to delete benefit"
- **getClaims()** - Error handler: "Failed to fetch benefit claims"

### 4. dashboardService.js
- **getStats()** - Error handler: "Failed to fetch dashboard statistics"
- **getApplications()** - Error handler: "Failed to fetch applications"
- **getRecentActivities()** - Error handler: "Failed to fetch recent activities"
- **getBarangayContacts()** - Error handler: "Failed to fetch barangay contacts"

### 5. documentService.js
- **getActiveDocumentTypes()** - Error handler: "Failed to fetch document types"

### 6. pwdMemberService.js
- **getAll()** - Error handler: "Failed to fetch PWD members"
- **getById()** - Error handler: "Failed to fetch PWD member"
- **create()** - Error handler: "Failed to create PWD member"
- **update()** - Error handler: "Failed to update PWD member"
- **delete()** - Error handler: "Failed to delete PWD member"
- **getApplications()** - Error handler: "Failed to fetch PWD member applications"
- **getComplaints()** - Error handler: "Failed to fetch PWD member complaints"
- **getBenefitClaims()** - Error handler: "Failed to fetch PWD member benefit claims"
- **getFiltered()** - Error handler: "Failed to fetch filtered PWD members"
- **claimCard()** - Error handler: "Failed to claim PWD card"
- **renewCard()** - Error handler: "Failed to renew PWD card"

### 7. passwordService.js
- **resetPassword()** - Error handler: "Password reset failed"
- **changePassword()** - Error handler: "Password change failed"
- **adminResetUserPassword()** - Error handler: "Admin password reset failed" (also includes validation error: "User not found with the provided email")

### 8. qrCodeService.js
- **generateMemberQRCode()** - Error handler: "Failed to generate QR code" (also includes validation error: "Member data is required to generate QR code")

### 9. reportsService.js
- **getAllReports()** - Error handler: "Failed to fetch reports"
- **getReport()** - Error handler: "Failed to fetch report"
- **generateReport()** - Error handler: "Failed to generate report"
- **getBarangayStats()** - Error handler: "Failed to fetch barangay statistics"
- **getPWDMasterlist()** - Error handler: "Failed to fetch PWD masterlist"
- **getApplicationStatusReport()** - Error handler: "Failed to fetch application status report"
- **getDisabilityDistribution()** - Error handler: "Failed to fetch disability distribution"
- **getAgeGroupAnalysis()** - Error handler: "Failed to fetch age group analysis"
- **getBenefitDistribution()** - Error handler: "Failed to fetch benefit distribution"
- **getMonthlyActivitySummary()** - Error handler: "Failed to fetch monthly activity summary"
- **getCityWideStats()** - Error handler: "Failed to fetch city-wide statistics"
- **getBarangayPerformance()** - Error handler: "Failed to fetch barangay performance"
- **downloadReport()** - Error handler: "Failed to download report"
- **createReport()** - Error handler: "Failed to create report"
- **updateReport()** - Error handler: "Failed to update report"
- **deleteReport()** - Error handler: "Failed to delete report"

### 10. supportService.js
- **getTickets()** - Error handler: "Failed to fetch support tickets"
- **getArchivedTickets()** - Error handler: "Failed to fetch archived tickets"
- **getTicket()** - Error handler: "Failed to fetch support ticket"
- **createTicket()** - Error handler: "Failed to create support ticket"
- **updateTicket()** - Error handler: "Failed to update support ticket"
- **patchTicket()** - Error handler: "Failed to update support ticket status"
- **deleteTicket()** - Error handler: "Failed to delete support ticket"
- **downloadAttachment()** - Error handler: "Failed to download attachment"
- **forceDownloadAttachment()** - Error handler: "Failed to force download attachment"
- **addMessage()** - Error handler: "Failed to send message"
- **admin.updateStatus()** - Error handler: "Failed to update ticket status"
- **admin.updatePriority()** - Error handler: "Failed to update ticket priority"
- **admin.markResolved()** - Error handler: "Failed to mark ticket as resolved"
- **admin.markClosed()** - Error handler: "Failed to mark ticket as closed"
- **admin.markInProgress()** - Error handler: "Failed to mark ticket as in progress"
- **pwdMember.markResolved()** - Error handler: "Failed to mark ticket as resolved"
- **pwdMember.markClosed()** - Error handler: "Failed to mark ticket as closed"

### 11. analyticsService.js
- **getAutomatedSuggestions()** - Error handler: "Failed to fetch automated suggestions"
- **getCategorySuggestions()** - Error handler: "Failed to fetch [category] suggestions"
- **getSuggestionSummary()** - Error handler: "Failed to fetch suggestion summary"
- **getHighPrioritySuggestions()** - Error handler: "Failed to fetch high priority suggestions"
- **getTransactionAnalysis()** - Error handler: "Failed to fetch transaction analysis"

### 12. filePreviewService.js
- **openPreview()** - Error handler: "Failed to open file preview" (also includes validation error: "Invalid file preview type")
- **getPreviewUrl()** - Error handler: "Failed to get preview URL" (also includes validation error: "Invalid file preview type")
- **downloadFile()** - Error handler: "Failed to download file"

## Contexts

### 13. AuthContext.js
- **login()** - Error handler: "Login failed"
- **register()** - Error handler: "Registration failed"

## Toast Notification Type

All error handlers use `toastService.error()` which displays a **red error toast notification** at the top center of the screen. The toast automatically disappears after 6 seconds (default duration for error toasts).

## Error Message Format

All error messages follow the pattern:
```
"[Action] failed: [error message]"
```

Where:
- `[Action]` describes what operation failed (e.g., "Failed to fetch", "Failed to create")
- `[error message]` is either the error message from the API response or "Unknown error" as a fallback

## Total Count

- **Total Functions with Error Handlers**: 70+
- **Total Service Files Updated**: 12
- **Total Context Files Updated**: 1

## Notes

- All error handlers maintain the original error logging to console for debugging purposes
- Error handlers re-throw the error to allow calling code to handle it if needed
- Error messages are user-friendly and avoid technical jargon
- The toast service automatically handles initialization and fallback to console if not initialized


