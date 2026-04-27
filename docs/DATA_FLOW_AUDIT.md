# Data Flow and User Flow Audit

## User Flow Audit

### Flow 1: View Existing Reports (Primary Path)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HOME PAGE (/)                                                       │
│ On Load: Fetch wallet catalog for each SAMPLE_ADDRESS               │
│ GET /api/indexing/wallet-catalog?address={addr}&multi=true          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ "View Reports" Tab                                                  │
│ - Shows wallets with data (availablePeriods.length > 0)            │
│ - Each wallet displays period buttons (e.g., "2021-04", "2021-05") │
│ - Wallets without data shown separately for indexing               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks period button
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION                                                          │
│ router.push(`/activity/${address}?period=${period}`)               │
│ Note: No jobId = "directView" mode                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ACTIVITY PAGE (/activity/[address])                                 │
│ Detects directView (no jobId, has period)                          │
│ Calls fetchReport() immediately                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FETCH REPORT                                                        │
│ GET /api/indexing/wallet-reports?address={addr}&period={period}    │
│                                                                     │
│ Backend returns:                                                    │
│ { payload_json: { period: { normalizedEvents, reconciliationRows }}}│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ RENDER REPORT                                                       │
│ <CompoundReportView report={report} />                             │
│                                                                     │
│ Data Transformation:                                                │
│ 1. Extract normalizedEvents & reconciliationRows                   │
│ 2. Transform to CompoundEvent[] for Transactions/JE tabs           │
│ 3. Transform to CollateralLedger/LoanLedger for Loan/Collateral    │
│ 4. Build report for Summary tab                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 2: New Indexing Request

```
┌─────────────────────────────────────────────────────────────────────┐
│ HOME PAGE (/) → "New Request" Tab                                  │
│ User enters:                                                        │
│ - Ethereum Address (0x...)                                         │
│ - Wallet Start Date (YYYY-MM-DD)                                   │
│ - Report End Month (YYYY-MM)                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Start Indexing"
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CHECK EXISTING DATA                                                 │
│ GET /api/indexing/wallet-catalog?address={addr}&multi=true         │
│                                                                     │
│ If period already exists → Redirect to activity page (no job)      │
│ If not → Create new indexing job                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CREATE INDEXING JOB                                                 │
│ POST /api/indexing/jobs                                            │
│ Body: { walletAddress, walletStartDate, reportEndMonth, ... }      │
│                                                                     │
│ Response: { jobId, walletId }                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION                                                          │
│ /activity/{address}?jobId={jobId}&walletId={walletId}&period={...} │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ACTIVITY PAGE - JOB POLLING                                        │
│ Poll GET /api/indexing/jobs/{jobId} every 3 seconds                │
│                                                                     │
│ Display: status, progressPercent, currentStage, currentStageDetail │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Job status === "completed"
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FETCH REPORT (same as Flow 1)                                      │
│ GET /api/indexing/reports?walletId={walletId}&period={period}      │
│ Render <CompoundReportView />                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Backend to UI

### Step 1: API Response Structure

```json
{
  "payload_json": {
    "notes": [],
    "metadata": { "walletAddress": "0x...", "protocol": "compound" },
    "period": {
      "periodLabel": "May 2021",
      "normalizedEvents": [
        {
          "txHash": "0x...",
          "blockTimestamp": "2021-05-01T12:00:00Z",
          "positionType": "collateral",
          "activityType": "deposit",
          "tokenSymbol": "USDC",
          "amount": 170768.00,
          "amountUsd": 170768.00
        }
      ],
      "reconciliationRows": [
        {
          "tokenSymbol": "USDC",
          "positionType": "collateral",
          "startBalance": 0,
          "provided": 170768.00,
          "endBalance": 170768.00
        }
      ]
    }
  }
}
```

### Step 2: Data Extraction (Activity Page)

```typescript
function extractReportPayload(input) {
  // Priority: payload_json > payloadJson > report
  if (obj.payload_json) return obj.payload_json;
  if (obj.payloadJson) return obj.payloadJson;
  if (obj.report) return obj.report;
}
```

### Step 3: Data Transformation (CompoundReportView)

```
┌─────────────────────────────────────────────────────────────────────┐
│ normalizedEvents[]                                                  │
│         │                                                           │
│         ├──► transformToCompoundEvents() ──► CompoundEvent[]       │
│         │         │                                                 │
│         │         ├──► TransactionsTab (direct)                    │
│         │         └──► buildCompoundReport() ──► CompoundReport    │
│         │                   │                                       │
│         │                   ├──► SummaryTab (collateralSummary,    │
│         │                   │                debtSummary)          │
│         │                   └──► JETab (borrowerRecon)             │
│         │                                                           │
│         └──► reconciliationRows (if present, preferred)            │
│                   │                                                 │
│                   ├──► transformToCollateralLedger()               │
│                   │         └──► CollateralTab                     │
│                   │                                                 │
│                   └──► transformToLoanLedger()                     │
│                             └──► LoanTab                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab-by-Tab Field Mappings

### Summary Tab

| Display | Source | Calculation |
|---------|--------|-------------|
| Collateral deposited | events | Sum `amountUsd` where activity="deposit" |
| Collateral redeemed | events | Sum `amountUsd` where activity="redemption" |
| Collateral seized | events | Sum `amountUsd` where activity="liquidation" |
| Interest income | events | Sum `amountUsd` where activity="interest" (collateral) |
| Borrow | events | Sum `amountUsd` where activity="borrowing" |
| RepayBorrow | events | Sum `amountUsd` where activity="repayment" |
| Interest expense | events | Sum `amountUsd` where activity="interest" (debt) |

### Loan Tab

| Column | Backend Field | Fallbacks |
|--------|---------------|-----------|
| Token | `tokenSymbol` | `token_symbol`, `token` |
| Item | Derived from `activityType` | Pattern matching |
| Date | `blockTimestamp` | `block_timestamp`, `date` |
| Start | `startBalance` | `start` |
| Proceeds | `proceeds` | `borrows`, `amount` |
| Accruals | `accruals` | `interest` |
| Liquidated | `liquidated` | 0 |
| Payments | `payments` | `repayments` |
| End | `endBalance` | `end` |

**Formula:** `End = Start + Proceeds + Accruals - Liquidated - Payments`

### Collateral Tab

| Column | Backend Field | Fallbacks |
|--------|---------------|-----------|
| Token | `tokenSymbol` | `token_symbol`, `token` |
| Item | Derived from `activityType` | Pattern matching |
| Date | `blockTimestamp` | `block_timestamp`, `date` |
| Start | `startBalance` | `start` |
| Provided | `provided` | `deposits`, `amount` |
| Accruals | `accruals` | `interest` |
| Liquidated | `liquidated` | 0 |
| Reclaimed | `reclaimed` | `withdrawals` |
| End | `endBalance` | `end` |

**Formula:** `End = Start + Provided + Accruals - Liquidated - Reclaimed`

### Transactions Tab

| Column | Field | Detection |
|--------|-------|-----------|
| TX HASH | `txHash` / `tx_hash` | Direct |
| ACCOUNT | `positionType` | "collateral" or "debt" |
| ACTIVITY | `activityType`, `sourceAction`, `eventName` | Pattern matching |
| TOKEN | `tokenSymbol` | Direct |
| AMOUNT | `amount` | parseFloat |
| AMOUNT USD | `amountUsd` | parseFloat |

**Liquidation Detection Priority:**
1. `activityType` contains "liquidat"
2. `sourceAction` contains "liquidat"  
3. `eventName` contains "liquidat" or "absorb"

### JE (Journal Entries) Tab

| Column | Source | Notes |
|--------|--------|-------|
| Date | Event `timestamp` | Formatted |
| Description | Activity + Asset | Template |
| Debit/Credit | Activity type | Hardcoded account mapping |
| USD Amount | Event `amountUsd` | **Uses backend value directly** |

**Account Mappings:**
- Borrow: DR Cash/Crypto, CR Crypto Borrowings
- Repay: DR Crypto Borrowings, CR Cash/Crypto
- Deposit: DR Collateral Crypto, CR Crypto Holdings
- Withdraw: DR Crypto Holdings, CR Collateral Crypto
- Liquidation: DR Loss, CR Collateral

---

## Issues Fixed

### 1. Removed Hardcoded Prices
**Before:** JE tab used hardcoded prices (WETH=$3200, WBTC=$65000) to calculate USD values.
**After:** Uses `amountUsd` directly from backend events.

### 2. Removed Fair Value Adjustments
**Before:** Simulated monthly FV adjustments using random volatility.
**After:** Removed - only transaction-based entries are shown.

### 3. Fixed Loan Ledger Formula
**Before:** `End = Start - Proceeds - Accruals + Liquidated + Payments` (wrong sign convention)
**After:** `End = Start + Proceeds + Accruals - Liquidated - Payments` (debt increases with borrows)

### 4. Enhanced Liquidation Detection
**Before:** Only checked `activityType`.
**After:** Also checks `sourceAction`, `eventName` for "liquidat", "absorb".

---

## Remaining Considerations

1. **USD Values Depend on Backend**: If backend doesn't provide `amountUsd` or provides 0, reports will show $0.

2. **Token Decimals**: No normalization - backend must provide human-readable amounts.

3. **Position Type Values**: Backend must use "collateral" or "debt"/"loan" for filtering.

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home, wallet selection |
| `app/activity/[address]/page.tsx` | Report viewer, job polling |
| `components/compound-report-view.tsx` | Main container, transforms |
| `components/compound/summary-tab.tsx` | Summary |
| `components/compound/loan-tab.tsx` | Loan ledger |
| `components/compound/collateral-tab.tsx` | Collateral ledger |
| `components/compound/transactions-tab.tsx` | Transactions |
| `components/compound/journal-entries-tab.tsx` | Journal entries |
| `lib/compound/report-builder.ts` | Event→Report logic |
| `lib/indexing-api.ts` | Backend client |
