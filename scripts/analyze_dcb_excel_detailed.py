#!/usr/bin/env python3
"""
Detailed DCB Excel File Analysis
Handles multi-row headers and extracts actual data structure
"""

import pandas as pd
import sys
import os
from pathlib import Path

def analyze_excel_detailed(file_path: str):
    """Detailed analysis with proper header handling"""

    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return 1

    print("=" * 80)
    print("DETAILED DCB EXCEL FILE ANALYSIS")
    print("=" * 80)
    print(f"\nFile: {file_path}\n")

    try:
        # Read Excel without headers first to see raw structure
        df_raw = pd.read_excel(file_path, header=None)

        print("=" * 80)
        print("1. RAW FILE STRUCTURE")
        print("=" * 80)
        print(f"Total Rows: {len(df_raw)}")
        print(f"Total Columns: {len(df_raw.columns)}")
        print(f"\nFirst 10 rows (raw):")
        print(df_raw.head(10).to_string())

        # Try to identify header rows
        print("\n" + "=" * 80)
        print("2. HEADER ROW IDENTIFICATION")
        print("=" * 80)

        # Look for rows that might contain headers
        # Based on the output, rows 0, 1, 2 seem to be headers
        print("\nRow 0 (Possible Title Row):")
        print(df_raw.iloc[0].tolist())

        print("\nRow 1 (Possible Header Row 1):")
        print(df_raw.iloc[1].tolist())

        print("\nRow 2 (Possible Header Row 2):")
        print(df_raw.iloc[2].tolist())

        print("\nRow 3 (Possible Data Start):")
        print(df_raw.iloc[3].tolist())

        # Try reading with skiprows
        print("\n" + "=" * 80)
        print("3. READING WITH HEADER AT ROW 2 (0-indexed)")
        print("=" * 80)

        df = pd.read_excel(file_path, header=2, skiprows=[0, 1])

        print(f"\nColumns found: {len(df.columns)}")
        print("\nColumn Names:")
        for i, col in enumerate(df.columns):
            print(f"  {i+1}. {col}")

        print("\n" + "=" * 80)
        print("4. DATA SAMPLE (First 5 Rows)")
        print("=" * 80)
        print(df.head().to_string())

        print("\n" + "=" * 80)
        print("5. DATA STATISTICS")
        print("=" * 80)
        print(f"Total Data Rows: {len(df)}")
        print(f"Total Columns: {len(df.columns)}")

        # Column mapping analysis
        print("\n" + "=" * 80)
        print("6. COLUMN MAPPING ANALYSIS")
        print("=" * 80)

        # Expected column patterns
        column_mapping = {}

        # Try to identify columns by position and content
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if 'Sl No' in col_str or 'Sl.No' in col_str or col_str == '1':
                column_mapping['Sl No'] = i
            elif 'Gazette' in col_str or 'SL.NO' in col_str or col_str == '2':
                column_mapping['Gazette SL.NO'] = i
            elif 'Name' in col_str and 'Institution' in col_str or col_str == '3':
                column_mapping['Name of Institution'] = i
            elif 'Mandal' in col_str or col_str == '4':
                column_mapping['Mandal'] = i
            elif 'Village' in col_str or col_str == '5':
                column_mapping['Village'] = i
            elif 'Dry' in col_str or col_str == '6':
                column_mapping['Ext-Dry'] = i
            elif 'Wet' in col_str or col_str == '7':
                column_mapping['Ext-Wet'] = i
            elif 'Total' in col_str and ('Extent' in str(df.columns[i-1]) or col_str == '8'):
                column_mapping['Ext-Total'] = i
            elif 'Arrears' in col_str and 'DEMAND' in str(df_raw.iloc[1, i]) or col_str == '9':
                column_mapping['D-Arrears'] = i
            elif 'Current' in col_str and 'DEMAND' in str(df_raw.iloc[1, i]) or col_str == '10':
                column_mapping['D-Current'] = i
            elif 'Total' in col_str and 'DEMAND' in str(df_raw.iloc[1, i]) or col_str == '11':
                column_mapping['D-Total'] = i
            elif 'Recept' in col_str or 'Receipt' in col_str or col_str == '12':
                column_mapping['Receipt No & Date'] = i
            elif 'Challan' in col_str or col_str == '13':
                column_mapping['Challan No & Date'] = i
            elif 'Arrears' in col_str and 'Collection' in str(df_raw.iloc[1, i]) or col_str == '14':
                column_mapping['C-Arrears'] = i
            elif 'Current' in col_str and 'Collection' in str(df_raw.iloc[1, i]) or col_str == '15':
                column_mapping['C-Current'] = i
            elif 'Total' in col_str and 'Collection' in str(df_raw.iloc[1, i]) or col_str == '16':
                column_mapping['C-Total'] = i
            elif 'Arrears' in col_str and 'BALANCE' in str(df_raw.iloc[1, i]) or col_str == '17':
                column_mapping['B-Arrears'] = i
            elif 'Current' in col_str and 'BALANCE' in str(df_raw.iloc[1, i]) or col_str == '18':
                column_mapping['B-Current'] = i
            elif 'Total' in col_str and 'BALANCE' in str(df_raw.iloc[1, i]) or col_str == '19':
                column_mapping['B-Total'] = i
            elif 'Remarks' in col_str or col_str == '20':
                column_mapping['Remarks'] = i

        print("\nIdentified Column Mappings:")
        for db_col, excel_idx in column_mapping.items():
            print(f"  {db_col:30} -> Column {excel_idx} ({df.columns[excel_idx]})")

        # Financial data analysis
        print("\n" + "=" * 80)
        print("7. FINANCIAL DATA ANALYSIS")
        print("=" * 80)

        financial_cols = ['D-Arrears', 'D-Current', 'C-Arrears', 'C-Current', 'B-Arrears', 'B-Current']

        for col_name in financial_cols:
            if col_name in column_mapping:
                col_idx = column_mapping[col_name]
                col_data = pd.to_numeric(df.iloc[:, col_idx], errors='coerce')
                non_null = col_data.notna().sum()
                if non_null > 0:
                    print(f"\n{col_name}:")
                    print(f"  Non-null: {non_null}")
                    print(f"  Total: Rs. {col_data.sum():,.2f}")
                    print(f"  Average: Rs. {col_data.mean():,.2f}")

        # District information
        print("\n" + "=" * 80)
        print("8. DISTRICT INFORMATION")
        print("=" * 80)

        # Extract district from title
        title_row = df_raw.iloc[0, 0]
        if pd.notna(title_row):
            title = str(title_row)
            if 'DISTRICT' in title:
                # Try to extract district name
                parts = title.split('DISTRICT')
                if len(parts) > 0:
                    district_part = parts[0].split()[-1] if parts[0] else "UNKNOWN"
                    print(f"District from title: {district_part}")

        # Financial year
        if 'YEAR' in str(title_row):
            year_parts = str(title_row).split('YEAR')
            if len(year_parts) > 1:
                year_info = year_parts[1].split()[0] if year_parts[1] else "UNKNOWN"
                print(f"Financial Year: {year_info}")

        print("\n" + "=" * 80)
        print("9. SUMMARY & RECOMMENDATIONS")
        print("=" * 80)

        print("\n[FINDINGS]")
        print("1. Excel file has multi-row header structure")
        print("2. Actual data starts from row 3 (0-indexed)")
        print("3. Column names are spread across rows 1-2")
        print("4. Need to create proper column mapping for import")
        print("5. District information is in the title row")

        print("\n[RECOMMENDATIONS]")
        print("1. Create a data transformation script to:")
        print("   - Skip header rows (0, 1)")
        print("   - Use row 2 as column headers")
        print("   - Map Excel columns to database columns")
        print("   - Extract district and financial year from title")
        print("   - Clean and validate data before import")

        print("\n" + "=" * 80)
        print("Analysis Complete!")
        print("=" * 80)

    except Exception as e:
        print(f"\n[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    default_path = Path(__file__).parent.parent / "assets" / "DCB CODES-19-12-2025.xlsx"

    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = str(default_path)

    sys.exit(analyze_excel_detailed(file_path))








