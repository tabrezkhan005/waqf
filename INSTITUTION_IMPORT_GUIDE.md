# Institution Import Guide

## Overview
This guide explains how to import institutions from Excel files district by district.

## Excel Files Location
All district Excel files are located in: `assets/Waqf Data/`

## Available Districts
The script supports the following districts (mapped from Excel file names):
- **VSKP.xlsx** → Visakhapatnam
- **Nellore.xlsx** → Nellore
- **Palnadu.xlsx** → Palnadu
- **Guntur.xlsx** → Guntur
- **Krishna.xlsx** → Krishna
- **Kurnool.xlsx** → Kurnool
- **Nandyal.xlsx** → Nandyal
- **NTR.xlsx** → NTR
- **Prakasam.xlsx** → Prakasam
- **SSS.xlsx** → Sri Sathya Sai
- **WG.xlsx** → West Godavari
- **YSR.xlsx** → YSR Kadapa District

## Excel File Format

### Required Columns:
1. **AP Gazette No** (or similar: "AP No", "Gazette No", "Sl.No")
2. **Institution Name** (or similar: "Name", "Name of Institution", "Waqf Name")

### Optional Columns:
3. **Mandal** - Mandal name
4. **Village** - Village name

### Column Detection:
The script automatically detects columns by searching for keywords:
- AP No: searches for "ap", "gazette", "sl.no", "serial"
- Name: searches for "institution", "name", "waqf"
- Mandal: searches for "mandal"
- Village: searches for "village"

If columns aren't found by name, it uses common positions:
- Column 1 (index 1): AP No
- Column 2 (index 2): Institution Name
- Column 3 (index 3): Mandal
- Column 4 (index 4): Village

## Running the Import

### Prerequisites:
1. Python 3.7+ installed
2. Required packages: `pandas`, `openpyxl`, `supabase`
3. Environment variables set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

### Installation:
```bash
pip install pandas openpyxl supabase
```

### Run the Script:
```bash
# From project root
python scripts/import_institutions_from_excel.py
```

### Environment Setup:
Create/update `.env` file:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Or set environment variables:
```bash
# Windows PowerShell
$env:SUPABASE_URL="https://your-project-ref.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Linux/Mac
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

## What the Script Does

1. **Reads all Excel files** from `assets/Waqf Data/` folder
2. **Maps file names** to database district names
3. **Detects columns** automatically (by name or position)
4. **Extracts institution data**:
   - AP Gazette No (required, unique)
   - Institution Name (required)
   - Mandal (optional)
   - Village (optional)
5. **Checks for existing institutions** by `ap_gazette_no`
6. **Creates new** or **updates existing** institutions
7. **Links to correct district** via `district_id`

## Output

The script provides:
- Progress for each district
- Number of institutions created
- Number of institutions updated
- Error count and details
- Final summary with totals

## Example Output:
```
================================================================================
Processing: VSKP.xlsx -> Visakhapatnam
================================================================================
  [INFO] Found 68 rows in Excel file
  [INFO] Column mapping:
    AP No: Column 1 (AP Gazette No)
    Name: Column 2 (Institution Name)
    Mandal: Column 3 (Mandal)
    Village: Column 4 (Village)

  [SUMMARY] Visakhapatnam:
    Created: 65
    Updated: 0
    Errors: 0
```

## Database Schema

Institutions are stored with:
- `id` (UUID, auto-generated)
- `district_id` (UUID, linked to districts table)
- `ap_gazette_no` (text, required, unique)
- `name` (text, required)
- `mandal` (text, optional)
- `village` (text, optional)
- `is_active` (boolean, default: true)
- `created_at` (timestamp, auto-generated)

## Troubleshooting

### Error: "District not found"
- Check that district name in database matches the mapping
- Verify district exists in `districts` table

### Error: "Duplicate ap_gazette_no"
- The script handles this by updating existing records
- If error persists, check for data inconsistencies

### Error: "Column not found"
- The script tries to auto-detect columns
- Check Excel file structure matches expected format
- You may need to adjust column indices in the script

### Missing Data
- Script skips rows with missing AP No or Institution Name
- Optional fields (Mandal, Village) can be null

## Next Steps

After importing institutions:
1. Verify data in database
2. Import DCB data for each institution
3. Link institutions to inspectors
4. Test inspector access to their district's institutions

## Manual Entry Alternative

If you prefer to enter institutions manually:
1. Go to Admin Panel → Inspectors & Institutions → Institutions
2. Click "Add Institution"
3. Fill in:
   - Institution Name
   - AP Gazette No
   - District (select from dropdown)
   - Mandal (optional)
   - Village (optional)
4. Click "Create Institution"
