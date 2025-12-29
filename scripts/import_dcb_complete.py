#!/usr/bin/env python3
"""
Complete DCB Data Import Script
Requires SUPABASE_SERVICE_ROLE_KEY environment variable
"""

import pandas as pd
import sys
import os
from pathlib import Path
import re
from typing import Dict, List, Optional, Tuple
from supabase import create_client, Client
from datetime import datetime

EXCEL_FILE = Path(__file__).parent.parent / "assets" / "DCB CODES-19-12-2025.xlsx"
SUPABASE_URL = os.getenv("SUPABASE_URL")

# Try to get service role key from environment or .env file
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    # Try to read from .env file
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=", 1)[1].strip()
                    break
                elif line.startswith("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=", 1)[1].strip()
                    break
                elif line.startswith("SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=", 1)[1].strip()
                    break

if not SUPABASE_URL:
    print("[ERROR] SUPABASE_URL not found!")
    print("Please add it to .env file as:")
    print("  SUPABASE_URL=https://<project-ref>.supabase.co")
    sys.exit(1)

if not SUPABASE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not found!")
    print("Please add it to .env file as:")
    print("  EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
    print("\nYou can find the service role key in Supabase Dashboard:")
    print("  Settings > API > service_role key (secret)")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    "2025-2026": None,
}

def clean_numeric(value) -> float:
    if pd.isna(value) or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        if value in ["-", "", "nan", "NaN", "None", "Shops"]:
            return 0.0
        value = re.sub(r'[₹,\s]', '', value)
        try:
            return float(value)
        except:
            return 0.0
    return 0.0

def parse_date(date_str) -> Optional[str]:
    if pd.isna(date_str) or not date_str:
        return None
    date_str = str(date_str).strip()
    if date_str in ["-", "", "nan", "NaN"]:
        return None

    # Clean up malformed dates
    date_str = re.sub(r',\s*', '-', date_str)  # Replace comma with dash
    date_str = re.sub(r'\s+', '-', date_str)  # Replace spaces with dash

    try:
        # Handle format like "2614/53/05-06-2025" -> extract "05-06-2025"
        if "/" in date_str and "-" in date_str:
            parts = date_str.split("/")
            if len(parts) >= 3:
                date_part = parts[-1]  # Last part should be the date
                if "-" in date_part:
                    date_parts = date_part.split("-")
                    if len(date_parts) == 3:
                        d, m, y = date_parts
                        # Validate year
                        if len(y) == 2:
                            y = "20" + y
                        if len(y) == 4 and y.isdigit():
                            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"

        # Handle format "DD-MM-YYYY" or "DD-MM-YY"
        if "-" in date_str:
            date_parts = date_str.split("-")
            if len(date_parts) == 3:
                d, m, y = date_parts
                # Clean up each part
                d = d.strip()
                m = m.strip()
                y = y.strip()

                # Remove any non-digit characters
                d = re.sub(r'\D', '', d)
                m = re.sub(r'\D', '', m)
                y = re.sub(r'\D', '', y)

                if d and m and y:
                    if len(y) == 2:
                        y = "20" + y
                    if len(y) == 4 and y.isdigit() and int(y) >= 2000 and int(y) <= 2100:
                        if int(m) >= 1 and int(m) <= 12 and int(d) >= 1 and int(d) <= 31:
                            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"

        # Try pandas date parsing as last resort
        date_obj = pd.to_datetime(date_str, errors='coerce')
        if pd.notna(date_obj):
            return date_obj.strftime("%Y-%m-%d")
    except Exception as e:
        # Silently fail and return None for invalid dates
        pass
    return None

def extract_receipt_info(receipt_str: str) -> Tuple[Optional[str], Optional[str]]:
    if pd.isna(receipt_str) or not receipt_str:
        return None, None
    receipt_str = str(receipt_str).strip()
    if receipt_str in ["-", "", "nan", "NaN"]:
        return None, None
    receipt_no = None
    receipt_date = None
    if "/" in receipt_str:
        parts = receipt_str.split("/")
        if len(parts) >= 2:
            receipt_no = "/".join(parts[:-1])
            date_part = parts[-1]
            receipt_date = parse_date(date_part)
    return receipt_no, receipt_date

def get_district_id(district_name: str) -> Optional[int]:
    if not district_name:
        return None
    result = supabase.table("districts").select("id").eq("name", district_name).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]["id"]
    return None

def process_sheet(sheet_name: str) -> Dict:
    print(f"\nProcessing: {sheet_name}")

    try:
        df_raw = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, header=None)
        district_name = DISTRICT_MAPPING.get(sheet_name, "UNKNOWN")
        financial_year = "2025-26"

        title_row = df_raw.iloc[0, 0] if len(df_raw) > 0 else None
        if pd.notna(title_row):
            title_str = str(title_row).upper()
            if "YEAR" in title_str:
                year_match = re.search(r'20\d{2}[-/]20\d{2}', title_str)
                if year_match:
                    financial_year = year_match.group().replace("/", "-")

        district_id = get_district_id(district_name)
        if not district_id:
            print(f"  [SKIP] District '{district_name}' not found")
            return {"status": "skipped", "district": district_name}

        df_data = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, skiprows=3, header=None)
        df_data = df_data.dropna(how='all')

        institutions_created = 0
        dcb_created = 0
        rows_processed = 0
        rows_skipped = 0

        for idx, row in df_data.iterrows():
            rows_processed += 1
            try:
                # Skip the column number indicator row (row with "1", "2", "3", etc.)
                first_col = str(row.iloc[0]).strip() if len(row) > 0 and pd.notna(row.iloc[0]) else None
                if first_col in ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]:
                    rows_skipped += 1
                    continue

                ap_no = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else None
                if not ap_no or ap_no in ["nan", "NaN", "2", "-", "", "A.P.Gazette Sl. No.", "A.P.Gazette Sl.No.", "A.P.               Gazette                 Sl. No.", "A.P.      Gazette Sl. No.", "A.P. Gazette Sl.No.", "A.P Gazette Sl.No.", "A.P.Gazette Sl. No", "Gazette SL.NO"]:
                    rows_skipped += 1
                    continue

                # Check if AP number looks like a valid code (contains letters and numbers, not just a number)
                if ap_no.isdigit() and len(ap_no) <= 2:
                    rows_skipped += 1
                    continue

                institution_name = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else None
                if not institution_name or institution_name in ["nan", "NaN", "3", "", "Name of the Institution.", "Name of the Institution", "Name of the Institution & location"]:
                    rows_skipped += 1
                    continue

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

                # Clean data
                if mandal and mandal in ["nan", "4"]:
                    mandal = None
                if village and village in ["nan", "5"]:
                    village = None
                if remarks and remarks in ["nan", "20"]:
                    remarks = None

                # Create/get institution
                existing = supabase.table("institutions").select("id").eq("code", ap_no).execute()

                if existing.data and len(existing.data) > 0:
                    institution_id = existing.data[0]["id"]
                else:
                    inst_data = {
                        "name": institution_name,
                        "code": ap_no,
                        "district_id": district_id,
                        "address": f"{village}, {mandal}" if village and mandal else (village or mandal),
                        "is_active": True
                    }
                    result = supabase.table("institutions").insert(inst_data).execute()
                    if result.data:
                        institution_id = result.data[0]["id"]
                        institutions_created += 1
                    else:
                        continue

                # Create/update DCB
                dcb_data = {
                    "institution_id": institution_id,
                    "financial_year": financial_year,
                    "ap_no": ap_no,
                    "institution_name": institution_name,
                    "district_name": district_name,
                    "mandal": mandal,
                    "village": village,
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
                    "remarks": remarks
                }

                existing_dcb = supabase.table("institution_dcb").select("id").eq("ap_no", ap_no).eq("financial_year", financial_year).execute()

                if existing_dcb.data and len(existing_dcb.data) > 0:
                    supabase.table("institution_dcb").update(dcb_data).eq("id", existing_dcb.data[0]["id"]).execute()
                else:
                    result = supabase.table("institution_dcb").insert(dcb_data).execute()
                    if result.data:
                        dcb_created += 1

            except Exception as e:
                print(f"  [WARNING] Row {idx}: {str(e)}")
                continue

        print(f"  [INFO] Rows processed: {rows_processed}, Skipped: {rows_skipped}")
        print(f"  [SUCCESS] Institutions: {institutions_created}, DCB: {dcb_created}")
        return {"status": "success", "institutions": institutions_created, "dcb": dcb_created}

    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return {"status": "error", "error": str(e)}

def create_inspector_accounts():
    print(f"\n{'='*80}")
    print("Creating Inspector Accounts")
    print(f"{'='*80}")

    districts = supabase.table("districts").select("id, name").execute()
    created = 0

    for district in districts.data:
        district_id = district["id"]
        district_name = district["name"]

        existing = supabase.table("profiles").select("id").eq("district_id", district_id).eq("role", "inspector").execute()
        if existing.data and len(existing.data) > 0:
            print(f"  [SKIP] {district_name} - inspector exists")
            continue

        email = f"inspector.{district_name.lower().replace(' ', '.').replace('.', '')}@waqf.gov.in"
        password = f"Inspector@{district_id}123"

        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })

            if auth_response.user:
                profile_data = {
                    "id": auth_response.user.id,
                    "full_name": f"Inspector - {district_name}",
                    "role": "inspector",
                    "district_id": district_id
                }
                supabase.table("profiles").insert(profile_data).execute()
                created += 1
                print(f"  [SUCCESS] {district_name}: {email} / {password}")
        except Exception as e:
            print(f"  [ERROR] {district_name}: {str(e)}")

    print(f"\n[SUMMARY] Created {created} inspector accounts")
    return created

def main():
    print("=" * 80)
    print("DCB DATA IMPORT - COMPLETE")
    print("=" * 80)

    if not EXCEL_FILE.exists():
        print(f"[ERROR] Excel file not found: {EXCEL_FILE}")
        return 1

    # Process all sheets
    excel_file = pd.ExcelFile(EXCEL_FILE)
    sheet_names = excel_file.sheet_names

    print(f"\nProcessing {len(sheet_names)} sheets...")

    results = []
    for sheet_name in sheet_names:
        result = process_sheet(sheet_name)
        results.append(result)

    # Create inspector accounts
    create_inspector_accounts()

    # Summary
    total_inst = sum(r.get("institutions", 0) for r in results)
    total_dcb = sum(r.get("dcb", 0) for r in results)

    print(f"\n{'='*80}")
    print("IMPORT SUMMARY")
    print(f"{'='*80}")
    print(f"Total Institutions Created: {total_inst}")
    print(f"Total DCB Records Created: {total_dcb}")
    print(f"[SUCCESS] Import completed!")

    return 0

if __name__ == "__main__":
    sys.exit(main())
