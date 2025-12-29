#!/usr/bin/env python3
"""
Clean CSV file for DCB import
Converts empty strings to proper NULL values for numeric columns
"""

import pandas as pd
import sys
from pathlib import Path
import argparse

def clean_numeric_value(value):
    """Convert empty strings and invalid values to None (NULL)"""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == '' or value == '""' or value.lower() in ['nan', 'none', 'n/a', 'na', '-']:
            return None
        # Try to convert to float
        try:
            return float(value.replace(',', '').replace('₹', '').strip())
        except (ValueError, AttributeError):
            return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def clean_text_value(value):
    """Convert empty strings to None (NULL)"""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == '' or value == '""':
            return None
        return value
    return str(value) if value is not None else None

def clean_csv(input_file: Path, output_file: Path, district_table: str):
    """Clean CSV file for DCB import"""
    print(f"Reading CSV: {input_file}")

    # Read CSV - handle various encodings and separators
    try:
        df = pd.read_csv(input_file, encoding='utf-8')
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(input_file, encoding='latin-1')
        except:
            df = pd.read_csv(input_file, encoding='cp1252')

    print(f"Found {len(df)} rows and {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")

    # Column mapping based on common CSV formats
    # Map various column name variations to standard names
    column_mapping = {}
    for col in df.columns:
        col_lower = col.lower().strip()
        # Map to standard column names
        if 'ap_gazett' in col_lower or 'ap_no' in col_lower:
            column_mapping[col] = 'ap_gazette_no'
        elif 'institut' in col_lower or 'institution' in col_lower:
            column_mapping[col] = 'institution_name'
        elif 'extent_dr' in col_lower or 'extent_dry' in col_lower:
            column_mapping[col] = 'extent_dry'
        elif 'extent_w' in col_lower or 'extent_wet' in col_lower:
            column_mapping[col] = 'extent_wet'
        elif 'extent_to' in col_lower or 'extent_total' in col_lower:
            column_mapping[col] = 'extent_total'
        elif 'demand_' in col_lower and 'arrear' in col_lower:
            column_mapping[col] = 'demand_arrears'
        elif 'demand_' in col_lower and 'current' in col_lower:
            column_mapping[col] = 'demand_current'
        elif 'demand_t' in col_lower or ('demand' in col_lower and 'total' in col_lower):
            column_mapping[col] = 'demand_total'
        elif 'collection' in col_lower and 'arrear' in col_lower:
            column_mapping[col] = 'collection_arrears'
        elif 'collection' in col_lower and 'current' in col_lower:
            column_mapping[col] = 'collection_current'
        elif 'collection' in col_lower and 'total' in col_lower:
            column_mapping[col] = 'collection_total'
        elif 'balance_a' in col_lower or ('balance' in col_lower and 'arrear' in col_lower):
            column_mapping[col] = 'balance_arrears'
        elif 'balance_c' in col_lower or ('balance' in col_lower and 'current' in col_lower):
            column_mapping[col] = 'balance_current'
        elif 'balance_t' in col_lower or ('balance' in col_lower and 'total' in col_lower):
            column_mapping[col] = 'balance_total'

    # Clean all columns
    for col in df.columns:
        col_lower = col.lower().strip()

        # Determine column type
        if col_lower in ['ap_gazette_no', 'ap_gazett', 'institution_name', 'institutior',
                        'village', 'mandal', 'remarks', 'receiptno', 'receipt_no',
                        'challanno', 'challan_no'] or 'extent_total' in col_lower or 'extent_to' in col_lower:
            # Text columns (including extent_total for alphanumeric)
            print(f"  Cleaning text column: {col}")
            df[col] = df[col].apply(clean_text_value)
        elif any(x in col_lower for x in ['extent', 'demand', 'collection', 'balance']):
            # Numeric columns
            print(f"  Cleaning numeric column: {col}")
            df[col] = df[col].apply(clean_numeric_value)
        else:
            # Unknown columns - clean as text
            print(f"  Cleaning unknown column as text: {col}")
            df[col] = df[col].apply(clean_text_value)

    # Save cleaned CSV - use empty string for NaN (Supabase will treat as NULL)
    df.to_csv(output_file, index=False, na_rep='')

    print(f"\n✓ Cleaned CSV saved to: {output_file}")
    print(f"  Rows: {len(df)}")
    print(f"  Empty values converted to empty strings (Supabase will treat as NULL)")
    print(f"\nNext steps:")
    print(f"  1. Upload the cleaned CSV to Supabase Dashboard")
    print(f"  2. Select table: {district_table}")
    print(f"  3. Map columns if needed")
    print(f"  4. Import data")

    return df

def main():
    parser = argparse.ArgumentParser(description='Clean CSV file for DCB import')
    parser.add_argument('input', type=str, help='Input CSV file path')
    parser.add_argument('--output', '-o', type=str, help='Output CSV file path (default: input_cleaned.csv)')
    parser.add_argument('--district', '-d', type=str, help='District table name (e.g., dcb_chittoor)')

    args = parser.parse_args()

    input_file = Path(args.input)
    if not input_file.exists():
        print(f"Error: File not found: {input_file}")
        sys.exit(1)

    if args.output:
        output_file = Path(args.output)
    else:
        output_file = input_file.parent / f"{input_file.stem}_cleaned{input_file.suffix}"

    district_table = args.district or 'dcb_chittoor'

    try:
        clean_csv(input_file, output_file, district_table)
        print("\n✓ CSV cleaned successfully!")
        print(f"\nNext steps:")
        print(f"1. Upload the cleaned CSV: {output_file}")
        print(f"2. Or use Supabase Dashboard → Table Editor → Import CSV")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
