"use client"

import { useRef, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppShell } from "@/components/app-shell"
import {
  HelpCircle,
  Plus,
  Pencil,
  Check,
  X,
  Upload,
  Download,
  Trash2,
  CalendarDays,
  Info,
  AlertTriangle,
  FileSpreadsheet,
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react"

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_CONFIGS = {
  "1": {
    label: "Level 1",
    description: "Quoted prices in active markets for identical assets (e.g. Coinbase, Kraken closing prices)",
    badgeClass: "border-success/40 text-success bg-success/5",
  },
  "2": {
    label: "Level 2",
    description: "Observable inputs other than Level 1 — index prices, dealer quotes, corroborated market data",
    badgeClass: "border-warning/40 text-warning bg-warning/5",
  },
  "3": {
    label: "Level 3",
    description: "Unobservable inputs reflecting entity assumptions — requires additional disclosure",
    badgeClass: "border-destructive/40 text-destructive bg-destructive/5",
  },
} as const

const PRICE_SOURCES = [
  "Chainlink Oracle",
  "Coinbase Pro",
  "Kraken",
  "CoinMarketCap",
  "CoinGecko",
  "Compound Protocol",
  "Internal Model",
  "Manual Entry",
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceEntry {
  asset: string
  symbol: string
  price: number
  source: string
  level: "1" | "2" | "3"
  onChainPrice: number
  notes: string
  custom: boolean
}

/** A snapshot of all prices for a single measurement date (month-end) */
interface PriceSnapshot {
  date: string          // YYYY-MM-DD, always a month-end
  entries: PriceEntry[]
  locked: boolean       // once JEs are generated, lock the snapshot
}

/** Daily price data for an asset on a specific date */
interface DailyPriceData {
  date: string       // YYYY-MM-DD
  asset: string      // symbol
  price: number
  source: string
}

/** Computed pricing metrics for an asset for a month */
interface ComputedPriceMetrics {
  asset: string
  periodEndPrice: number       // Last day of month price (for balance measurement)
  periodStartPrice: number     // First day of month price
  averagePrice: number         // Average over the month (for activity measurement)
  priceChange: number          // End - Start
  priceChangePercent: number   // (End - Start) / Start * 100
  unrealizedGain: number       // Placeholder - would need holdings data
  dataPoints: number           // Number of daily prices in the month
  missingDates: number         // Number of dates with fallback pricing
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const BASE_ENTRIES: PriceEntry[] = [
  { asset: "Wrapped Ether",   symbol: "WETH", price: 3200.00,  source: "Coinbase Pro",    level: "1", onChainPrice: 3198.42, notes: "Closing price on principal market", custom: false },
  { asset: "Ether",           symbol: "ETH",  price: 3200.00,  source: "Coinbase Pro",    level: "1", onChainPrice: 3198.42, notes: "Closing price on principal market", custom: false },
  { asset: "Wrapped Bitcoin", symbol: "WBTC", price: 65000.00, source: "Coinbase Pro",    level: "1", onChainPrice: 64987.20, notes: "1:1 custodial peg to BTC",         custom: false },
  { asset: "USD Coin",        symbol: "USDC", price: 1.0000,   source: "Chainlink Oracle", level: "1", onChainPrice: 1.0000, notes: "Regulated stablecoin, 1:1 USD",    custom: false },
  { asset: "Tether",          symbol: "USDT", price: 1.0000,   source: "Chainlink Oracle", level: "2", onChainPrice: 0.9997, notes: "Minor basis risk — Level 2",        custom: false },
  { asset: "Dai",             symbol: "DAI",  price: 1.0000,   source: "Chainlink Oracle", level: "1", onChainPrice: 1.0000, notes: "Overcollateralized stablecoin",    custom: false },
  { asset: "Compound",        symbol: "COMP", price: 60.00,    source: "CoinGecko",       level: "2", onChainPrice: 59.44, notes: "Governance token, lower liquidity", custom: false },
]

function seedSnapshots(): PriceSnapshot[] {
  const months = ["2025-01-31", "2025-02-28", "2025-03-31"]
  const multipliers = [0.88, 0.94, 1.0]
  return months.map((date, i) => ({
    date,
    locked: i < 2,
    entries: BASE_ENTRIES.map((e) => ({
      ...e,
      price: parseFloat((e.price * multipliers[i]).toFixed(e.price < 10 ? 4 : 2)),
      onChainPrice: parseFloat((e.onChainPrice * multipliers[i]).toFixed(e.onChainPrice < 10 ? 4 : 2)),
    })),
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

function lastDayOfMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  return new Date(y, m, 0).toISOString().split("T")[0]
}

function exportCsv(snapshot: PriceSnapshot) {
  const header = "symbol,asset,price_usd,on_chain_price,source,level,notes\n"
  const rows = snapshot.entries
    .map((e) => `${e.symbol},${e.asset},${e.price},${e.onChainPrice},${e.source},${e.level},"${e.notes}"`)
    .join("\n")
  const blob = new Blob([header + rows], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `fair-value-${snapshot.date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parseCsv(text: string): Partial<PriceEntry>[] {
  const lines = text.trim().split("\n")
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""))
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""))
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = cols[i] ?? "" })
    return {
      symbol: (obj.symbol || "").toUpperCase(),
      asset: obj.asset || obj.symbol || "",
      price: parseFloat(obj.price_usd || obj.price || "0"),
      onChainPrice: parseFloat(obj.on_chain_price || obj.onchainprice || obj.price_usd || "0"),
      source: obj.source || "Manual Entry",
      level: (["1","2","3"].includes(obj.level) ? obj.level : "2") as "1"|"2"|"3",
      notes: obj.notes || "",
      custom: true,
    }
  }).filter((e) => e.symbol && !isNaN(e.price!))
}

/**
 * Parse daily pricing CSV with format: date,symbol,price,source
 * Supports flexible column names and handles various date formats
 */
function parseDailyPriceCsv(text: string): DailyPriceData[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []
  
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""))
  const dateIdx = header.findIndex(h => h === "date" || h === "timestamp" || h === "time")
  const symbolIdx = header.findIndex(h => h === "symbol" || h === "asset" || h === "token")
  const priceIdx = header.findIndex(h => h === "price" || h === "price_usd" || h === "close" || h === "value")
  const sourceIdx = header.findIndex(h => h === "source" || h === "provider")
  
  if (dateIdx < 0 || symbolIdx < 0 || priceIdx < 0) return []
  
  const results: DailyPriceData[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""))
    const dateStr = cols[dateIdx]
    const symbol = (cols[symbolIdx] || "").toUpperCase()
    const price = parseFloat(cols[priceIdx])
    const source = sourceIdx >= 0 ? cols[sourceIdx] : "CSV Import"
    
    if (!dateStr || !symbol || isNaN(price)) continue
    
    // Parse date - support YYYY-MM-DD, MM/DD/YYYY, etc.
    let parsedDate: string
    if (dateStr.includes("-")) {
      parsedDate = dateStr.split("T")[0] // Handle ISO format
    } else if (dateStr.includes("/")) {
      const parts = dateStr.split("/")
      if (parts[2].length === 4) {
        // MM/DD/YYYY
        parsedDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
      } else {
        // YYYY/MM/DD
        parsedDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
      }
    } else {
      continue // Skip invalid date format
    }
    
    results.push({ date: parsedDate, asset: symbol, price, source })
  }
  
  return results.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get price for a specific date using "last available prior date" fallback rule
 * If exact date not found, use the most recent price before that date
 */
function getPriceForDate(
  dailyPrices: DailyPriceData[],
  asset: string,
  targetDate: string
): { price: number; actualDate: string; isFallback: boolean } | null {
  const assetPrices = dailyPrices
    .filter(p => p.asset === asset)
    .sort((a, b) => a.date.localeCompare(b.date))
  
  if (assetPrices.length === 0) return null
  
  // Find exact match first
  const exact = assetPrices.find(p => p.date === targetDate)
  if (exact) {
    return { price: exact.price, actualDate: exact.date, isFallback: false }
  }
  
  // Find last available price before target date
  const priorPrices = assetPrices.filter(p => p.date < targetDate)
  if (priorPrices.length > 0) {
    const lastPrior = priorPrices[priorPrices.length - 1]
    return { price: lastPrior.price, actualDate: lastPrior.date, isFallback: true }
  }
  
  // If no prior price, use first available (for beginning of data set)
  return { price: assetPrices[0].price, actualDate: assetPrices[0].date, isFallback: true }
}

/**
 * Compute pricing metrics for a month from daily price data
 */
function computeMonthlyMetrics(
  dailyPrices: DailyPriceData[],
  year: number,
  month: number // 1-12
): ComputedPriceMetrics[] {
  // Get all unique assets
  const assets = [...new Set(dailyPrices.map(p => p.asset))]
  
  // Calculate date range for the month
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0]
  
  // Generate all dates in the month
  const allDates: string[] = []
  const current = new Date(firstDay)
  const end = new Date(lastDay)
  while (current <= end) {
    allDates.push(current.toISOString().split("T")[0])
    current.setDate(current.getDate() + 1)
  }
  
  return assets.map(asset => {
    const assetPrices = dailyPrices.filter(p => p.asset === asset)
    const pricesInMonth = assetPrices.filter(p => p.date >= firstDay && p.date <= lastDay)
    
    // Get period-end price (with fallback)
    const endPriceData = getPriceForDate(dailyPrices, asset, lastDay)
    const periodEndPrice = endPriceData?.price ?? 0
    
    // Get period-start price (with fallback)
    const startPriceData = getPriceForDate(dailyPrices, asset, firstDay)
    const periodStartPrice = startPriceData?.price ?? 0
    
    // Calculate average price over the month
    // For each day, get the price (with fallback) and average them
    let totalPrice = 0
    let fallbackCount = 0
    
    for (const date of allDates) {
      const priceData = getPriceForDate(dailyPrices, asset, date)
      if (priceData) {
        totalPrice += priceData.price
        if (priceData.isFallback) fallbackCount++
      }
    }
    
    const averagePrice = allDates.length > 0 ? totalPrice / allDates.length : 0
    const priceChange = periodEndPrice - periodStartPrice
    const priceChangePercent = periodStartPrice > 0 
      ? (priceChange / periodStartPrice) * 100 
      : 0
    
    return {
      asset,
      periodEndPrice,
      periodStartPrice,
      averagePrice,
      priceChange,
      priceChangePercent,
      unrealizedGain: 0, // Would need holdings data to calculate
      dataPoints: pricesInMonth.length,
      missingDates: fallbackCount,
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FairValuePage() {
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>(seedSnapshots)
  const [activeDateIdx, setActiveDateIdx] = useState(2)  // most recent selected by default
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PriceEntry>>({})
  const [addingNew, setAddingNew] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<PriceEntry>>({ level: "1", source: "Manual Entry", custom: true, notes: "" })
  const [newPeriod, setNewPeriod] = useState("")
  const [showAddPeriod, setShowAddPeriod] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [csvPreview, setCsvPreview] = useState<Partial<PriceEntry>[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const dailyFileRef = useRef<HTMLInputElement>(null)

  // Daily pricing state
  const [dailyPrices, setDailyPrices] = useState<DailyPriceData[]>([])
  const [showDailyImport, setShowDailyImport] = useState(false)
  const [dailyPreview, setDailyPreview] = useState<DailyPriceData[]>([])
  const [activeTab, setActiveTab] = useState<"month-end" | "daily-prices" | "computed">("month-end")

  const snapshot = snapshots[activeDateIdx]
  const entries = snapshot?.entries ?? []

  // Compute metrics when daily prices exist for the selected period
  const computedMetrics = useMemo(() => {
    if (!snapshot || dailyPrices.length === 0) return []
    const [year, month] = snapshot.date.split("-").map(Number)
    return computeMonthlyMetrics(dailyPrices, year, month)
  }, [snapshot, dailyPrices])

  // ── Edit helpers ────────────────────────────────────────────────────────────

  function startEdit(entry: PriceEntry) {
    setEditingSymbol(entry.symbol)
    setEditValues({ ...entry })
  }

  function commitEdit() {
    if (!editingSymbol) return
    setSnapshots((prev) =>
      prev.map((snap, i) =>
        i !== activeDateIdx ? snap : {
          ...snap,
          entries: snap.entries.map((e) =>
            e.symbol !== editingSymbol ? e : { ...e, ...editValues, custom: true } as PriceEntry
          ),
        }
      )
    )
    setEditingSymbol(null)
    setEditValues({})
  }

  function cancelEdit() {
    setEditingSymbol(null)
    setEditValues({})
  }

  function deleteEntry(symbol: string) {
    setSnapshots((prev) =>
      prev.map((snap, i) =>
        i !== activeDateIdx ? snap : {
          ...snap,
          entries: snap.entries.filter((e) => e.symbol !== symbol),
        }
      )
    )
  }

  // ── Add row ─────────────────────────────────────────────────────────────────

  function commitAdd() {
    if (!newEntry.symbol || newEntry.price === undefined) return
    const price = Number(newEntry.price)
    const onChainPrice = Number(newEntry.onChainPrice) || price
    const row: PriceEntry = {
      asset: newEntry.asset || newEntry.symbol!,
      symbol: newEntry.symbol!.toUpperCase(),
      price,
      source: newEntry.source || "Manual Entry",
      level: (newEntry.level as "1" | "2" | "3") || "3",
      onChainPrice,
      notes: newEntry.notes || "",
      custom: true,
    }
    setSnapshots((prev) =>
      prev.map((snap, i) =>
        i !== activeDateIdx ? snap : { ...snap, entries: [...snap.entries, row] }
      )
    )
    setAddingNew(false)
    setNewEntry({ level: "1", source: "Manual Entry", custom: true, notes: "" })
  }

  // ── Add period ───────────────────────────────────────────────────────────────

  function commitAddPeriod() {
    if (!newPeriod) return
    const date = lastDayOfMonth(newPeriod)
    if (snapshots.find((s) => s.date === date)) {
      setCsvError("A snapshot for this period already exists.")
      return
    }
    // Copy entries from the most recent snapshot as a starting point
    const base = snapshots[snapshots.length - 1]
    const newSnap: PriceSnapshot = {
      date,
      locked: false,
      entries: base ? base.entries.map((e) => ({ ...e, custom: false })) : [],
    }
    const updated = [...snapshots, newSnap].sort((a, b) => a.date.localeCompare(b.date))
    setSnapshots(updated)
    setActiveDateIdx(updated.findIndex((s) => s.date === date))
    setShowAddPeriod(false)
    setNewPeriod("")
    setCsvError(null)
  }

  // ── CSV import ───────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsv(text)
      if (!parsed.length) {
        setCsvError("No valid rows found. Ensure columns: symbol, price_usd, source, level.")
        return
      }
      setCsvPreview(parsed)
      setCsvError(null)
      setShowImport(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function confirmImport() {
    setSnapshots((prev) =>
      prev.map((snap, i) => {
        if (i !== activeDateIdx) return snap
        const existing = [...snap.entries]
        csvPreview.forEach((row) => {
          const idx = existing.findIndex((e) => e.symbol === row.symbol)
          const full: PriceEntry = {
            asset: row.asset || row.symbol || "",
            symbol: row.symbol!,
            price: row.price!,
            source: row.source || "Manual Entry",
            level: row.level || "2",
            onChainPrice: row.onChainPrice ?? row.price!,
            notes: row.notes || "",
            custom: true,
          }
          if (idx >= 0) existing[idx] = { ...existing[idx], ...full }
          else existing.push(full)
        })
        return { ...snap, entries: existing }
      })
    )
    setShowImport(false)
    setCsvPreview([])
  }

  // ── Daily Price CSV import ───────────────────────────────────────────────────

  function handleDailyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseDailyPriceCsv(text)
      if (!parsed.length) {
        setCsvError("No valid rows found. Ensure columns: date, symbol, price (or price_usd/close).")
        return
      }
      setDailyPreview(parsed)
      setCsvError(null)
      setShowDailyImport(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function confirmDailyImport() {
    // Merge with existing daily prices (update if same date+asset, add if new)
    setDailyPrices((prev) => {
      const merged = [...prev]
      dailyPreview.forEach((row) => {
        const idx = merged.findIndex(p => p.date === row.date && p.asset === row.asset)
        if (idx >= 0) {
          merged[idx] = row
        } else {
          merged.push(row)
        }
      })
      return merged.sort((a, b) => a.date.localeCompare(b.date) || a.asset.localeCompare(b.asset))
    })
    
    // Also update the month-end snapshot with period-end prices
    if (snapshot) {
      const [year, month] = snapshot.date.split("-").map(Number)
      const metrics = computeMonthlyMetrics([...dailyPrices, ...dailyPreview], year, month)
      
      setSnapshots((prev) =>
        prev.map((snap, i) => {
          if (i !== activeDateIdx) return snap
          const updated = snap.entries.map(entry => {
            const metric = metrics.find(m => m.asset === entry.symbol)
            if (metric && metric.periodEndPrice > 0) {
              return { ...entry, price: metric.periodEndPrice, custom: true, notes: entry.notes || "Updated from daily CSV" }
            }
            return entry
          })
          // Add any new assets from the CSV
          metrics.forEach(metric => {
            if (!updated.find(e => e.symbol === metric.asset) && metric.periodEndPrice > 0) {
              updated.push({
                asset: metric.asset,
                symbol: metric.asset,
                price: metric.periodEndPrice,
                onChainPrice: metric.periodEndPrice,
                source: "CSV Import",
                level: "2",
                notes: "Added from daily price CSV",
                custom: true,
              })
            }
          })
          return { ...snap, entries: updated }
        })
      )
    }
    
    setShowDailyImport(false)
    setDailyPreview([])
  }

  // Get daily prices for current month
  const monthlyDailyPrices = useMemo(() => {
    if (!snapshot) return []
    const [year, month] = snapshot.date.split("-").map(Number)
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = snapshot.date
    return dailyPrices.filter(p => p.date >= firstDay && p.date <= lastDay)
  }, [snapshot, dailyPrices])

  // ── Derived values ───────────────────────────────────────────────────────────

  const levelCounts = { "1": 0, "2": 0, "3": 0 }
  entries.forEach((e) => { levelCounts[e.level]++ })

  const totalFv = entries.reduce((s, e) => s + e.price, 0)
  const customCount = entries.filter((e) => e.custom).length

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <TooltipProvider>
        <div className="flex h-full">

          {/* Left sidebar — period list */}
          <div className="w-52 border-r border-border flex flex-col shrink-0">
            <div className="px-3 pt-3 pb-2 border-b border-border/50 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Measurement Dates
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => { setShowAddPeriod(true); setCsvError(null) }}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add period</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {snapshots.map((snap, i) => (
                <button
                  key={snap.date}
                  onClick={() => { setActiveDateIdx(i); setEditingSymbol(null) }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                    i === activeDateIdx
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-muted/40"
                  }`}
                >
                  <CalendarDays className="size-3.5 shrink-0 opacity-60" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{fmtDate(snap.date)}</div>
                    <div className="text-[10px] text-muted-foreground">{snap.entries.length} assets</div>
                  </div>
                  {snap.locked && (
                    <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      Locked
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Hierarchy summary */}
            <div className="border-t border-border/50 px-3 py-3 space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Level Breakdown
              </Label>
              {(["1","2","3"] as const).map((lvl) => {
                const cfg = LEVEL_CONFIGS[lvl]
                return (
                  <div key={lvl} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                    <span className="text-muted-foreground ml-auto">{levelCounts[lvl]}</span>
                  </div>
                )
              })}
            </div>

            {/* Daily prices summary */}
            {dailyPrices.length > 0 && (
              <div className="border-t border-border/50 px-3 py-3 space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Daily Prices
                </Label>
                <div className="text-xs text-muted-foreground">
                  {dailyPrices.length} data points
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {[...new Set(dailyPrices.map(p => p.asset))].length} assets
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto pb-8">
            {!snapshot ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <CalendarDays className="size-8 opacity-30" />
                <p className="text-sm">No measurement date selected</p>
              </div>
            ) : (
              <div className="space-y-5 px-6 py-5">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-semibold tracking-tight">Fair Value</h1>
                      {snapshot.locked && (
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-muted-foreground/40 text-muted-foreground">
                          Locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ASC 820 measurement — {fmtDate(snapshot.date)}
                      {customCount > 0 && (
                        <span className="ml-2 text-warning text-xs">({customCount} manually overridden)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <input
                      ref={dailyFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleDailyFileChange}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={snapshot.locked}
                          onClick={() => dailyFileRef.current?.click()}
                        >
                          <FileSpreadsheet className="size-3.5" />
                          Upload Monthly Prices
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                        <p className="font-medium">Upload Daily Pricing CSV</p>
                        <p className="text-muted-foreground mt-1">
                          Upload a CSV with daily prices for the entire month. Required columns: date, symbol, price.
                          System will auto-calculate period-end, average, and differential prices.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={snapshot.locked}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="size-3.5" />
                      Import Month-End
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => exportCsv(snapshot)}
                    >
                      <Download className="size-3.5" />
                      Export
                    </Button>
                    {!snapshot.locked && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() =>
                          setSnapshots((prev) =>
                            prev.map((s, i) => i === activeDateIdx ? { ...s, locked: true } : s)
                          )
                        }
                      >
                        <Check className="size-3.5" />
                        Lock Period
                      </Button>
                    )}
                  </div>
                </div>

                {snapshot.locked && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-4 py-2.5">
                    <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                    This period is locked. Prices are used in generated journal entries and cannot be changed without unlocking.
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 text-xs text-warning hover:text-warning"
                      onClick={() =>
                        setSnapshots((prev) =>
                          prev.map((s, i) => i === activeDateIdx ? { ...s, locked: false } : s)
                        )
                      }
                    >
                      Unlock
                    </Button>
                  </div>
                )}

                {/* Price table */}
                <Card className="bg-card border-border/60">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Asset Prices (ASC 820)</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entries.length} assets · Measurement date {fmtDate(snapshot.date)}
                      </p>
                    </div>
                    {!snapshot.locked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setAddingNew(true)}
                      >
                        <Plus className="size-3.5" />
                        Add Asset
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 border-b border-border/50 hover:bg-muted/10">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4 w-[120px]">Asset</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Quantity</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Source</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Price (USD)</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">On-chain</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">FV Adj.</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Level</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => {
                          const isEditing = editingSymbol === entry.symbol
                          const adj = entry.price - entry.onChainPrice
                          return (
                            <TableRow
                              key={entry.symbol}
                              className={`border-b border-border/30 transition-colors ${
                                isEditing ? "bg-primary/5" : "hover:bg-muted/20"
                              }`}
                            >
                              <TableCell className="pl-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-mono font-semibold text-sm">{entry.symbol}</span>
                                  <span className="text-[11px] text-muted-foreground">{entry.asset}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">—</TableCell>
                              <TableCell className="text-xs">
                                {isEditing ? (
                                  <Select
                                    value={editValues.source ?? entry.source}
                                    onValueChange={(v) => setEditValues((p) => ({ ...p, source: v }))}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PRICE_SOURCES.map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-muted-foreground">{entry.source}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    value={editValues.price ?? entry.price}
                                    onChange={(e) => setEditValues((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                                    className="h-7 text-xs w-28 text-right ml-auto"
                                  />
                                ) : (
                                  <span className={`font-mono font-semibold text-sm ${entry.custom ? "text-warning" : ""}`}>
                                    {formatUsd(entry.price, entry.price < 10 ? 4 : 2)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono text-muted-foreground py-3">
                                {formatUsd(entry.onChainPrice, entry.onChainPrice < 10 ? 4 : 2)}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <span className={`font-mono text-xs ${Math.abs(adj) < 0.001 ? "text-muted-foreground" : adj > 0 ? "text-success" : "text-destructive"}`}>
                                  {adj >= 0 ? "+" : ""}{formatUsd(adj, Math.abs(adj) < 1 ? 4 : 2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3">
                                {isEditing ? (
                                  <Select
                                    value={editValues.level ?? entry.level}
                                    onValueChange={(v) => setEditValues((p) => ({ ...p, level: v as "1"|"2"|"3" }))}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-20 mx-auto">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(["1","2","3"] as const).map((l) => (
                                        <SelectItem key={l} value={l} className="text-xs">Level {l}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] font-mono cursor-help ${LEVEL_CONFIGS[entry.level].badgeClass}`}
                                      >
                                        {LEVEL_CONFIGS[entry.level].label}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                      {LEVEL_CONFIGS[entry.level].description}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell className="py-3 pr-4">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <Button variant="ghost" size="icon" className="size-7 text-success hover:text-success" onClick={commitEdit}>
                                      <Check className="size-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-muted-foreground" onClick={cancelEdit}>
                                      <X className="size-3.5" />
                                    </Button>
                                  </div>
                                ) : !snapshot.locked ? (
                                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(entry)}>
                                      <Pencil className="size-3.5" />
                                    </Button>
                                    {entry.custom && (
                                      <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteEntry(entry.symbol)}>
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )
                        })}

                        {/* Add new row inline */}
                        {addingNew && (
                          <TableRow className="bg-primary/5 border-b border-border/30">
                            <TableCell className="pl-4 py-3">
                              <div className="space-y-1">
                                <Input
                                  placeholder="Symbol"
                                  value={newEntry.symbol ?? ""}
                                  onChange={(e) => setNewEntry((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                                  className="h-7 text-xs w-20 font-mono"
                                />
                                <Input
                                  placeholder="Name"
                                  value={newEntry.asset ?? ""}
                                  onChange={(e) => setNewEntry((p) => ({ ...p, asset: e.target.value }))}
                                  className="h-7 text-xs w-28"
                                />
                              </div>
                            </TableCell>
                            <TableCell />
                            <TableCell>
                              <Select
                                value={newEntry.source ?? "Manual Entry"}
                                onValueChange={(v) => setNewEntry((p) => ({ ...p, source: v }))}
                              >
                                <SelectTrigger className="h-7 text-xs w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRICE_SOURCES.map((s) => (
                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.0001"
                                placeholder="0.00"
                                value={newEntry.price ?? ""}
                                onChange={(e) => setNewEntry((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                                className="h-7 text-xs w-28 text-right ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.0001"
                                placeholder="On-chain"
                                value={newEntry.onChainPrice ?? ""}
                                onChange={(e) => setNewEntry((p) => ({ ...p, onChainPrice: parseFloat(e.target.value) }))}
                                className="h-7 text-xs w-28 text-right ml-auto"
                              />
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-center">
                              <Select
                                value={newEntry.level ?? "1"}
                                onValueChange={(v) => setNewEntry((p) => ({ ...p, level: v as "1"|"2"|"3" }))}
                              >
                                <SelectTrigger className="h-7 text-xs w-20 mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(["1","2","3"] as const).map((l) => (
                                    <SelectItem key={l} value={l} className="text-xs">Level {l}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="pr-4">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="size-7 text-success hover:text-success" onClick={commitAdd}>
                                  <Check className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7" onClick={() => setAddingNew(false)}>
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* FV Summary footer */}
                <div className="grid grid-cols-3 gap-4">
                  {(["1","2","3"] as const).map((lvl) => {
                    const cfg = LEVEL_CONFIGS[lvl]
                    const lvlEntries = entries.filter((e) => e.level === lvl)
                    return (
                      <Card key={lvl} className="bg-card border-border/60">
                        <CardContent className="px-4 py-3 flex items-start justify-between gap-3">
                          <div>
                            <Badge variant="outline" className={`text-[10px] font-mono mb-1 ${cfg.badgeClass}`}>
                              {cfg.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{cfg.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm font-semibold">{lvlEntries.length}</div>
                            <div className="text-[10px] text-muted-foreground">assets</div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Computed Metrics Section */}
                {(computedMetrics.length > 0 || monthlyDailyPrices.length > 0) && (
                  <Card className="bg-card border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Calculator className="size-4 text-primary" />
                            Computed Price Metrics
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Period-end, average, and differential prices calculated from daily data.
                            {monthlyDailyPrices.length > 0 && (
                              <span className="ml-1">
                                ({monthlyDailyPrices.length} daily data points loaded)
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-xs">
                            <p className="font-semibold mb-1">Calculation Rules:</p>
                            <ul className="space-y-1 list-disc pl-4">
                              <li><strong>Period-End Price:</strong> Last day of month (for balance measurement)</li>
                              <li><strong>Average Price:</strong> Simple average over all days (for activity measurement)</li>
                              <li><strong>Differential:</strong> End price minus start price (for gain/loss)</li>
                              <li><strong>Fallback Rule:</strong> If a required date is missing, uses last available prior date</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {computedMetrics.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/10 border-b border-border/50 hover:bg-muted/10">
                              <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4">Asset</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Period Start</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Period End</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Average</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help border-b border-dotted border-muted-foreground">Differential</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    End - Start price (for realized/unrealized gain calculations)
                                  </TooltipContent>
                                </Tooltip>
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Change %</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Data Pts</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help border-b border-dotted border-muted-foreground">Fallback</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-xs">
                                    Days using &quot;last available prior date&quot; rule due to missing price data
                                  </TooltipContent>
                                </Tooltip>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {computedMetrics.map((metric) => (
                              <TableRow key={metric.asset} className="border-b border-border/30 hover:bg-muted/20">
                                <TableCell className="pl-4 py-3">
                                  <span className="font-mono font-semibold text-sm">{metric.asset}</span>
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                  {formatUsd(metric.periodStartPrice, metric.periodStartPrice < 10 ? 4 : 2)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm">
                                  {formatUsd(metric.periodEndPrice, metric.periodEndPrice < 10 ? 4 : 2)}
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono">
                                  {formatUsd(metric.averagePrice, metric.averagePrice < 10 ? 4 : 2)}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  <span className={`font-mono text-xs ${
                                    Math.abs(metric.priceChange) < 0.001 
                                      ? "text-muted-foreground" 
                                      : metric.priceChange > 0 
                                        ? "text-success" 
                                        : "text-destructive"
                                  }`}>
                                    {metric.priceChange >= 0 ? "+" : ""}
                                    {formatUsd(metric.priceChange, Math.abs(metric.priceChange) < 1 ? 4 : 2)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    {metric.priceChangePercent > 0 ? (
                                      <TrendingUp className="size-3 text-success" />
                                    ) : metric.priceChangePercent < 0 ? (
                                      <TrendingDown className="size-3 text-destructive" />
                                    ) : null}
                                    <span className={`font-mono text-xs ${
                                      Math.abs(metric.priceChangePercent) < 0.01
                                        ? "text-muted-foreground"
                                        : metric.priceChangePercent > 0
                                          ? "text-success"
                                          : "text-destructive"
                                    }`}>
                                      {metric.priceChangePercent >= 0 ? "+" : ""}
                                      {metric.priceChangePercent.toFixed(2)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {metric.dataPoints}
                                </TableCell>
                                <TableCell className="text-center">
                                  {metric.missingDates > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] border-warning/40 text-warning bg-warning/5 cursor-help">
                                          {metric.missingDates}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        {metric.missingDates} days used fallback pricing
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <FileSpreadsheet className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Upload a monthly pricing CSV to compute metrics
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expected format: date, symbol, price (or price_usd/close)
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Daily Prices Detail (collapsible) */}
                {monthlyDailyPrices.length > 0 && (
                  <Card className="bg-card border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        Daily Price Schedule
                        <Badge variant="secondary" className="text-[10px] ml-2">
                          {monthlyDailyPrices.length} entries
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Raw daily pricing data for {fmtDate(snapshot.date.slice(0, 7) + "-01")} — {fmtDate(snapshot.date)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/10 border-b border-border/50 hover:bg-muted/10 sticky top-0">
                              <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4">Date</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider">Asset</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Price</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider">Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthlyDailyPrices.map((dp, i) => (
                              <TableRow key={`${dp.date}-${dp.asset}-${i}`} className="border-b border-border/30 hover:bg-muted/20">
                                <TableCell className="pl-4 py-2 text-xs">{fmtDate(dp.date)}</TableCell>
                                <TableCell className="py-2">
                                  <span className="font-mono font-semibold text-xs">{dp.asset}</span>
                                </TableCell>
                                <TableCell className="text-right py-2 font-mono text-xs">
                                  {formatUsd(dp.price, dp.price < 10 ? 4 : 2)}
                                </TableCell>
                                <TableCell className="py-2 text-xs text-muted-foreground">{dp.source}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>
            )}
          </div>
        </div>

        {/* Add Period Dialog */}
        <Dialog open={showAddPeriod} onOpenChange={setShowAddPeriod}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Measurement Period</DialogTitle>
              <DialogDescription>
                Select a month-end date. Prices will be pre-populated from the most recent period and can be edited.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Period (YYYY-MM)</Label>
                <Input
                  type="month"
                  value={newPeriod}
                  onChange={(e) => { setNewPeriod(e.target.value); setCsvError(null) }}
                  className="h-9 text-sm"
                />
              </div>
              {newPeriod && (
                <p className="text-xs text-muted-foreground">
                  Measurement date: <strong>{fmtDate(lastDayOfMonth(newPeriod))}</strong>
                </p>
              )}
              {csvError && <p className="text-xs text-destructive">{csvError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setShowAddPeriod(false); setCsvError(null) }}>
                Cancel
              </Button>
              <Button size="sm" disabled={!newPeriod} onClick={commitAddPeriod}>
                Add Period
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Preview Dialog */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Preview</DialogTitle>
              <DialogDescription>
                {csvPreview.length} rows parsed. Existing assets will be overwritten; new ones added.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border/50 text-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-xs font-semibold px-3 py-2">Symbol</TableHead>
                    <TableHead className="text-xs font-semibold px-3 py-2">Asset</TableHead>
                    <TableHead className="text-xs font-semibold text-right px-3 py-2">Price</TableHead>
                    <TableHead className="text-xs font-semibold px-3 py-2">Source</TableHead>
                    <TableHead className="text-xs font-semibold text-center px-3 py-2">Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, i) => (
                    <TableRow key={i} className="border-b border-border/30">
                      <TableCell className="font-mono font-semibold px-3 py-2">{row.symbol}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{row.asset || "—"}</TableCell>
                      <TableCell className="text-right font-mono px-3 py-2">{formatUsd(row.price ?? 0, 4)}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{row.source}</TableCell>
                      <TableCell className="text-center px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] font-mono ${LEVEL_CONFIGS[row.level ?? "2"].badgeClass}`}>
                          Level {row.level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvError && <p className="text-xs text-destructive mt-1">{csvError}</p>}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setShowImport(false); setCsvPreview([]) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmImport}>
                Import {csvPreview.length} rows
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Daily Price CSV Import Preview Dialog */}
        <Dialog open={showDailyImport} onOpenChange={setShowDailyImport}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" />
                Import Monthly Pricing Data
              </DialogTitle>
              <DialogDescription>
                {dailyPreview.length} daily price entries parsed. This will update period-end prices and enable computed metrics (average, differential).
              </DialogDescription>
            </DialogHeader>
            
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Total Entries</div>
                <div className="font-mono font-semibold">{dailyPreview.length}</div>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Unique Assets</div>
                <div className="font-mono font-semibold">
                  {[...new Set(dailyPreview.map(p => p.asset))].length}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Date Range</div>
                <div className="font-mono text-xs font-semibold">
                  {dailyPreview.length > 0 
                    ? `${dailyPreview[0].date} — ${dailyPreview[dailyPreview.length - 1].date}`
                    : "—"}
                </div>
              </div>
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">What this import does:</p>
                <ul className="mt-1 space-y-0.5 list-disc pl-4">
                  <li>Stores daily prices for computing metrics (average, differential)</li>
                  <li>Auto-updates month-end prices using the last day of data</li>
                  <li>Applies &quot;last available prior date&quot; fallback for any missing dates</li>
                </ul>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-border/50 text-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20 sticky top-0">
                    <TableHead className="text-xs font-semibold px-3 py-2">Date</TableHead>
                    <TableHead className="text-xs font-semibold px-3 py-2">Asset</TableHead>
                    <TableHead className="text-xs font-semibold text-right px-3 py-2">Price (USD)</TableHead>
                    <TableHead className="text-xs font-semibold px-3 py-2">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyPreview.slice(0, 100).map((row, i) => (
                    <TableRow key={i} className="border-b border-border/30">
                      <TableCell className="px-3 py-2 text-muted-foreground">{row.date}</TableCell>
                      <TableCell className="font-mono font-semibold px-3 py-2">{row.asset}</TableCell>
                      <TableCell className="text-right font-mono px-3 py-2">
                        {formatUsd(row.price, row.price < 10 ? 4 : 2)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{row.source}</TableCell>
                    </TableRow>
                  ))}
                  {dailyPreview.length > 100 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-2">
                        ...and {dailyPreview.length - 100} more entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {csvError && <p className="text-xs text-destructive mt-1">{csvError}</p>}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setShowDailyImport(false); setDailyPreview([]) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmDailyImport}>
                Import {dailyPreview.length} price entries
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </AppShell>
  )
}
