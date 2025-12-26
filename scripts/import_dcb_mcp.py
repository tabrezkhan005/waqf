#!/usr/bin/env python3
"""
DCB Data Import using Supabase MCP Tools
Processes Excel and prepares data for import via SQL
"""

import pandas as pd
import sys
import os
import json
from pathlib import Path
import re
from typing import Dict, List, Optional, Tuple

EXCEL_FILE = Path(__file__).parent.parent / "assets" / "DCB CODES-19-12-2025.xlsx"

# District name mapping
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
    """Convert value to numeric"""
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
    """Parse date string"""
    if pd.isna(date_str) or not date_str:
        return None
    date_str = str(date_str).strip()
    if date_str in ["-", "", "nan", "NaN"]:
        return None
    try:
        if "/" in date_str and "-" in date_str:
            parts = date_str.split("/")
            if len(parts) >= 3:
                date_part = parts[-1]
                if "-" in date_part:
                    d, m, y = date_part.split("-")
                    return f"{y}-{m}-{d}"
        if "-" in date_str and len(date_str.split("-")) == 3:
            d, m, y = date_str.split("-")
            return f"{y}-{m}-{d}"
        date_obj = pd.to_datetime(date_str, errors='coerce')
        if pd.notna(date_obj):
            return date_obj.strftime("%Y-%m-%d")
    except:
        pass
    return None

def extract_receipt_info(receipt_str: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract receipt number and date"""
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

def escape_sql_string(value: Optional[str]) -> Optional[str]:
    """Escape SQL string"""
    if value is None or pd.isna(value):
        return None
    value = str(value).strip()
    if value in ["-", "", "nan", "NaN", "None"]:
        return None
    # Escape single quotes
    value = value.replace("'", "''")
    return value

def process_all_sheets() -> Tuple[List[Dict], List[Dict]]:
    """Process all sheets and return institutions and DCB data"""
    excel_file = pd.ExcelFile(EXCEL_FILE)
    sheet_names = excel_file.sheet_names

    all_institutions = []
    all_dcb_records = []
    district_ids = {}  # Cache district IDs

    print(f"Processing {len(sheet_names)} sheets...")

    for sheet_idx, sheet_name in enumerate(sheet_names, 1):
        print(f"\n[{sheet_idx}/{len(sheet_names)}] Processing: {sheet_name}")

        try:
            df_raw = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, header=None)

            # Extract district and financial year
            district_name = DISTRICT_MAPPING.get(sheet_name, "UNKNOWN")
            financial_year = "2025-26"

            title_row = df_raw.iloc[0, 0] if len(df_raw) > 0 else None
            if pd.notna(title_row):
                title_str = str(title_row).upper()
                if "YEAR" in title_str or "2025" in title_str:
                    year_match = re.search(r'20\d{2}[-/]20\d{2}', title_str)
                    if year_match:
                        year_str = year_match.group()
                        financial_year = year_str.replace("/", "-")

            # Get district ID
            if district_name not in district_ids:
                # Will be resolved later with SQL
                district_ids[district_name] = None

            # Read data
            df_data = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, skiprows=3, header=None)
            df_data = df_data.dropna(how='all')

            for idx, row in df_data.iterrows():
                try:
                    ap_no = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else None
                    if not ap_no or ap_no in ["nan", "NaN", "2", "-", ""]:
                        continue

                    institution_name = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else None
                    if not institution_name or institution_name in ["nan", "NaN", "3", ""]:
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
                    mandal = escape_sql_string(mandal) if mandal and mandal not in ["nan", "4"] else None
                    village = escape_sql_string(village) if village and village not in ["nan", "5"] else None
                    institution_name_clean = escape_sql_string(institution_name)
                    remarks_clean = escape_sql_string(remarks) if remarks and remarks not in ["nan", "20"] else None
                    receipt_no_clean = escape_sql_string(receipt_no)
                    challan_no_clean = escape_sql_string(challan_no)

                    # Institution data
                    institution = {
                        "name": institution_name_clean,
                        "code": ap_no,
                        "district_name": district_name,
                        "mandal": mandal,
                        "village": village,
                        "address": f"{village}, {mandal}" if village and mandal else (village or mandal),
                    }

                    # DCB data
                    dcb = {
                        "ap_no": ap_no,
                        "institution_name": institution_name_clean,
                        "district_name": district_name,
                        "financial_year": financial_year,
                        "mandal": mandal,
                        "village": village,
                        "ext_dry": ext_dry if ext_dry > 0 else None,
                        "ext_wet": ext_wet if ext_wet > 0 else None,
                        "d_arrears": d_arrears,
                        "d_current": d_current,
                        "c_arrears": c_arrears,
                        "c_current": c_current,
                        "receipt_no": receipt_no_clean,
                        "receipt_date": receipt_date,
                        "challan_no": challan_no_clean,
                        "challan_date": challan_date,
                        "remarks": remarks_clean,
                    }

                    all_institutions.append(institution)
                    all_dcb_records.append(dcb)

                except Exception as e:
                    print(f"  [WARNING] Error processing row {idx}: {str(e)}")
                    continue

            print(f"  [SUCCESS] Processed {len([i for i in all_institutions if i.get('district_name') == district_name])} records")

        except Exception as e:
            print(f"  [ERROR] Failed to process sheet: {str(e)}")
            continue

    print(f"\n[SUMMARY] Total Institutions: {len(all_institutions)}")
    print(f"[SUMMARY] Total DCB Records: {len(all_dcb_records)}")

    return all_institutions, all_dcb_records

def generate_sql_inserts(institutions: List[Dict], dcb_records: List[Dict]) -> str:
    """Generate SQL INSERT statements"""
    sql_parts = []

    # First, get district IDs mapping
    sql_parts.append("-- Get district IDs")
    sql_parts.append("DO $$")
    sql_parts.append("DECLARE")
    sql_parts.append("  district_map JSONB := '{}'::JSONB;")
    sql_parts.append("BEGIN")

    # Get all districts
    districts_sql = """
    FOR d IN SELECT id, name FROM districts LOOP
      district_map := jsonb_set(district_map, ARRAY[LOWER(d.name)], to_jsonb(d.id));
    END LOOP;
    """
    sql_parts.append(districts_sql)

    # Insert institutions in batches
    sql_parts.append("\n-- Insert Institutions")
    batch_size = 100
    for i in range(0, len(institutions), batch_size):
        batch = institutions[i:i+batch_size]
        values = []
        for inst in batch:
            district_id_sql = f"(district_map->>LOWER('{inst['district_name']}'))::int"
            name = inst['name'].replace("'", "''")
            code = inst['code'].replace("'", "''")
            address_val = inst.get('address')
            if address_val:
                address_escaped = address_val.replace("'", "''")
                address_sql = f"'{address_escaped}'"
            else:
                address_sql = 'NULL'
            values.append(f"('{name}', '{code}', {district_id_sql}, {address_sql}, true)")

        sql_parts.append(f"INSERT INTO institutions (name, code, district_id, address, is_active) VALUES")
        sql_parts.append(",\n".join(values) + ";")

    # Insert DCB records (need institution_id, so use subquery)
    sql_parts.append("\n-- Insert DCB Records")
    for dcb in dcb_records:
        district_id_sql = f"(district_map->>LOWER('{dcb['district_name']}'))::int"
        inst_name = dcb['institution_name'].replace("'", "''")
        ap_no = dcb['ap_no'].replace("'", "''")

        sql = f"""
INSERT INTO institution_dcb (
  institution_id, financial_year, ap_no, institution_name, district_name,
  mandal, village, ext_dry, ext_wet,
  d_arrears, d_current, c_arrears, c_current,
  receipt_no, receipt_date, challan_no, challan_date, remarks
)
SELECT
  i.id,
  '{dcb['financial_year']}',
  '{ap_no}',
  '{inst_name}',
  '{dcb['district_name']}',
  {f"'{dcb['mandal']}'" if dcb.get('mandal') else 'NULL'},
  {f"'{dcb['village']}'" if dcb.get('village') else 'NULL'},
  {dcb['ext_dry'] if dcb.get('ext_dry') else 'NULL'},
  {dcb['ext_wet'] if dcb.get('ext_wet') else 'NULL'},
  {dcb['d_arrears']},
  {dcb['d_current']},
  {dcb['c_arrears']},
  {dcb['c_current']},
  {f"'{dcb['receipt_no']}'" if dcb.get('receipt_no') else 'NULL'},
  {f"'{dcb['receipt_date']}'" if dcb.get('receipt_date') else 'NULL'},
  {f"'{dcb['challan_no']}'" if dcb.get('challan_no') else 'NULL'},
  {f"'{dcb['challan_date']}'" if dcb.get('challan_date') else 'NULL'},
  {f"'{dcb['remarks']}'" if dcb.get('remarks') else 'NULL'}
FROM institutions i
WHERE i.code = '{ap_no}'
ON CONFLICT (ap_no, financial_year) DO UPDATE SET
  institution_name = EXCLUDED.institution_name,
  district_name = EXCLUDED.district_name,
  mandal = EXCLUDED.mandal,
  village = EXCLUDED.village,
  ext_dry = EXCLUDED.ext_dry,
  ext_wet = EXCLUDED.ext_wet,
  d_arrears = EXCLUDED.d_arrears,
  d_current = EXCLUDED.d_current,
  c_arrears = EXCLUDED.c_arrears,
  c_current = EXCLUDED.c_current,
  receipt_no = EXCLUDED.receipt_no,
  receipt_date = EXCLUDED.receipt_date,
  challan_no = EXCLUDED.challan_no,
  challan_date = EXCLUDED.challan_date,
  remarks = EXCLUDED.remarks,
  updated_at = now();
"""
        sql_parts.append(sql)

    sql_parts.append("END $$;")

    return "\n".join(sql_parts)

def main():
    """Main function"""
    print("=" * 80)
    print("DCB DATA IMPORT - PREPARATION")
    print("=" * 80)

    if not EXCEL_FILE.exists():
        print(f"[ERROR] Excel file not found: {EXCEL_FILE}")
        return 1

    # Process all sheets
    institutions, dcb_records = process_all_sheets()

    # Generate SQL file
    sql_content = generate_sql_inserts(institutions, dcb_records)
    sql_file = Path(__file__).parent.parent / "supabase" / "migrations" / "014_import_dcb_data.sql"

    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- ============================================\n")
        f.write("-- DCB Data Import Migration\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write(f"-- Institutions: {len(institutions)}\n")
        f.write(f"-- DCB Records: {len(dcb_records)}\n")
        f.write("-- ============================================\n\n")
        f.write(sql_content)

    print(f"\n[SUCCESS] SQL file generated: {sql_file}")
    print(f"[INFO] Run this migration in Supabase SQL Editor")

    return 0

if __name__ == "__main__":
    from datetime import datetime
    sys.exit(main())
