# Add 400 Dispersed Data Seeder

This seeder generates **400 data entries** distributed across different functions and systems in the PWD Management System.

## Overview

The seeder creates realistic sample data across multiple system components:

- **PWD Members & Applications**: ~100 entries
  - Creates user accounts, PWD member records, and applications
  - Distributed across all 18 barangays in Cabuyao
  - Various application statuses (Approved, Pending, Under Review, etc.)

- **Support Tickets**: ~80 entries
  - Includes ticket messages (initial inquiry + admin replies)
  - Various statuses: open, in_progress, resolved, closed
  - Different priorities and categories

- **Benefit Claims**: ~80 entries
  - Links to existing benefits and PWD members
  - Statuses: claimed, unclaimed, pending

- **Complaints**: ~50 entries
  - Various complaint types and statuses
  - Linked to PWD members

- **ID Renewals**: ~40 entries
  - Renewal applications with different statuses
  - Includes reviewer information for processed renewals

- **Announcements**: ~30 entries
  - Various announcement types and priorities
  - Different target audiences

- **Audit Logs**: ~20 entries
  - System activity logs
  - Various user actions

**Total: ~400 entries**

## Usage

### Method 1: Run the seeder independently

```bash
cd pwd-backend
php artisan db:seed --class=Add400DispersedDataSeeder
```

### Method 2: Enable it in DatabaseSeeder

Edit `database/seeders/DatabaseSeeder.php` and uncomment the line:

```php
// Uncomment the line below to add 400 dispersed data entries across the system
$this->call([Add400DispersedDataSeeder::class]);
```

Then run:

```bash
php artisan db:seed
```

## Default Credentials

All generated PWD member accounts use:
- **Password**: `password123`
- **Role**: `PWDMember`
- **Status**: `active`

## Data Distribution

### Application Statuses
- 60% Approved (creates PWD member records)
- 20% Pending Admin Approval
- 10% Under Review
- 5% Needs Additional Documents
- 5% Rejected

### Support Ticket Statuses
- 40% Open
- 30% In Progress
- 20% Resolved
- 10% Closed

### Support Ticket Priorities
- 30% Low
- 40% Medium
- 25% High
- 5% Urgent

### Benefit Claim Statuses
- 60% Claimed
- 30% Unclaimed
- 10% Pending

## Features

- **Realistic Data**: Uses Filipino names, addresses, and phone numbers
- **Distributed Across Barangays**: All 18 barangays in Cabuyao are represented
- **Diverse Disability Types**: All 13 disability types are included
- **Various Statuses**: Realistic distribution of statuses across all data types
- **Linked Data**: All entries are properly linked (e.g., tickets to members, claims to benefits)
- **Batch Processing**: Efficient batch insertion for better performance

## Notes

- The seeder processes data in batches of 50 for performance
- All emails are unique (format: `pwd{userID}_{timestamp}_{random}@sample.pwd.local`)
- Usernames are unique (format: `pwd_{userID}_{name}_{userID}`)
- PWD IDs are generated as `PWD-{6-digit-userID}`
- Reference numbers are generated as `REF-{year}-{6-digit-userID}`
- Support ticket numbers are generated as `SUP-{6-digit-ID}`
- Dates are randomly distributed over the past 2 years
- Phone numbers follow Philippine mobile format (09XXXXXXXXX)

## Verification

After running the seeder, verify the data appears in:

1. **Admin Dashboard**: Check statistics cards and charts
2. **PWD Records**: View all PWD members and applications
3. **Support Desk**: View support tickets and messages
4. **Benefits/Ayuda**: View benefits and benefit claims
5. **Complaints**: View complaint records
6. **ID Renewals**: View renewal applications
7. **Announcements**: View system announcements
8. **Audit Logs**: View system activity logs

## Integration with Existing Data

The seeder:
- Works with existing data (doesn't duplicate)
- Links to existing benefits if available
- Creates default benefits if none exist
- Uses existing admin users for announcements and reviews
- Properly handles foreign key relationships

