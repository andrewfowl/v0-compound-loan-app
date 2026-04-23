export type AccountType = "collateral" | "debt"
export type ActivityType = "deposit" | "redemption" | "borrowing" | "repayment" | "liquidation" | "interest"
export type EventName = "Mint" | "Redeem" | "Borrow" | "RepayBorrow" | "LiquidateBorrow"
export type Period = "monthly" | "quarterly" | "annual"

export interface CompoundEvent {
  id: string
  blockNumber: string
  timestamp: string
  transactionHash: string
  accountType: AccountType
  activity: ActivityType
  eventName: EventName
  asset: string
  amount: string
  amountUsd: string
}

export interface LoanLedgerEntry {
  token: string
  item: string
  date: string
  start: number
  proceeds: number
  accruals: number
  liquidated: number
  payments: number
  end: number
}

export interface CollateralLedgerEntry {
  token: string
  item: string
  date: string
  start: number
  provided: number
  accruals: number
  liquidated: number
  reclaimed: number
  end: number
}

export interface PeriodGroup<T> {
  periodLabel: string
  rows: T[]
  subtotals: Record<string, number>
}

export interface CompoundReport {
  collateralSummary: Record<string, Record<string, number>>
  debtSummary: Record<string, Record<string, number>>
  collateralTokens: string[]
  debtTokens: string[]
  loanLedger: LoanLedgerEntry[]
  collateralLedger: CollateralLedgerEntry[]
}
