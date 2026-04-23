import type {
  CompoundEvent,
  CompoundReport,
  LoanLedgerEntry,
  CollateralLedgerEntry,
  PeriodGroup,
  Period,
  ActivityType,
  AccountType,
} from "./types"
import { getPeriodKey, getPeriodLabel, formatDate } from "./format"

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

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const e of sorted) {
    const amt = parseFloat(e.amount)
    const amtUsd = parseFloat(e.amountUsd)
    const date = formatDate(e.timestamp)

    if (e.accountType === "collateral") {
      collTokens.add(e.asset)
      const start = collateralBalances[e.asset] ?? 0
      let provided = 0, accruals = 0, liquidated = 0, reclaimed = 0

      if (e.activity === "deposit") {
        collateralSummary.deposited[e.asset] = (collateralSummary.deposited[e.asset] ?? 0) + amtUsd
        provided = amt
      } else if (e.activity === "redemption") {
        collateralSummary.redeemed[e.asset] = (collateralSummary.redeemed[e.asset] ?? 0) + amtUsd
        reclaimed = amt
      } else if (e.activity === "liquidation") {
        collateralSummary.seized[e.asset] = (collateralSummary.seized[e.asset] ?? 0) + amtUsd
        liquidated = amt
      } else if (e.activity === "interest") {
        collateralSummary["interest income"][e.asset] = (collateralSummary["interest income"][e.asset] ?? 0) + amtUsd
        accruals = amt
      }

      const end = start + provided + accruals - liquidated - reclaimed
      collateralBalances[e.asset] = end

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
      })
    } else {
      dbtTokens.add(e.asset)
      const start = loanBalances[e.asset] ?? 0
      let proceeds = 0, accruals = 0, liquidated = 0, payments = 0

      if (e.activity === "borrowing") {
        debtSummary.Borrow[e.asset] = (debtSummary.Borrow[e.asset] ?? 0) + amtUsd
        proceeds = amt   // positive column value; balance effect is negative (liability grows)
      } else if (e.activity === "repayment") {
        debtSummary.RepayBorrow[e.asset] = (debtSummary.RepayBorrow[e.asset] ?? 0) + amtUsd
        payments = amt   // positive column value; balance effect is positive (liability shrinks)
      } else if (e.activity === "liquidation") {
        liquidated = amt // positive column value; balance effect is positive (liability shrinks)
      } else if (e.activity === "interest") {
        debtSummary["interest expense"][e.asset] = (debtSummary["interest expense"][e.asset] ?? 0) + amtUsd
        accruals = amt   // positive column value; balance effect is negative (liability grows)
      }

      // Loan balance is negative (liability). Borrows/accruals deepen it; payments/liquidations reduce it.
      const end = start - proceeds - accruals + liquidated + payments
      loanBalances[e.asset] = end

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
      })
    }
  }

  return {
    collateralSummary,
    debtSummary,
    collateralTokens: Array.from(collTokens).sort(),
    debtTokens: Array.from(dbtTokens).sort(),
    loanLedger,
    collateralLedger,
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
      proceeds: rows.reduce((s, r) => s + r.proceeds, 0),
      accruals: rows.reduce((s, r) => s + r.accruals, 0),
      liquidated: rows.reduce((s, r) => s + r.liquidated, 0),
      payments: rows.reduce((s, r) => s + r.payments, 0),
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
      provided: rows.reduce((s, r) => s + r.provided, 0),
      accruals: rows.reduce((s, r) => s + r.accruals, 0),
      liquidated: rows.reduce((s, r) => s + r.liquidated, 0),
      reclaimed: rows.reduce((s, r) => s + r.reclaimed, 0),
    },
  }))
}
