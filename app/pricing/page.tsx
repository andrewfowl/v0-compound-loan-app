"use client"

import { useState } from "react"
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
import { Separator } from "@/components/ui/separator"
import {
  HelpCircle,
  RefreshCw,
  Plus,
  Pencil,
  Check,
  X,
  ExternalLink,
  Info,
} from "lucide-react"

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

interface PriceEntry {
  asset: string
  symbol: string
  price: number
  source: string
  level: "1" | "2" | "3"
  lastUpdated: string
  onChainPrice: number
  notes: string
  custom: boolean
}

const DEFAULT_PRICES: PriceEntry[] = [
  {
    asset: "Wrapped Ether",      symbol: "WETH",  price: 3200.00,   source: "Coinbase Pro",    level: "1", lastUpdated: "2025-03-31", onChainPrice: 3198.42,  notes: "Closing price on principal market as of measurement date",             custom: false,
  },
  {
    asset: "Ether",              symbol: "ETH",   price: 3200.00,   source: "Coinbase Pro",    level: "1", lastUpdated: "2025-03-31", onChainPrice: 3198.42,  notes: "Closing price on principal market as of measurement date",             custom: false,
  },
  {
    asset: "Wrapped Bitcoin",    symbol: "WBTC",  price: 65000.00,  source: "Coinbase Pro",    level: "1", lastUpdated: "2025-03-31", onChainPrice: 64987.20, notes: "Closing BTC price proxied for WBTC — 1:1 custodial peg",              custom: false,
  },
  {
    asset: "USD Coin",           symbol: "USDC",  price: 1.0000,    source: "Chainlink Oracle", level: "1", lastUpdated: "2025-03-31", onChainPrice: 1.0000,   notes: "Regulated stablecoin pegged 1:1 to USD. No FV adjustment required.",  custom: false,
  },
  {
    asset: "Tether",             symbol: "USDT",  price: 1.0000,    source: "Chainlink Oracle", level: "2", lastUpdated: "2025-03-31", onChainPrice: 0.9997,   notes: "Stablecoin with minor basis risk — classified Level 2",               custom: false,
  },
  {
    asset: "Dai",                symbol: "DAI",   price: 1.0000,    source: "Chainlink Oracle", level: "1", lastUpdated: "2025-03-31", onChainPrice: 1.0000,   notes: "Decentralized overcollateralized stablecoin — Level 1",               custom: false,
  },
  {
    asset: "Compound",           symbol: "COMP",  price: 60.00,     source: "CoinGecko",       level: "2", lastUpdated: "2025-03-31", onChainPrice: 59.44,    notes: "Governance token — lower liquidity, Level 2 classification",          custom: false,
  },
]

function formatUsd(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function fvAdj(entry: PriceEntry) {
  return entry.price - entry.onChainPrice
}

export default function PricingDataPage() {
  const [entries, setEntries] = useState<PriceEntry[]>(DEFAULT_PRICES)
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PriceEntry>>({})
  const [measurementDate, setMeasurementDate] = useState("2025-03-31")
  const [addingNew, setAddingNew] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<PriceEntry>>({
    level: "1",
    source: "Manual Entry",
    custom: true,
    notes: "",
  })

  function startEdit(entry: PriceEntry) {
    setEditingSymbol(entry.symbol)
    setEditValues({ ...entry })
  }

  function commitEdit() {
    if (!editingSymbol) return
    setEntries((prev) =>
      prev.map((e) =>
        e.symbol !== editingSymbol
          ? e
          : { ...e, ...editValues, custom: true } as PriceEntry
      )
    )
    setEditingSymbol(null)
    setEditValues({})
  }

  function cancelEdit() {
    setEditingSymbol(null)
    setEditValues({})
  }

  function resetEntry(symbol: string) {
    const orig = DEFAULT_PRICES.find((d) => d.symbol === symbol)
    if (orig) setEntries((prev) => prev.map((e) => (e.symbol === symbol ? { ...orig } : e)))
  }

  function commitAdd() {
    if (!newEntry.symbol || !newEntry.price) return
    const price = Number(newEntry.price)
    const onChainPrice = Number(newEntry.onChainPrice) || price
    setEntries((prev) => [
      ...prev,
      {
        asset: newEntry.asset || newEntry.symbol!,
        symbol: newEntry.symbol!.toUpperCase(),
        price,
        source: newEntry.source || "Manual Entry",
        level: (newEntry.level as "1" | "2" | "3") || "3",
        lastUpdated: measurementDate,
        onChainPrice,
        notes: newEntry.notes || "",
        custom: true,
      },
    ])
    setAddingNew(false)
    setNewEntry({ level: "1", source: "Manual Entry", custom: true, notes: "" })
  }

  const levelCounts = { "1": 0, "2": 0, "3": 0 }
  entries.forEach((e) => { levelCounts[e.level]++ })
  const totalFvAdj = entries.reduce((sum, e) => sum + fvAdj(e), 0)

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pricing Data</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              ASC 820 Fair Value Measurement — principal market prices and hierarchy classification
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Measurement Date</Label>
            <Input
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <RefreshCw className="size-3" />
              Sync Onchain
            </Button>
          </div>
        </div>

        {/* Hierarchy Level Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {(["1", "2", "3"] as const).map((lvl) => {
            const cfg = LEVEL_CONFIGS[lvl]
            return (
              <div key={lvl} className="rounded-lg border bg-card px-4 py-3 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs font-mono shrink-0 ${cfg.badgeClass}`}>
                      {cfg.label}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground/50 cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{cfg.description}</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{cfg.description}</p>
                </div>
                <span className="text-2xl font-bold font-mono text-foreground shrink-0">{levelCounts[lvl]}</span>
              </div>
            )
          })}
        </div>

        {/* Methodology Banner */}
        <div className="rounded-lg border border-border/50 bg-muted/25 px-4 py-3 flex items-start gap-3">
          <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            <p>
              <strong className="text-foreground">Fair Value Adjustment:</strong>{" "}
              FV Adj per unit = Principal Market Price − Implied On-Chain Price,
              where implied on-chain price is derived as{" "}
              <span className="font-mono text-foreground/70">amountUsd ÷ amount</span> per Compound event.
              Total FV adjustment = period-end balance × FV adj per unit.
            </p>
            <p>
              Override any price below to reflect your entity&apos;s principal market. Level 1 inputs take precedence.
              Level 3 inputs require additional footnote disclosure under ASC 820-10-50.
            </p>
          </div>
        </div>

        {/* Price Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/15">
            <div>
              <h2 className="text-sm font-semibold">Principal Market Prices</h2>
              <p className="text-xs text-muted-foreground mt-0.5">As of {measurementDate} — click the pencil to override any row</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total FV Adj / Unit</p>
                <p className={`text-sm font-mono font-semibold ${totalFvAdj >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalFvAdj >= 0 ? "+" : ""}{formatUsd(totalFvAdj, 4)}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="size-3" />
                Add Asset
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Asset</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider w-24">Level</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Price Source</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Principal Mkt Price</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">On-Chain Price</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help inline-flex items-center gap-1">
                        FV Adj / Unit
                        <HelpCircle className="size-3 text-muted-foreground/50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Principal Market Price minus Implied On-Chain Price per unit.
                      Multiply by period-end balance to get total FV adjustment for the JE.
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Notes</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isEditing = editingSymbol === entry.symbol
                const cfg = LEVEL_CONFIGS[entry.level]
                const adj = fvAdj(entry)

                return (
                  <TableRow key={entry.symbol} className={isEditing ? "bg-accent/20" : ""}>

                    {/* Asset */}
                    <TableCell>
                      <p className="font-mono text-sm font-semibold">{entry.symbol}</p>
                      <p className="text-xs text-muted-foreground">{entry.asset}</p>
                    </TableCell>

                    {/* Level */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={String(editValues.level)}
                          onValueChange={(v) => setEditValues((p) => ({ ...p, level: v as "1" | "2" | "3" }))}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Level 1</SelectItem>
                            <SelectItem value="2">Level 2</SelectItem>
                            <SelectItem value="3">Level 3</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={`text-xs font-mono ${cfg.badgeClass}`}>
                          {cfg.label}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editValues.source}
                          onValueChange={(v) => setEditValues((p) => ({ ...p, source: v }))}
                        >
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_SOURCES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{entry.source}</span>
                          {!entry.custom && <ExternalLink className="size-3 text-muted-foreground/40" />}
                          {entry.custom && <Badge variant="secondary" className="text-xs py-0 h-4">custom</Badge>}
                        </div>
                      )}
                    </TableCell>

                    {/* Principal Market Price */}
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="relative w-32 ml-auto">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number" min="0" step="any"
                            className="pl-5 h-7 text-xs text-right font-mono"
                            value={editValues.price ?? ""}
                            onChange={(e) => setEditValues((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-sm font-semibold">
                          {formatUsd(entry.price, entry.price < 10 ? 4 : 2)}
                        </span>
                      )}
                    </TableCell>

                    {/* On-Chain Price */}
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="relative w-32 ml-auto">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number" min="0" step="any"
                            className="pl-5 h-7 text-xs text-right font-mono"
                            value={editValues.onChainPrice ?? ""}
                            onChange={(e) => setEditValues((p) => ({ ...p, onChainPrice: parseFloat(e.target.value) }))}
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatUsd(entry.onChainPrice, entry.onChainPrice < 10 ? 4 : 2)}
                        </span>
                      )}
                    </TableCell>

                    {/* FV Adjustment */}
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${adj > 0 ? "text-success" : adj < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {adj >= 0 ? "+" : ""}{formatUsd(adj, 4)}
                      </span>
                    </TableCell>

                    {/* Notes */}
                    <TableCell className="max-w-52">
                      {isEditing ? (
                        <Input
                          className="h-7 text-xs"
                          placeholder="Measurement basis..."
                          value={editValues.notes ?? ""}
                          onChange={(e) => setEditValues((p) => ({ ...p, notes: e.target.value }))}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate max-w-44 cursor-default">
                              {entry.notes || "—"}
                            </p>
                          </TooltipTrigger>
                          {entry.notes && (
                            <TooltipContent className="max-w-xs text-xs">{entry.notes}</TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="size-7" onClick={commitEdit}>
                              <Check className="size-3.5 text-success" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={cancelEdit}>
                              <X className="size-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(entry)}>
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </Button>
                            {entry.custom && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7" onClick={() => resetEntry(entry.symbol)}>
                                    <RefreshCw className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Reset to reference price</TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Add new asset row */}
              {addingNew && (
                <TableRow className="bg-accent/15">
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        className="h-7 text-xs font-mono"
                        placeholder="SYMBOL"
                        value={newEntry.symbol ?? ""}
                        onChange={(e) => setNewEntry((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                      />
                      <Input
                        className="h-7 text-xs"
                        placeholder="Full name"
                        value={newEntry.asset ?? ""}
                        onChange={(e) => setNewEntry((p) => ({ ...p, asset: e.target.value }))}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newEntry.level}
                      onValueChange={(v) => setNewEntry((p) => ({ ...p, level: v as "1" | "2" | "3" }))}
                    >
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1</SelectItem>
                        <SelectItem value="2">Level 2</SelectItem>
                        <SelectItem value="3">Level 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newEntry.source}
                      onValueChange={(v) => setNewEntry((p) => ({ ...p, source: v }))}
                    >
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="relative w-32 ml-auto">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <Input
                        type="number" min="0" step="any"
                        className="pl-5 h-7 text-xs text-right font-mono"
                        placeholder="0.00"
                        value={newEntry.price ?? ""}
                        onChange={(e) => setNewEntry((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="relative w-32 ml-auto">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <Input
                        type="number" min="0" step="any"
                        className="pl-5 h-7 text-xs text-right font-mono"
                        placeholder="0.00"
                        value={newEntry.onChainPrice ?? ""}
                        onChange={(e) => setNewEntry((p) => ({ ...p, onChainPrice: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Measurement basis..."
                      value={newEntry.notes ?? ""}
                      onChange={(e) => setNewEntry((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="size-7" onClick={commitAdd}>
                        <Check className="size-3.5 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setAddingNew(false)}>
                        <X className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ASC 820 Disclosure Note */}
        <div className="rounded-lg border border-border/40 bg-muted/15 px-4 py-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">ASC 820 Disclosure Note (draft)</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The entity measures digital asset positions at fair value on a recurring basis in accordance with ASC 820,{" "}
            <em>Fair Value Measurement</em>. Fair value represents the exit price in the principal market for the asset
            as of the measurement date, determined by reference to the hierarchy below. Level 1 inputs consist of quoted
            prices in active markets (Coinbase Pro, Kraken) for identical assets. Level 2 inputs include observable
            market data that is not directly quoted, such as exchange index prices and dealer quotes corroborated by
            multiple sources. Level 3 inputs reflect entity-specific assumptions where no observable market data is
            available; these positions require enhanced disclosure in the notes to financial statements per
            ASC 820-10-50-2.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Implied on-chain prices are derived from Compound Protocol event data as{" "}
            <span className="font-mono text-foreground/60">amountUsd ÷ amount</span> per transaction.
            Fair value adjustments are computed as the difference between the principal market closing price and the
            implied on-chain price per unit, applied to the period-end balance as of {measurementDate}.
          </p>
        </div>

      </div>
    </TooltipProvider>
  )
}
