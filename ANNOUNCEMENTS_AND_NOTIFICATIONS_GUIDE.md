# Announcements & Notifications System Guide

## ✅ Features Implemented

### 1. **Database Schema** (`supabase/migrations/020_notifications_and_rejection_reason.sql`)

#### Notifications Table
- Stores all system notifications for users
- Types: `announcement`, `payment_review`, `payment_verified`, `payment_rejected`, `system`
- Tracks read/unread status
- Links to related entities (collections, announcements)

#### Announcements Table
- Admin-created announcements
- Target specific roles (inspector, accounts, reports) or specific users
- Optional expiration dates
- Active/inactive status

#### Collections Table Enhancement
- Added `rejection_reason` field for accounts to provide feedback when rejecting payments

### 2. **Admin Announcements Management** (`app/admin/settings/announcements.tsx`)

**Features:**
- Create announcements targeting specific roles
- View all announcements with status (active/inactive)
- Toggle announcement active status
- Delete announcements
- Optional expiration dates
- Automatic notification creation when announcement is published

**Access:**
- Admin Panel → Settings → Announcements

**Usage:**
1. Click the "+" button to create a new announcement
2. Enter title and message
3. Select target roles (inspector, accounts, reports)
4. Optionally set expiration date
5. Click "Send Announcement"
6. All users with selected roles will receive notifications

### 3. **Payment Review Notifications**

#### Automatic Notifications
- **When inspector sends payment for review:**
  - Status changes to `sent_to_accounts`
  - All accounts users receive a notification
  - Notification includes inspector name, institution name, and amount

- **When accounts verifies payment:**
  - Inspector receives "Payment Verified" notification
  - Includes institution name and amount

- **When accounts rejects payment:**
  - Inspector receives "Payment Rejected" notification
  - Includes rejection reason (if provided)
  - Inspector can see why payment was rejected

#### Database Triggers
- `notify_accounts_on_payment_review()` - Creates notifications when payment is sent
- `notify_inspector_on_payment_decision()` - Creates notifications when payment is verified/rejected
- `notify_users_on_announcement()` - Creates notifications when announcement is published

### 4. **Inspector Collection Screen Updates** (`app/inspector/search/collection.tsx`)

**New Features:**
- **Save Draft** button - Saves collection with status `pending` (local draft)
- **Send for Review** button - Sends collection to accounts with status `sent_to_accounts`
  - Automatically triggers notification to all accounts users
  - Inspector receives confirmation message

**Workflow:**
1. Inspector enters collection data
2. Uploads receipts (optional)
3. Clicks "Save Draft" to save locally, OR
4. Clicks "Send for Review" to submit to accounts
5. Accounts team receives notification immediately

### 5. **Accounts Approval Screen Updates** (`app/accounts/approvals/index.tsx`)

**New Features:**
- **Notifications Display** - Shows recent payment review notifications
- **Unread Badge** - Displays count of unread notifications in header
- **Click to View** - Click notification to navigate to collection
- **Auto-mark as Read** - Notifications marked as read when clicked
- **Pull to Refresh** - Refresh notifications and collections

**Notification Card Shows:**
- Inspector name
- Institution name
- Amount
- Timestamp
- Unread indicator (green dot)

### 6. **Accounts Verify Screen Updates** (`app/accounts/verify.tsx`)

**New Features:**
- **Rejection Reason Field** - Required when rejecting a payment
- **Expandable Section** - Click to show/hide rejection reason input
- **Validation** - Cannot reject without providing reason
- **Automatic Notification** - Inspector receives notification with rejection reason

**Workflow:**
1. Accounts reviews collection
2. If verifying: Enter challan number and date
3. If rejecting: **Must provide rejection reason**
4. Inspector receives notification with decision and reason (if rejected)

## 📋 Database Migration

Run the migration to set up the system:

```sql
-- File: supabase/migrations/020_notifications_and_rejection_reason.sql
```

This migration:
1. Adds `rejection_reason` to `collections` table
2. Creates `notifications` table
3. Creates `announcements` table
4. Sets up RLS policies
5. Creates database triggers for automatic notifications
6. Creates indexes for performance

## 🔄 Notification Flow

### Payment Review Flow
```
Inspector → Sends Payment → Status: sent_to_accounts
                              ↓
                    Database Trigger Fires
                              ↓
                    All Accounts Users Notified
                              ↓
                    Accounts Reviews Payment
                              ↓
                    [Verified] → Inspector Notified (Success)
                    [Rejected] → Inspector Notified (with reason)
```

### Announcement Flow
```
Admin → Creates Announcement → Targets Roles/Users
                              ↓
                    Database Trigger Fires
                              ↓
                    All Target Users Notified
                              ↓
                    Users See Notification in App
```

## 🎯 User Roles & Permissions

### Admin
- ✅ Create/edit/delete announcements
- ✅ View all notifications
- ✅ Send notifications to any role

### Accounts
- ✅ Receive payment review notifications
- ✅ View own notifications
- ✅ Mark notifications as read
- ✅ Provide rejection reasons

### Inspectors
- ✅ Receive payment decision notifications
- ✅ View own notifications
- ✅ Mark notifications as read
- ✅ See rejection reasons

## 📱 UI Components

### Notification Badge
- Shows unread count in header
- Red badge with number
- Click to view notifications

### Notification Card
- Shows recent notifications
- Unread indicator (green dot)
- Click to navigate to related item
- Auto-marks as read on click

### Rejection Reason Input
- Expandable section
- Required when rejecting
- Multi-line text input
- Highlighted in red when active

## 🔧 Configuration

### Notification Types
- `announcement` - Admin announcements
- `payment_review` - Payment sent for review
- `payment_verified` - Payment accepted
- `payment_rejected` - Payment rejected
- `system` - System notifications

### Target Roles
- `inspector` - All inspectors
- `accounts` - All accounts users
- `reports` - All reports users

## 📝 Best Practices

1. **Rejection Reasons:**
   - Always provide clear, specific reasons
   - Help inspectors understand what to fix
   - Be professional and constructive

2. **Announcements:**
   - Use clear, concise titles
   - Keep messages brief but informative
   - Set expiration dates for time-sensitive announcements
   - Target specific roles when possible

3. **Notifications:**
   - Check notifications regularly
   - Mark as read when reviewed
   - Use pull-to-refresh to get latest updates

## 🐛 Troubleshooting

### Notifications Not Appearing
- Check database triggers are enabled
- Verify RLS policies allow notification creation
- Check user role matches target roles

### Rejection Reason Not Saving
- Ensure field is filled before rejecting
- Check database migration applied correctly
- Verify `rejection_reason` column exists

### Announcements Not Sending
- Verify target roles are selected
- Check announcement is active
- Ensure users have matching roles

## 🚀 Next Steps

1. **Run Migration:**
   ```bash
   # Apply migration to database
   supabase migration up
   ```

2. **Test Flow:**
   - Create announcement as admin
   - Send payment as inspector
   - Verify/reject as accounts
   - Check notifications appear correctly

3. **Monitor:**
   - Check notification delivery
   - Verify triggers are working
   - Monitor database performance

## 📊 Database Schema

### Notifications
```sql
- id (uuid)
- recipient_id (uuid) → profiles.id
- sender_id (uuid) → profiles.id (nullable)
- type (text)
- title (text)
- message (text)
- related_id (text)
- related_type (text)
- is_read (boolean)
- read_at (timestamptz)
- created_at (timestamptz)
```

### Announcements
```sql
- id (uuid)
- created_by (uuid) → profiles.id
- title (text)
- message (text)
- target_roles (text[])
- target_users (uuid[])
- is_active (boolean)
- expires_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Collections (Updated)
```sql
- rejection_reason (text) -- NEW FIELD
```
