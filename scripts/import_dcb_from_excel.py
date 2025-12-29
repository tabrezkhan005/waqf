#!/usr/bin/env python3
"""
Import DCB (Demand, Collection, Balance) Data from District Excel Files
Processes Excel files from assets/Waqf Data folder and imports DCB data district by district
Handles nested column headers (e.g., Extent Ac0Cents with Dry/Wet sub-columns)
"""

import pandas as pd
import sys
import os
from pathlib import Path
import re
from typing import Dict, List, Optional, Tuple
import argparse
from supabase import create_client, Client
from datetime import datetime

# Configuration
EXCEL_DIR = Path(__file__).parent.parent / "assets" / "Waqf Data"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

# Try to read from .env file if not in environment
if not SUPABASE_URL or not SUPABASE_KEY:
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")

                    if not SUPABASE_URL and (key == "SUPABASE_URL" or key == "EXPO_PUBLIC_SUPABASE_URL"):
                        SUPABASE_URL = value
                    if not SUPABASE_KEY and (key == "SUPABASE_SERVICE_ROLE_KEY" or
                                            key == "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" or
                                            key == "SERVICE_ROLE_KEY"):
                        SUPABASE_KEY = value

if not SUPABASE_URL:
    print("[ERROR] SUPABASE_URL not found!")
    sys.exit(1)

if not SUPABASE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not found!")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# District name mapping (Excel file names -> Database district names)
DISTRICT_MAPPING = {
    # Updated to match current district names used in app/db
    "Adoni": "Adoni",
    "ASRR": "Alluri Seetaramaraju",
    "Anakapalli": "Anakapalli",
    "Anantapuramu": "Anantapuramu",
    "Annamaya": "Annamayya",
    "Bapatla": "Bapatla",
    "Chitoor": "Chittoor",
    "Dr. B.R. Konaseema": "Dr. B.R. A.Konaseema",
    "EG": "East Godavari",
    "Eluru": "Eluru",
    "Guntur": "Guntur",
    "Kakinada": "Kakinada",
    "Krishna": "Krishna",
    "Kurnool": "Kurnool",
    "Nandyal": "Nandyal",
    "Nellore": "Nellore",
    "NTR": "NTR",
    "Palnadu": "Palnadu",
    "Parvatipuram": "Parvathipuram",
    "Prakasam": "Prakasam",
    "Srikakulam": "Srikakulam",
    "SSS": "Sri Sathya Sai",
    "Tirupati": "Tirupati",
    "VSKP": "Visakhapatnam",
    "Vizianagaram": "Vizianagaram",
    "WG": "West Godavari",
    "YSR": "YSR Kadapa District",
}

DEFAULT_FINANCIAL_YEAR = os.getenv("FINANCIAL_YEAR") or "2025-26"

def _parse_only_list(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip().lower() for v in value.split(",") if v.strip()]

def clean_text(value) -> Optional[str]:
    """Clean text value"""
    if pd.isna(value) or value is None:
        return None
    text = str(value).strip()
    if text.lower() in ["nan", "none", "", "-", "n/a", "na"]:
        return None
    return text if text else None

def clean_numeric(value) -> float:
    """Clean numeric value, handles scientific notation (1E+06 = 1000000)"""
    if pd.isna(value) or value is None:
        return 0.0
    try:
        if isinstance(value, str):
            value = value.replace(",", "").replace("₹", "").strip()
            # Handle scientific notation
            if 'e+' in value.lower() or 'e-' in value.lower():
                return float(value)
        num = float(value)
        return num
    except (ValueError, TypeError):
        return 0.0

def parse_date(date_str) -> Optional[str]:
    """Parse date string to YYYY-MM-DD format"""
    if pd.isna(date_str) or not date_str:
        return None
    date_str = str(date_str).strip()
    if date_str.lower() in ["-", "", "nan", "none"]:
        return None
    try:
        # Try parsing as date
        if isinstance(date_str, pd.Timestamp):
            return date_str.strftime('%Y-%m-%d')
        # Try common date formats
        for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%d-%b-%Y', '%d/%b/%Y']:
            try:
                return pd.to_datetime(date_str, format=fmt).strftime('%Y-%m-%d')
            except:
                continue
        # Last resort: pandas auto-parse
        return pd.to_datetime(date_str).strftime('%Y-%m-%d')
    except:
        return None

def extract_receipt_challan(combined_value: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract receipt/challan number and date from combined string"""
    if not combined_value or pd.isna(combined_value):
        return None, None

    combined = str(combined_value).strip()
    if combined.lower() in ["-", "", "nan", "none"]:
        return None, None

    # Try to extract number and date
    # Common patterns: "12345 01-01-2024" or "12345/01-01-2024" or "12345, 01-01-2024"
    parts = re.split(r'[,\s/]+', combined)
    receipt_no = None
    receipt_date = None

    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Check if it looks like a date
        date_parsed = parse_date(part)
        if date_parsed:
            receipt_date = date_parsed
        # Otherwise assume it's the receipt number
        elif not receipt_no and len(part) > 0:
            receipt_no = part

    return receipt_no, receipt_date

def get_district_id(district_name: str) -> Optional[str]:
    """Get district UUID from database"""
    try:
        response = supabase.table("districts").select("id").eq("name", district_name).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to get district ID for {district_name}: {e}")
        return None

def get_inspector_id(district_id: str) -> Optional[str]:
    """Get inspector UUID for a district"""
    try:
        response = supabase.table("profiles").select("id").eq("district_id", district_id).eq("role", "inspector").execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to get inspector ID for district {district_id}: {e}")
        return None

def get_institution_id(ap_gazette_no: str) -> Optional[str]:
    """Get institution UUID by AP Gazette No"""
    try:
        response = supabase.table("institutions").select("id").eq("ap_gazette_no", ap_gazette_no).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
        return None
    except Exception as e:
        return None

def find_column_index(df: pd.DataFrame, search_terms: List[str], exclude_terms: List[str] = None) -> Optional[int]:
    """Find column index by searching for terms in column names (handles multi-level headers)"""
    exclude_terms = exclude_terms or []

    for idx, col in enumerate(df.columns):
        # Handle multi-level columns (tuples)
        if isinstance(col, tuple):
            col_str = " ".join(str(c).lower() for c in col if pd.notna(c))
        else:
            col_str = str(col).lower().strip()

        # Check if all search terms are present and no exclude terms
        if all(term.lower() in col_str for term in search_terms):
            if not any(exclude.lower() in col_str for exclude in exclude_terms):
                return idx

    return None

def flatten_column_name(col) -> str:
    """Flatten multi-level column name to a single string"""
    if isinstance(col, tuple):
        return " ".join(str(c) for c in col if pd.notna(c))
    return str(col)

def process_excel_file(excel_file: Path, financial_year: str) -> Dict:
    """Process a single Excel file and return statistics"""
    district_name = DISTRICT_MAPPING.get(excel_file.stem)
    if not district_name:
        print(f"\n[SKIP] {excel_file.name} - District name not found in mapping")
        return {"status": "skipped", "reason": "district_not_found"}

    print(f"\n{'='*80}")
    print(f"Processing: {excel_file.name} -> {district_name}")
    print(f"{'='*80}")

    district_id = get_district_id(district_name)
    if not district_id:
        print(f"  [ERROR] District '{district_name}' not found in database")
        return {"status": "error", "error": f"District not found: {district_name}"}

    inspector_id = get_inspector_id(district_id)
    if not inspector_id:
        print(f"  [WARNING] No inspector found for district '{district_name}'")
        print(f"  [WARNING] DCB records require inspector_id. Skipping this district.")
        return {"status": "error", "error": f"No inspector for district: {district_name}"}

    try:
        # Try reading with multi-level headers first (header=[0, 1])
        # If that fails, try single-level header
        df = None
        try:
            df = pd.read_excel(excel_file, header=[0, 1])
            print(f"  [INFO] Read Excel with multi-level headers")
        except:
            try:
                df = pd.read_excel(excel_file, header=0)
                print(f"  [INFO] Read Excel with single-level header")
            except Exception as e:
                print(f"  [ERROR] Failed to read Excel file: {e}")
                return {"status": "error", "error": str(e)}

        print(f"  [INFO] Found {len(df)} rows in Excel file")
        print(f"  [INFO] Total columns: {len(df.columns)}")

        # Print first few column names for debugging
        print(f"  [INFO] First 10 columns: {[flatten_column_name(c) for c in df.columns[:10]]}")

        # Find columns using flexible search
        ap_no_col = find_column_index(df, ["ap", "gazette"], ["sl no", "serial"])
        if ap_no_col is None:
            ap_no_col = find_column_index(df, ["gazette"], [])
        if ap_no_col is None:
            ap_no_col = find_column_index(df, ["sl", "no"], [])

        name_col = find_column_index(df, ["institution", "name"], ["mandal", "village", "of officer"])
        if name_col is None:
            name_col = find_column_index(df, ["name"], ["mandal", "village"])

        mandal_col = find_column_index(df, ["mandal"], [])
        village_col = find_column_index(df, ["village"], [])

        # Extent columns (under "Extent Ac0Cents")
        ext_dry_col = find_column_index(df, ["extent", "dry"], ["total", "wet"])
        if ext_dry_col is None:
            ext_dry_col = find_column_index(df, ["dry"], ["total"])

        ext_wet_col = find_column_index(df, ["extent", "wet"], ["total", "dry"])
        if ext_wet_col is None:
            ext_wet_col = find_column_index(df, ["wet"], ["total"])

        # Demand columns (under "Demand (in Rs)")
        d_arrears_col = find_column_index(df, ["demand", "arrear"], ["total", "current"])
        if d_arrears_col is None:
            d_arrears_col = find_column_index(df, ["arrear"], ["total", "current", "collection", "balance"])

        d_current_col = find_column_index(df, ["demand", "current"], ["total", "arrear"])
        if d_current_col is None:
            d_current_col = find_column_index(df, ["current"], ["total", "arrear", "collection", "balance"])

        # Collection columns (under "Collection (in Rs)")
        c_arrears_col = find_column_index(df, ["collection", "arrear"], ["total", "current"])
        if c_arrears_col is None:
            c_arrears_col = find_column_index(df, ["arrear"], ["total", "current", "demand", "balance"])

        c_current_col = find_column_index(df, ["collection", "current"], ["total", "arrear"])
        if c_current_col is None:
            c_current_col = find_column_index(df, ["current"], ["total", "arrear", "demand", "balance"])

        # Receipt and Challan (under "Collection (in Rs)")
        receipt_col = find_column_index(df, ["receipt"], ["challan"])
        challan_col = find_column_index(df, ["challan"], ["receipt"])

        remarks_col = find_column_index(df, ["remark"], [])

        # Print detected column mapping
        print(f"\n  [INFO] Column mapping detected:")
        print(f"    AP Gazette No: Column {ap_no_col} ({flatten_column_name(df.columns[ap_no_col]) if ap_no_col is not None else 'NOT FOUND'})")
        print(f"    Institution Name: Column {name_col} ({flatten_column_name(df.columns[name_col]) if name_col is not None else 'NOT FOUND'})")
        print(f"    Mandal: Column {mandal_col} ({flatten_column_name(df.columns[mandal_col]) if mandal_col is not None else 'NOT FOUND'})")
        print(f"    Village: Column {village_col} ({flatten_column_name(df.columns[village_col]) if village_col is not None else 'NOT FOUND'})")
        print(f"    Extent Dry: Column {ext_dry_col} ({flatten_column_name(df.columns[ext_dry_col]) if ext_dry_col is not None else 'NOT FOUND'})")
        print(f"    Extent Wet: Column {ext_wet_col} ({flatten_column_name(df.columns[ext_wet_col]) if ext_wet_col is not None else 'NOT FOUND'})")
        print(f"    Demand Arrears: Column {d_arrears_col} ({flatten_column_name(df.columns[d_arrears_col]) if d_arrears_col is not None else 'NOT FOUND'})")
        print(f"    Demand Current: Column {d_current_col} ({flatten_column_name(df.columns[d_current_col]) if d_current_col is not None else 'NOT FOUND'})")
        print(f"    Collection Arrears: Column {c_arrears_col} ({flatten_column_name(df.columns[c_arrears_col]) if c_arrears_col is not None else 'NOT FOUND'})")
        print(f"    Collection Current: Column {c_current_col} ({flatten_column_name(df.columns[c_current_col]) if c_current_col is not None else 'NOT FOUND'})")
        print(f"    Receipt: Column {receipt_col} ({flatten_column_name(df.columns[receipt_col]) if receipt_col is not None else 'NOT FOUND'})")
        print(f"    Challan: Column {challan_col} ({flatten_column_name(df.columns[challan_col]) if challan_col is not None else 'NOT FOUND'})")
        print(f"    Remarks: Column {remarks_col} ({flatten_column_name(df.columns[remarks_col]) if remarks_col is not None else 'NOT FOUND'})")

        # Validate critical columns
        if ap_no_col is None or name_col is None:
            print(f"  [ERROR] Critical columns (AP Gazette No or Institution Name) not found!")
            return {"status": "error", "error": "Critical columns not found"}

        dcb_records_created = 0
        dcb_records_updated = 0
        rows_processed = 0
        rows_skipped = 0
        errors = []

        for idx, row in df.iterrows():
            rows_processed += 1
            try:
                # Extract AP No and Institution Name
                ap_no = None
                institution_name = None

                try:
                    if ap_no_col is not None:
                        ap_no = clean_text(row.iloc[ap_no_col])
                    if name_col is not None:
                        institution_name = clean_text(row.iloc[name_col])
                except (IndexError, KeyError):
                    rows_skipped += 1
                    continue

                # Skip if missing required fields
                if not ap_no or not institution_name:
                    rows_skipped += 1
                    continue

                # Skip header rows
                ap_no_lower = str(ap_no).lower() if ap_no else ""
                name_lower = str(institution_name).lower() if institution_name else ""

                skip_patterns = ["ap no", "ap gazette no", "gazette", "sl no", "s.no", "serial no", "sno", "serial number"]
                if ap_no_lower in skip_patterns or name_lower in ["institution name", "name of institution", "name", "waqf name"]:
                    rows_skipped += 1
                    continue

                # Skip if AP No is just a small number (likely row number)
                if ap_no.isdigit() and len(ap_no) <= 3:
                    rows_skipped += 1
                    continue

                # Get institution ID
                institution_id = get_institution_id(ap_no)
                if not institution_id:
                    # Institution doesn't exist, skip DCB record
                    rows_skipped += 1
                    continue

                # Extract all DCB fields with safe indexing
                def safe_get(col_idx, default=0.0, is_numeric=True):
                    if col_idx is None:
                        return default
                    try:
                        if col_idx < len(row):
                            value = row.iloc[col_idx]
                            return clean_numeric(value) if is_numeric else clean_text(value)
                    except (IndexError, KeyError):
                        pass
                    return default

                ext_dry = safe_get(ext_dry_col, 0.0, True)
                ext_wet = safe_get(ext_wet_col, 0.0, True)
                d_arrears = safe_get(d_arrears_col, 0.0, True)
                d_current = safe_get(d_current_col, 0.0, True)
                c_arrears = safe_get(c_arrears_col, 0.0, True)
                c_current = safe_get(c_current_col, 0.0, True)
                remarks = safe_get(remarks_col, None, False)

                receipt_str = safe_get(receipt_col, None, False)
                challan_str = safe_get(challan_col, None, False)

                # Note: receipt_no, receipt_date, challan_no, challan_date are not stored in institution_dcb
                # They would be in collections table if needed

                # Prepare DCB data
                # Note: Totals (extent_total, demand_total, collection_total, balance_*) are GENERATED columns
                # in the database, so we don't need to calculate them here
                dcb_data = {
                    "institution_id": institution_id,
                    "inspector_id": inspector_id,
                    "extent_dry": ext_dry,
                    "extent_wet": ext_wet,
                    # extent_total will be auto-calculated: extent_dry + extent_wet
                    "demand_arrears": d_arrears,
                    "demand_current": d_current,
                    # demand_total will be auto-calculated: demand_arrears + demand_current
                    "collection_arrears": c_arrears,
                    "collection_current": c_current,
                    # collection_total will be auto-calculated: collection_arrears + collection_current
                    # balance_arrears, balance_current, balance_total will be auto-calculated
                    "remarks": remarks,
                    "financial_year": financial_year,
                }

                # Check if DCB record exists
                existing = (
                    supabase.table("institution_dcb")
                    .select("id")
                    .eq("institution_id", institution_id)
                    .eq("financial_year", financial_year)
                    .execute()
                )

                if existing.data and len(existing.data) > 0:
                    # Update existing
                    result = supabase.table("institution_dcb").update(dcb_data).eq("id", existing.data[0]["id"]).execute()
                    if result.data:
                        dcb_records_updated += 1
                    else:
                        errors.append(f"Row {idx + 2}: Failed to update DCB for {ap_no}")
                else:
                    # Create new
                    result = supabase.table("institution_dcb").insert(dcb_data).execute()
                    if result.data:
                        dcb_records_created += 1
                    else:
                        errors.append(f"Row {idx + 2}: Failed to insert DCB for {ap_no}")

            except Exception as e:
                error_msg = f"Row {idx + 2}: {str(e)}"
                errors.append(error_msg)
                rows_skipped += 1
                if len(errors) <= 5:
                    print(f"  [ERROR] {error_msg}")

        print(f"\n  [SUMMARY] {district_name}:")
        print(f"    Rows Processed: {rows_processed}")
        print(f"    Rows Skipped: {rows_skipped}")
        print(f"    DCB Records Created: {dcb_records_created}")
        print(f"    DCB Records Updated: {dcb_records_updated}")
        print(f"    Errors: {len(errors)}")

        if errors and len(errors) > 5:
            print(f"    (Showing first 5 of {len(errors)} errors)")
            for err in errors[:5]:
                print(f"      - {err}")

        return {
            "status": "success",
            "district": district_name,
            "created": dcb_records_created,
            "updated": dcb_records_updated,
            "skipped": rows_skipped,
            "errors": len(errors),
        }

    except Exception as e:
        print(f"  [ERROR] Failed to process {excel_file.name}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Import DCB data from district Excel files")
    parser.add_argument(
        "--only",
        help="Comma-separated list of Excel file stems or district names to process (case-insensitive). Example: Adoni,ASRR,Eluru",
        default="",
    )
    parser.add_argument(
        "--year",
        help=f"Financial year to import into (default: {DEFAULT_FINANCIAL_YEAR})",
        default=DEFAULT_FINANCIAL_YEAR,
    )
    args = parser.parse_args()
    only = _parse_only_list(args.only)
    financial_year = str(args.year).strip() or DEFAULT_FINANCIAL_YEAR

    print("=" * 80)
    print("DCB DATA IMPORT FROM EXCEL FILES")
    print("=" * 80)
    print(f"[INFO] Financial year: {financial_year}")

    if not EXCEL_DIR.exists():
        print(f"[ERROR] Directory not found: {EXCEL_DIR}")
        sys.exit(1)

    excel_files = list(EXCEL_DIR.glob("*.xlsx"))
    if not excel_files:
        print(f"[ERROR] No Excel files found in {EXCEL_DIR}")
        sys.exit(1)

    if only:
        allowed = set(only)
        filtered_files = []
        for f in excel_files:
            stem = f.stem.lower()
            mapped = (DISTRICT_MAPPING.get(f.stem) or "").lower()
            if stem in allowed or mapped in allowed:
                filtered_files.append(f)
        excel_files = filtered_files
        if not excel_files:
            print(f"[ERROR] --only matched 0 files. Available stems: {[f.stem for f in EXCEL_DIR.glob('*.xlsx')]}")
            sys.exit(1)

    print(f"\n[INFO] Found {len(excel_files)} Excel files")
    print(f"[INFO] Processing files from: {EXCEL_DIR}")

    results = []
    for excel_file in sorted(excel_files):
        result = process_excel_file(excel_file, financial_year)
        results.append(result)

    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)

    total_created = sum(r.get("created", 0) for r in results if r.get("status") == "success")
    total_updated = sum(r.get("updated", 0) for r in results if r.get("status") == "success")
    total_skipped = sum(r.get("skipped", 0) for r in results if r.get("status") == "success")
    total_errors = sum(r.get("errors", 0) for r in results if r.get("status") == "success")

    print(f"\nTotal DCB Records Created: {total_created}")
    print(f"Total DCB Records Updated: {total_updated}")
    print(f"Total Rows Skipped: {total_skipped}")
    print(f"Total Errors: {total_errors}")

    print("\nDistrict-wise Summary:")
    for result in results:
        if result.get("status") == "success":
            print(f"  {result.get('district', 'Unknown')}: "
                  f"Created={result.get('created', 0)}, "
                  f"Updated={result.get('updated', 0)}, "
                  f"Skipped={result.get('skipped', 0)}, "
                  f"Errors={result.get('errors', 0)}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
