import type { Period } from "./types"

// USD amounts: always 2 decimal places, with "$" prefix, zero = "-"
export function formatUsd(value: number, isDebit = false): string {
  if (value === 0) return "-"
  const formatted = "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return isDebit ? `(${formatted})` : formatted
}

// Crypto token amounts: strip trailing zeros, no currency symbol, zero = "-"
export function formatCrypto(value: number, isDebit = false): string {
  if (value === 0) return "-"
  const formatted = value
    .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    .replace(/\.?0+$/, "")
  return isDebit ? `(${formatted})` : formatted
}

// Ledger cells use crypto formatting (token quantities, not USD)
export function formatLedgerValue(value: number, isDebit = false): string {
  return formatCrypto(value, isDebit)
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  })
}

export function getPeriodKey(date: string, period: Period): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = d.getMonth()
  if (period === "annual") return `${y}`
  if (period === "quarterly") return `${y} Q${Math.floor(m / 3) + 1}`
  return `${y}/${String(m + 1).padStart(2, "0")}`
}

export function getPeriodLabel(key: string, period: Period): string {
  if (period === "annual" || period === "quarterly") return key
  const [y, m] = key.split("/")
  const monthName = new Date(Number(y), Number(m) - 1).toLocaleString("en-US", { month: "long" })
  return `${monthName} ${y}`
}
