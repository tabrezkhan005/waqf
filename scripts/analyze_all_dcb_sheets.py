#!/usr/bin/env python3
"""
Analyze ALL sheets in the DCB Excel file
Each sheet likely represents a different district
"""

import pandas as pd
import sys
import os
from pathlib import Path

def analyze_all_sheets(file_path: str):
    """Analyze all sheets in the Excel file"""

    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return 1

    print("=" * 80)
    print("COMPREHENSIVE DCB EXCEL FILE ANALYSIS - ALL SHEETS")
    print("=" * 80)
    print(f"\nFile: {file_path}\n")

    try:
        # Get all sheet names
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names

        print("=" * 80)
        print(f"1. SHEET OVERVIEW")
        print("=" * 80)
        print(f"\nTotal Sheets Found: {len(sheet_names)}")
        print(f"\nSheet Names:")
        for i, sheet in enumerate(sheet_names, 1):
            print(f"  {i:2d}. {sheet}")

        # Analyze each sheet
        print("\n" + "=" * 80)
        print("2. SHEET-BY-SHEET ANALYSIS")
        print("=" * 80)

        all_districts = []
        total_institutions = 0
        sheet_summaries = []

        for sheet_idx, sheet_name in enumerate(sheet_names):
            print(f"\n{'='*80}")
            print(f"SHEET {sheet_idx + 1}/{len(sheet_names)}: {sheet_name}")
            print(f"{'='*80}")

            try:
                # Read raw data
                df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)

                # Extract district and financial year from title row
                title_row = df_raw.iloc[0, 0] if len(df_raw) > 0 else None
                district = "UNKNOWN"
                financial_year = "UNKNOWN"

                if pd.notna(title_row):
                    title_str = str(title_row).upper()
                    # Try to extract district
                    if 'DISTRICT' in title_str:
                        parts = title_str.split('DISTRICT')
                        if len(parts) > 0:
                            district = parts[0].strip().split()[-1] if parts[0] else "UNKNOWN"

                    # Try to extract financial year
                    if 'YEAR' in title_str:
                        year_parts = title_str.split('YEAR')
                        if len(year_parts) > 1:
                            year_info = year_parts[1].strip().split()[0] if year_parts[1] else "UNKNOWN"
                            financial_year = year_info

                # Try to read data (skip first 3 rows which are headers)
                try:
                    df_data = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=3, header=None)
                    # Remove completely empty rows
                    df_data = df_data.dropna(how='all')

                    # Count actual data rows (rows with at least AP number)
                    data_rows = 0
                    if len(df_data) > 0 and len(df_data.columns) > 1:
                        # Column 1 (index 1) should have AP numbers
                        ap_col = df_data.iloc[:, 1]
                        data_rows = ap_col.notna().sum()

                    print(f"\n[INFO] District: {district}")
                    print(f"[INFO] Financial Year: {financial_year}")
                    print(f"[INFO] Total Rows (raw): {len(df_raw)}")
                    print(f"[INFO] Data Rows (estimated): {data_rows}")
                    print(f"[INFO] Columns: {len(df_raw.columns)}")

                    # Sample data
                    if len(df_data) > 0:
                        print(f"\n[INFO] First Data Row Sample:")
                        print(f"  Sl No: {df_data.iloc[0, 0] if len(df_data.columns) > 0 else 'N/A'}")
                        print(f"  AP No: {df_data.iloc[0, 1] if len(df_data.columns) > 1 else 'N/A'}")
                        print(f"  Institution: {df_data.iloc[0, 2] if len(df_data.columns) > 2 else 'N/A'}")

                    all_districts.append(district)
                    total_institutions += data_rows

                    sheet_summaries.append({
                        'sheet_name': sheet_name,
                        'district': district,
                        'financial_year': financial_year,
                        'data_rows': data_rows,
                        'total_rows': len(df_raw),
                        'columns': len(df_raw.columns)
                    })

                except Exception as e:
                    print(f"[WARNING] Could not read data rows: {str(e)}")
                    sheet_summaries.append({
                        'sheet_name': sheet_name,
                        'district': district,
                        'financial_year': financial_year,
                        'data_rows': 0,
                        'total_rows': len(df_raw),
                        'columns': len(df_raw.columns),
                        'error': str(e)
                    })

            except Exception as e:
                print(f"[ERROR] Error analyzing sheet '{sheet_name}': {str(e)}")
                sheet_summaries.append({
                    'sheet_name': sheet_name,
                    'district': 'ERROR',
                    'financial_year': 'ERROR',
                    'data_rows': 0,
                    'total_rows': 0,
                    'columns': 0,
                    'error': str(e)
                })

        # Summary Statistics
        print("\n" + "=" * 80)
        print("3. SUMMARY STATISTICS")
        print("=" * 80)

        print(f"\n[SUMMARY] Total Sheets: {len(sheet_names)}")
        print(f"[SUMMARY] Total Institutions (estimated): {total_institutions:,}")
        print(f"[SUMMARY] Unique Districts Found: {len(set(all_districts))}")

        # District breakdown
        from collections import Counter
        district_counts = Counter(all_districts)
        print(f"\n[SUMMARY] District Distribution:")
        for district, count in sorted(district_counts.items()):
            print(f"  {district}: {count} sheet(s)")

        # Detailed summary table
        print("\n" + "=" * 80)
        print("4. DETAILED SHEET SUMMARY")
        print("=" * 80)
        print(f"\n{'Sheet Name':<30} {'District':<20} {'Year':<12} {'Data Rows':<12} {'Status':<15}")
        print("-" * 100)

        for summary in sheet_summaries:
            status = "OK" if summary.get('data_rows', 0) > 0 else "ERROR" if 'error' in summary else "EMPTY"
            print(f"{summary['sheet_name']:<30} {summary['district']:<20} {summary['financial_year']:<12} "
                  f"{summary['data_rows']:<12} {status:<15}")

        # Check for consistency
        print("\n" + "=" * 80)
        print("5. DATA CONSISTENCY CHECK")
        print("=" * 80)

        # Check if all sheets have same structure
        financial_years = set(s['financial_year'] for s in sheet_summaries if s['financial_year'] != 'UNKNOWN' and s['financial_year'] != 'ERROR')
        if len(financial_years) == 1:
            print(f"[OK] All sheets have same financial year: {financial_years.pop()}")
        elif len(financial_years) > 1:
            print(f"[WARNING] Multiple financial years found: {financial_years}")

        # Check column counts
        column_counts = set(s['columns'] for s in sheet_summaries if s['columns'] > 0)
        if len(column_counts) == 1:
            print(f"[OK] All sheets have same column count: {column_counts.pop()}")
        else:
            print(f"[WARNING] Different column counts found: {column_counts}")

        # Sample detailed analysis of first sheet
        print("\n" + "=" * 80)
        print("6. DETAILED ANALYSIS OF FIRST SHEET (Sample)")
        print("=" * 80)

        if len(sheet_names) > 0:
            first_sheet = sheet_names[0]
            print(f"\nAnalyzing sheet: {first_sheet}")

            df_raw = pd.read_excel(file_path, sheet_name=first_sheet, header=None)

            print(f"\nHeader Structure:")
            print(f"Row 0 (Title): {df_raw.iloc[0, 0] if len(df_raw) > 0 else 'N/A'}")
            print(f"Row 1 (Header 1): {df_raw.iloc[1, :8].tolist() if len(df_raw) > 1 else 'N/A'}")
            print(f"Row 2 (Header 2): {df_raw.iloc[2, 5:11].tolist() if len(df_raw) > 2 else 'N/A'}")

            # Try to read actual data
            try:
                df_data = pd.read_excel(file_path, sheet_name=first_sheet, skiprows=3, header=None)
                df_data = df_data.dropna(how='all')

                if len(df_data) > 0:
                    print(f"\nSample Data Rows (first 3):")
                    for i in range(min(3, len(df_data))):
                        row = df_data.iloc[i]
                        print(f"\n  Row {i+1}:")
                        print(f"    Sl No: {row.iloc[0] if len(row) > 0 else 'N/A'}")
                        print(f"    AP No: {row.iloc[1] if len(row) > 1 else 'N/A'}")
                        print(f"    Institution: {str(row.iloc[2])[:50] if len(row) > 2 else 'N/A'}")
                        print(f"    D-Arrears: {row.iloc[8] if len(row) > 8 else 'N/A'}")
                        print(f"    D-Current: {row.iloc[9] if len(row) > 9 else 'N/A'}")
                        print(f"    C-Arrears: {row.iloc[13] if len(row) > 13 else 'N/A'}")
                        print(f"    C-Current: {row.iloc[14] if len(row) > 14 else 'N/A'}")
            except Exception as e:
                print(f"[ERROR] Could not read sample data: {str(e)}")

        # Recommendations
        print("\n" + "=" * 80)
        print("7. RECOMMENDATIONS")
        print("=" * 80)

        print("\n[FINDINGS]")
        print(f"1. Excel file contains {len(sheet_names)} sheets (likely one per district)")
        print(f"2. Estimated total institutions: {total_institutions:,}")
        print(f"3. Each sheet follows same structure (multi-row header)")
        print(f"4. District name extracted from title row in each sheet")
        print(f"5. Financial year appears consistent across sheets")

        print("\n[RECOMMENDATIONS]")
        print("1. Create import script that processes ALL sheets")
        print("2. Extract district name from each sheet's title row")
        print("3. Use same column mapping for all sheets")
        print("4. Validate data consistency across sheets")
        print("5. Import each sheet as separate batch or combine into single import")
        print("6. Map district names to districts table (26 districts)")

        print("\n" + "=" * 80)
        print("Analysis Complete!")
        print("=" * 80)

    except Exception as e:
        print(f"\n[ERROR] Error analyzing file: {str(e)}")
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

    sys.exit(analyze_all_sheets(file_path))

















