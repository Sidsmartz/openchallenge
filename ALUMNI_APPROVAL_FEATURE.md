# Alumni Account Approval Feature

## Overview
Alumni accounts with company emails (non-Gmail) now require admin approval before gaining full access to the platform.

## How It Works

### For Alumni Users
1. **Sign Up**: Alumni sign up with their company email (e.g., @company.com)
2. **Complete Onboarding**: Fill out profile information including:
   - Full Name
   - Graduating Batch
   - Current Company
   - Current Job Title
   - Mentorship Availability
3. **Pending Status**: After completing onboarding, alumni with non-Gmail emails see a "Account Under Review" page
4. **Notification**: Once approved, alumni receive a notification and gain full access
5. **Auto-Refresh**: The pending page checks approval status every 10 seconds

### For Admins
1. **Admin Dashboard**: Navigate to Admin Panel → Alumni Approval tab
2. **Review Pending Accounts**: See all pending alumni with their:
   - Name and email
   - Graduating batch
   - Current company and position
   - Application date
3. **Take Action**:
   - **Approve**: Grants full access and sends approval notification
   - **Reject**: Denies access and sends rejection notification

## Technical Implementation

### Database Changes
- Added `approval_status` column to `users` table (values: 'pending', 'approved', 'rejected')
- Default value is 'approved' for existing users
- Alumni with non-Gmail emails automatically set to 'pending'

### New API Endpoints
- `GET /api/admin/pending-alumni` - Fetch pending alumni accounts
- `POST /api/admin/approve-alumni` - Approve or reject alumni accounts

### New Pages
- `/pending` - Pending approval page for alumni users

### Protected Routes
All main pages now check approval status:
- Home page (`/`)
- Hub page (`/hub`)
- Community page (`/community`)

Alumni with pending/rejected status are redirected to `/pending` page.

## Email Validation Logic
- **Gmail accounts** (@gmail.com): Auto-approved, no review needed
- **Company emails** (any other domain): Requires admin approval
- **Admin emails**: Bypass all checks (defined in ADMIN_EMAILS env variable)

## Notifications
- **Approval**: "Account Approved! 🎉" - User gains full access
- **Rejection**: "Account Application Update" - User directed to contact support

## Environment Variables
No new environment variables required. Uses existing:
- `ADMIN_EMAILS` - List of admin email addresses
- `ALLOWED_DOMAINS` - List of allowed email domains

## Future Enhancements
- Bulk approval/rejection
- Email notifications (in addition to in-app)
- Approval reason/notes field
- Alumni verification via LinkedIn or other methods
