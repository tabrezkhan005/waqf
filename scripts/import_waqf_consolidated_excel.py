#!/usr/bin/env python3
"""
WAQF: Import Consolidated_Excel.xlsx into Supabase (UUID-based schema).

Imports:
1) institutions (upsert by ap_gazette_no)
2) institution_dcb (upsert by (institution_id, financial_year))

It assigns inspector_id based on the institution's district (one inspector per district).

Required env vars:
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from supabase import Client, create_client


ASSETS_XLSX = Path(__file__).parent.parent / "assets" / "Consolidated_Excel.xlsx"


def clean_text(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    if not s or s.lower() in ("nan", "null", "none", "-"):
        return None
    # normalize whitespace
    s = re.sub(r"\s+", " ", s)
    return s


def clean_number(v: Any) -> float:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s or s.lower() in ("nan", "null", "none", "-", "shops"):
        return 0.0
    s = s.replace(",", "")
    s = re.sub(r"[₹\s]", "", s)
    try:
        return float(s)
    except Exception:
        return 0.0


def norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()).lower()


def main() -> int:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not supabase_url or not supabase_key:
        print("[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
        print("PowerShell example:")
        print("  $env:SUPABASE_URL='https://yznrasubypbdwhkhcgty.supabase.co'")
        print("  $env:SUPABASE_SERVICE_ROLE_KEY='<service_role_key>'")
        return 1

    if not ASSETS_XLSX.exists():
        print(f"[ERROR] Excel file not found: {ASSETS_XLSX}")
        return 1

    sb: Client = create_client(supabase_url, supabase_key)

    print(f"[INFO] Reading: {ASSETS_XLSX}")
    df = pd.read_excel(ASSETS_XLSX, sheet_name=0)
    df.columns = [str(c).strip() for c in df.columns]
    print(f"[INFO] Rows: {len(df)}")

    # Column aliases (be tolerant to variations)
    def pick(*names: str) -> Optional[str]:
        cols = {norm_name(c): c for c in df.columns}
        for n in names:
            if norm_name(n) in cols:
                return cols[norm_name(n)]
        return None

    col_ap = pick("Ap Gazette No", "AP Gazette No", "AP No", "ap_gazette_no")
    col_name = pick("Name of institution", "Name of Institution", "Name of the Institution", "institution_name")
    col_district = pick("District", "district_name")
    col_mandal = pick("Mandal", "mandal")
    col_village = pick("Village", "village")
    col_ext_dry = pick("Ext-Dry", "Extent Dry", "extent_dry")
    col_ext_wet = pick("Ext-Wet", "Extent Wet", "extent_wet")
    col_d_arrears = pick("D-Arrears", "Demand Arrears", "demand_arrears")
    col_d_current = pick("D-Current", "Demand Current", "demand_current")
    col_c_arrears = pick("C-Arrears", "Collection Arrears", "collection_arrears")
    col_c_current = pick("C-Current", "Collection Current", "collection_current")
    col_remarks = pick("Remarks", "remarks")
    col_fy = pick("Financial Year", "financial_year")

    required = {"Ap Gazette No": col_ap, "Name of institution": col_name, "District": col_district}
    missing = [k for k, v in required.items() if not v]
    if missing:
        print(f"[ERROR] Missing required columns in Excel: {missing}")
        print(f"[INFO] Columns found: {list(df.columns)}")
        return 1

    # Load districts mapping (by name)
    districts = sb.table("districts").select("id,name").execute().data or []
    district_by_name = {norm_name(d["name"]): d["id"] for d in districts}
    print(f"[INFO] Districts loaded: {len(district_by_name)}")

    # Load inspector per district mapping
    inspectors = (
        sb.table("profiles")
        .select("id,full_name,district_id,role")
        .eq("role", "inspector")
        .execute()
        .data
        or []
    )
    inspector_by_district = {i["district_id"]: i["id"] for i in inspectors if i.get("district_id")}
    print(f"[INFO] Inspectors loaded: {len(inspector_by_district)} (by district_id)")

    # 1) Upsert institutions
    inst_payload = []
    skipped = 0
    for _, row in df.iterrows():
        ap = clean_text(row.get(col_ap))
        name = clean_text(row.get(col_name))
        district_name = clean_text(row.get(col_district))
        if not ap or not name or not district_name:
            skipped += 1
            continue

        district_id = district_by_name.get(norm_name(district_name))
        if not district_id:
            skipped += 1
            continue

        inst_payload.append(
            {
                "ap_gazette_no": ap,
                "name": name,
                "district_id": district_id,
                "mandal": clean_text(row.get(col_mandal)) if col_mandal else None,
                "village": clean_text(row.get(col_village)) if col_village else None,
                "is_active": True,
            }
        )

    # Deduplicate by ap_gazette_no (latest wins)
    inst_by_ap: Dict[str, Dict[str, Any]] = {}
    for rec in inst_payload:
        inst_by_ap[rec["ap_gazette_no"]] = rec
    inst_payload = list(inst_by_ap.values())

    print(f"[INFO] Institutions to upsert: {len(inst_payload)} (skipped rows: {skipped})")
    if inst_payload:
        # upsert in batches
        for i in range(0, len(inst_payload), 500):
            batch = inst_payload[i : i + 500]
            sb.table("institutions").upsert(batch, on_conflict="ap_gazette_no").execute()
            print(f"  - upserted institutions: {min(i + 500, len(inst_payload))}/{len(inst_payload)}")

    # Reload institutions id map
    inst_rows = sb.table("institutions").select("id,ap_gazette_no,district_id").execute().data or []
    inst_id_by_ap = {r["ap_gazette_no"]: r["id"] for r in inst_rows}
    inst_district_by_id = {r["id"]: r["district_id"] for r in inst_rows}
    print(f"[INFO] Institutions in DB: {len(inst_id_by_ap)}")

    # 2) Upsert institution_dcb
    dcb_payload = []
    dcb_skipped = 0
    for _, row in df.iterrows():
        ap = clean_text(row.get(col_ap))
        if not ap:
            dcb_skipped += 1
            continue
        institution_id = inst_id_by_ap.get(ap)
        if not institution_id:
            dcb_skipped += 1
            continue

        district_id = inst_district_by_id.get(institution_id)
        inspector_id = inspector_by_district.get(district_id)
        if not inspector_id:
            dcb_skipped += 1
            continue

        fy = clean_text(row.get(col_fy)) if col_fy else None
        fy = fy or "2025-26"

        dcb_payload.append(
            {
                "institution_id": institution_id,
                "inspector_id": inspector_id,
                "financial_year": fy,
                "extent_dry": clean_number(row.get(col_ext_dry)) if col_ext_dry else 0,
                "extent_wet": clean_number(row.get(col_ext_wet)) if col_ext_wet else 0,
                "demand_arrears": clean_number(row.get(col_d_arrears)) if col_d_arrears else 0,
                "demand_current": clean_number(row.get(col_d_current)) if col_d_current else 0,
                "collection_arrears": clean_number(row.get(col_c_arrears)) if col_c_arrears else 0,
                "collection_current": clean_number(row.get(col_c_current)) if col_c_current else 0,
                "remarks": clean_text(row.get(col_remarks)) if col_remarks else None,
            }
        )

    # Deduplicate by (institution_id, financial_year)
    dcb_keyed: Dict[str, Dict[str, Any]] = {}
    for rec in dcb_payload:
        key = f\"{rec['institution_id']}::{rec['financial_year']}\"
        dcb_keyed[key] = rec
    dcb_payload = list(dcb_keyed.values())

    print(f\"[INFO] DCB rows to upsert: {len(dcb_payload)} (skipped rows: {dcb_skipped})\")
    if dcb_payload:
        for i in range(0, len(dcb_payload), 500):
            batch = dcb_payload[i : i + 500]
            sb.table(\"institution_dcb\").upsert(batch, on_conflict=\"institution_id,financial_year\").execute()
            print(f\"  - upserted dcb: {min(i + 500, len(dcb_payload))}/{len(dcb_payload)}\")

    print(\"[DONE] Import complete.\")
    return 0


if __name__ == \"__main__\":
    raise SystemExit(main())















