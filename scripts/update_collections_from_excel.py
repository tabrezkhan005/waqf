#!/usr/bin/env python3
"""
Update Collection Data (C-Arrears, C-Current) in institution_dcb from Excel Files
This script updates existing DCB records with collection amounts from Excel files
"""

import pandas as pd
import sys
import os
from pathlib import Path
from typing import Dict, Optional
from supabase import create_client, Client

# Configuration
EXCEL_DIR = Path(__file__).parent.parent / "assets" / "Waqf Data"

# Try to read from .env file
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

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

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing Supabase credentials!")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DISTRICT_MAPPING = {
    "VSKP": "Visakhapatnam",
    "Nellore": "Nellore",
    "Palnadu": "Palnadu",
    "Guntur": "Guntur",
    "Krishna": "Krishna",
    "Kurnool": "Kurnool",
    "Nandyal": "Nandyal",
    "NTR": "NTR",
    "Prakasam": "Prakasam",
    "SSS": "Sri Sathya Sai",
    "WG": "West Godavari",
    "YSR": "YSR Kadapa District",
}

def clean_text(value) -> Optional[str]:
    if pd.isna(value) or value is None:
        return None
    text = str(value).strip()
    if text.lower() in ["nan", "none", "", "-", "n/a", "na"]:
        return None
    return text if text else None

def clean_numeric(value) -> float:
    if pd.isna(value) or value is None:
        return 0.0
    try:
        if isinstance(value, str):
            value = value.replace(",", "").replace("₹", "").strip()
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def get_institution_id(ap_gazette_no: str) -> Optional[str]:
    try:
        response = supabase.table("institutions").select("id").eq("ap_gazette_no", ap_gazette_no).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
        return None
    except:
        return None

def process_excel_file(excel_file: Path) -> Dict:
    district_name = DISTRICT_MAPPING.get(excel_file.stem)
    if not district_name:
        return {"status": "skipped"}

    print(f"\n{'='*80}")
    print(f"Processing: {excel_file.name} -> {district_name}")
    print(f"{'='*80}")

    try:
        df = pd.read_excel(excel_file)
        print(f"  [INFO] Found {len(df)} rows")

        # Auto-detect columns
        ap_no_col = None
        c_arrears_col = None
        c_current_col = None

        for idx, col in enumerate(df.columns):
            col_str = str(col).lower().strip()
            if ap_no_col is None and any(kw in col_str for kw in ["ap", "gazette", "sl.no"]):
                ap_no_col = idx
            if ("c" in col_str or "collection" in col_str) and "arrear" in col_str:
                c_arrears_col = idx
            if ("c" in col_str or "collection" in col_str) and "current" in col_str:
                c_current_col = idx

        # Default positions
        if ap_no_col is None and len(df.columns) > 1:
            ap_no_col = 1
        if c_arrears_col is None and len(df.columns) > 13:
            c_arrears_col = 13
        if c_current_col is None and len(df.columns) > 14:
            c_current_col = 14

        updated = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                ap_no = clean_text(row.iloc[ap_no_col]) if ap_no_col is not None and ap_no_col < len(row) else None
                if not ap_no or ap_no.lower() in ["ap no", "gazette", "sl no"]:
                    continue

                institution_id = get_institution_id(ap_no)
                if not institution_id:
                    continue

                c_arrears = clean_numeric(row.iloc[c_arrears_col]) if c_arrears_col is not None and c_arrears_col < len(row) else 0.0
                c_current = clean_numeric(row.iloc[c_current_col]) if c_current_col is not None and c_current_col < len(row) else 0.0

                # Update DCB record
                result = supabase.table("institution_dcb").update({
                    "collection_arrears": c_arrears,
                    "collection_current": c_current,
                }).eq("institution_id", institution_id).eq("financial_year", "2024-25").execute()

                if result.data:
                    updated += 1

            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")

        print(f"  [SUMMARY] Updated {updated} DCB records, Errors: {len(errors)}")
        return {"status": "success", "updated": updated, "errors": len(errors)}

    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return {"status": "error", "error": str(e)}

def main():
    print("=" * 80)
    print("UPDATE COLLECTION DATA FROM EXCEL FILES")
    print("=" * 80)

    excel_files = list(EXCEL_DIR.glob("*.xlsx"))
    if not excel_files:
        print(f"[ERROR] No Excel files found in {EXCEL_DIR}")
        sys.exit(1)

    results = []
    for excel_file in sorted(excel_files):
        result = process_excel_file(excel_file)
        results.append(result)

    total_updated = sum(r.get("updated", 0) for r in results if r.get("status") == "success")
    print(f"\n{'='*80}")
    print(f"TOTAL UPDATED: {total_updated} DCB records")
    print(f"{'='*80}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
