# Documentation Index

## Quick Links

### 1. **FIXES_SUMMARY.md** (Start Here!)
Overview of all fixes applied and enhancements made. Perfect for understanding what changed and why.
- All 7 major fixes with explanations
- Key findings and limitations
- Testing recommendations
- Next steps

### 2. **DATA_FLOW_AUDIT.md**
Deep technical audit of how data flows through the system, from API ingestion to report rendering.
- Data extraction pipeline
- Report-specific column mappings
- Transformation functions
- Data integrity mechanisms
- Critical issues and solutions

### 3. **USER_FLOW_AUDIT.md**
Complete user journey documentation covering both report viewing and indexing workflows.
- Entry points and navigation
- Data transformation pipeline (detailed)
- Per-tab rendering algorithms
- Error handling and recovery
- Visual data flow diagram
- 12-item testing checklist

---

## What Each Document Is For

| Document | Audience | Purpose |
|----------|----------|---------|
| FIXES_SUMMARY.md | Everyone | Quick overview of what was fixed |
| DATA_FLOW_AUDIT.md | Developers | How data transforms from API to UI |
| USER_FLOW_AUDIT.md | QA / Developers | Complete user journey & architecture |

---

## Key Insights

### Data Comes From Two Sources
1. **reconciliationRows** - Pre-calculated by backend (Loan & Collateral tabs)
2. **normalizedEvents** - Raw transactions (Transactions, JE, Summary tabs)

### Fair Value Adjustments
- Restored and improved
- Based on estimated monthly volatility (not hardcoded prices)
- Visible in JE tab (marked as computed entries)
- Volatility model: WETH 8%, WBTC 10%, Stablecoins 0.1%

### USD Values
- Using backend `amountUsd` field directly
- No hardcoded prices in calculation path
- If missing → shows zeros

### Transparency Features
- Data source indicators on every tab
- Debug panel shows actual field names from API
- Reconciliation variance column highlights imbalances
- JE hover tooltips explain calculations

---

## Debugging Guide

### Issue: Amounts showing as zero
1. Check "Data Mapping" view → look for "amountUsd" field
2. If not present → backend needs to provide USD values
3. If present but zeros → check actual API response

### Issue: Liquidation transactions missing
1. Check "Transactions" tab for events
2. Use Data Mapping to verify event naming
3. Look for variations: "liquidation", "liquidateborrow", "absorb"

### Issue: Reconciliation doesn't balance
1. Check "Reconciliation" tab variance column
2. Use "Raw API Data" tab to see actual values
3. Compare formula: End = Start + Proceeds + Accruals - Liquidated - Repayments

### Issue: Numbers differ between tabs
1. Check data source banner on each tab
2. Backend data (Loan/Collateral) is source of truth
3. Calculated data (Txns/JE) is derived from normalizedEvents

---

## Architecture at a Glance

```
User Input
    ↓
Homepage (/page.tsx)
    ↓
Activity Page (/activity/[address])
    ├─ Wait for hydration
    ├─ Read URL params
    └─ Fetch /api/wallet-reports
        ↓
    API Route (returns payload_json)
        ↓
    Extract ReportPayload
        ├─ normalizedEvents []
        ├─ reconciliationRows []
        └─ reconciliationSummary []
        ↓
    Two Processing Paths:
    ├─ PATH 1: Use reconciliationRows directly
    │   └─ Loan Tab, Collateral Tab
    │
    └─ PATH 2: Calculate from normalizedEvents
        ├─ transformToCompoundEvents()
        ├─ buildCompoundReport()
        ├─ buildBorrowerRecon()
        └─ Transactions Tab, JE Tab, Summary Tab, etc.
        ↓
    Render 5 Report Tabs
    ├─ Summary
    ├─ Loan
    ├─ Collateral
    ├─ Transactions
    └─ JE (Journal Entries)
```

---

## File Locations

```
docs/
├── FIXES_SUMMARY.md          ← Start here
├── DATA_FLOW_AUDIT.md        ← Technical deep dive
└── USER_FLOW_AUDIT.md        ← Architecture & workflows

Key files mentioned in docs:
├── app/page.tsx              ← Home page
├── app/activity/[address]/page.tsx ← Report page
├── app/api/indexing/wallet-reports/route.ts ← API endpoint
├── lib/compound/report-builder.ts ← Core logic
├── lib/compound/types.ts     ← Type definitions
├── components/compound-report-view.tsx ← Main container
└── components/compound/
    ├── summary-tab.tsx
    ├── loan-tab.tsx
    ├── collateral-tab.tsx
    ├── transactions-tab.tsx
    └── journal-entries-tab.tsx
```

---

## Quick Reference: Column Mappings

### Loan Tab
| Display | Source Field | Fallback |
|---------|-------------|----------|
| Token | tokenSymbol | token_symbol → token |
| Start | startBalance | start |
| Proceeds | proceeds | borrows |
| Accruals | accruals | interest |
| Payments | payments | repayments |
| End | endBalance | end |

### Collateral Tab
| Display | Source Field | Fallback |
|---------|-------------|----------|
| Token | tokenSymbol | token_symbol → token |
| Start | startBalance | start |
| Provided | provided | deposits |
| Accruals | accruals | interest |
| Reclaimed | reclaimed | withdrawals |
| End | endBalance | end |

### Transactions Tab
| Display | Source Field | Detection |
|---------|-------------|-----------|
| ACCOUNT | positionType | "collateral" or "debt" |
| ACTIVITY | activityType | Detected from multiple fields |
| TOKEN | tokenSymbol | token_symbol |
| AMOUNT USD | amountUsd | amount_usd |

---

## Testing Scenarios

### Scenario 1: Verify Data Accuracy
```
1. Open home page
2. Click on a wallet+period
3. Check each tab displays data
4. Click "Data Mapping" tab
5. Verify field names match your backend
6. Check amounts are non-zero
```

### Scenario 2: Verify Liquidation Detection
```
1. Select a wallet that had liquidations
2. Go to Transactions tab
3. Look for rows with "Liquidation" activity
4. Check they also appear in Collateral tab with liquidated amount
5. Verify JE tab has liquidation entries
```

### Scenario 3: Verify Reconciliation
```
1. Go to Raw API Data tab
2. Click Reconciliation section
3. Check variance column (green = balanced, red = imbalance)
4. For any red rows, manually verify formula:
   End = Start + Proceeds + Accruals - Liquidated - Repayments
```

### Scenario 4: Verify FV Adjustments
```
1. Go to JE (Journal Entries) tab
2. Look for italic rows with "(FV)" in date
3. Hover over the description to see calculation details
4. Verify they're marked as "computed"
5. Check FV Adj summary shows in period summary
```

---

## Troubleshooting

**Q: Page won't load after clicking a period**
A: Check browser console for errors. Most likely cause is hydration timing. Fixed in latest version.

**Q: All numbers show as zero**
A: Check Data Mapping tab - look for amountUsd field. If missing, backend needs to provide USD values.

**Q: Liquidations not showing**
A: Go to Transactions tab and search for liquidation. If not there, check Data Mapping for eventName field variations.

**Q: JE numbers don't match Loan/Collateral tabs**
A: That's expected. JE is calculated from normalizedEvents, Loan/Collateral from reconciliationRows. Check Data Mapping tab to see both sources.

**Q: Reconciliation doesn't balance**
A: Check Raw API Data tab's reconciliation section. Red variance column shows how much is off. Could be fees, slippage, or missing data.

---

## Contact & Support

For questions about specific aspects:
- **Data transformation logic** → See DATA_FLOW_AUDIT.md section 3
- **User workflows** → See USER_FLOW_AUDIT.md section 8
- **Specific tab logic** → See USER_FLOW_AUDIT.md section 4
- **Error recovery** → See USER_FLOW_AUDIT.md section 9
- **What was fixed** → See FIXES_SUMMARY.md section 1

