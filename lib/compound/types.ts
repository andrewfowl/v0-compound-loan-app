export type AccountType = "collateral" | "debt"
export type ActivityType = "deposit" | "redemption" | "borrowing" | "repayment" | "liquidation" | "interest"
export type EventName = "Mint" | "Redeem" | "Borrow" | "RepayBorrow" | "LiquidateBorrow"
export type Period = "monthly" | "quarterly" | "annual"
export type RiskLevel = "healthy" | "monitor" | "at-risk" | "critical"

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
  txHash: string
  eventName: string
  riskAtTime: RiskLevel
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
  txHash: string
  eventName: string
  riskAtTime: RiskLevel
}

export interface PeriodGroup<T> {
  periodLabel: string
  rows: T[]
  subtotals: Record<string, number>
}

// Journal Entry for double-entry accounting
export interface JournalEntry {
  date: string
  timestamp: string
  description: string
  debitAccount: string
  creditAccount: string
  usdAmount: number
  asset: string
  computed: boolean  // true for calculated entries like FV adjustments
}

// Monthly reconciliation group
export interface MonthlyReconGroup {
  period: string
  periodLabel: string
  entries: JournalEntry[]
  openingDebt: number
  openingCollateral: number
  closingDebt: number
  closingCollateral: number
  totalBorrowed: number
  totalRepaid: number
  totalInterest: number
  totalLiquidated: number
  embeddedDerivative: number
  liquidationRisk: "low" | "medium" | "high" | "liquidated"
}

// Position risk info per asset
export interface PositionRisk {
  asset: string
  units: number
  debtUsd: number
  collateralUsd: number
  ltv: number
  riskLevel: RiskLevel
  collateralToAddUsd: number
  debtToRepayUsd: number
  debtToRepayUnits: number
  usdToLiquidation: number
  bufferPct: number
  price: number
}

// Borrower reconciliation result
export interface BorrowerRecon {
  monthlyGroups: MonthlyReconGroup[]
  currentDebt: number
  currentCollateral: number
  currentLtv: number
  positions: PositionRisk[]
}

export interface CompoundReport {
  collateralSummary: Record<string, Record<string, number>>
  debtSummary: Record<string, Record<string, number>>
  collateralTokens: string[]
  debtTokens: string[]
  loanLedger: LoanLedgerEntry[]
  collateralLedger: CollateralLedgerEntry[]
  borrowerRecon: BorrowerRecon
}
