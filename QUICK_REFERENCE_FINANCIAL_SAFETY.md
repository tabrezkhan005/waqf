# Quick Reference: Financial Safety Implementation

## 🚀 Migration Execution

```bash
# Apply migration
supabase migration up 023_financial_safety_and_integrity
```

## 📋 Frontend Integration Checklist

### 1. Import Helper Functions
```typescript
import {
  deriveFinancialYear,
  checkOverCollection,
  validateOverCollection,
  updateDcbProvisional,
  finalizeDcbVerification,
  rollbackDcbRejection,
  getCurrentFinancialYear
} from '@/lib/dcb/financial-safety';
```

### 2. Inspector: Save Draft/Send for Review

**Before saving:**
```typescript
// Validate over-collection
const errorMsg = await validateOverCollection(
  districtName,
  apGazetteNo,
  cArrearNum,
  cCurrentNum,
  overCollectionReason
);

if (errorMsg) {
  Alert.alert('Over-Collection', errorMsg);
  return; // Block submission
}
```

**Save to DCB (provisional):**
```typescript
const financialYear = getCurrentFinancialYear(new Date(collectionDate));

const { error } = await updateDcbProvisional(
  tableName,
  apGazetteNo,
  cArrearNum,
  cCurrentNum,
  remarks,
  financialYear
);

if (error) {
  Alert.alert('Error', 'Failed to save collection');
  return;
}
```

### 3. Accounts: Verify Collection

```typescript
// Step 1: Update collection status
await supabase.from('collections')
  .update({
    status: 'verified',
    challan_no,
    challan_date,
    verified_by: profile.id,
    verified_at: new Date().toISOString()
  })
  .eq('id', collectionId);

// Step 2: Finalize DCB (set is_provisional = false)
const { error } = await finalizeDcbVerification(
  tableName,
  apGazetteNo,
  challanDate,
  remarks
);
```

### 4. Accounts: Reject Collection

```typescript
// Step 1: Update collection status
await supabase.from('collections')
  .update({
    status: 'rejected',
    rejection_reason,
    verified_by: profile.id,
    verified_at: new Date().toISOString()
  })
  .eq('id', collectionId);

// Step 2: Rollback DCB (undo accumulation)
const { error } = await rollbackDcbRejection(
  tableName,
  apGazetteNo,
  collection.arrear_amount,
  collection.current_amount
);
```

### 5. Receipt Upload with Hash

```typescript
import * as Crypto from 'expo-crypto';

// Compute hash
const response = await fetch(uri);
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  new Uint8Array(arrayBuffer).toString()
);

// Check for duplicate
const { data: existing } = await supabase
  .from('receipts')
  .select('id')
  .eq('collection_id', collectionId)
  .eq('file_hash', hash)
  .single();

if (existing) {
  Alert.alert('Duplicate', 'This receipt already uploaded');
  return;
}

// Upload and save with hash
await supabase.from('receipts').insert({
  collection_id: collectionId,
  type: 'bill',
  file_path: path,
  file_hash: hash,
  // ... other fields
});
```

### 6. Analytics: Filter by Financial Year

```typescript
// Get current financial year
const currentFY = getCurrentFinancialYear();

// Query DCB for specific FY (only verified)
const { data } = await supabase
  .from(tableName)
  .select('*')
  .eq('financial_year', currentFY)
  .eq('is_provisional', false); // Only verified collections
```

### 7. Filter Active Institutions

```typescript
const { data: institutions } = await supabase
  .from('institutions')
  .select('*')
  .eq('district_id', profile.district_id)
  .eq('is_active', true)
  .is('deleted_at', null);
```

## 🔍 Database Functions Reference

| Function | Purpose | Parameters |
|----------|---------|------------|
| `derive_financial_year(date)` | Get FY from date | `input_date: date` |
| `check_over_collection(...)` | Check if reason required | `table_name, ap_gazette_no, new_arrear, new_current` |
| `update_dcb_provisional(...)` | Update DCB (draft) | `table_name, ap_gazette_no, collection_arrears, collection_current, remarks, financial_year` |
| `finalize_dcb_verification(...)` | Finalize DCB (verify) | `table_name, ap_gazette_no, challan_date, remarks` |
| `rollback_dcb_rejection(...)` | Rollback DCB (reject) | `table_name, ap_gazette_no, collection_arrears, collection_current` |
| `log_audit(...)` | Manual audit log | `user_id, action, table_name, row_id, old_values, new_values, details` |

## ⚠️ Important Rules

1. **Over-Collection:** Always validate before saving
2. **Drafts:** Use `update_dcb_provisional()` (sets `is_provisional = true`)
3. **Verification:** Use `finalize_dcb_verification()` (sets `is_provisional = false`)
4. **Rejection:** Use `rollback_dcb_rejection()` (undoes accumulation)
5. **Financial Year:** Auto-derive from `collection_date`
6. **Receipt Hash:** Compute before upload, check for duplicates
7. **Institutions:** Filter by `is_active = true AND deleted_at IS NULL`

## 🐛 Troubleshooting

**Error: "over_collection_reason required"**
- Solution: Check `validateOverCollection()` before saving

**Error: "DCB update failed"**
- Solution: Verify table name and ap_gazette_no are correct

**Error: "Duplicate receipt"**
- Solution: File hash already exists for this collection

**Error: "Financial year invalid"**
- Solution: Use `deriveFinancialYear()` function

---

**See:** `FINANCIAL_SAFETY_IMPLEMENTATION.md` for detailed documentation




