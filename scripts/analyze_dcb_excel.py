#!/usr/bin/env python3
"""
DCB Excel File Analysis Script
Analyzes the DCB CODES Excel file and provides comprehensive statistics
"""

import pandas as pd
import sys
import os
from pathlib import Path

def analyze_excel_file(file_path: str):
    """Analyze the DCB Excel file and provide comprehensive report"""

    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return

    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("=" * 80)
    print("DCB EXCEL FILE ANALYSIS REPORT")
    print("=" * 80)
    print(f"\nFile: {file_path}")
    print(f"Analyzing...\n")

    try:
        # Read Excel file
        df = pd.read_excel(file_path)

        # Basic Information
        print("=" * 80)
        print("1. BASIC INFORMATION")
        print("=" * 80)
        print(f"Total Rows: {len(df):,}")
        print(f"Total Columns: {len(df.columns)}")
        print(f"File Size: {os.path.getsize(file_path) / 1024:.2f} KB")

        # Column Information
        print("\n" + "=" * 80)
        print("2. COLUMN STRUCTURE")
        print("=" * 80)
        print(f"\n{'Column Name':<30} {'Data Type':<15} {'Non-Null':<12} {'Null Count':<12}")
        print("-" * 80)

        for col in df.columns:
            non_null = df[col].notna().sum()
            null_count = df[col].isna().sum()
            dtype = str(df[col].dtype)
            print(f"{col:<30} {dtype:<15} {non_null:<12} {null_count:<12}")

        # Expected Columns (from documentation)
        expected_columns = [
            'AP No', 'Name of Institution', 'District', 'Name of Inspector',
            'Ext-Dry', 'Ext-Wet', 'Ext-Total',
            'D-Arrears', 'D-Current', 'D-Total',
            'Receipt No', 'Receipt Date',
            'C-Arrears', 'C-Current', 'C-Total',
            'B-Arrears', 'B-Current', 'B-Total',
            'Upload Receipt', 'Upload Bank Receipt', 'Remarks'
        ]

        print("\n" + "=" * 80)
        print("3. COLUMN MAPPING VERIFICATION")
        print("=" * 80)
        actual_columns = df.columns.tolist()

        missing_columns = [col for col in expected_columns if col not in actual_columns]
        extra_columns = [col for col in actual_columns if col not in expected_columns]

        if missing_columns:
            print(f"\n[WARNING] Missing Expected Columns ({len(missing_columns)}):")
            for col in missing_columns:
                print(f"   - {col}")
        else:
            print("\n[OK] All expected columns present")

        if extra_columns:
            print(f"\n[INFO] Extra Columns Found ({len(extra_columns)}):")
            for col in extra_columns:
                print(f"   - {col}")

        # Data Quality Analysis
        print("\n" + "=" * 80)
        print("4. DATA QUALITY ANALYSIS")
        print("=" * 80)

        # Check for duplicate AP Numbers
        if 'AP No' in df.columns:
            ap_no_col = 'AP No'
        elif 'AP No.' in df.columns:
            ap_no_col = 'AP No.'
        else:
            ap_no_col = None

        if ap_no_col:
            duplicates = df[ap_no_col].duplicated().sum()
            print(f"\n[ANALYSIS] AP Number Analysis:")
            print(f"   Total Records: {len(df):,}")
            print(f"   Unique AP Numbers: {df[ap_no_col].nunique():,}")
            print(f"   Duplicate AP Numbers: {duplicates:,}")

            if duplicates > 0:
                print(f"\n   [WARNING] Duplicate AP Numbers Found:")
                dup_ap_nos = df[df[ap_no_col].duplicated(keep=False)][ap_no_col].unique()
                for ap_no in dup_ap_nos[:10]:  # Show first 10
                    print(f"      - {ap_no}")
                if len(dup_ap_nos) > 10:
                    print(f"      ... and {len(dup_ap_nos) - 10} more")

        # District Analysis
        if 'District' in df.columns:
            print(f"\n[ANALYSIS] District Analysis:")
            district_counts = df['District'].value_counts()
            print(f"   Total Districts: {district_counts.nunique()}")
            print(f"   Top 10 Districts by Record Count:")
            for district, count in district_counts.head(10).items():
                print(f"      {district}: {count:,} records")

        # Inspector Analysis
        if 'Name of Inspector' in df.columns:
            print(f"\n[ANALYSIS] Inspector Analysis:")
            inspector_counts = df['Name of Inspector'].value_counts()
            print(f"   Total Inspectors: {inspector_counts.nunique()}")
            print(f"   Top 10 Inspectors by Record Count:")
            for inspector, count in inspector_counts.head(10).items():
                print(f"      {inspector}: {count:,} records")

        # Financial Data Analysis
        print("\n" + "=" * 80)
        print("5. FINANCIAL DATA ANALYSIS")
        print("=" * 80)

        numeric_columns = {
            'Ext-Dry': 'Land Area (Dry)',
            'Ext-Wet': 'Land Area (Wet)',
            'D-Arrears': 'Demand (Arrears)',
            'D-Current': 'Demand (Current)',
            'C-Arrears': 'Collection (Arrears)',
            'C-Current': 'Collection (Current)',
        }

        for col, label in numeric_columns.items():
            if col in df.columns:
                col_data = pd.to_numeric(df[col], errors='coerce')
                non_null = col_data.notna().sum()
                if non_null > 0:
                    print(f"\n[ANALYSIS] {label} ({col}):")
                    print(f"   Non-null values: {non_null:,} ({non_null/len(df)*100:.1f}%)")
                    print(f"   Total: Rs. {col_data.sum():,.2f}")
                    print(f"   Average: Rs. {col_data.mean():,.2f}")
                    print(f"   Min: Rs. {col_data.min():,.2f}")
                    print(f"   Max: Rs. {col_data.max():,.2f}")

        # Missing Data Analysis
        print("\n" + "=" * 80)
        print("6. MISSING DATA ANALYSIS")
        print("=" * 80)

        missing_data = df.isnull().sum()
        missing_percent = (missing_data / len(df)) * 100

        print(f"\n{'Column':<30} {'Missing Count':<15} {'Missing %':<15}")
        print("-" * 80)

        for col in df.columns:
            missing = missing_data[col]
            percent = missing_percent[col]
            if missing > 0:
                status = "[WARN]" if percent > 50 else "[INFO]"
                print(f"{status} {col:<28} {missing:<15} {percent:.1f}%")

        # Sample Data
        print("\n" + "=" * 80)
        print("7. SAMPLE DATA (First 5 Rows)")
        print("=" * 80)
        print("\n" + df.head().to_string())

        # Summary Statistics
        print("\n" + "=" * 80)
        print("8. SUMMARY & RECOMMENDATIONS")
        print("=" * 80)

        recommendations = []

        if missing_columns:
            recommendations.append(f"[ACTION] Add missing columns: {', '.join(missing_columns)}")

        if ap_no_col and duplicates > 0:
            recommendations.append(f"[ACTION] Resolve {duplicates} duplicate AP numbers before import")

        high_missing = missing_percent[missing_percent > 50]
        if len(high_missing) > 0:
            recommendations.append(f"[ACTION] Review columns with >50% missing data: {', '.join(high_missing.index.tolist())}")

        if not recommendations:
            recommendations.append("[OK] File structure looks good! Ready for import.")

        print("\n")
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")

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
    # Default file path
    default_path = Path(__file__).parent.parent / "assets" / "DCB CODES-19-12-2025.xlsx"

    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = str(default_path)

    exit_code = analyze_excel_file(file_path)
    sys.exit(exit_code)
