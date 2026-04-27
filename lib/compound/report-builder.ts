import type {
  CompoundEvent,
  CompoundReport,
  LoanLedgerEntry,
  CollateralLedgerEntry,
  PeriodGroup,
  Period,
  ActivityType,
  AccountType,
  RiskLevel,
  JournalEntry,
  MonthlyReconGroup,
  PositionRisk,
  BorrowerRecon,
} from "./types"
import { getPeriodKey, getPeriodLabel, formatDate } from "./format"

/** User-supplied principal-market prices keyed by token symbol */
export type PriceOverrides = Record<string, number>
const LIQUIDATION_THRESHOLD = 0.80
const SAFE_TARGET = 0.65
const MONITOR_THRESHOLD = 0.50

const ITEM_LABELS: Record<AccountType, Partial<Record<ActivityType, string>>> = {
  collateral: {
    deposit: "Deposit",
    redemption: "Redeem",
    liquidation: "Liquidate",
    interest: "Interest",
  },
  debt: {
    borrowing: "Borrowed crypto",
    repayment: "Paid by borrower",
    liquidation: "Paid by liquidator",
    interest: "Interest",
  },
}

function getItemLabel(activity: ActivityType, accountType: AccountType): string {
  return ITEM_LABELS[accountType]?.[activity] ?? activity
}

function computeRiskLevel(debtUsd: number, collateralUsd: number): RiskLevel {
  if (collateralUsd <= 0) return debtUsd > 0 ? "critical" : "healthy"
  const ltv = debtUsd / collateralUsd
  if (ltv >= LIQUIDATION_THRESHOLD) return "critical"
  if (ltv >= SAFE_TARGET) return "at-risk"
  if (ltv >= MONITOR_THRESHOLD) return "monitor"
  return "healthy"
}

/**
 * Build a CompoundReport from normalized events.
 *
 * priceOverrides: user-supplied prices from their principal market.
 * Used to compute Fair Value (mark-to-market) adjustments in the JE tab:
 *   FV Adj = endBalance (tokens) × (userPrice − impliedOnChainPrice)
 * impliedOnChainPrice per event = amountUsd ÷ amount.
 */
/**
 * Insert estimated interest accrual rows between consecutive ledger entries for a given asset.
 * A calculated row is inserted whenever:
 *   - There is a gap of >= 1 day between consecutive entries
 *   - No explicit interest event already covers that gap
 *   - The running balance is > 0 (i.e. there is an open position to accrue on)
 *
 * @param entries  Ledger rows for one asset, sorted ascending by date
 * @param apr      Annual percentage rate as a decimal (e.g. 0.05 for 5%)
 * @param isDebt   True for loan ledger (accrual increases balance); false for collateral (supply income)
 */
function injectCalculatedInterest<T extends { date: string; start: number; end: number; token: string; riskAtTime: RiskLevel }>(
  entries: T[],
  apr: number,
  makeAccrualRow: (prev: T, accrual: number, days: number, newStart: number) => T
): T[] {
  if (entries.length === 0) return entries
  const result: T[] = []
  for (let i = 0; i < entries.length; i++) {
    const prev = result[result.length - 1] ?? entries[i]
    const curr = entries[i]
    if (i > 0) {
      const prevDate = new Date(prev.date)
      const currDate = new Date(curr.date)
      const days = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000)
      const runningBalance = prev.end
      // Only insert if gap >= 1 day, balance is open, and this isn't already an accrual row
      if (days >= 1 && runningBalance > 0 && !(prev as unknown as { calculated?: boolean }).calculated) {
        const accrual = runningBalance * (apr / 365) * days
        if (accrual > 0.000001) {
          // Midpoint date for the calculated row
          const midDate = new Date(prevDate.getTime() + (currDate.getTime() - prevDate.getTime()) / 2)
          const midDateStr = midDate.toISOString().slice(0, 10)
          result.push(makeAccrualRow({ ...prev, date: midDateStr } as T, accrual, days, runningBalance))
        }
      }
    }
    result.push(curr)
  }
  return result
}

export function buildCompoundReport(
  events: CompoundEvent[],
  priceOverrides: PriceOverrides = {}
): CompoundReport {
  const collateralSummary: Record<string, Record<string, number>> = {
    deposited: {},
    redeemed: {},
    seized: {},
    "interest income": {},
  }
  const debtSummary: Record<string, Record<string, number>> = {
    Borrow: {},
    RepayBorrow: {},
    "interest expense": {},
  }

  const collTokens = new Set<string>()
  const dbtTokens = new Set<string>()
  const loanLedger: LoanLedgerEntry[] = []
  const collateralLedger: CollateralLedgerEntry[] = []
  const loanBalances: Record<string, number> = {}
  const collateralBalances: Record<string, number> = {}
  
  // Track running USD totals for risk calculation
  let runningDebtUsd = 0
  let runningCollateralUsd = 0

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const e of sorted) {
    const amt = parseFloat(e.amount) || 0
    const amtUsd = parseFloat(e.amountUsd) || 0
    const date = formatDate(e.timestamp)

    if (e.accountType === "collateral") {
      collTokens.add(e.asset)
      const start = collateralBalances[e.asset] ?? 0
      let provided = 0, accruals = 0, liquidated = 0, reclaimed = 0

      if (e.activity === "deposit") {
        collateralSummary.deposited[e.asset] = (collateralSummary.deposited[e.asset] ?? 0) + amtUsd
        provided = amt
        runningCollateralUsd += amtUsd
      } else if (e.activity === "redemption") {
        collateralSummary.redeemed[e.asset] = (collateralSummary.redeemed[e.asset] ?? 0) + amtUsd
        reclaimed = amt
        runningCollateralUsd -= amtUsd
      } else if (e.activity === "liquidation") {
        collateralSummary.seized[e.asset] = (collateralSummary.seized[e.asset] ?? 0) + amtUsd
        liquidated = amt
        runningCollateralUsd -= amtUsd
      } else if (e.activity === "interest") {
        collateralSummary["interest income"][e.asset] = (collateralSummary["interest income"][e.asset] ?? 0) + amtUsd
        accruals = amt
        runningCollateralUsd += amtUsd
      }

      // Collateral balance: Start + Provided + Accruals - Liquidated - Reclaimed = End
      const end = start + provided + accruals - liquidated - reclaimed
      collateralBalances[e.asset] = end
      const riskAtTime = computeRiskLevel(runningDebtUsd, runningCollateralUsd)

      collateralLedger.push({
        token: e.asset,
        item: getItemLabel(e.activity, e.accountType),
        date,
        start,
        provided,
        accruals,
        liquidated,
        reclaimed,
        end,
        txHash: e.transactionHash,
        eventName: e.eventName,
        riskAtTime,
      })
    } else {
      dbtTokens.add(e.asset)
      const start = loanBalances[e.asset] ?? 0
      let proceeds = 0, accruals = 0, liquidated = 0, payments = 0

      if (e.activity === "borrowing") {
        debtSummary.Borrow[e.asset] = (debtSummary.Borrow[e.asset] ?? 0) + amtUsd
        proceeds = amt
        runningDebtUsd += amtUsd
      } else if (e.activity === "repayment") {
        debtSummary.RepayBorrow[e.asset] = (debtSummary.RepayBorrow[e.asset] ?? 0) + amtUsd
        payments = amt
        runningDebtUsd -= amtUsd
      } else if (e.activity === "liquidation") {
        liquidated = amt
        runningDebtUsd -= amtUsd
      } else if (e.activity === "interest") {
        debtSummary["interest expense"][e.asset] = (debtSummary["interest expense"][e.asset] ?? 0) + amtUsd
        accruals = amt
        runningDebtUsd += amtUsd
      }

      // Loan balance: Start + Proceeds + Accruals - Liquidated - Payments = End
      // (Debt increases with borrows/interest, decreases with repayments/liquidations)
      const end = start + proceeds + accruals - liquidated - payments
      loanBalances[e.asset] = end
      const riskAtTime = computeRiskLevel(runningDebtUsd, runningCollateralUsd)

      loanLedger.push({
        token: e.asset,
        item: getItemLabel(e.activity, e.accountType),
        date,
        start,
        proceeds,
        accruals,
        liquidated,
        payments,
        end,
        txHash: e.transactionHash,
        eventName: e.eventName,
        riskAtTime,
      })
    }
  }

  // Inject calculated interest accrual rows between on-chain events per asset
  // Compound v3 borrow APR ~5%, supply APR ~4% — users can override these in the JE tab price panel
  const BORROW_APR = 0.05
  const SUPPLY_APR = 0.04

  // Group loan ledger by asset, inject, then flatten back in date order
  const loanAssets = [...new Set(loanLedger.map((r) => r.token))]
  const loanLedgerWithAccruals = loanAssets.flatMap((asset) => {
    const assetRows = loanLedger.filter((r) => r.token === asset)
    return injectCalculatedInterest(
      assetRows,
      BORROW_APR,
      (prev, accrual, days, newStart) => ({
        ...prev,
        item: "Est. Interest (calc.)",
        accruals: accrual,
        proceeds: 0,
        liquidated: 0,
        payments: 0,
        start: newStart,
        end: newStart + accrual,
        txHash: "",
        calculated: true,
        calculatedApr: BORROW_APR,
        calculatedDays: days,
      })
    )
  }).sort((a, b) => a.date.localeCompare(b.date))

  // Group collateral ledger by asset, inject, then flatten back in date order
  const collAssets = [...new Set(collateralLedger.map((r) => r.token))]
  const collateralLedgerWithAccruals = collAssets.flatMap((asset) => {
    const assetRows = collateralLedger.filter((r) => r.token === asset)
    return injectCalculatedInterest(
      assetRows,
      SUPPLY_APR,
      (prev, accrual, days, newStart) => ({
        ...prev,
        item: "Est. Interest (calc.)",
        accruals: accrual,
        provided: 0,
        liquidated: 0,
        reclaimed: 0,
        start: newStart,
        end: newStart + accrual,
        txHash: "",
        calculated: true,
        calculatedApr: SUPPLY_APR,
        calculatedDays: days,
      })
    )
  }).sort((a, b) => a.date.localeCompare(b.date))

  // Build borrower reconciliation with journal entries
  const borrowerRecon = buildBorrowerRecon(events, loanBalances, collateralBalances, runningDebtUsd, runningCollateralUsd, priceOverrides)

  return {
    collateralSummary,
    debtSummary,
    collateralTokens: Array.from(collTokens).sort(),
    debtTokens: Array.from(dbtTokens).sort(),
    loanLedger: loanLedgerWithAccruals,
    collateralLedger: collateralLedgerWithAccruals,
    borrowerRecon,
  }
}

function buildBorrowerRecon(
  events: CompoundEvent[],
  debtUnits: Record<string, number>,
  collateralUnits: Record<string, number>,
  finalDebtUsd: number,
  finalCollateralUsd: number,
  priceOverrides: PriceOverrides = {}
): BorrowerRecon {
  const monthlyGroups: MonthlyReconGroup[] = []
  
  // Group events by month
  const eventsByMonth = new Map<string, CompoundEvent[]>()
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  for (const e of sorted) {
    const d = new Date(e.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!eventsByMonth.has(key)) eventsByMonth.set(key, [])
    eventsByMonth.get(key)!.push(e)
  }

  let runningDebt = 0
  let runningCollateral = 0

  for (const [monthKey, monthEvents] of eventsByMonth) {
    const [y, m] = monthKey.split("-").map(Number)
    const monthName = new Date(y, m - 1).toLocaleString("en-US", { month: "long" })
    
    const entries: JournalEntry[] = []
    const openingDebt = runningDebt
    const openingCollateral = runningCollateral
    let totalBorrowed = 0, totalRepaid = 0, totalInterest = 0, totalLiquidated = 0

    for (const e of monthEvents) {
      const amtUsd = parseFloat(e.amountUsd) || 0
      const date = formatDate(e.timestamp)

      if (e.accountType === "debt") {
        if (e.activity === "borrowing") {
          totalBorrowed += amtUsd
          runningDebt += amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Borrow ${e.asset}`,
            debitAccount: "Cash / Crypto Received",
            creditAccount: "Crypto Borrowings",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "repayment") {
          totalRepaid += amtUsd
          runningDebt -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Repay ${e.asset}`,
            debitAccount: "Crypto Borrowings",
            creditAccount: "Cash / Crypto Paid",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "interest") {
          totalInterest += amtUsd
          runningDebt += amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Interest Expense – ${e.asset}`,
            debitAccount: "Interest Expense",
            creditAccount: "Accrued Interest Payable",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "liquidation") {
          totalLiquidated += amtUsd
          runningDebt -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Liquidation – ${e.asset} debt cleared`,
            debitAccount: "Crypto Borrowings",
            creditAccount: "Collateral Seized",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        }
      } else {
        // Collateral events
        if (e.activity === "deposit") {
          runningCollateral += amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Deposit ${e.asset} collateral`,
            debitAccount: `Collateral Crypto (${e.asset})`,
            creditAccount: `Crypto (${e.asset})`,
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "redemption") {
          runningCollateral -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Withdraw ${e.asset} collateral`,
            debitAccount: `Crypto (${e.asset})`,
            creditAccount: `Collateral Crypto (${e.asset})`,
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "liquidation") {
          runningCollateral -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Collateral ${e.asset} seized`,
            debitAccount: "Loss on Liquidation",
            creditAccount: `Collateral Crypto (${e.asset})`,
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        } else if (e.activity === "interest") {
          runningCollateral += amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Interest Income – ${e.asset}`,
            debitAccount: `Collateral Crypto (${e.asset})`,
            creditAccount: "Interest Income",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
            txHash: e.transactionHash || undefined,
          })
        }
      }
    }

    // Fair Value (mark-to-market) adjustments using user-supplied principal market prices.
    // Formula per asset:
    //   impliedPrice  = amountUsd / amount  (price embedded in the on-chain event)
    //   endTokens     = running balance in tokens at month-end
    //   fvAdj         = endTokens × (userPrice − impliedPrice)
    // Positive = unrealized gain (user price > on-chain price), Negative = loss.
    let totalFvAdjustment = 0
    const fvByAsset: Record<string, { tokens: number; impliedPrice: number }> = {}

    // Accumulate end-of-month token balances and last implied price per asset
    for (const e of monthEvents) {
      const amt = parseFloat(e.amount) || 0
      const amtUsd = parseFloat(e.amountUsd) || 0
      const impliedPrice = amt > 0 ? amtUsd / amt : 0
      if (!fvByAsset[e.asset]) fvByAsset[e.asset] = { tokens: 0, impliedPrice }
      // Update with latest implied price when available
      if (impliedPrice > 0) fvByAsset[e.asset].impliedPrice = impliedPrice
      if (e.activity === "deposit" || e.activity === "borrowing" || e.activity === "interest") {
        fvByAsset[e.asset].tokens += amt
      } else {
        fvByAsset[e.asset].tokens -= amt
      }
    }

    // One FV entry per asset that has a user price override
    const fvDate = `${y}-${String(m).padStart(2, "0")}-30`
    for (const [asset, { tokens, impliedPrice }] of Object.entries(fvByAsset)) {
      const userPrice = priceOverrides[asset]
      if (userPrice == null || Math.abs(tokens) < 0.0001) continue
      const fvAdj = tokens * (userPrice - impliedPrice)
      if (Math.abs(fvAdj) < 0.01) continue

      const isGain = fvAdj > 0
      totalFvAdjustment += fvAdj

      entries.push({
        date: fvDate,
        timestamp: new Date(y, m - 1, 30).toISOString(),
        description: `FV Adj – ${asset} (user $${userPrice.toLocaleString()} vs implied $${impliedPrice.toFixed(2)})`,
        debitAccount: isGain
          ? `Unrealized FV Gain – ${asset}`
          : `Unrealized FV Loss – ${asset}`,
        creditAccount: isGain
          ? `FV Reserve – ${asset}`
          : `FV Reserve – ${asset}`,
        usdAmount: Math.abs(fvAdj),
        asset,
        computed: true,
      })
    }

    if (entries.length > 0 || openingDebt > 0) {
      const ltv = runningCollateral > 0 ? runningDebt / runningCollateral : 0
      const liquidationRisk: MonthlyReconGroup["liquidationRisk"] =
        totalLiquidated > 0 ? "liquidated" : ltv > 0.75 ? "high" : ltv > 0.5 ? "medium" : "low"
      
      monthlyGroups.push({
        period: monthKey,
        periodLabel: `${monthName} ${y}`,
        entries,
        openingDebt,
        openingCollateral,
        closingDebt: runningDebt,
        closingCollateral: runningCollateral,
        totalBorrowed,
        totalRepaid,
        totalInterest,
        totalLiquidated,
        embeddedDerivative: totalFvAdjustment, // Store the total FV adjustment for this period
        liquidationRisk,
      })
    }
  }

  // Build position risk info using USD totals from events (no hardcoded prices)
  const ltv = finalCollateralUsd > 0 ? finalDebtUsd / finalCollateralUsd : 0
  const positions: PositionRisk[] = Object.entries(debtUnits)
    .filter(([, units]) => Math.abs(units) > 0.0001)
    .map(([asset, units]) => {
      // Calculate debt USD proportionally from the total
      const totalUnits = Object.values(debtUnits).reduce((s, u) => s + Math.abs(u), 0)
      const proportion = totalUnits > 0 ? Math.abs(units) / totalUnits : 1
      const debtUsd = finalDebtUsd * proportion
      const collateralUsd = finalCollateralUsd * proportion
      const posLtv = collateralUsd > 0 ? debtUsd / collateralUsd : debtUsd > 0 ? Infinity : 0
      const price = Math.abs(units) > 0 ? debtUsd / Math.abs(units) : 0

      const riskLevel = computeRiskLevel(debtUsd, collateralUsd)
      const collateralToAddUsd = Math.max(0, debtUsd / SAFE_TARGET - collateralUsd)
      const debtToRepayUsd = Math.max(0, debtUsd - collateralUsd * SAFE_TARGET)
      const debtToRepayUnits = price > 0 ? debtToRepayUsd / price : 0
      const usdToLiquidation = Math.max(0, collateralUsd * LIQUIDATION_THRESHOLD - debtUsd)
      const bufferPct = collateralUsd > 0 ? ((LIQUIDATION_THRESHOLD - posLtv) / LIQUIDATION_THRESHOLD) * 100 : 0

      return {
        asset,
        units: Math.abs(units),
        debtUsd,
        collateralUsd,
        ltv: posLtv,
        riskLevel,
        collateralToAddUsd,
        debtToRepayUsd,
        debtToRepayUnits,
        usdToLiquidation,
        bufferPct: Math.max(0, bufferPct),
        price,
      }
    })

  return {
    monthlyGroups,
    currentDebt: finalDebtUsd,
    currentCollateral: finalCollateralUsd,
    currentLtv: ltv,
    positions,
  }
}

export function groupLoanLedgerByPeriod(
  ledger: LoanLedgerEntry[],
  period: Period
): PeriodGroup<LoanLedgerEntry>[] {
  // Re-thread start/end so each detail row's start = prior row's end (per asset),
  // then build period groups whose subtotal start = first row start, end = start + sum(middle cols).
  const assetEnd: Record<string, number> = {}
  const relinked = ledger.map((row) => {
    const start = assetEnd[row.token] ?? row.start
    const end = start + row.proceeds + row.accruals - row.liquidated - row.payments
    assetEnd[row.token] = end
    return { ...row, start, end }
  })

  const groups = new Map<string, typeof relinked>()
  for (const row of relinked) {
    const key = getPeriodKey(row.date, period)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return Array.from(groups.entries()).map(([key, rows]) => {
    const startBalance = rows[0]?.start ?? 0
    const proceeds   = rows.reduce((s, r) => s + r.proceeds, 0)
    const accruals   = rows.reduce((s, r) => s + r.accruals, 0)
    const liquidated = rows.reduce((s, r) => s + r.liquidated, 0)
    const payments   = rows.reduce((s, r) => s + r.payments, 0)
    const endBalance = startBalance + proceeds + accruals - liquidated - payments
    return {
      periodLabel: getPeriodLabel(key, period),
      rows,
      subtotals: { startBalance, proceeds, accruals, liquidated, payments, endBalance },
    }
  })
}

export function groupCollateralLedgerByPeriod(
  ledger: CollateralLedgerEntry[],
  period: Period
): PeriodGroup<CollateralLedgerEntry>[] {
  // Re-thread start/end so each detail row's start = prior row's end (per asset),
  // then build period groups whose subtotal start = first row start, end = start + sum(middle cols).
  const assetEnd: Record<string, number> = {}
  const relinked = ledger.map((row) => {
    const start = assetEnd[row.token] ?? row.start
    const end = start + row.provided + row.accruals - row.liquidated - row.reclaimed
    assetEnd[row.token] = end
    return { ...row, start, end }
  })

  const groups = new Map<string, typeof relinked>()
  for (const row of relinked) {
    const key = getPeriodKey(row.date, period)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return Array.from(groups.entries()).map(([key, rows]) => {
    const startBalance = rows[0]?.start ?? 0
    const provided   = rows.reduce((s, r) => s + r.provided, 0)
    const accruals   = rows.reduce((s, r) => s + r.accruals, 0)
    const liquidated = rows.reduce((s, r) => s + r.liquidated, 0)
    const reclaimed  = rows.reduce((s, r) => s + r.reclaimed, 0)
    const endBalance = startBalance + provided + accruals - liquidated - reclaimed
    return {
      periodLabel: getPeriodLabel(key, period),
      rows,
      subtotals: { startBalance, provided, accruals, liquidated, reclaimed, endBalance },
    }
  })
}
