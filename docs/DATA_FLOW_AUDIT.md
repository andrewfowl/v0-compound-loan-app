# Data Flow Audit Report

## Executive Summary

This document provides a comprehensive audit of data flow from backend API to report rendering. It identifies **critical discrepancies** in field mapping, calculation logic, and data integrity issues.

---

## 1. Data Ingestion Pipeline

### 1.1 API Response Structure

**Endpoint:** `GET /api/wallet-reports?address={address}&period={period}`

**Response Format:**
```json
{
  "payload_json": {
    "notes": [],
    "metadata": {},
    "period": {
      "periodLabel": "May 2021",
      "normalizedEvents": [...],      // Raw transaction events
      "reconciliationRows": [...],    // Pre-calculated ledger data
      "reconciliationSummary": [...]  // Aggregated totals
    }
  }
}
```

### 1.2 Data Extraction (compound-report-view.tsx)

```
Backend Response
       ↓
extractReportPayload()  → Extracts payload_json or payloadJson
       ↓
period.normalizedEvents → Raw events array
period.reconciliationRows → Pre-calculated ledger
```

---

## 2. Report-by-Report Data Flow

### 2.1 Summary Tab

**Data Source:** `buildCompoundReport(transformToCompoundEvents(normalizedEvents))`

**Column Mappings:**

| Display Column | Source Calculation |
|----------------|-------------------|
| COLLATERAL - deposited | Sum of `amountUsd` where `accountType="collateral"` AND `activity="deposit"` |
| COLLATERAL - redeemed | Sum of `amountUsd` where `accountType="collateral"` AND `activity="redemption"` |
| COLLATERAL - seized | Sum of `amountUsd` where `accountType="collateral"` AND `activity="liquidation"` |
| COLLATERAL - interest income | Sum of `amountUsd` where `accountType="collateral"` AND `activity="interest"` |
| DEBT - Borrow | Sum of `amountUsd` where `accountType="debt"` AND `activity="borrowing"` |
| DEBT - RepayBorrow | Sum of `amountUsd` where `accountType="debt"` AND `activity="repayment"` |
| DEBT - interest expense | Sum of `amountUsd` where `accountType="debt"` AND `activity="interest"` |

**ISSUE IDENTIFIED:** Uses `transformToCompoundEvents()` which depends on correct field mapping from backend.

---

### 2.2 Loan Tab

**Data Source:** Prioritizes `reconciliationRows` → Falls back to `buildCompoundReport().loanLedger`

**Field Mapping (transformToLoanLedger):**

| UI Column | Backend Fields Tried (in order) | Fallback |
|-----------|--------------------------------|----------|
| Token | `tokenSymbol`, `token_symbol`, `token` | "" |
| Item | Derived from `activityType`, `activity_type`, `item` | "Borrowed crypto" |
| Date | `blockTimestamp`, `block_timestamp`, `date` | Current date |
| Start | `startBalance`, `start` | 0 |
| Proceeds | `proceeds`, `borrows`, `amount` | 0 |
| Accruals | `accruals`, `interest` | 0 |
| Liquidated | `liquidated` | 0 |
| Payments | `payments`, `repayments` | 0 |
| End | `endBalance`, `end` | 0 |

**Ledger Formula:**
```
End = Start - Proceeds - Accruals + Liquidated + Payments
```

**CRITICAL ISSUE:** The formula subtracts `proceeds` because debt is tracked as NEGATIVE. If backend provides positive values, this causes incorrect calculations.

**Filter Condition:** `positionType === "debt"` OR `positionType === "loan"`

---

### 2.3 Collateral Tab

**Data Source:** Prioritizes `reconciliationRows` → Falls back to `buildCompoundReport().collateralLedger`

**Field Mapping (transformToCollateralLedger):**

| UI Column | Backend Fields Tried (in order) | Fallback |
|-----------|--------------------------------|----------|
| Token | `tokenSymbol`, `token_symbol`, `token` | "" |
| Item | Derived from `activityType`, `activity_type`, `item` | "Deposit" |
| Date | `blockTimestamp`, `block_timestamp`, `date` | Current date |
| Start | `startBalance`, `start` | 0 |
| Provided | `provided`, `deposits`, `amount` | 0 |
| Accruals | `accruals`, `interest` | 0 |
| Liquidated | `liquidated` | 0 |
| Reclaimed | `reclaimed`, `withdrawals` | 0 |
| End | `endBalance`, `end` | 0 |

**Ledger Formula:**
```
End = Start + Provided + Accruals - Liquidated - Reclaimed
```

**Filter Condition:** `positionType === "collateral"`

**ISSUE:** If backend uses different `positionType` values (e.g., "supply", "lend"), filtering fails.

---

### 2.4 Transactions Tab

**Data Source:** `transformToCompoundEvents(normalizedEvents)`

**Field Mapping:**

| UI Column | Backend Fields | Transformation |
|-----------|----------------|----------------|
| TX HASH | `txHash`, `tx_hash` | Direct |
| ACCOUNT | `positionType`, `position_type` | Lowercase, map to "collateral" or "debt" |
| ACTIVITY | `activityType`, `activity_type`, `sourceAction` | Complex detection logic |
| TIMESTAMP | `blockTimestamp`, `block_timestamp` | Date formatting |
| EVENT NAME | Derived | Based on activity type |
| TOKEN | `tokenSymbol`, `token_symbol` | Direct |
| AMOUNT | `amount`, `amount_token` | parseFloat |
| AMOUNT USD | `amountUsd`, `amount_usd` | parseFloat |

**Activity Detection Logic:**
```javascript
// Priority order:
1. "liquidation" if activityType/sourceAction/eventName contains "liquidat" or "absorb"
2. "deposit" if activityType="deposit" or sourceAction contains "supply"/"mint"
3. "redemption" if activityType="redemption"/"withdraw" or sourceAction contains "redeem"/"withdraw"
4. "borrowing" if activityType="borrowing"/"borrow" or sourceAction contains "borrow"
5. "repayment" if activityType="repayment"/"repay" or sourceAction contains "repay"
6. "interest" if activityType="interest" or contains "accrual"
7. Default: "borrowing"
```

**ISSUE:** Missing liquidation transactions if backend uses unexpected field names like `eventType` or different values.

---

### 2.5 JE (Journal Entries) Tab

**Data Source:** `buildCompoundReport(transformToCompoundEvents(normalizedEvents)).borrowerRecon`

**CRITICAL:** This tab is ENTIRELY CALCULATED, not from backend data directly.

**Calculation Pipeline:**
```
normalizedEvents
    ↓
transformToCompoundEvents() - Maps to CompoundEvent[]
    ↓
buildCompoundReport() - Generates CompoundReport
    ↓
buildBorrowerRecon() - Creates JournalEntry[] with:
    - Transaction-based entries (from events)
    - Fair Value adjustments (COMPUTED using hardcoded prices)
```

**USD Conversion:**
```javascript
// HARDCODED PRICES (NOT FROM BACKEND):
const ASSET_PRICES = {
  WETH: 3200, ETH: 3200, WBTC: 65000, BTC: 65000,
  USDC: 1, USDT: 1, DAI: 1, COMP: 85, UNI: 12, LINK: 18,
}
```

**Fair Value Adjustment Calculation:**
```javascript
// SIMULATED monthly volatility:
const ASSET_MONTHLY_VOL = {
  WETH: 0.08, WBTC: 0.06, COMP: 0.12, UNI: 0.15, LINK: 0.10,
  USDC: 0, USDT: 0, DAI: 0,  // Stablecoins = no FV adjustment
}

// FV Change = |units| × price × monthlyRate
// where monthlyRate = (pseudoRandom - 0.5) × 2 × volatility
```

**Journal Entry Types:**

| Activity | Debit Account | Credit Account |
|----------|---------------|----------------|
| Borrow | Cash / Crypto Received | Crypto Borrowings |
| Repay | Crypto Borrowings | Cash / Crypto Paid |
| Interest (debt) | Interest Expense | Accrued Interest Payable |
| Deposit | Collateral Deposited | Crypto Holdings |
| Withdraw | Crypto Holdings | Collateral Deposited |
| Liquidation | Loss on Liquidation | Collateral Deposited |
| Interest (collateral) | Collateral Deposited | Interest Income |
| FV Adjustment | Fair Value Loss/Crypto Borrowings | Crypto Borrowings/Fair Value Gain |

---

## 3. Critical Issues Identified

### 3.1 Field Name Mismatch
**Severity: HIGH**

The backend may use different field names than expected:
- `positionType` vs `position_type` vs `accountType`
- `activityType` vs `activity_type` vs `eventType`
- `amountUsd` vs `amount_usd` vs `usdValue`

**Impact:** Columns show zeros or wrong data.

### 3.2 Hardcoded Asset Prices
**Severity: HIGH**

JE tab uses hardcoded prices, not actual on-chain USD values:
```javascript
WETH: 3200  // Actual price may differ significantly
WBTC: 65000 // Historical prices not considered
```

**Impact:** USD amounts in JE entries are INCORRECT if backend provides actual USD values but they're ignored.

### 3.3 Missing Liquidation Events
**Severity: MEDIUM**

Transactions tab may miss liquidations if:
- Backend uses `eventType: "Absorb"` (Compound V3) not detected
- `activityType` is something else like "seizure"

**Impact:** Liquidations appear in Collateral tab (from `reconciliationRows`) but not Transactions tab.

### 3.4 Loan Ledger Formula Sign Convention
**Severity: HIGH**

The loan ledger uses:
```javascript
end = start - proceeds - accruals + liquidated + payments
```

This assumes debt is tracked as NEGATIVE balances. If backend provides positive debt values, the formula produces wrong results.

### 3.5 Decimal/Denomination Handling
**Severity: MEDIUM**

No explicit decimal handling for different tokens:
- USDC: 6 decimals
- ETH: 18 decimals
- WBTC: 8 decimals

If backend returns raw blockchain values (e.g., `170768000000` for USDC), amounts will be HUGELY WRONG.

---

## 4. Data Integrity Verification

### 4.1 Reconciliation Formula

The Raw API Data view includes a verification panel that calculates:
```
Calculated End = Start + Proceeds + Accruals - Liquidated - Repayments
Variance = Actual End - Calculated End
```

If variance ≠ 0, there are unaccounted movements.

### 4.2 Recommended Backend Response

For full compatibility, backend should provide:

```json
{
  "normalizedEvents": [{
    "txHash": "0x...",
    "blockTimestamp": "2021-05-01T12:00:00Z",
    "positionType": "collateral" | "debt",
    "activityType": "deposit" | "redemption" | "borrowing" | "repayment" | "liquidation" | "interest",
    "tokenSymbol": "USDC",
    "amount": 170768.00,        // Human-readable, NOT raw blockchain value
    "amountUsd": 170768.00      // Already converted to USD
  }],
  "reconciliationRows": [{
    "tokenSymbol": "USDC",
    "positionType": "collateral",
    "startBalance": 0,
    "provided": 170768.00,      // Use these exact field names
    "accruals": 0,
    "liquidated": 0,
    "reclaimed": 0,
    "endBalance": 170768.00
  }]
}
```

---

## 5. Recommendations

1. **Add field name detection logging** to identify what the backend actually sends
2. **Use backend `amountUsd`** instead of hardcoded prices for JE calculations
3. **Add explicit decimal normalization** based on token type
4. **Verify `positionType` values** match expected "collateral"/"debt"
5. **Add "Absorb" event detection** for Compound V3 liquidations
6. **Display data source indicator** on each tab showing whether data is from backend or calculated
