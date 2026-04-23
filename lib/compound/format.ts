import type { Period } from "./types"

export function formatLedgerValue(value: number, isDebit = false): string {
  if (value === 0) return ""
  const formatted = value
    .toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    .replace(/0+$/, "")
    .replace(/\.$/, "")
  return isDebit ? `(${formatted})` : formatted
}

export function formatUsd(value: number, negative = false): string {
  if (value === 0) return ""
  const formatted = value
    .toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    .replace(/0+$/, "")
    .replace(/\.$/, "")
  return negative ? `(${formatted})` : formatted
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
