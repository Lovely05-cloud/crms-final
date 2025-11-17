# ID Renewal System Implementation

## Overview
This document describes the comprehensive ID Renewal system implemented for PWD members. The system allows members to renew their ID cards by submitting their old ID card image and a recent medical certificate, with admin approval workflow.

## Features

### 1. **30-Day Expiration Notification**
- Members are automatically notified 30 days before their ID card expires
- Notifications are sent via the existing notification system
- A scheduled task runs daily at 9:00 AM to check for expiring cards

### 2. **Renewal Request Submission**
- Members can submit renewal requests through the API
- Required documents:
  - **Old ID Card Image**: Photo or scan of the surrendered ID card (JPEG, JPG, PNG, PDF, max 5MB)
  - **Medical Certificate**: Recent medical certificate (JPEG, JPG, PNG, PDF, max 5MB)
- System prevents duplicate pending requests
- Only members with claimed cards can submit renewal requests

### 3. **Admin Review Workflow**
- Admins can view all renewal requests
- Filter by status: pending, approved, rejected
- View renewal details including uploaded documents
- Approve or reject requests with notes
- When approved, the card expiration date is automatically extended by 3 years

### 4. **Member Notifications**
- Notification when renewal request is submitted
- Notification when renewal is approved (with new expiration date)
- Notification when renewal is rejected (with rejection reason)

## Database Structure

### `id_renewals` Table
- `id`: Primary key
- `member_id`: Foreign key to `pwd_members.userID`
- `old_card_image_path`: Path to uploaded old ID card image
- `medical_certificate_path`: Path to uploaded medical certificate
- `status`: Enum ('pending', 'approved', 'rejected')
- `notes`: Admin notes or rejection reason
- `reviewed_by`: Foreign key to `users.userID` (admin who reviewed)
- `submitted_at`: Timestamp when request was submitted
- `reviewed_at`: Timestamp when request was reviewed
- `created_at`, `updated_at`: Timestamps

## API Endpoints

### Member Endpoints

#### Submit Renewal Request
```
POST /api/id-renewals/submit
Content-Type: multipart/form-data

Body:
- old_card_image: File (required)
- medical_certificate: File (required)

Response:
{
  "success": true,
  "message": "Renewal request submitted successfully",
  "renewal": { ... }
}
```

#### Get My Renewal Status
```
GET /api/id-renewals/my-status

Response:
{
  "success": true,
  "renewal": { ... },
  "card_info": {
    "card_claimed": true,
    "card_issue_date": "2022-01-01",
    "card_expiration_date": "2025-01-01",
    "days_until_expiration": 45,
    "is_expiring_soon": false
  }
}
```

### Admin Endpoints

#### Get All Renewals
```
GET /api/id-renewals?status=pending

Query Parameters:
- status: 'all', 'pending', 'approved', 'rejected' (default: 'all')

Response:
{
  "success": true,
  "renewals": [ ... ],
  "counts": {
    "total": 10,
    "pending": 5,
    "approved": 3,
    "rejected": 2
  }
}
```

#### Get Specific Renewal
```
GET /api/id-renewals/{id}

Response:
{
  "success": true,
  "renewal": { ... }
}
```

#### Approve Renewal
```
POST /api/id-renewals/{id}/approve

Body:
{
  "notes": "Optional approval notes"
}

Response:
{
  "success": true,
  "message": "Renewal approved successfully",
  "renewal": { ... }
}
```

#### Reject Renewal
```
POST /api/id-renewals/{id}/reject

Body:
{
  "notes": "Required rejection reason"
}

Response:
{
  "success": true,
  "message": "Renewal rejected",
  "renewal": { ... }
}
```

#### Download File
```
GET /api/id-renewals/{id}/file/{type}

Parameters:
- type: 'old_card' or 'medical_certificate'

Response: File download
```

## Scheduled Tasks

### Daily Card Renewal Check
- **Command**: `pwd:check-card-renewals`
- **Schedule**: Daily at 9:00 AM
- **Function**: 
  - Checks for cards expiring within 30 days
  - Creates notifications for members
  - Prevents duplicate notifications (checks last 7 days)

## Models

### IDRenewal Model
- Relationships:
  - `member()`: Belongs to PWDMember
  - `reviewer()`: Belongs to User (admin)
- Scopes:
  - `pending()`, `approved()`, `rejected()`
- Helper Methods:
  - `isPending()`, `isApproved()`, `isRejected()`

### PWDMember Model
- Added relationship:
  - `idRenewals()`: Has many IDRenewal

## File Storage

- Renewal documents are stored in: `storage/app/public/id-renewals/YYYY/MM/DD/`
- File naming convention:
  - Old card: `old-card_{memberId}_{timestamp}.{ext}`
  - Medical certificate: `medical-cert_{memberId}_{timestamp}.{ext}`

## Workflow

### Member Workflow
1. Member receives notification 30 days before expiration
2. Member submits renewal request with:
   - Old ID card image
   - Recent medical certificate
3. Member receives confirmation notification
4. Member waits for admin review
5. Member receives approval/rejection notification

### Admin Workflow
1. Admin views pending renewal requests
2. Admin reviews uploaded documents
3. Admin approves or rejects with notes
4. If approved:
   - Card expiration date extended by 3 years
   - Card issue date updated to renewal date
   - Member notified
5. If rejected:
   - Member notified with rejection reason
   - Member can submit a new request

## Security & Validation

- Only authenticated members can submit renewal requests
- Only members with claimed cards can renew
- Prevents duplicate pending requests
- File type validation (JPEG, JPG, PNG, PDF)
- File size limit (5MB per file)
- Admin-only endpoints for review actions
- Transaction safety for approval/rejection

## Next Steps (Frontend Implementation)

### Member Frontend
1. Create ID Renewal page component
2. Display card expiration status
3. Upload form for old card and medical certificate
4. Show renewal request status
5. Display notifications

### Admin Frontend
1. Create ID Renewals management page
2. List all renewal requests with filters
3. View renewal details and documents
4. Approve/Reject interface with notes
5. Dashboard widget showing pending renewals count

## Migration

To apply the database changes, run:
```bash
php artisan migrate
```

## Testing

### Manual Testing Steps
1. Set a member's card expiration date to within 30 days
2. Run the command: `php artisan pwd:check-card-renewals`
3. Verify notification is created
4. Submit a renewal request via API
5. Verify files are uploaded correctly
6. Approve/reject via admin endpoint
7. Verify card expiration date is updated on approval

## Notes

- The system integrates with the existing notification system
- File storage uses Laravel's public disk
- All timestamps are stored in UTC
- The renewal process maintains audit trail through `reviewed_by` and `reviewed_at` fields

