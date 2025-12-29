# Inspector DCB Table Mapping Verification

## Overview
Inspectors are assigned to districts and access district-specific DCB tables. This document verifies the mapping is correct.

## Inspector Login Flow

1. **Inspector logs in** → `AuthContext` loads profile with `district_id`
2. **Profile contains**:
   - `id`: Inspector's user ID
   - `full_name`: Inspector's name
   - `role`: "inspector"
   - `district_id`: UUID of assigned district

## District to Table Name Mapping

### Function: `districtNameToTableName(districtName: string)`

**Process:**
1. Convert to lowercase
2. Replace spaces, dots, hyphens with underscores
3. Remove apostrophes
4. Collapse multiple underscores to single
5. Remove leading/trailing underscores
6. Prefix with `dcb_`

**Examples:**
- "Chittoor" → `dcb_chittoor` ✓
- "Alluri Seetaramaraju" → `dcb_alluri_seetaramaraju` ✓
- "Dr. B.R. A.Konaseema" → `dcb_dr_b_r_a_konaseema` ✓
- "East Godavari" → `dcb_east_godavari` ✓
- "YSR Kadapa District" → `dcb_ysr_kadapa_district` ✓

## Inspector Collection Workflow

### 1. Search Institutions (`app/inspector/search/index.tsx`)
- ✅ Filters institutions by `profile.district_id`
- ✅ Only shows institutions from inspector's district

### 2. View/Edit Collection (`app/inspector/search/collection.tsx`)
- ✅ Gets district name from `profile.district_id` (not institution's district)
- ✅ Maps district name to table name using `districtNameToTableName()`
- ✅ Queries district-specific DCB table using `ap_gazette_no`
- ✅ Updates district-specific DCB table when saving
- ✅ Calculates balances correctly:
  - `balance_arrears = demand_arrears - collection_arrears`
  - `balance_current = demand_current - collection_current`
  - `balance_total = balance_arrears + balance_current`

### 3. Save Collection
- ✅ Updates `collection_arrears`, `collection_current`, `collection_total`
- ✅ Updates `balance_arrears`, `balance_current`, `balance_total`
- ✅ Updates `remarks`
- ✅ Creates/updates record in `collections` table (separate from DCB)

### 4. Send for Review
- ✅ Updates DCB in district table
- ✅ Sets collection status to `sent_to_accounts`
- ✅ Accounts team can review

## Verification Queries

### Check Inspector District Assignment
```sql
SELECT
    p.id as inspector_id,
    p.full_name,
    d.name as district_name,
    'dcb_' || lower(replace(replace(replace(replace(replace(d.name, ' ', '_'), '.', '_'), '-', '_'), '''', ''), '__', '_')) as table_name
FROM profiles p
JOIN districts d ON p.district_id = d.id
WHERE p.role = 'inspector';
```

### Verify Table Exists
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'dcb_%'
ORDER BY table_name;
```

## Key Points

1. ✅ **Inspector's district_id** is used to determine which DCB table to access
2. ✅ **District name** is fetched from `districts` table using `district_id`
3. ✅ **Table name** is generated using `districtNameToTableName()` function
4. ✅ **DCB lookup** uses `ap_gazette_no` (not `institution_id`)
5. ✅ **All updates** go to the correct district-specific table
6. ✅ **Balance calculations** are performed correctly and saved

## Data Flow

```
Inspector Login
    ↓
Profile Loaded (with district_id)
    ↓
Search Institutions (filtered by district_id)
    ↓
Select Institution
    ↓
Get District Name (from profile.district_id)
    ↓
Map to Table Name (districtNameToTableName)
    ↓
Query District DCB Table (using ap_gazette_no)
    ↓
Display/Edit DCB Data
    ↓
Save/Update District DCB Table
    ↓
Create/Update Collection Record
```

## Security

- ✅ Inspectors can only see institutions from their district
- ✅ Inspectors can only access their district's DCB table
- ✅ RLS policies on district tables ensure data isolation
- ✅ No cross-district data access possible
