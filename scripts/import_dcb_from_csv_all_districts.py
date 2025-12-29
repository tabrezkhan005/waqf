#!/usr/bin/env python3
"""
Import DCB Data from CSV Files for All Districts
Imports directly to district-specific DCB tables without staging
"""

import os
import sys
import csv
from pathlib import Path
from typing import Optional, Dict, List, Any
from decimal import Decimal, InvalidOperation
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
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

# CSV filename to table name mapping
CSV_TO_TABLE_MAP = {
    "Adoni": "dcb_adoni",
    "ASRR": "dcb_alluri_seetaramaraju",
    "Anakapalli": "dcb_anakapalli",
    "Anantapuramu": "dcb_anantapuramu",
    "Annamaya": "dcb_annamayya",
    "Bapatla": "dcb_bapatla",
    "Chitoor": "dcb_chittoor",
    "Dr. B.R. Konaseema": "dcb_dr_b_r_a_konaseema",
    "EG": "dcb_east_godavari",
    "Eluru": "dcb_eluru",
    "Guntur": "dcb_guntur",
    "Kakinada": "dcb_kakinada",
    "Krishna": "dcb_krishna",
    "Kurnool": "dcb_kurnool",
    "Nandyal": "dcb_nandyal",
    "Nellore": "dcb_nellore",
    "NTR": "dcb_ntr",
    "Palnadu": "dcb_palnadu",
    "Parvatipuram": "dcb_parvathipuram",
    "Prakasam": "dcb_prakasam",
    "Srikakulam": "dcb_srikakulam",
    "SSS": "dcb_sri_sathya_sai",
    "Tirupati": "dcb_tirupati",
    "Vizianagaram": "dcb_vijayanagaram",
    "VSKP": "dcb_visakhapatnam",
    "WG": "dcb_west_godavari",
    "YSR": "dcb_ysr_kadapa_district",
}

def clean_numeric(value: Any) -> Optional[float]:
    """Convert value to numeric, handling empty strings, None, NaN, etc."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if str(value).lower() in ['nan', 'none', 'null']:
            return None
        return float(value)

    value_str = str(value).strip()
    if not value_str or value_str.lower() in ['', 'nan', 'none', 'null', 'n/a', '-', 'nil']:
        return None

    # Remove currency symbols and commas
    value_str = value_str.replace(',', '').replace('₹', '').replace('$', '').strip()

    try:
        return float(value_str)
    except (ValueError, InvalidOperation):
        return None

def clean_text(value: Any) -> Optional[str]:
    """Clean text value - keep None as None, empty strings as None or 'N/A'"""
    if value is None:
        return None
    value_str = str(value).strip()
    if not value_str or value_str.lower() in ['', 'nan', 'none', 'null']:
        return None  # Keep as None for text fields
    return value_str

def calculate_demand_total(demand_arrears: Optional[float], demand_current: Optional[float]) -> Optional[float]:
    """Calculate demand_total from arrears and current"""
    arr = demand_arrears if demand_arrears is not None else 0.0
    curr = demand_current if demand_current is not None else 0.0
    total = arr + curr
    return total if total > 0 else 0.0

def calculate_collection_total(collection_arrears: Optional[float], collection_current: Optional[float]) -> Optional[float]:
    """Calculate collection_total from arrears and current"""
    arr = collection_arrears if collection_arrears is not None else 0.0
    curr = collection_current if collection_current is not None else 0.0
    total = arr + curr
    return total if total > 0 else 0.0

def calculate_balance_arrears(demand_arrears: Optional[float], collection_arrears: Optional[float]) -> Optional[float]:
    """Calculate balance_arrears = demand_arrears - collection_arrears"""
    demand = demand_arrears if demand_arrears is not None else 0.0
    collection = collection_arrears if collection_arrears is not None else 0.0
    balance = demand - collection
    return balance

def calculate_balance_current(demand_current: Optional[float], collection_current: Optional[float]) -> Optional[float]:
    """Calculate balance_current = demand_current - collection_current"""
    demand = demand_current if demand_current is not None else 0.0
    collection = collection_current if collection_current is not None else 0.0
    balance = demand - collection
    return balance

def calculate_balance_total(balance_arrears: Optional[float], balance_current: Optional[float]) -> Optional[float]:
    """Calculate balance_total = balance_arrears + balance_current"""
    arr = balance_arrears if balance_arrears is not None else 0.0
    curr = balance_current if balance_current is not None else 0.0
    total = arr + curr
    return total

def process_csv_row(row: Dict[str, str], table_name: str) -> Dict[str, Any]:
    """Process a single CSV row and return data ready for database insertion"""

    # Text fields
    ap_gazette_no = clean_text(row.get('ap_gazette_no', ''))
    institution_name = clean_text(row.get('institution_name', ''))
    village = clean_text(row.get('village', ''))
    mandal = clean_text(row.get('mandal', ''))
    remarks = clean_text(row.get('remarks', ''))
    receiptno_date = clean_text(row.get('receiptno_date', ''))
    challanno_date = clean_text(row.get('challanno_date', ''))

    # Extent fields (text)
    extent_dry = clean_text(row.get('extent_dry', ''))
    extent_wet = clean_text(row.get('extent_wet', ''))
    extent_total = clean_text(row.get('extent_total', ''))

    # Demand fields (numeric, null -> 0)
    demand_arrears_raw = clean_numeric(row.get('demand_arrears', ''))
    demand_arrears = demand_arrears_raw if demand_arrears_raw is not None else 0.0

    demand_current_raw = clean_numeric(row.get('demand_current', ''))
    demand_current = demand_current_raw if demand_current_raw is not None else 0.0

    # Demand total: use provided value or calculate
    demand_total_raw = clean_numeric(row.get('demand_total', ''))
    if demand_total_raw is None:
        demand_total = calculate_demand_total(demand_arrears, demand_current)
    else:
        demand_total = demand_total_raw

    # Collection fields (numeric, null -> 0)
    collection_arrears_raw = clean_numeric(row.get('collection_arrears', ''))
    collection_arrears = collection_arrears_raw if collection_arrears_raw is not None else 0.0

    collection_current_raw = clean_numeric(row.get('collection_current', ''))
    collection_current = collection_current_raw if collection_current_raw is not None else 0.0

    # Collection total: use provided value or calculate
    collection_total_raw = clean_numeric(row.get('collection_total', ''))
    if collection_total_raw is None:
        collection_total = calculate_collection_total(collection_arrears, collection_current)
    else:
        collection_total = collection_total_raw

    # Balance fields: calculate from demand and collection
    balance_arrears_raw = clean_numeric(row.get('balance_arrears', ''))
    if balance_arrears_raw is None:
        balance_arrears = calculate_balance_arrears(demand_arrears, collection_arrears)
    else:
        balance_arrears = balance_arrears_raw

    balance_current_raw = clean_numeric(row.get('balance_current', ''))
    if balance_current_raw is None:
        balance_current = calculate_balance_current(demand_current, collection_current)
    else:
        balance_current = balance_current_raw

    balance_total_raw = clean_numeric(row.get('balance_total', ''))
    if balance_total_raw is None:
        balance_total = calculate_balance_total(balance_arrears, balance_current)
    else:
        balance_total = balance_total_raw

    # Validate required fields
    if not ap_gazette_no or not institution_name:
        raise ValueError(f"Missing required fields: ap_gazette_no={ap_gazette_no}, institution_name={institution_name}")

    return {
        'ap_gazette_no': ap_gazette_no,
        'institution_name': institution_name,
        'village': village,
        'mandal': mandal,
        'extent_dry': extent_dry,
        'extent_wet': extent_wet,
        'extent_total': extent_total,
        'demand_arrears': demand_arrears,
        'demand_current': demand_current,
        'demand_total': demand_total,
        'receiptno_date': receiptno_date,
        'challanno_date': challanno_date,
        'collection_arrears': collection_arrears,
        'collection_current': collection_current,
        'collection_total': collection_total,
        'balance_arrears': balance_arrears,
        'balance_current': balance_current,
        'balance_total': balance_total,
        'remarks': remarks,
    }

def import_csv_file(csv_path: Path, table_name: str, dry_run: bool = False) -> Dict[str, int]:
    """Import a single CSV file to the specified table"""
    stats = {
        'total_rows': 0,
        'imported': 0,
        'updated': 0,
        'errors': 0,
        'skipped': 0,
    }

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Importing {csv_path.name} to {table_name}...")

    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows_to_insert = []

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                stats['total_rows'] += 1

                try:
                    data = process_csv_row(row, table_name)

                    if not dry_run:
                        # Use upsert based on ap_gazette_no
                        result = supabase.table(table_name).upsert(
                            data,
                            on_conflict='ap_gazette_no'
                        ).execute()

                        # Check if it was an insert or update
                        # (Supabase doesn't directly tell us, so we'll assume update if no error)
                        stats['updated'] += 1
                        stats['imported'] += 1
                    else:
                        # Dry run - just validate
                        stats['imported'] += 1

                except ValueError as e:
                    print(f"  [WARN] Row {row_num}: {e}")
                    stats['skipped'] += 1
                except Exception as e:
                    print(f"  [ERROR] Row {row_num}: {e}")
                    stats['errors'] += 1
                    if not dry_run:
                        import traceback
                        traceback.print_exc()

        print(f"  [OK] Processed {stats['total_rows']} rows")
        print(f"       - Imported/Updated: {stats['imported']}")
        print(f"       - Skipped: {stats['skipped']}")
        print(f"       - Errors: {stats['errors']}")

    except Exception as e:
        print(f"  [ERROR] Failed to import {csv_path.name}: {e}")
        stats['errors'] = stats['total_rows']
        import traceback
        traceback.print_exc()

    return stats

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Import DCB data from CSV files for all districts')
    parser.add_argument('--csv-dir', type=str, default='assets/Waqf csv',
                       help='Directory containing CSV files (default: assets/Waqf csv)')
    parser.add_argument('--only', type=str, help='Comma-separated list of districts to import (e.g., "Chitoor,Anantapuramu")')
    parser.add_argument('--dry-run', action='store_true', help='Validate CSV files without importing')
    args = parser.parse_args()

    csv_dir = Path(__file__).parent.parent / args.csv_dir

    if not csv_dir.exists():
        print(f"[ERROR] CSV directory not found: {csv_dir}")
        sys.exit(1)

    # Get list of CSV files to process
    csv_files = list(csv_dir.glob("*.csv"))

    if not csv_files:
        print(f"[ERROR] No CSV files found in {csv_dir}")
        sys.exit(1)

    # Filter by --only if specified
    if args.only:
        only_list = [d.strip() for d in args.only.split(',')]
        csv_files = [f for f in csv_files if f.stem in only_list]
        if not csv_files:
            print(f"[ERROR] No matching CSV files found for: {args.only}")
            sys.exit(1)

    print("=" * 80)
    print("DCB Data Import from CSV Files")
    print("=" * 80)
    print(f"CSV Directory: {csv_dir}")
    print(f"Files to process: {len(csv_files)}")
    if args.dry_run:
        print("[DRY RUN MODE] - No data will be imported")
    print()

    # Process each CSV file
    total_stats = {
        'total_rows': 0,
        'imported': 0,
        'updated': 0,
        'errors': 0,
        'skipped': 0,
    }

    failed_files = []

    for csv_file in sorted(csv_files):
        district_name = csv_file.stem
        table_name = CSV_TO_TABLE_MAP.get(district_name)

        if not table_name:
            print(f"[WARN] No table mapping found for district: {district_name}")
            failed_files.append(district_name)
            continue

        stats = import_csv_file(csv_file, table_name, dry_run=args.dry_run)

        # Accumulate stats
        for key in total_stats:
            total_stats[key] += stats[key]

    # Summary
    print("\n" + "=" * 80)
    print("Import Summary")
    print("=" * 80)
    print(f"Total rows processed: {total_stats['total_rows']}")
    print(f"Successfully imported/updated: {total_stats['imported']}")
    print(f"Skipped: {total_stats['skipped']}")
    print(f"Errors: {total_stats['errors']}")

    if failed_files:
        print(f"\nFailed files (no table mapping): {len(failed_files)}")
        for f in failed_files:
            print(f"  - {f}")

    if total_stats['errors'] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
