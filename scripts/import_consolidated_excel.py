"""
Import Consolidated Excel Data to Supabase
Handles all columns from the Excel file and properly maps them to database
"""

import pandas as pd
import os
import sys
from pathlib import Path
from supabase import create_client, Client
from datetime import datetime
import re
from typing import Dict, Optional, Tuple

# Supabase configuration
# IMPORTANT: Never hardcode service role keys in code. Use environment variables.
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n"
        "Example (PowerShell):\n"
        "  $env:SUPABASE_URL='https://<project-ref>.supabase.co'\n"
        "  $env:SUPABASE_SERVICE_ROLE_KEY='<service_role_key>'\n"
    )

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_receipt_challan(combined_value: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse combined receipt/challan 'no and date' format
    Example: "123/45 01-01-2024" or "123/45, 01-01-2024"
    Returns: (number, date)
    """
    if pd.isna(combined_value) or not str(combined_value).strip():
        return None, None

    value = str(combined_value).strip()

    # Try to extract date patterns (DD-MM-YYYY, DD/MM/YYYY, etc.)
    date_patterns = [
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',  # DD-MM-YYYY or DD/MM/YYYY
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',   # YYYY-MM-DD or YYYY/MM/DD
    ]

    date_match = None
    for pattern in date_patterns:
        date_match = re.search(pattern, value)
        if date_match:
            break

    if date_match:
        date_str = date_match.group(1)
        # Remove date from string to get number
        number = value.replace(date_str, '').strip().rstrip(',').strip()

        # Parse and format date
        try:
            # Try different date formats
            for fmt in ['%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%Y/%m/%d', '%d-%m-%y', '%d/%m/%y']:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    formatted_date = parsed_date.strftime('%Y-%m-%d')
                    return number if number else None, formatted_date
                except:
                    continue
        except:
            pass

        return number if number else None, None
    else:
        # No date found, treat entire value as number
        return value if value else None, None

def clean_numeric(value) -> Optional[float]:
    """Convert value to float, handling nulls and empty strings"""
    if pd.isna(value) or value == '' or value == 'None' or str(value).strip() == '':
        return None
    try:
        # Remove commas and other formatting
        cleaned = str(value).replace(',', '').strip()
        if cleaned == '' or cleaned.lower() == 'null':
            return None
        return float(cleaned)
    except:
        return None

def clean_text(value) -> Optional[str]:
    """Clean text values, preserving nulls"""
    if pd.isna(value) or value == '' or str(value).strip() == '':
        return None
    return str(value).strip()

def import_excel_data(excel_path: str):
    """Import data from Excel file to Supabase"""

    print(f"Reading Excel file: {excel_path}")

    # Read Excel file
    try:
        df = pd.read_excel(excel_path, sheet_name=0)  # Read first sheet
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    print(f"Found {len(df)} rows in Excel file")
    print(f"Columns: {list(df.columns)}")

    # Map Excel columns to database columns
    column_mapping = {
        'S.NO': None,  # We'll use auto-increment id
        'Ap Gazette No': 'ap_no',
        'Name of institution': 'institution_name',
        'District': 'district_name',
        'Mandal': 'mandal',
        'Village': 'village',
        'name of Inspector': 'inspector_name',
        'Ext-Dry': 'ext_dry',
        'Ext-Wet': 'ext_wet',
        'Ext-Tot': None,  # Generated column
        'D-Arrears': 'd_arrears',
        'D-Current': 'd_current',
        'D-Tot': None,  # Generated column
        'Receipt no and date': None,  # Will parse into receipt_no and receipt_date
        'Challan no and date': None,  # Will parse into challan_no and challan_date
        'C-Arrears': 'c_arrears',
        'C-Current': 'c_current',
        'C-Tot': None,  # Generated column
        'B-arrears': None,  # Generated column
        'B-Current': None,  # Generated column
        'B-Tot': None,  # Generated column
        'Remarks': 'remarks',
        'Financial Year': 'financial_year',
    }

    # Normalize column names (handle variations)
    df.columns = df.columns.str.strip()

    # Find actual column names (case-insensitive)
    actual_columns = {}
    for excel_col, db_col in column_mapping.items():
        for col in df.columns:
            if col.strip().lower() == excel_col.lower():
                actual_columns[excel_col] = col
                break

    print(f"\nColumn mapping found:")
    for excel_col, actual_col in actual_columns.items():
        print(f"  {excel_col} -> {actual_col}")

    # Prepare data for insertion
    records = []
    errors = []

    for idx, row in df.iterrows():
        try:
            # Parse receipt no and date
            receipt_no, receipt_date = None, None
            if 'Receipt no and date' in actual_columns:
                receipt_col = actual_columns['Receipt no and date']
                receipt_no, receipt_date = parse_receipt_challan(row.get(receipt_col))

            # Parse challan no and date
            challan_no, challan_date = None, None
            if 'Challan no and date' in actual_columns:
                challan_col = actual_columns['Challan no and date']
                challan_no, challan_date = parse_receipt_challan(row.get(challan_col))

            # Build record - handle null vs 0 properly
            # For numeric fields: null if empty, 0 if explicitly 0
            d_arrears_val = clean_numeric(row.get(actual_columns.get('D-Arrears', '')))
            d_current_val = clean_numeric(row.get(actual_columns.get('D-Current', '')))
            c_arrears_val = clean_numeric(row.get(actual_columns.get('C-Arrears', '')))
            c_current_val = clean_numeric(row.get(actual_columns.get('C-Current', '')))

            record = {
                'ap_no': clean_text(row.get(actual_columns.get('Ap Gazette No', ''))),
                'institution_name': clean_text(row.get(actual_columns.get('Name of institution', ''))),
                'district_name': clean_text(row.get(actual_columns.get('District', ''))),
                'mandal': clean_text(row.get(actual_columns.get('Mandal', ''))),
                'village': clean_text(row.get(actual_columns.get('Village', ''))),
                'inspector_name': clean_text(row.get(actual_columns.get('name of Inspector', ''))),  # Can be null
                'ext_dry': clean_numeric(row.get(actual_columns.get('Ext-Dry', ''))),
                'ext_wet': clean_numeric(row.get(actual_columns.get('Ext-Wet', ''))),
                'd_arrears': d_arrears_val if d_arrears_val is not None else 0,
                'd_current': d_current_val if d_current_val is not None else 0,
                'receipt_no': receipt_no,
                'receipt_date': receipt_date,
                'challan_no': challan_no,
                'challan_date': challan_date,
                'c_arrears': c_arrears_val if c_arrears_val is not None else 0,
                'c_current': c_current_val if c_current_val is not None else 0,
                'remarks': clean_text(row.get(actual_columns.get('Remarks', ''))),
                'financial_year': clean_text(row.get(actual_columns.get('Financial Year', ''))) or '2024-25',
            }

            # Validate required fields
            if not record['ap_no']:
                errors.append(f"Row {idx + 2}: Missing AP No")
                continue

            # Remove None values for optional text fields only
            # Keep all numeric fields (they have defaults or are 0)
            final_record = {}
            for k, v in record.items():
                if v is not None:
                    final_record[k] = v
                elif k in ['d_arrears', 'd_current', 'c_arrears', 'c_current']:
                    final_record[k] = 0  # Ensure these are always 0, not null
                # Skip null optional fields (they'll be NULL in DB)

            record = final_record

            records.append(record)

        except Exception as e:
            errors.append(f"Row {idx + 2}: {str(e)}")
            continue

    print(f"\nPrepared {len(records)} records for insertion")
    if errors:
        print(f"\n{len(errors)} errors found:")
        for error in errors[:10]:  # Show first 10 errors
            print(f"  {error}")

    # Insert data in batches
    batch_size = 100
    inserted = 0
    failed = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = supabase.table('institution_dcb').insert(batch).execute()
            inserted += len(batch)
            print(f"Inserted batch {i//batch_size + 1}: {len(batch)} records")
        except Exception as e:
            print(f"Error inserting batch {i//batch_size + 1}: {e}")
            failed += len(batch)
            # Try inserting one by one to find problematic records
            for record in batch:
                try:
                    supabase.table('institution_dcb').insert(record).execute()
                    inserted += 1
                except Exception as err:
                    print(f"  Failed to insert record with ap_no={record.get('ap_no')}: {err}")
                    failed += 1

    print(f"\n✅ Import complete!")
    print(f"  Inserted: {inserted}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(records)}")

if __name__ == '__main__':
    # Try multiple possible paths
    possible_paths = [
        Path(__file__).parent.parent / 'assets' / 'Consolidated_Excel.xlsx',
        Path(__file__).parent.parent / 'assets' / 'DCB CODES-19-12-2025.xlsx',
    ]

    excel_path = None
    for path in possible_paths:
        if path.exists():
            excel_path = str(path)
            break

    if not excel_path:
        print(f"Error: Excel file not found. Tried:")
        for path in possible_paths:
            print(f"  - {path}")
        print("\nPlease ensure the Excel file is in the assets folder.")
        sys.exit(1)

    print(f"Using Excel file: {excel_path}")
    import_excel_data(excel_path)
