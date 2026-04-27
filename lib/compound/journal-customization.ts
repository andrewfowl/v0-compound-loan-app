/**
 * Journal Customization System
 * 
 * Provides full customization of journal entries for collateralized loans:
 * - Daily price schedules for accurate MTM calculations
 * - Custom chart of accounts
 * - Manual journal entry creation
 * - Calculation transparency and audit trail
 */

// ============================================================================
// TYPES
// ============================================================================

/** Daily price entry for a specific asset */
export interface DailyPrice {
  date: string // ISO date string YYYY-MM-DD
  asset: string
  price: number
  source: "manual" | "imported" | "on-chain"
}

/** Price schedule for multiple assets over time */
export interface PriceSchedule {
  entries: DailyPrice[]
  /** Default prices when no date-specific price exists */
  defaults: Record<string, number>
}

/** Custom account in the chart of accounts */
export interface CustomAccount {
  id: string
  code: string // e.g., "1001", "2001", "4001"
  name: string
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
  category: string // e.g., "Crypto Assets", "Borrowings", "Interest"
  description?: string
  isSystem: boolean // true for auto-generated accounts
}

/** Manual journal entry created by user */
export interface ManualJournalEntry {
  id: string
  date: string
  description: string
  debitAccountId: string
  creditAccountId: string
  amount: number
  asset?: string
  memo?: string
  linkedTxHash?: string // optional link to on-chain tx
  createdAt: string
  updatedAt: string
}

/** Calculation breakdown for transparency */
export interface CalculationStep {
  label: string
  formula: string
  inputs: Record<string, number | string>
  result: number
}

/** Enhanced journal entry with calculation details */
export interface EnhancedJournalEntry {
  id: string
  date: string
  timestamp: string
  description: string
  debitAccount: CustomAccount
  creditAccount: CustomAccount
  amount: number
  asset?: string
  
  // Source tracking
  source: "on-chain" | "computed" | "manual"
  txHash?: string
  
  // Calculation transparency
  calculations: CalculationStep[]
  
  // Price info
  priceUsed?: number
  priceSource?: "schedule" | "on-chain" | "default"
  impliedPrice?: number
}

/** Journal customization state */
export interface JournalCustomization {
  priceSchedule: PriceSchedule
  accounts: CustomAccount[]
  manualEntries: ManualJournalEntry[]
}

// ============================================================================
// DEFAULT CHART OF ACCOUNTS
// ============================================================================

export const DEFAULT_ACCOUNTS: CustomAccount[] = [
  // Assets (1xxx)
  { id: "1001", code: "1001", name: "Cash & Cash Equivalents", type: "asset", category: "Current Assets", isSystem: true },
  { id: "1010", code: "1010", name: "Crypto Holdings", type: "asset", category: "Digital Assets", isSystem: true },
  { id: "1011", code: "1011", name: "WETH Holdings", type: "asset", category: "Digital Assets", isSystem: true },
  { id: "1012", code: "1012", name: "WBTC Holdings", type: "asset", category: "Digital Assets", isSystem: true },
  { id: "1013", code: "1013", name: "USDC Holdings", type: "asset", category: "Digital Assets", isSystem: true },
  { id: "1020", code: "1020", name: "Collateral Deposited", type: "asset", category: "Protocol Assets", isSystem: true },
  { id: "1021", code: "1021", name: "Collateral - WETH", type: "asset", category: "Protocol Assets", isSystem: true },
  { id: "1022", code: "1022", name: "Collateral - WBTC", type: "asset", category: "Protocol Assets", isSystem: true },
  { id: "1030", code: "1030", name: "Unrealized FV Gain", type: "asset", category: "Fair Value", isSystem: true },
  
  // Liabilities (2xxx)
  { id: "2001", code: "2001", name: "Crypto Borrowings", type: "liability", category: "Protocol Liabilities", isSystem: true },
  { id: "2002", code: "2002", name: "WETH Borrowings", type: "liability", category: "Protocol Liabilities", isSystem: true },
  { id: "2003", code: "2003", name: "USDC Borrowings", type: "liability", category: "Protocol Liabilities", isSystem: true },
  { id: "2010", code: "2010", name: "Accrued Interest Payable", type: "liability", category: "Accruals", isSystem: true },
  { id: "2020", code: "2020", name: "FV Reserve", type: "liability", category: "Fair Value", isSystem: true },
  
  // Equity (3xxx)
  { id: "3001", code: "3001", name: "Retained Earnings", type: "equity", category: "Equity", isSystem: true },
  { id: "3010", code: "3010", name: "Unrealized Gains/Losses", type: "equity", category: "Other Comprehensive Income", isSystem: true },
  
  // Revenue (4xxx)
  { id: "4001", code: "4001", name: "Interest Income", type: "revenue", category: "Interest", isSystem: true },
  { id: "4010", code: "4010", name: "FV Gain - Collateral", type: "revenue", category: "Fair Value", isSystem: true },
  { id: "4011", code: "4011", name: "FV Gain - Borrowings", type: "revenue", category: "Fair Value", isSystem: true },
  
  // Expenses (5xxx)
  { id: "5001", code: "5001", name: "Interest Expense", type: "expense", category: "Interest", isSystem: true },
  { id: "5010", code: "5010", name: "FV Loss - Collateral", type: "expense", category: "Fair Value", isSystem: true },
  { id: "5011", code: "5011", name: "FV Loss - Borrowings", type: "expense", category: "Fair Value", isSystem: true },
  { id: "5020", code: "5020", name: "Loss on Liquidation", type: "expense", category: "Losses", isSystem: true },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Get price for an asset on a specific date from the schedule */
export function getPriceForDate(
  schedule: PriceSchedule,
  asset: string,
  date: string
): { price: number; source: "schedule" | "default" } | null {
  // Find exact date match
  const exactMatch = schedule.entries.find(
    (e) => e.asset === asset && e.date === date
  )
  if (exactMatch) {
    return { price: exactMatch.price, source: "schedule" }
  }
  
  // Find closest previous date
  const previousEntries = schedule.entries
    .filter((e) => e.asset === asset && e.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
  
  if (previousEntries.length > 0) {
    return { price: previousEntries[0].price, source: "schedule" }
  }
  
  // Fall back to default
  if (schedule.defaults[asset] != null) {
    return { price: schedule.defaults[asset], source: "default" }
  }
  
  return null
}

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Create empty customization state */
export function createEmptyCustomization(): JournalCustomization {
  return {
    priceSchedule: {
      entries: [],
      defaults: {},
    },
    accounts: [...DEFAULT_ACCOUNTS],
    manualEntries: [],
  }
}

/** Get account by ID or code */
export function findAccount(
  accounts: CustomAccount[],
  idOrCode: string
): CustomAccount | undefined {
  return accounts.find((a) => a.id === idOrCode || a.code === idOrCode)
}

/** Group accounts by type */
export function groupAccountsByType(
  accounts: CustomAccount[]
): Record<CustomAccount["type"], CustomAccount[]> {
  return {
    asset: accounts.filter((a) => a.type === "asset"),
    liability: accounts.filter((a) => a.type === "liability"),
    equity: accounts.filter((a) => a.type === "equity"),
    revenue: accounts.filter((a) => a.type === "revenue"),
    expense: accounts.filter((a) => a.type === "expense"),
  }
}
