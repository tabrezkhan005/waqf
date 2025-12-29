#!/usr/bin/env python3
"""
Complete DCB Data Import Script
- Deletes existing data
- Imports institutions from all 27 Excel sheets
- Imports DCB data
- Creates inspector accounts for each district
"""

import pandas as pd
import sys
import os
from pathlib import Path
from supabase import create_client, Client
from datetime import datetime
import re
from typing import Dict, List, Optional, Tuple

# Configuration
EXCEL_FILE = Path(__file__).parent.parent / "assets" / "DCB CODES-19-12-2025.xlsx"
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://foaawljhlrvltfiezuks.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Must be service role key for admin operations

if not SUPABASE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY environment variable not set!")
    print("Please set it with: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# District name mapping (Excel sheet names -> Database district names)
DISTRICT_MAPPING = {
    "ELURU-2025-2026": "ELURU",
    "VZN-2025-26 DEC 05": "Vizianagaram",
    "ADONI DIVISION": "ADONI",
    "Annamayya Dist-2025-26": "ANNAMAYYA",
    "ATP-2025-26": "ANANTAPURAMU",
    "Bapatla -2025-26 as per I.A": "BAPATLA",
    "ASRR-2025-26": "Alluri Seetha Rama Raju",
    "Anakapalli-2025-26": "Ankapalli",
    "CTR-2025-26": "CHITTOOR",
    "Dr.B.R.A.K Dist.,": "Br.Ambedkar Konaseema",
    "EG Dist": "East Godavari",
    "Kakinada Dist 03 dec": "KAKINADA",
    "Parvathipuram Manyam 3 DEC": "Parvathipuram Manyam",
    "SRIKAKULAM DISTRICT 3 DEC": "Srikakulam",
    "TPT-2025-2026": "TIRUPATI",
    "VSP-2025-26 dec 05": "VISAKHAPATNAM",
    "NLR 2025-26": "NELLORE",
    "Palnadu-2025-26 (2)": "PALNADU",
    "GNT 2025-26 AS PER I.A": "GUNTUR",
    "KST 2025-26 AS PER I.A": "Krishna",
    "KURNOOL 2025-26": "KURNOOL",
    "NANDYAL DISTRICT": "NANDYAL",
    "NTR 2025-26 AS PER I.A DEC 04": "NTR",
    "Prakasam 2025-26": "PRAKASAM",
    "SRI SATHYA SAI DISTRICT": "Sri Satya Sai",
    "WG 2025-26 as PER I.A": "West Godavari",
    "2025-2026": None,  # Unknown district - will need to handle
}

def get_district_id(district_name: str) -> Optional[int]:
    """Get district ID from database"""
    if not district_name:
        return None

    result = supabase.table("districts").select("id").eq("name", district_name).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]["id"]
    return None

def clean_numeric(value) -> float:
    """Convert value to numeric, handling text values"""
    if pd.isna(value) or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        if value in ["-", "", "nan", "NaN", "None"]:
            return 0.0
        # Remove currency symbols and commas
        value = re.sub(r'[₹,\s]', '', value)
        try:
            return float(value)
        except:
            return 0.0
    return 0.0

def parse_date(date_str) -> Optional[str]:
    """Parse date string to YYYY-MM-DD format"""
    if pd.isna(date_str) or not date_str:
        return None

    date_str = str(date_str).strip()
    if date_str in ["-", "", "nan", "NaN"]:
        return None

    # Try to parse various date formats
    # Format: "2614/53/05-06-2025" -> "2025-06-05"
    # Format: "05-06-2025" -> "2025-06-05"
    try:
        # Handle format like "2614/53/05-06-2025"
        if "/" in date_str and "-" in date_str:
            parts = date_str.split("/")
            if len(parts) >= 3:
                date_part = parts[-1]  # "05-06-2025"
                if "-" in date_part:
                    d, m, y = date_part.split("-")
                    return f"{y}-{m}-{d}"

        # Handle format "DD-MM-YYYY"
        if "-" in date_str and len(date_str.split("-")) == 3:
            d, m, y = date_str.split("-")
            return f"{y}-{m}-{d}"

        # Try pandas date parsing
        date_obj = pd.to_datetime(date_str, errors='coerce')
        if pd.notna(date_obj):
            return date_obj.strftime("%Y-%m-%d")
    except:
        pass

    return None

def extract_receipt_info(receipt_str: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract receipt number and date from combined string"""
    if pd.isna(receipt_str) or not receipt_str:
        return None, None

    receipt_str = str(receipt_str).strip()
    if receipt_str in ["-", "", "nan", "NaN"]:
        return None, None

    # Format: "2614/53/05-06-2025" -> receipt_no="2614/53", date="2025-06-05"
    receipt_no = None
    receipt_date = None

    if "/" in receipt_str:
        parts = receipt_str.split("/")
        if len(parts) >= 2:
            receipt_no = "/".join(parts[:-1])  # Everything except last part
            date_part = parts[-1]
            receipt_date = parse_date(date_part)

    return receipt_no, receipt_date

def read_sheet_data(sheet_name: str, excel_file: Path) -> Tuple[pd.DataFrame, str, str]:
    """Read data from a sheet and extract district/financial year"""
    df_raw = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

    # Extract district and financial year from title
    title_row = df_raw.iloc[0, 0] if len(df_raw) > 0 else None
    district_name = DISTRICT_MAPPING.get(sheet_name, "UNKNOWN")
    financial_year = "2025-26"

    if pd.notna(title_row):
        title_str = str(title_row).upper()
        # Try to extract financial year
        if "YEAR" in title_str or "2025" in title_str or "2026" in title_str:
            year_match = re.search(r'20\d{2}[-/]20\d{2}', title_str)
            if year_match:
                year_str = year_match.group()
                financial_year = year_str.replace("/", "-")

        # Try to extract district from title if not in mapping
        if district_name == "UNKNOWN" and "DISTRICT" in title_str:
            parts = title_str.split("DISTRICT")
            if len(parts) > 0:
                district_candidate = parts[0].strip().split()[-1]
                # Try to match with database districts
                db_districts = supabase.table("districts").select("name").execute()
                for db_dist in db_districts.data:
                    if district_candidate.upper() in db_dist["name"].upper():
                        district_name = db_dist["name"]
                        break

    # Read actual data (skip first 3-4 rows which are headers)
    skip_rows = 3
    df_data = pd.read_excel(excel_file, sheet_name=sheet_name, skiprows=skip_rows, header=None)
    df_data = df_data.dropna(how='all')  # Remove completely empty rows

    return df_data, district_name, financial_year

def process_sheet(sheet_name: str, excel_file: Path) -> Dict:
    """Process a single sheet and return statistics"""
    print(f"\n{'='*80}")
    print(f"Processing: {sheet_name}")
    print(f"{'='*80}")

    try:
        df_data, district_name, financial_year = read_sheet_data(sheet_name, excel_file)
        district_id = get_district_id(district_name)

        if not district_id:
            print(f"[WARNING] District '{district_name}' not found in database. Skipping sheet.")
            return {"status": "skipped", "reason": "district_not_found", "district": district_name}

        print(f"[INFO] District: {district_name} (ID: {district_id})")
        print(f"[INFO] Financial Year: {financial_year}")
        print(f"[INFO] Data Rows: {len(df_data)}")

        institutions_created = 0
        dcb_records_created = 0
        errors = []

        # Process each row
        for idx, row in df_data.iterrows():
            try:
                # Column mapping (0-indexed)
                # 0: Sl No, 1: AP No, 2: Institution Name, 3: Mandal, 4: Village
                # 5: Ext-Dry, 6: Ext-Wet, 7: Ext-Total
                # 8: D-Arrears, 9: D-Current, 10: D-Total
                # 11: Receipt No & Date, 12: Challan No & Date
                # 13: C-Arrears, 14: C-Current, 15: C-Total
                # 16: B-Arrears, 17: B-Current, 18: B-Total
                # 19: Remarks

                ap_no = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else None

                # Skip if no AP number
                if not ap_no or ap_no in ["nan", "NaN", "2", "-", ""]:
                    continue

                institution_name = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else None
                if not institution_name or institution_name in ["nan", "NaN", "3", ""]:
                    continue

                # Extract data
                mandal = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else None
                village = str(row.iloc[4]).strip() if len(row) > 4 and pd.notna(row.iloc[4]) else None
                ext_dry = clean_numeric(row.iloc[5]) if len(row) > 5 else 0.0
                ext_wet = clean_numeric(row.iloc[6]) if len(row) > 6 else 0.0
                d_arrears = clean_numeric(row.iloc[8]) if len(row) > 8 else 0.0
                d_current = clean_numeric(row.iloc[9]) if len(row) > 9 else 0.0

                receipt_str = str(row.iloc[11]).strip() if len(row) > 11 and pd.notna(row.iloc[11]) else None
                challan_str = str(row.iloc[12]).strip() if len(row) > 12 and pd.notna(row.iloc[12]) else None

                receipt_no, receipt_date = extract_receipt_info(receipt_str) if receipt_str else (None, None)
                challan_no, challan_date = extract_receipt_info(challan_str) if challan_str else (None, None)

                c_arrears = clean_numeric(row.iloc[13]) if len(row) > 13 else 0.0
                c_current = clean_numeric(row.iloc[14]) if len(row) > 14 else 0.0
                remarks = str(row.iloc[19]).strip() if len(row) > 19 and pd.notna(row.iloc[19]) else None

                # Create or get institution
                institution_code = ap_no  # Use AP number as code

                # Check if institution exists
                existing = supabase.table("institutions").select("id").eq("code", institution_code).execute()

                if existing.data and len(existing.data) > 0:
                    institution_id = existing.data[0]["id"]
                else:
                    # Create institution
                    institution_data = {
                        "name": institution_name,
                        "code": institution_code,
                        "district_id": district_id,
                        "address": f"{village}, {mandal}" if village and mandal else (village or mandal or None),
                        "is_active": True
                    }

                    result = supabase.table("institutions").insert(institution_data).execute()
                    if result.data:
                        institution_id = result.data[0]["id"]
                        institutions_created += 1
                    else:
                        errors.append(f"Failed to create institution: {institution_name}")
                        continue

                # Create DCB record
                dcb_data = {
                    "institution_id": institution_id,
                    "financial_year": financial_year,
                    "ap_no": ap_no,
                    "institution_name": institution_name,
                    "district_name": district_name,
                    "mandal": mandal if mandal and mandal not in ["nan", "4"] else None,
                    "village": village if village and village not in ["nan", "5"] else None,
                    "ext_dry": ext_dry if ext_dry > 0 else None,
                    "ext_wet": ext_wet if ext_wet > 0 else None,
                    "d_arrears": d_arrears,
                    "d_current": d_current,
                    "c_arrears": c_arrears,
                    "c_current": c_current,
                    "receipt_no": receipt_no,
                    "receipt_date": receipt_date,
                    "challan_no": challan_no,
                    "challan_date": challan_date,
                    "remarks": remarks if remarks and remarks not in ["nan", "20"] else None
                }

                # Check if DCB record exists (by ap_no and financial_year)
                existing_dcb = supabase.table("institution_dcb").select("id").eq("ap_no", ap_no).eq("financial_year", financial_year).execute()

                if existing_dcb.data and len(existing_dcb.data) > 0:
                    # Update existing
                    supabase.table("institution_dcb").update(dcb_data).eq("id", existing_dcb.data[0]["id"]).execute()
                else:
                    # Insert new
                    result = supabase.table("institution_dcb").insert(dcb_data).execute()
                    if result.data:
                        dcb_records_created += 1
                    else:
                        errors.append(f"Failed to create DCB for: {ap_no}")

            except Exception as e:
                errors.append(f"Error processing row {idx}: {str(e)}")
                continue

        print(f"[SUCCESS] Institutions created: {institutions_created}")
        print(f"[SUCCESS] DCB records created: {dcb_records_created}")
        if errors:
            print(f"[WARNING] Errors: {len(errors)}")
            for error in errors[:5]:  # Show first 5 errors
                print(f"  - {error}")

        return {
            "status": "success",
            "district": district_name,
            "institutions_created": institutions_created,
            "dcb_records_created": dcb_records_created,
            "errors": len(errors)
        }

    except Exception as e:
        print(f"[ERROR] Failed to process sheet: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

def create_inspector_accounts():
    """Create inspector account for each district"""
    print(f"\n{'='*80}")
    print("Creating Inspector Accounts")
    print(f"{'='*80}")

    # Get all districts
    districts = supabase.table("districts").select("id, name").execute()

    inspectors_created = 0

    for district in districts.data:
        district_id = district["id"]
        district_name = district["name"]

        # Check if inspector already exists for this district
        existing = supabase.table("profiles").select("id").eq("district_id", district_id).eq("role", "inspector").execute()

        if existing.data and len(existing.data) > 0:
            print(f"[SKIP] Inspector already exists for {district_name}")
            continue

        # Create email and password
        email = f"inspector.{district_name.lower().replace(' ', '.')}@waqf.gov.in"
        password = f"Inspector@{district_id}123"  # Simple password pattern

        try:
            # Create auth user
            from supabase import create_client as create_auth_client
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })

            if not auth_response.user:
                print(f"[ERROR] Failed to create auth user for {district_name}")
                continue

            user_id = auth_response.user.id

            # Create profile
            profile_data = {
                "id": user_id,
                "full_name": f"Inspector - {district_name}",
                "role": "inspector",
                "district_id": district_id
            }

            result = supabase.table("profiles").insert(profile_data).execute()

            if result.data:
                inspectors_created += 1
                print(f"[SUCCESS] Created inspector for {district_name}: {email}")
            else:
                print(f"[ERROR] Failed to create profile for {district_name}")

        except Exception as e:
            print(f"[ERROR] Failed to create inspector for {district_name}: {str(e)}")
            continue

    print(f"\n[SUMMARY] Inspectors created: {inspectors_created}")
    return inspectors_created

def delete_existing_data():
    """Delete all existing DCB and institution data"""
    print(f"\n{'='*80}")
    print("Deleting Existing Data")
    print(f"{'='*80}")

    # Delete in correct order (respecting foreign keys)
    print("[INFO] Deleting institution_dcb records...")
    supabase.table("institution_dcb").delete().neq("id", 0).execute()  # Delete all

    print("[INFO] Deleting institutions...")
    supabase.table("institutions").delete().neq("id", 0).execute()  # Delete all

    print("[INFO] Deleting inspector profiles...")
    # Get all inspector IDs
    inspectors = supabase.table("profiles").select("id").eq("role", "inspector").execute()
    for inspector in inspectors.data:
        user_id = inspector["id"]
        # Delete profile
        supabase.table("profiles").delete().eq("id", user_id).execute()
        # Delete auth user
        try:
            supabase.auth.admin.delete_user(user_id)
        except:
            pass

    print("[SUCCESS] Existing data deleted")

def main():
    """Main import function"""
    print("=" * 80)
    print("DCB DATA IMPORT - COMPLETE PROCESS")
    print("=" * 80)

    if not EXCEL_FILE.exists():
        print(f"[ERROR] Excel file not found: {EXCEL_FILE}")
        return 1

    # Step 1: Delete existing data
    delete_existing_data()

    # Step 2: Process all sheets
    excel_file = pd.ExcelFile(EXCEL_FILE)
    sheet_names = excel_file.sheet_names

    print(f"\n{'='*80}")
    print(f"Processing {len(sheet_names)} Sheets")
    print(f"{'='*80}")

    results = []
    for sheet_name in sheet_names:
        result = process_sheet(sheet_name, EXCEL_FILE)
        results.append(result)

    # Step 3: Create inspector accounts
    create_inspector_accounts()

    # Summary
    print(f"\n{'='*80}")
    print("IMPORT SUMMARY")
    print(f"{'='*80}")

    total_institutions = sum(r.get("institutions_created", 0) for r in results)
    total_dcb = sum(r.get("dcb_records_created", 0) for r in results)
    successful = sum(1 for r in results if r.get("status") == "success")
    failed = sum(1 for r in results if r.get("status") == "error")
    skipped = sum(1 for r in results if r.get("status") == "skipped")

    print(f"Total Sheets Processed: {len(sheet_names)}")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Skipped: {skipped}")
    print(f"Total Institutions Created: {total_institutions}")
    print(f"Total DCB Records Created: {total_dcb}")

    print("\n[SUCCESS] Import completed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())

















