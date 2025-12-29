# Database Connection Verification & District Data Entry Guide

## ✅ Issues Fixed

### 1. **UUID/Integer Mismatch (CRITICAL)**
   - **Problem**: Code was using `parseInt()` on district_id, but database uses UUID
   - **Fixed Files**:
     - `app/admin/inspectors-institutions/inspectors/add.tsx` - Removed parseInt
     - `app/admin/inspectors-institutions/inspectors/edit.tsx` - Removed parseInt
     - `app/admin/inspectors-institutions/institutions/add.tsx` - Removed parseInt, fixed schema
     - `app/admin/inspectors-institutions/institutions/edit.tsx` - Removed parseInt, fixed schema

### 2. **Institutions Table Schema Mismatch**
   - **Problem**: Code was using fields that don't exist in production schema
   - **Fixed**: Updated to match production schema (migration 019):
     - Removed: `code`, `address`, `contact_name`, `contact_phone`
     - Using: `ap_gazette_no`, `mandal`, `village` (matches actual schema)

### 3. **District Management Screen**
   - **Created**: `app/admin/inspectors-institutions/districts.tsx`
   - **Features**:
     - View all districts
     - Add new districts
     - Delete districts (with validation)
     - Refresh functionality

## 📋 Database Schema Verification

### Districts Table (UUID-based)
```sql
CREATE TABLE public.districts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### Institutions Table
```sql
CREATE TABLE public.institutions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   uuid NOT NULL REFERENCES public.districts(id),
  ap_gazette_no text NOT NULL UNIQUE,
  name          text NOT NULL,
  mandal        text,
  village       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### Profiles Table
```sql
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name   text NOT NULL,
  role        text NOT NULL,
  district_id uuid REFERENCES public.districts(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## ✅ How to Enter District Data

### Option 1: Using the Admin Panel (Recommended)
1. Navigate to **Admin Panel** → **Inspectors & Institutions**
2. Click on **"Districts"** card
3. Click the **"+"** button to add a new district
4. Enter the district name
5. Click **"Add District"**

### Option 2: Direct Database Insert
```sql
INSERT INTO public.districts (name)
VALUES ('DISTRICT_NAME');
```

### Option 3: Using Python Scripts
The import scripts automatically create districts when processing Excel files.

## 🔧 Database Connection Setup

### Required Environment Variables

Create/update `.env` file in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### For Python Scripts (Data Import)
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Verification Steps

1. **Check Supabase Client Connection**:
   - File: `lib/supabase/client.ts`
   - Verifies environment variables on app start
   - Throws error if missing

2. **Test Connection**:
   ```typescript
   // In any component
   const { data, error } = await supabase
     .from('districts')
     .select('*')
     .limit(1);

   if (error) {
     console.error('Connection error:', error);
   } else {
     console.log('Connection successful!');
   }
   ```

## 📝 All District Queries Verified

All district queries across the codebase now correctly:
- ✅ Use UUID strings (not integers)
- ✅ Match the production schema
- ✅ Handle district_id as string/UUID

### Files Verified:
- ✅ `app/admin/inspectors-institutions/inspectors/add.tsx`
- ✅ `app/admin/inspectors-institutions/inspectors/edit.tsx`
- ✅ `app/admin/inspectors-institutions/institutions/add.tsx`
- ✅ `app/admin/inspectors-institutions/institutions/edit.tsx`
- ✅ `app/admin/inspectors-institutions/districts.tsx` (NEW)
- ✅ All district list queries use correct UUID format

## 🎯 Ready for Data Entry

The system is now ready for district data entry:

1. **Add Districts**: Use the new Districts management screen
2. **Add Inspectors**: Each inspector must be assigned to a district (UUID)
3. **Add Institutions**: Each institution must be assigned to a district (UUID)
4. **All relationships**: Properly linked using UUID foreign keys

## ⚠️ Important Notes

1. **District Names Must Be Unique**: The database enforces unique district names
2. **Cannot Delete Districts in Use**: Districts with assigned inspectors/institutions cannot be deleted
3. **UUID Format**: All district IDs are UUIDs (not integers) - never use parseInt()
4. **AP Gazette No**: Required for institutions and must be unique

## 🔍 Troubleshooting

### If you see "parseInt" errors:
- Check that all district_id assignments use the UUID string directly
- Never use `parseInt()` on district_id

### If district creation fails:
- Check that district name is unique
- Verify database connection
- Check RLS (Row Level Security) policies allow inserts

### If institutions fail to save:
- Ensure `ap_gazette_no` is provided and unique
- Verify `district_id` is a valid UUID from districts table
- Check that district exists before creating institution
