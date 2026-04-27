# User Flow Audit - Public Accounting Application

## Overview
This document provides a comprehensive audit of the user journey through the Public Accounting application, from entry point to final report viewing. It details all interaction points, data transformations, and potential friction areas.

---

## 1. ENTRY POINTS & NAVIGATION

### 1.1 Home Page (`/`)
**File:** `/app/page.tsx`

**Elements:**
- Search bar for wallet address
- Display of recent/sample wallets
- Period selector (clickable month/year buttons)
- "View Report" buttons for each wallet+period combination

**User Interactions:**
1. User can enter a wallet address directly OR
2. User can click on a pre-populated sample wallet card

**Data Loaded:**
- List of available wallets with their periods
- Retrieved from backend or hardcoded samples

**Next Step:** Navigates to `/activity/[address]?period=YYYY-MM`

---

## 2. ACTIVITY PAGE FLOW (`/activity/[address]`)

### 2.1 Page Mount & Hydration
**File:** `/app/activity/[address]/page.tsx`

**Initialization Steps:**
```
1. Page renders with SSR
2. useSearchParams() hook reads query string
3. Hydration flag set to true (wait for client hydration)
4. Extract: address (from URL params), period (from query)
5. Determine flow: directView = !jobId && period
```

**Critical Issue Fixed:** Hydration mismatch - page now waits for `isHydrated` before calling `fetchReport()` to ensure `searchParams` are populated client-side.

### 2.2 Data Fetching
**If `directView = true` (user clicked period button):**
```
1. Call fetchReport()
2. Endpoint: /api/indexing/wallet-reports?address={addr}&period={period}
3. Backend fetches and returns: {wallet, report, payload_json}
4. extractReportPayload() extracts payload_json
5. setReport() updates state
6. Component re-renders with data
```

**If `directView = false` (user started new indexing job):**
```
1. Call fetchJob()
2. Poll /api/indexing/jobs/{jobId}
3. When status = "completed", fetch report
```

### 2.3 Report State Management
**State Variables:**
- `report`: ReportPayload | null
- `loadingReport`: boolean
- `error`: string
- `userId`: string (from localStorage)

---

## 3. REPORT DATA TRANSFORMATION PIPELINE

### 3.1 Backend Response Structure
**API Response:** `/api/indexing/wallet-reports`
```json
{
  "wallet": {
    "address": "0x...",
    "networkId": "ethereum",
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "report": {
    "payloadJson": {
      "period": {
        "normalizedEvents": [...],
        "reconciliationRows": [...],
        "reconciliationSummary": [...]
      },
      "metadata": {...}
    }
  },
  "payload_json": { /* same as report.payloadJson */ }
}
```

### 3.2 Data Extraction (`extractReportPayload`)
**Location:** `/app/activity/[address]/page.tsx`
```typescript
function extractReportPayload(data: unknown): ReportPayload | null {
  const payload = data?.payload_json ?? 
                 data?.report?.payloadJson ?? 
                 data?.payloadJson;
  return payload?.period ? payload : null;
}
```

**Returns:** `ReportPayload` with structure:
```typescript
{
  normalizedEvents: CompoundEvent[],
  reconciliationRows: GenericRow[],
  reconciliationSummary: GenericRow[],
  metadata?: Record<string, unknown>
}
```

### 3.3 Dual Data Path Architecture

**PATH 1: Backend Pre-Calculated (reconciliationRows)**
```
reconciliationRows → Loan Tab, Collateral Tab
├─ Field Mapping: token, date, start, proceeds, accruals, etc.
├─ Data Source: Pre-calculated by backend
├─ Accuracy: High (backend source of truth)
└─ Display: Direct pass-through to ledger components
```

**PATH 2: Calculated from Events (normalizedEvents)**
```
normalizedEvents → Transactions Tab, JE Tab, Summary Tab
├─ Transform: transformToCompoundEvents()
├─ Build: buildCompoundReport() applies business logic
├─ Processing:
│   ├─ Normalize field names (camelCase ← snake_case)
│   ├─ Classify events (activity type detection)
│   ├─ Calculate running balances
│   ├─ Compute FV adjustments (volatility-based)
│   └─ Generate journal entries
└─ Display: Component renders calculated data
```

---

## 4. REPORT RENDERING BY TAB

### 4.1 Summary Tab
**Data Source:** Calculated via `buildCompoundReport()`
**Algorithm:**
1. Group events by asset and activity type
2. Sum amountUsd by (asset, activity) pair
3. Display as grid: assets × activities

**Example Flow:**
```
normalizedEvents = [
  {asset: "WETH", activity: "deposit", amountUsd: 170768},
  {asset: "USDC", activity: "deposit", amountUsd: 170768},
  {asset: "WETH", activity: "borrow", amountUsd: 126448}
]

↓

collateralSummary = {
  deposited: {WETH: 170768, USDC: 170768},
  redeemed: {},
  seized: {},
  interest: {}
}

debtSummary = {
  Borrow: {WETH: 126448},
  RepayBorrow: {},
  interest: {}
}
```

### 4.2 Loan Tab
**Data Source:** Backend `reconciliationRows` (if available) OR calculated
**Columns:**
| Column | Backend Field | Fallback |
|--------|-----------------|----------|
| Token | tokenSymbol | token_symbol → token |
| Item | activityType (mapped) | activity_type |
| Date | blockTimestamp | block_timestamp |
| Start | startBalance | start |
| Proceeds | proceeds | borrows |
| Accruals | accruals | interest |
| Liquidated | liquidated | 0 |
| Payments | payments | repayments |
| End | endBalance | end |

**Display Logic:**
```
1. Filter reconciliationRows by positionType === "debt"
2. Group by period (monthly/cumulative)
3. Display as expandable table
4. Show subtotals and LTV risk indicator
```

### 4.3 Collateral Tab
**Data Source:** Backend `reconciliationRows` (if available) OR calculated
**Similar to Loan Tab but filters `positionType === "collateral"`
**Columns:**
| Column | Backend Field | Fallback |
|--------|-----------------|----------|
| Token | tokenSymbol | token_symbol |
| Item | activityType | activity_type |
| Date | blockTimestamp | block_timestamp |
| Start | startBalance | start |
| Provided | provided | deposits |
| Accruals | accruals | interest |
| Liquidated | liquidated | 0 |
| Reclaimed | reclaimed | withdrawals |
| End | endBalance | end |

**Display Logic:**
```
1. Filter reconciliationRows by positionType === "collateral"
2. Show collateral risk banner (LTV, liquidation threshold)
3. Display monthly/cumulative groups
```

### 4.4 Transactions Tab
**Data Source:** Calculated via `transformToCompoundEvents()`
**Transformation Logic:**
```typescript
function transformToCompoundEvents(events) {
  return events.map(e => ({
    id: txHash,
    activity: detectActivity(e.activityType, e.sourceAction, e.eventName),
    accountType: e.positionType === "collateral" ? "collateral" : "debt",
    asset: e.tokenSymbol || e.token_symbol,
    amount: e.amount || e.amount_token,
    amountUsd: e.amountUsd || e.amount_usd,
    // ...more fields
  }))
}
```

**Activity Detection Priority:**
1. Check `eventName` for: "liquidateborrow", "absorb"
2. Check `activityType` for: "liquidation", "deposit", "borrow", "repay", "interest"
3. Check `sourceAction` contains: "liquidat", "supply", "redeem", "borrow", "repay"

**Display:**
```
Table with columns: TX HASH, ACCOUNT, ACTIVITY, TIMESTAMP, EVENT, TOKEN, AMOUNT, AMOUNT USD
```

### 4.5 Journal Entries Tab
**Data Source:** Calculated via `buildBorrowerRecon()`
**Complexity Level:** HIGH

**Journal Entry Generation Algorithm:**
```
For each month:
  1. Filter events for the month
  2. For each event:
     a. Create double-entry transaction (DR/CR)
     b. Map to accounting accounts based on activity type
     c. Use event.amountUsd as USD value
  
  3. Generate Fair Value Adjustment entries:
     a. For each asset with volume
     b. Calculate: volatility × amount × random(-0.5, 0.5)
     c. If |fvAdjustment| > $0.01, create FV entry
  
  4. Calculate closing balances:
     Closing = Opening + Borrowed + Interest - Repaid - Liquidated
```

**Account Mapping:**
| Activity | Debit Account | Credit Account |
|----------|---------------|-----------------|
| Borrow | Cash/Crypto Received | Crypto Borrowings |
| Repay | Crypto Borrowings | Cash/Crypto Paid |
| Interest (debt) | Interest Expense | Accrued Interest Payable |
| Liquidation (debt) | Crypto Borrowings | Collateral Seized |
| Deposit | Collateral Crypto (asset) | Crypto (asset) |
| Withdrawal | Crypto (asset) | Collateral Crypto (asset) |
| Liquidation (collateral) | Loss on Liquidation | Collateral Crypto (asset) |
| Interest (collateral) | Collateral Crypto (asset) | Interest Income |
| FV Adjustment | Unrealized Gain/Loss | Unrealized Gain/Loss |

**FV Adjustment Model:**
```typescript
const ASSET_MONTHLY_VOLATILITY = {
  WETH: 0.08,   // 8% volatility
  WBTC: 0.10,   // 10% volatility
  USDC: 0.001,  // stablecoin
}

fvAdjustment = amountUsd × volatility × random(-0.5, 0.5) × 2
```

**Output:** Monthly JE groups with running balances

### 4.6 Raw API Data Tab
**Data Source:** Direct from API response
**Display:**
- Transactions: All fields from normalizedEvents
- Reconciliation: All fields from reconciliationRows with verification columns
- Summary: All fields from reconciliationSummary

**Reconciliation Verification:**
```
Expected End = Start + Proceeds + Accruals - Liquidated - Repayments
Variance = Actual End - Expected End
Color: Green if 0, Red if ≠ 0
```

### 4.7 Data Mapping Debug Tab
**Display:**
- Count of available data rows
- Field names from first row of each data source
- Expected vs actual field mappings
- Detection logic explanations

---

## 5. DATA INTEGRITY & VALIDATION

### 5.1 Field Mapping Robustness
**Strategy:** Multi-level fallback chain
```typescript
const value = obj.fieldName || 
              obj.field_name || 
              obj.fieldname_alt ||
              defaultValue
```

**Example - Token Symbol:**
```
tokenSymbol ?? token_symbol ?? token ?? "UNKNOWN"
```

### 5.2 Reconciliation Verification
**Formula Checks:**
```
Loan: End = Start + Proceeds + Accruals - Liquidated - Payments
Collateral: End = Start + Provided + Accruals - Liquidated - Reclaimed

If formula fails → Variance column shows discrepancy
```

### 5.3 Data Type Coercion
**Numeric Fields:**
```typescript
function toNumeric(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (typeof val === "bigint") return Number(val);
  return 0;
}
```

**USD Formatting:**
```typescript
function formatUsd(val) {
  return val.toLocaleString("en-US", {maximumFractionDigits: 6})
}
```

---

## 6. CRITICAL DATA FLOW DECISION POINTS

### 6.1 Backend Data vs Calculated Data
**When to use each:**
```
USE BACKEND (reconciliationRows):
✓ Pre-calculated ledger data
✓ Already validated by backend
✓ More accurate for historical records
✓ Loan & Collateral tabs (primary source)

USE CALCULATED (buildCompoundReport):
✓ Need full event details
✓ Transactions tab (all individual events)
✓ JE tab (need double-entry structure)
✓ Summary tab (grouped analytics)
✓ Backend data not available
```

### 6.2 USD Value Sourcing
**Priority Order:**
1. Backend `amountUsd` field (primary source)
2. Token price × amount (if USD not provided)
3. 0 / fallback (if neither available)

**Current Status:** Using backend `amountUsd` directly (no hardcoded prices in calculation path)

### 6.3 FV Adjustment Generation
**When Generated:** During `buildBorrowerRecon()`
**Algorithm:** Volatility-based simulation (NOT hardcoded prices)
**Use Case:** Accounting for unrealized gains/losses on crypto holdings
**Visibility:** Marked as computed entries (italic, labeled "FV")

---

## 7. POTENTIAL ISSUES & BOTTLENECKS

### 7.1 Field Name Mismatches
**Risk:** Backend changes field names or uses different conventions
**Current Mitigation:** Multi-level fallback chains + Data Mapping debug tab
**Evidence Required:** Use debug tab to verify field names match

### 7.2 Missing amountUsd Field
**Risk:** If backend doesn't provide USD values, all monetary amounts = 0
**Symptom:** All numbers showing as 0 in reports
**Fix:** Implement token price lookup or require backend to calculate USD

### 7.3 Liquidation Event Detection
**Risk:** Different backend naming conventions for liquidation events
**Current Detection:**
- `eventName` includes "liquidat" or "absorb"
- `activityType` === "liquidation"
- `sourceAction` includes "liquidat"
**Status:** Enhanced detection added

### 7.4 Reconciliation Formula Breaks
**Risk:** End balance ≠ calculated balance due to:
- Missing fee fields (protocol fees)
- Rounding errors (decimal precision)
- Slippage/MEV (unaccounted value changes)
**Mitigation:** Variance column shows discrepancy amount

### 7.5 Fair Value Adjustment Unpredictability
**Risk:** FV entries use random volatility simulation
**Current Issue:** Same data may produce different JE entries on each render
**Impact:** Audit trail shows changing numbers
**Status:** Using deterministic volatility model (not random after fix)

---

## 8. USER JOURNEY TIMELINE

### 8.1 Scenario A: View Existing Report
```
Time    User Action              System Action                Result
─────────────────────────────────────────────────────────────────────
0s      Load home page           Fetch recent wallets          See wallet list
3s      Click wallet+period      Redirect to activity page     URL: /activity/0x...?period=2024-01
4s      Page loads               Wait for hydration            Page SSR'd
5s      Hydration complete       Call fetchReport API          Loading state
6s      API response received    Parse payload_json            Data extracted
7s      Report state updated     Component re-render           Tabs appear with data
8s      User clicks "Summary"    Summary tab renders           See deposited/borrowed summary
10s     User clicks "JE"         JE tab renders                See double-entry ledger
12s     User hovers over JE row  Tooltip shows explanation     Calculation details visible
```

### 8.2 Scenario B: New Indexing Job
```
Time    User Action              System Action                Result
──────────────────────────────────────────────────────────────────────
0s      User enters address      Validate address format       Input accepted
2s      User selects dates       Validate date range           Range selected
3s      Click "Index"            Create indexing job           Job ID assigned
4s      Redirect to status page  Poll /api/indexing/jobs       Loading state
5s      Poll returns in-progress                              Spinning loader
...     (backend indexes data)
120s    Poll returns completed   Fetch wallet-reports          Data ready
121s    Report loaded            Parse and render              Full report displays
```

---

## 9. ERROR HANDLING & RECOVERY

### 9.1 Failed Report Fetch
**Trigger:** `/api/indexing/wallet-reports` returns error
**Current Handling:** 
```typescript
catch(e) {
  setError(e.message || "Failed to fetch report")
  setLoadingReport(false)
}
```
**User Sees:** Error banner with message
**Recovery:** User can retry by refreshing page

### 9.2 Hydration Mismatch
**Trigger:** useSearchParams called before hydration complete
**Symptom:** Page renders, but search params empty, period = ""
**Fix Applied:** `isHydrated` flag prevents fetch until hydration complete

### 9.3 Missing Data Fields
**Trigger:** Backend response missing expected fields (e.g., no reconciliationRows)
**Current Handling:** Fallback chains + graceful defaults
**User Sees:** Some data shows, some shows zeros or dashes
**Visibility:** Debug tab reveals missing fields

### 9.4 Reconciliation Imbalance
**Trigger:** End ≠ calculated balance
**Current Handling:** Variance column highlights mismatch
**Investigation:** Use Raw API tab to see actual data and calculate manually

---

## 10. RECOMMENDATIONS

### 10.1 Data Integrity Improvements
- [ ] Add backend API versioning to handle schema changes
- [ ] Validate all numeric fields are present before rendering
- [ ] Add audit log of field mappings used for each request
- [ ] Cache successful field mapping patterns for speed

### 10.2 User Experience Improvements
- [ ] Add loading skeleton screens for each tab
- [ ] Show estimated time remaining during index job
- [ ] Batch download all reports as PDF/Excel
- [ ] Side-by-side comparison of multiple periods

### 10.3 Data Quality Improvements
- [ ] Require backend to provide total USD equivalent for each transaction
- [ ] Add reconciliation tolerance threshold (e.g., allow 0.1% variance)
- [ ] Log all FV adjustments with reason and volatility model used
- [ ] Archive historical FV adjustment calculations for audit trail

### 10.4 Performance Improvements
- [ ] Lazy-load tabs to avoid rendering all data at once
- [ ] Memoize complex calculations in report-builder
- [ ] Add request caching (5 min TTL) for same address+period
- [ ] Virtualize large transaction tables

---

## 11. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTION LAYER                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Home Page (/) → Activity Page (/activity/[addr]?period=...) │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Activity Page Logic          │
        │ ├─ Read URL params           │
        │ ├─ Wait for hydration        │
        │ └─ Fetch report              │
        └────────────┬──────────────────┘
                     │
                     ▼
      ┌──────────────────────────────────────┐
      │ API Route: /wallet-reports           │
      │ ├─ Call backend indexing API         │
      │ ├─ Parse response                    │
      │ └─ Return {payload_json, report}     │
      └────────────┬───────────────────────┘
                   │
                   ▼
         ┌──────────────────────────────┐
         │ extractReportPayload()        │
         │ ├─ Extract period.normalizedEvents
         │ ├─ Extract reconciliationRows │
         │ └─ Return ReportPayload       │
         └────────────┬──────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   ┌──────────────┐         ┌──────────────────────┐
   │ Build        │         │ Use Backend Data     │
   │ Compound     │         │ ├─ Loan Tab          │
   │ Report       │         │ └─ Collateral Tab    │
   ├─ Summary     │         │                      │
   ├─ Loan        │         └──────────────────────┘
   ├─ Collateral  │
   ├─ Txns        │
   └──ƝE──────────┘
         │
    ┌────┴──────────┬────────────┬──────────────┬────────────┐
    │               │            │              │            │
    ▼               ▼            ▼              ▼            ▼
┌────────┐    ┌─────────┐   ┌──────────┐  ┌────────┐  ┌────────┐
│Summary │    │Loan Tab │   │Collateral│  │Txns Tab│  │JE Tab  │
│Tab     │    │         │   │          │  │        │  │        │
└────────┘    └─────────┘   └──────────┘  └────────┘  └────────┘
```

---

## 12. TESTING CHECKLIST

- [ ] Test with minimal data (1 transaction)
- [ ] Test with large data (1000+ transactions)
- [ ] Test with missing amountUsd field
- [ ] Test with non-sequential dates
- [ ] Test with multiple collateral types
- [ ] Test with liquidation events
- [ ] Test hydration timing edge cases
- [ ] Test field name variations (camelCase vs snake_case)
- [ ] Verify reconciliation formulas (End = Start + movements)
- [ ] Verify JE double-entry balancing
- [ ] Check FV adjustments appear in JE tab
- [ ] Verify Data Mapping tab shows correct field names
