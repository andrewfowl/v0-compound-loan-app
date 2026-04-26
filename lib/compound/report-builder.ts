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

// Risk thresholds
const LIQUIDATION_THRESHOLD = 0.80
const SAFE_TARGET = 0.65
const MONITOR_THRESHOLD = 0.50

// Simulated asset prices (would come from oracle in production)
const ASSET_PRICES: Record<string, number> = {
  WETH: 3200, ETH: 3200, WBTC: 65000, BTC: 65000,
  USDC: 1, USDT: 1, DAI: 1, COMP: 85, UNI: 12, LINK: 18,
}

// Monthly volatility for FV adjustments (stablecoins = 0)
const ASSET_MONTHLY_VOL: Record<string, number> = {
  WETH: 0.08, ETH: 0.08, WBTC: 0.06, BTC: 0.06,
  COMP: 0.12, UNI: 0.15, LINK: 0.10,
  USDC: 0, USDT: 0, DAI: 0,
}

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

export function buildCompoundReport(events: CompoundEvent[]): CompoundReport {
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
    const amt = parseFloat(e.amount)
    const amtUsd = parseFloat(e.amountUsd)
    const date = formatDate(e.timestamp)
    const price = ASSET_PRICES[e.asset] ?? (amtUsd / amt || 1)

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

      const end = start - proceeds - accruals + liquidated + payments
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

  // Build borrower reconciliation with journal entries
  const borrowerRecon = buildBorrowerRecon(events, loanBalances, collateralBalances, runningDebtUsd, runningCollateralUsd)

  return {
    collateralSummary,
    debtSummary,
    collateralTokens: Array.from(collTokens).sort(),
    debtTokens: Array.from(dbtTokens).sort(),
    loanLedger,
    collateralLedger,
    borrowerRecon,
  }
}

function buildBorrowerRecon(
  events: CompoundEvent[],
  debtUnits: Record<string, number>,
  collateralUnits: Record<string, number>,
  finalDebtUsd: number,
  finalCollateralUsd: number
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
    const lastDay = new Date(y, m, 0).getDate()
    const lastDayIso = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    
    const entries: JournalEntry[] = []
    const openingDebt = runningDebt
    const openingCollateral = runningCollateral
    let totalBorrowed = 0, totalRepaid = 0, totalInterest = 0, totalLiquidated = 0

    for (const e of monthEvents) {
      const amtUsd = parseFloat(e.amountUsd)
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
            debitAccount: "Collateral Deposited",
            creditAccount: "Crypto Holdings",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
          })
        } else if (e.activity === "redemption") {
          runningCollateral -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Withdraw ${e.asset} collateral`,
            debitAccount: "Crypto Holdings",
            creditAccount: "Collateral Deposited",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
          })
        } else if (e.activity === "liquidation") {
          runningCollateral -= amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Collateral ${e.asset} seized`,
            debitAccount: "Loss on Liquidation",
            creditAccount: "Collateral Deposited",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
          })
        } else if (e.activity === "interest") {
          runningCollateral += amtUsd
          entries.push({
            date,
            timestamp: e.timestamp,
            description: `Interest Income – ${e.asset}`,
            debitAccount: "Collateral Deposited",
            creditAccount: "Interest Income",
            usdAmount: amtUsd,
            asset: e.asset,
            computed: false,
          })
        }
      }
    }

    // Fair Value adjustments (simulated)
    let embeddedDerivative = 0
    Object.entries(debtUnits).forEach(([asset, units]) => {
      if (Math.abs(units) <= 0.0001) return
      const vol = ASSET_MONTHLY_VOL[asset] || 0
      if (vol === 0) return
      
      // Simulate a random monthly price move based on volatility
      const monthSeed = y * 12 + m + asset.charCodeAt(0)
      const pseudoRandom = Math.sin(monthSeed) * 0.5 + 0.5
      const monthlyRate = (pseudoRandom - 0.5) * 2 * vol
      
      const price = ASSET_PRICES[asset] || 1
      const fvChange = Math.abs(units) * price * monthlyRate
      if (Math.abs(fvChange) < 0.01) return
      
      const isLoss = fvChange > 0
      embeddedDerivative += fvChange
      
      entries.push({
        date: `${monthName.slice(0, 3)} ${lastDay}, ${y}`,
        timestamp: lastDayIso,
        description: `FV ${isLoss ? "Loss" : "Gain"} – ${asset} (${monthlyRate >= 0 ? "+" : ""}${(monthlyRate * 100).toFixed(2)}%)`,
        debitAccount: isLoss ? `Fair Value Loss – ${asset}` : "Crypto Borrowings",
        creditAccount: isLoss ? "Crypto Borrowings" : `Fair Value Gain – ${asset}`,
        usdAmount: Math.abs(fvChange),
        asset,
        computed: true,
      })
    })

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
        embeddedDerivative,
        liquidationRisk,
      })
    }
  }

  // Build position risk info
  const ltv = finalCollateralUsd > 0 ? finalDebtUsd / finalCollateralUsd : 0
  const positions: PositionRisk[] = Object.entries(debtUnits)
    .filter(([, units]) => Math.abs(units) > 0.0001)
    .map(([asset, units]) => {
      const price = ASSET_PRICES[asset] || 1
      const debtUsd = Math.abs(units) * price
      const debtShare = finalDebtUsd > 0 ? debtUsd / finalDebtUsd : 1
      const collateralUsd = finalCollateralUsd * debtShare
      const posLtv = collateralUsd > 0 ? debtUsd / collateralUsd : debtUsd > 0 ? Infinity : 0

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
  const groups = new Map<string, LoanLedgerEntry[]>()
  for (const row of ledger) {
    const key = getPeriodKey(row.date, period)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.entries()).map(([key, rows]) => ({
    periodLabel: getPeriodLabel(key, period),
    rows,
    subtotals: {
      startBalance: rows[0]?.start ?? 0,
      proceeds: rows.reduce((s, r) => s + r.proceeds, 0),
      accruals: rows.reduce((s, r) => s + r.accruals, 0),
      liquidated: rows.reduce((s, r) => s + r.liquidated, 0),
      payments: rows.reduce((s, r) => s + r.payments, 0),
      endBalance: rows[rows.length - 1]?.end ?? 0,
    },
  }))
}

export function groupCollateralLedgerByPeriod(
  ledger: CollateralLedgerEntry[],
  period: Period
): PeriodGroup<CollateralLedgerEntry>[] {
  const groups = new Map<string, CollateralLedgerEntry[]>()
  for (const row of ledger) {
    const key = getPeriodKey(row.date, period)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.entries()).map(([key, rows]) => ({
    periodLabel: getPeriodLabel(key, period),
    rows,
    subtotals: {
      startBalance: rows[0]?.start ?? 0,
      provided: rows.reduce((s, r) => s + r.provided, 0),
      accruals: rows.reduce((s, r) => s + r.accruals, 0),
      liquidated: rows.reduce((s, r) => s + r.liquidated, 0),
      reclaimed: rows.reduce((s, r) => s + r.reclaimed, 0),
      endBalance: rows[rows.length - 1]?.end ?? 0,
    },
  }))
}
