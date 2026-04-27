"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Calculator, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Equal, ArrowRight, ExternalLink, Info } from "lucide-react"
import type { JournalEntry, MonthlyReconGroup } from "@/lib/compound/types"
import type { PriceSchedule } from "@/lib/compound/journal-customization"
import { formatUsd } from "@/lib/compound/format"

interface CalculationVisualizerProps {
  monthlyGroups: MonthlyReconGroup[]
  priceSchedule: PriceSchedule
  onPriceChange?: (asset: string, price: number) => void
}

interface CalculationBreakdown {
  label: string
  formula: string
  inputs: { name: string; value: number | string; source?: string }[]
  result: number
  highlight?: boolean
}

function getCalculationBreakdown(entry: JournalEntry, priceSchedule: PriceSchedule): CalculationBreakdown[] {
  const breakdowns: CalculationBreakdown[] = []

  if (entry.description.includes("FV Adj")) {
    // Parse the FV adjustment description
    const match = entry.description.match(/user \$([0-9,.]+) vs implied \$([0-9.]+)/)
    const userPrice = match ? parseFloat(match[1].replace(",", "")) : 0
    const impliedPrice = match ? parseFloat(match[2]) : 0
    
    // Estimate tokens from the USD amount and price difference
    const priceDiff = userPrice - impliedPrice
    const tokens = priceDiff !== 0 ? entry.usdAmount / Math.abs(priceDiff) : 0

    breakdowns.push({
      label: "Implied On-Chain Price",
      formula: "amountUsd / amount",
      inputs: [
        { name: "Derived from transactions", value: `$${impliedPrice.toFixed(2)}`, source: "on-chain" },
      ],
      result: impliedPrice,
    })

    breakdowns.push({
      label: "Your Principal Market Price",
      formula: "User input",
      inputs: [
        { name: "From price schedule", value: `$${userPrice.toLocaleString()}`, source: "user" },
      ],
      result: userPrice,
    })

    breakdowns.push({
      label: "Price Difference",
      formula: "userPrice - impliedPrice",
      inputs: [
        { name: "userPrice", value: userPrice },
        { name: "impliedPrice", value: impliedPrice },
      ],
      result: userPrice - impliedPrice,
      highlight: true,
    })

    breakdowns.push({
      label: "Fair Value Adjustment",
      formula: "endBalance × (userPrice - impliedPrice)",
      inputs: [
        { name: "endBalance (tokens)", value: tokens.toFixed(4) },
        { name: "priceDiff", value: priceDiff.toFixed(2) },
      ],
      result: entry.usdAmount,
      highlight: true,
    })
  } else if (entry.description.includes("Borrow") || entry.description.includes("Repay")) {
    breakdowns.push({
      label: "Transaction Amount",
      formula: "On-chain event value",
      inputs: [
        { name: "USD value at tx time", value: formatUsd(entry.usdAmount), source: "on-chain" },
      ],
      result: entry.usdAmount,
    })
  } else if (entry.description.includes("Interest")) {
    breakdowns.push({
      label: "Interest Calculation",
      formula: "Accrued based on protocol rate",
      inputs: [
        { name: "Interest accrued", value: formatUsd(entry.usdAmount), source: "protocol" },
      ],
      result: entry.usdAmount,
    })
  } else if (entry.description.includes("Deposit") || entry.description.includes("Withdraw")) {
    breakdowns.push({
      label: "Collateral Movement",
      formula: "Asset transfer at market value",
      inputs: [
        { name: "USD value", value: formatUsd(entry.usdAmount), source: "on-chain" },
      ],
      result: entry.usdAmount,
    })
  }

  return breakdowns
}

function CalculationRow({ calc }: { calc: CalculationBreakdown }) {
  return (
    <div className={`p-3 rounded-lg ${calc.highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{calc.label}</span>
        <span className="font-mono text-sm font-semibold">
          {typeof calc.result === "number" ? formatUsd(calc.result) : calc.result}
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-mono mb-2">
        {calc.formula}
      </div>
      <div className="flex flex-wrap gap-2">
        {calc.inputs.map((input, i) => (
          <div key={i} className="inline-flex items-center gap-1.5 px-2 py-1 bg-background rounded text-xs">
            <span className="text-muted-foreground">{input.name}:</span>
            <span className="font-mono font-medium">{input.value}</span>
            {input.source && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {input.source}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EntryCalculationCard({ 
  entry, 
  priceSchedule,
  index 
}: { 
  entry: JournalEntry
  priceSchedule: PriceSchedule
  index: number 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const breakdowns = getCalculationBreakdown(entry, priceSchedule)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg ${entry.computed ? "border-dashed bg-muted/20" : ""}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center justify-center size-6 rounded bg-muted text-xs font-medium">
              {index + 1}
            </div>
            {isOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{entry.description}</span>
                {entry.computed && (
                  <Badge variant="secondary" className="text-xs shrink-0">computed</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{entry.date}</span>
                <span className="text-blue-600">DR: {entry.debitAccount}</span>
                <span className="text-amber-600">CR: {entry.creditAccount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-semibold">{formatUsd(entry.usdAmount)}</span>
              {entry.usdAmount > 0 && (
                <TrendingUp className="size-4 text-green-500" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 border-t">
            <div className="pt-3 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="size-3" />
              Calculation Breakdown
            </div>
            {breakdowns.length > 0 ? (
              <div className="space-y-2">
                {breakdowns.map((calc, i) => (
                  <CalculationRow key={i} calc={calc} />
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Direct on-chain value. No additional calculations applied.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function CalculationVisualizer({
  monthlyGroups,
  priceSchedule,
  onPriceChange,
}: CalculationVisualizerProps) {
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(
    monthlyGroups[0]?.period || null
  )

  // Calculate totals
  const totals = monthlyGroups.reduce(
    (acc, group) => ({
      borrowed: acc.borrowed + group.totalBorrowed,
      repaid: acc.repaid + group.totalRepaid,
      interest: acc.interest + group.totalInterest,
      liquidated: acc.liquidated + group.totalLiquidated,
      fvAdjustment: acc.fvAdjustment + group.embeddedDerivative,
    }),
    { borrowed: 0, repaid: 0, interest: 0, liquidated: 0, fvAdjustment: 0 }
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="size-4" />
              Calculation Transparency
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              See exactly how each journal entry amount is calculated from on-chain data and your price inputs.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-xs text-muted-foreground">Total Borrowed</div>
            <div className="text-lg font-semibold font-mono text-red-600">
              {formatUsd(totals.borrowed)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-xs text-muted-foreground">Total Repaid</div>
            <div className="text-lg font-semibold font-mono text-green-600">
              {formatUsd(totals.repaid)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="text-xs text-muted-foreground">Total Interest</div>
            <div className="text-lg font-semibold font-mono text-orange-600">
              {formatUsd(totals.interest)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="text-xs text-muted-foreground">Liquidated</div>
            <div className="text-lg font-semibold font-mono text-purple-600">
              {formatUsd(totals.liquidated)}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${totals.fvAdjustment >= 0 ? "bg-blue-500/10 border border-blue-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              FV Adjustment
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Fair Value adjustments based on the difference between your principal market prices
                    and implied on-chain prices.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={`text-lg font-semibold font-mono ${totals.fvAdjustment >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {totals.fvAdjustment >= 0 ? "+" : ""}{formatUsd(totals.fvAdjustment)}
            </div>
          </div>
        </div>

        {/* Period Breakdown */}
        <div className="space-y-3">
          {monthlyGroups.map((group) => (
            <Collapsible
              key={group.period}
              open={expandedPeriod === group.period}
              onOpenChange={(open) => setExpandedPeriod(open ? group.period : null)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {expandedPeriod === group.period ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                      <span className="font-semibold">{group.periodLabel}</span>
                      <Badge variant="outline" className="text-xs">
                        {group.entries.length} entries
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Closing Debt: <span className="font-mono font-medium text-foreground">{formatUsd(group.closingDebt)}</span>
                      </span>
                      {group.embeddedDerivative !== 0 && (
                        <span className={group.embeddedDerivative > 0 ? "text-green-600" : "text-red-600"}>
                          FV: {group.embeddedDerivative > 0 ? "+" : ""}{formatUsd(group.embeddedDerivative)}
                        </span>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t p-4 space-y-3">
                    {/* Period Summary */}
                    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Opening:</span>
                        <span className="font-mono font-medium">{formatUsd(group.openingDebt)}</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        <span className="text-red-600">+{formatUsd(group.totalBorrowed)}</span>
                        <span className="text-muted-foreground">borrowed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-600">-{formatUsd(group.totalRepaid)}</span>
                        <span className="text-muted-foreground">repaid</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-600">+{formatUsd(group.totalInterest)}</span>
                        <span className="text-muted-foreground">interest</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Closing:</span>
                        <span className="font-mono font-semibold">{formatUsd(group.closingDebt)}</span>
                      </div>
                    </div>

                    {/* Individual Entries */}
                    <div className="space-y-2">
                      {group.entries.map((entry, idx) => (
                        <EntryCalculationCard
                          key={idx}
                          entry={entry}
                          priceSchedule={priceSchedule}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
