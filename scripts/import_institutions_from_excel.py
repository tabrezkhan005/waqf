#!/usr/bin/env python3
"""
Import Institutions from District Excel Files
Processes Excel files from assets/Waqf Data folder and imports institutions district by district
"""

import pandas as pd
import sys
import os
from pathlib import Path
from typing import Dict, List, Optional
import argparse
from supabase import create_client, Client
from datetime import datetime

# Configuration
EXCEL_DIR = Path(__file__).parent.parent / "assets" / "Waqf Data"

# Try to get from environment variables first
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

# If not found, try to read from .env file
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
    print("Please set it in .env file as:")
    print("  SUPABASE_URL=https://<project-ref>.supabase.co")
    print("  or EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co")
    sys.exit(1)

if not SUPABASE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not found!")
    print("Please set it in .env file as:")
    print("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
    print("  or EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
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
    """Clean numeric value"""
    if pd.isna(value) or value is None:
        return 0.0
    try:
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return float(value)
    except (ValueError, TypeError):
        return 0.0

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

def process_excel_file(excel_file: Path) -> Dict:
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

    try:
        # Read Excel file
        df = pd.read_excel(excel_file)
        print(f"  [INFO] Found {len(df)} rows in Excel file")
        print(f"  [INFO] Columns: {list(df.columns)}")

        # Try to identify column indices by searching column names
        ap_no_col = None
        name_col = None
        mandal_col = None
        village_col = None

        # Search for columns by name (case-insensitive)
        for idx, col in enumerate(df.columns):
            col_str = str(col).lower().strip()

            # AP No/Gazette No column
            if ap_no_col is None and any(keyword in col_str for keyword in ["ap", "gazette", "sl.no", "sl no", "serial"]):
                ap_no_col = idx

            # Institution Name column
            if name_col is None and any(keyword in col_str for keyword in ["institution", "name", "waqf"]):
                if "mandal" not in col_str and "village" not in col_str:
                    name_col = idx

            # Mandal column
            if "mandal" in col_str:
                mandal_col = idx

            # Village column
            if "village" in col_str:
                village_col = idx

        # If not found by name, try to infer from position (common Excel layouts)
        # Usually: Sl No (0), AP No (1), Name (2), Mandal (3), Village (4)
        if ap_no_col is None:
            # Try column 1 (index 1) - most common position
            if len(df.columns) > 1:
                ap_no_col = 1
            else:
                ap_no_col = 0

        if name_col is None:
            # Try column 2 (index 2) - most common position
            if len(df.columns) > 2:
                name_col = 2
            elif len(df.columns) > 1:
                name_col = 1
            else:
                name_col = 0

        if mandal_col is None and len(df.columns) > 3:
            mandal_col = 3

        if village_col is None and len(df.columns) > 4:
            village_col = 4

        print(f"  [INFO] Column mapping:")
        print(f"    AP No: Column {ap_no_col} ({df.columns[ap_no_col] if ap_no_col < len(df.columns) else 'N/A'})")
        print(f"    Name: Column {name_col} ({df.columns[name_col] if name_col < len(df.columns) else 'N/A'})")
        print(f"    Mandal: Column {mandal_col} ({df.columns[mandal_col] if mandal_col < len(df.columns) else 'N/A'})")
        print(f"    Village: Column {village_col} ({df.columns[village_col] if village_col < len(df.columns) else 'N/A'})")

        institutions_created = 0
        institutions_updated = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                # Extract data safely
                ap_no = None
                institution_name = None
                mandal = None
                village = None

                try:
                    if ap_no_col is not None and ap_no_col < len(row):
                        ap_no = clean_text(row.iloc[ap_no_col])
                    if name_col is not None and name_col < len(row):
                        institution_name = clean_text(row.iloc[name_col])
                    if mandal_col is not None and mandal_col < len(row):
                        mandal = clean_text(row.iloc[mandal_col])
                    if village_col is not None and village_col < len(row):
                        village = clean_text(row.iloc[village_col])
                except (IndexError, KeyError) as e:
                    continue

                # Skip if missing required fields
                if not ap_no or not institution_name:
                    continue

                # Skip header-like rows and invalid data
                ap_no_lower = str(ap_no).lower() if ap_no else ""
                name_lower = str(institution_name).lower() if institution_name else ""

                skip_patterns = [
                    "ap no", "ap gazette no", "gazette", "sl no", "s.no", "serial no",
                    "sno", "serial number", "1", "2", "3", "4", "5"
                ]

                if ap_no_lower in skip_patterns or name_lower in ["institution name", "name of institution", "name", "waqf name"]:
                    continue

                # Skip if AP No is just a number (likely row number)
                if ap_no.isdigit() and len(ap_no) <= 3:
                    continue

                # Check if institution already exists
                existing = supabase.table("institutions").select("id").eq("ap_gazette_no", ap_no).execute()

                institution_data = {
                    "name": institution_name,
                    "ap_gazette_no": ap_no,
                    "district_id": district_id,
                    "mandal": mandal,
                    "village": village,
                    "is_active": True,
                }

                if existing.data and len(existing.data) > 0:
                    # Update existing
                    result = supabase.table("institutions").update(institution_data).eq("id", existing.data[0]["id"]).execute()
                    if result.data:
                        institutions_updated += 1
                else:
                    # Create new
                    result = supabase.table("institutions").insert(institution_data).execute()
                    if result.data:
                        institutions_created += 1

            except Exception as e:
                error_msg = f"Row {idx + 2}: {str(e)}"
                errors.append(error_msg)
                print(f"  [ERROR] {error_msg}")

        print(f"\n  [SUMMARY] {district_name}:")
        print(f"    Created: {institutions_created}")
        print(f"    Updated: {institutions_updated}")
        print(f"    Errors: {len(errors)}")

        if errors:
            print(f"\n  [ERRORS] First 5 errors:")
            for error in errors[:5]:
                print(f"    {error}")

        return {
            "status": "success",
            "district": district_name,
            "created": institutions_created,
            "updated": institutions_updated,
            "errors": len(errors),
        }

    except Exception as e:
        print(f"  [ERROR] Failed to process {excel_file.name}: {str(e)}")
        return {"status": "error", "error": str(e)}

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Import institutions from district Excel files")
    parser.add_argument(
        "--only",
        help="Comma-separated list of Excel file stems or district names to process (case-insensitive). Example: Adoni,ASRR,Eluru",
        default="",
    )
    args = parser.parse_args()
    only = _parse_only_list(args.only)

    print("=" * 80)
    print("INSTITUTION IMPORT FROM EXCEL FILES")
    print("=" * 80)

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
        result = process_excel_file(excel_file)
        results.append(result)

    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)

    total_created = sum(r.get("created", 0) for r in results if r.get("status") == "success")
    total_updated = sum(r.get("updated", 0) for r in results if r.get("status") == "success")
    total_errors = sum(r.get("errors", 0) for r in results if r.get("status") == "success")

    print(f"\nTotal Institutions Created: {total_created}")
    print(f"Total Institutions Updated: {total_updated}")
    print(f"Total Errors: {total_errors}")

    print("\nDistrict-wise Summary:")
    for result in results:
        if result.get("status") == "success":
            print(f"  {result.get('district', 'Unknown')}: "
                  f"Created={result.get('created', 0)}, "
                  f"Updated={result.get('updated', 0)}, "
                  f"Errors={result.get('errors', 0)}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
