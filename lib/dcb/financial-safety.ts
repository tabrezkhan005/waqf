/**
 * Financial Safety & Data Integrity Utilities
 *
 * Helper functions for frontend to interact with financial safety features:
 * - Over-collection validation
 * - DCB provisional updates
 * - Financial year derivation
 * - Receipt hash computation
 */

import { supabase } from '@/lib/supabase/client';
import { districtNameToTableName } from './district-tables';

/**
 * Derive financial year from date
 * Format: YYYY-YY (e.g., 2025-26)
 * Financial year runs from April 1 to March 31
 */
export function deriveFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // If before April, belongs to previous FY
  if (month < 4) {
    const prevYear = year - 1;
    const nextYear = year;
    return `${prevYear}-${String(nextYear).slice(-2)}`;
  } else {
    const nextYear = year + 1;
    return `${year}-${String(nextYear).slice(-2)}`;
  }
}

/**
 * Check if over-collection requires reason
 * Returns: { requires_reason: boolean, remaining_arrear: number, remaining_current: number }
 */
export async function checkOverCollection(
  tableName: string,
  apGazetteNo: string,
  newArrear: number,
  newCurrent: number
): Promise<{
  requires_reason: boolean;
  remaining_arrear: number;
  remaining_current: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('check_over_collection', {
      p_table_name: tableName,
      p_ap_gazette_no: apGazetteNo,
      p_new_arrear: newArrear,
      p_new_current: newCurrent,
    });

    if (error) {
      console.error('Error checking over-collection:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Exception checking over-collection:', error);
    return null;
  }
}

/**
 * Update DCB with provisional flag (for drafts/sent_for_review)
 * This accumulates collections but marks them as provisional
 */
export async function updateDcbProvisional(
  tableName: string,
  apGazetteNo: string,
  collectionArrears: number,
  collectionCurrent: number,
  remarks?: string | null,
  financialYear?: string | null
): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('update_dcb_provisional', {
      p_table_name: tableName,
      p_ap_gazette_no: apGazetteNo,
      p_collection_arrears: collectionArrears,
      p_collection_current: collectionCurrent,
      p_remarks: remarks || null,
      p_financial_year: financialYear || null,
    });

    return { error };
  } catch (error) {
    console.error('Exception updating DCB provisional:', error);
    return { error };
  }
}

/**
 * Finalize DCB verification (set is_provisional = false)
 * Called when accounts verifies a collection
 */
export async function finalizeDcbVerification(
  tableName: string,
  apGazetteNo: string,
  challanDate?: string | null,
  remarks?: string | null
): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('finalize_dcb_verification', {
      p_table_name: tableName,
      p_ap_gazette_no: apGazetteNo,
      p_challan_date: challanDate || null,
      p_remarks: remarks || null,
    });

    return { error };
  } catch (error) {
    console.error('Exception finalizing DCB verification:', error);
    return { error };
  }
}

/**
 * Rollback DCB on rejection (undo provisional accumulation)
 * Called when accounts rejects a collection
 */
export async function rollbackDcbRejection(
  tableName: string,
  apGazetteNo: string,
  collectionArrears: number,
  collectionCurrent: number
): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('rollback_dcb_rejection', {
      p_table_name: tableName,
      p_ap_gazette_no: apGazetteNo,
      p_collection_arrears: collectionArrears,
      p_collection_current: collectionCurrent,
    });

    return { error };
  } catch (error) {
    console.error('Exception rolling back DCB rejection:', error);
    return { error };
  }
}

/**
 * Validate over-collection and return user-friendly message
 * Returns null if validation passes, error message if it fails
 */
export async function validateOverCollection(
  districtName: string,
  apGazetteNo: string,
  newArrear: number,
  newCurrent: number,
  overCollectionReason?: string | null
): Promise<string | null> {
  const tableName = districtNameToTableName(districtName);
  const result = await checkOverCollection(tableName, apGazetteNo, newArrear, newCurrent);

  if (!result) {
    return 'Unable to validate collection amounts. Please try again.';
  }

  if (result.requires_reason) {
    if (!overCollectionReason || !overCollectionReason.trim()) {
      return (
        `This collection exceeds remaining balance.\n\n` +
        `Remaining Arrear: ₹${result.remaining_arrear.toLocaleString('en-IN')}\n` +
        `Remaining Current: ₹${result.remaining_current.toLocaleString('en-IN')}\n\n` +
        `Please provide a reason for over-collection.`
      );
    }
  }

  return null; // Validation passed
}

/**
 * Get financial year for current date or specified date
 */
export function getCurrentFinancialYear(date?: Date): string {
  return deriveFinancialYear(date || new Date());
}

/**
 * Get financial year from collection date string (YYYY-MM-DD)
 */
export function getFinancialYearFromDate(dateString: string): string {
  const date = new Date(dateString);
  return deriveFinancialYear(date);
}




