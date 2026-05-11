"use client"

import { useState, useMemo, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { 
  FileText, 
  Settings2, 
  Calculator, 
  Calendar, 
  BookOpen, 
  FileEdit, 
  Download,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Check,
} from "lucide-react"
import type { BorrowerRecon, JournalEntry, MonthlyReconGroup } from "@/lib/compound/types"
import type { 
  JournalCustomization, 
  PriceSchedule, 
  CustomAccount, 
  ManualJournalEntry 
} from "@/lib/compound/journal-customization"
import { 
  createEmptyCustomization, 
  DEFAULT_ACCOUNTS, 
  findAccount,
  getPriceForDate,
} from "@/lib/compound/journal-customization"
import { formatUsd } from "@/lib/compound/format"
import { DailyPriceSchedule } from "./daily-price-schedule"
import { CustomAccountsManager } from "./custom-accounts-manager"
import { ManualEntriesManager } from "./manual-entries-manager"
import { CalculationVisualizer } from "./calculation-visualizer"

interface CustomizableJournalTabProps {
  borrowerRecon: BorrowerRecon
  assets: string[]
  /** Report date range */
  startDate?: string
  endDate?: string
}

type ViewMode = "journal" | "customize" | "calculate"

export function CustomizableJournalTab({
  borrowerRecon,
  assets,
  startDate,
  endDate,
}: CustomizableJournalTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("journal")
  const [customization, setCustomization] = useState<JournalCustomization>(() => createEmptyCustomization())
  const [shareCopied, setShareCopied] = useState(false)

  /** Copy current URL to clipboard as shareable link */
  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }, [])

  /** Export all journal entries to a CSV file */
  const handleExport = useCallback((groups: typeof borrowerRecon.monthlyGroups, manualEntries: typeof customization.manualEntries) => {
    const rows: string[] = [
      ["Period", "Date", "Description", "Debit Account", "Credit Account", "DR (USD)", "CR (USD)", "Asset", "Source", "Tx Hash"].join(","),
    ]

    for (const group of groups) {
      // Opening balance
      rows.push([
        group.periodLabel,
        group.period + "-01",
        "Opening Balance",
        "",
        "",
        group.openingDebt.toFixed(2),
        group.openingCollateral.toFixed(2),
        "",
        "system",
        "",
      ].map((v) => `"${v}"`).join(","))

      for (const entry of group.entries) {
        const isManual = entry.description.startsWith("[Manual]")
        rows.push([
          group.periodLabel,
          entry.date,
          isManual ? entry.description.replace("[Manual] ", "") : entry.description,
          entry.debitAccount,
          entry.creditAccount,
          entry.usdAmount.toFixed(2),
          entry.usdAmount.toFixed(2),
          entry.asset,
          isManual ? "manual" : entry.computed ? "computed" : "on-chain",
          entry.txHash || "",
        ].map((v) => `"${v}"`).join(","))
      }

      // Closing balance
      rows.push([
        group.periodLabel,
        group.period + "-30",
        "Closing Balance",
        "",
        "",
        group.closingDebt.toFixed(2),
        group.closingCollateral.toFixed(2),
        "",
        "system",
        "",
      ].map((v) => `"${v}"`).join(","))
    }

    const csv = rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `journal-entries-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Merge manual entries with on-chain entries
  const enhancedMonthlyGroups = useMemo(() => {
    const groups = [...borrowerRecon.monthlyGroups]
    
    // Add manual entries to appropriate months
    for (const manual of customization.manualEntries) {
      const [year, month] = manual.date.split("-").map(Number)
      const monthKey = `${year}-${String(month).padStart(2, "0")}`
      
      let group = groups.find((g) => g.period === monthKey)
      
      if (!group) {
        // Create new month group if needed
        const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" })
        group = {
          period: monthKey,
          periodLabel: `${monthName} ${year}`,
          entries: [],
          openingDebt: 0,
          openingCollateral: 0,
          closingDebt: 0,
          closingCollateral: 0,
          totalBorrowed: 0,
          totalRepaid: 0,
          totalInterest: 0,
          totalLiquidated: 0,
          embeddedDerivative: 0,
          liquidationRisk: "low",
        }
        groups.push(group)
      }
      
      // Find account names
      const debitAccount = findAccount(customization.accounts, manual.debitAccountId)
      const creditAccount = findAccount(customization.accounts, manual.creditAccountId)
      
      // Add manual entry as a JournalEntry
      group.entries.push({
        date: manual.date,
        timestamp: new Date(manual.date).toISOString(),
        description: `[Manual] ${manual.description}`,
        debitAccount: debitAccount?.name || manual.debitAccountId,
        creditAccount: creditAccount?.name || manual.creditAccountId,
        usdAmount: manual.amount,
        asset: manual.asset || "",
        computed: false,
      })
    }
    
    // Sort groups by period
    groups.sort((a, b) => a.period.localeCompare(b.period))
    
    // Sort entries within each group by date
    for (const group of groups) {
      group.entries.sort((a, b) => a.date.localeCompare(b.date))
    }
    
    return groups
  }, [borrowerRecon.monthlyGroups, customization.manualEntries, customization.accounts])

  // Calculate totals including manual entries
  const totals = useMemo(() => {
    const manualTotal = customization.manualEntries.reduce((sum, e) => sum + e.amount, 0)
    const onChainTotal = borrowerRecon.monthlyGroups.reduce(
      (sum, g) => sum + g.entries.reduce((s, e) => s + e.usdAmount, 0),
      0
    )
    return {
      onChain: onChainTotal,
      manual: manualTotal,
      combined: onChainTotal + manualTotal,
      fvAdjustment: borrowerRecon.monthlyGroups.reduce((s, g) => s + g.embeddedDerivative, 0),
    }
  }, [borrowerRecon.monthlyGroups, customization.manualEntries])

  const handlePriceScheduleChange = useCallback((schedule: PriceSchedule) => {
    setCustomization((prev) => ({ ...prev, priceSchedule: schedule }))
  }, [])

  const handleAccountsChange = useCallback((accounts: CustomAccount[]) => {
    setCustomization((prev) => ({ ...prev, accounts }))
  }, [])

  const handleManualEntriesChange = useCallback((entries: ManualJournalEntry[]) => {
    setCustomization((prev) => ({ ...prev, manualEntries: entries }))
  }, [])

  if (borrowerRecon.monthlyGroups.length === 0 && customization.manualEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No Journal Entries Found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No on-chain transactions to display. You can add manual entries below.
        </p>
        <Button onClick={() => setViewMode("customize")} className="gap-2">
          <FileEdit className="size-4" />
          Add Manual Entry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with mode switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="journal" className="gap-2">
                <FileText className="size-4" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="customize" className="gap-2">
                <Settings2 className="size-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="calculate" className="gap-2">
                <Calculator className="size-4" />
                Calculations
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          {customization.manualEntries.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              {customization.manualEntries.length} manual
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleShare}
          >
            {shareCopied ? (
              <><Check className="size-4 text-green-500" /> Copied!</>
            ) : (
              <><Share2 className="size-4" /> Share</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport(enhancedMonthlyGroups, customization.manualEntries)}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">On-Chain Entries</div>
          <div className="text-xl font-semibold font-mono mt-1">
            {borrowerRecon.monthlyGroups.reduce((s, g) => s + g.entries.filter(e => !e.description.startsWith("[Manual]")).length, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Manual Entries</div>
          <div className="text-xl font-semibold font-mono mt-1">
            {customization.manualEntries.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Debt Movement</div>
          <div className="text-xl font-semibold font-mono mt-1">
            {formatUsd(totals.combined)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            FV Adjustments
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Fair Value adjustments computed from your principal market prices vs implied on-chain prices.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={`text-xl font-semibold font-mono mt-1 ${totals.fvAdjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totals.fvAdjustment >= 0 ? "+" : ""}{formatUsd(totals.fvAdjustment)}
          </div>
        </Card>
      </div>

      {/* View Content */}
      {viewMode === "journal" && (
        <JournalView 
          monthlyGroups={enhancedMonthlyGroups} 
          hasManualEntries={customization.manualEntries.length > 0}
        />
      )}

      {viewMode === "customize" && (
        <div className="space-y-6">
          <Tabs defaultValue="prices" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prices" className="gap-2">
                <Calendar className="size-4" />
                Prices
              </TabsTrigger>
              <TabsTrigger value="accounts" className="gap-2">
                <BookOpen className="size-4" />
                Accounts
              </TabsTrigger>
              <TabsTrigger value="entries" className="gap-2">
                <FileEdit className="size-4" />
                Manual Entries
              </TabsTrigger>
            </TabsList>
            <TabsContent value="prices" className="mt-4">
              <DailyPriceSchedule
                assets={assets}
                schedule={customization.priceSchedule}
                onChange={handlePriceScheduleChange}
                startDate={startDate}
                endDate={endDate}
              />
            </TabsContent>
            <TabsContent value="accounts" className="mt-4">
              <CustomAccountsManager
                accounts={customization.accounts}
                onChange={handleAccountsChange}
              />
            </TabsContent>
            <TabsContent value="entries" className="mt-4">
              <ManualEntriesManager
                entries={customization.manualEntries}
                accounts={customization.accounts}
                assets={assets}
                onChange={handleManualEntriesChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {viewMode === "calculate" && (
        <CalculationVisualizer
          monthlyGroups={enhancedMonthlyGroups}
          priceSchedule={customization.priceSchedule}
        />
      )}
    </div>
  )
}

// Journal View Component
function JournalView({ 
  monthlyGroups,
  hasManualEntries,
}: { 
  monthlyGroups: MonthlyReconGroup[]
  hasManualEntries: boolean
}) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(
    new Set(monthlyGroups.map((g) => g.period))
  )

  function togglePeriod(period: string) {
    const next = new Set(expandedPeriods)
    if (next.has(period)) {
      next.delete(period)
    } else {
      next.add(period)
    }
    setExpandedPeriods(next)
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-xs">
        <span className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-blue-500" />
          On-chain entry
        </span>
        <span className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-purple-500" />
          Manual entry
        </span>
        <span className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-amber-500" />
          Computed (FV)
        </span>
        <span className="ml-auto text-muted-foreground">
          Hover over amounts for calculation details
        </span>
      </div>

      {monthlyGroups.map((group) => {
        const isExpanded = expandedPeriods.has(group.period)
        
        return (
          <Card key={group.period}>
            <Collapsible open={isExpanded} onOpenChange={() => togglePeriod(group.period)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                      <CardTitle className="text-base">{group.periodLabel}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {group.entries.length} entries
                      </Badge>
                      {group.entries.some((e) => e.description.startsWith("[Manual]")) && (
                        <Badge className="text-xs bg-purple-500">has manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Closing: <span className="font-mono font-medium text-foreground">{formatUsd(group.closingDebt)}</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead className="text-right">DR (USD)</TableHead>
                        <TableHead className="text-right">CR (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance */}
                      <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                        <TableCell></TableCell>
                        <TableCell colSpan={4} className="italic">Opening Balance</TableCell>
                        <TableCell className="text-right font-mono">
                          {group.openingDebt > 0 ? formatUsd(group.openingDebt) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {group.openingCollateral > 0 ? formatUsd(group.openingCollateral) : "—"}
                        </TableCell>
                      </TableRow>

                      {/* Entries */}
                      {group.entries.map((entry, idx) => {
                        const isManual = entry.description.startsWith("[Manual]")
                        const isComputed = entry.computed
                        
                        return (
                          <TableRow 
                            key={idx} 
                            className={`text-xs ${isComputed ? "bg-amber-500/5 italic" : ""} ${isManual ? "bg-purple-500/5" : ""}`}
                          >
                            <TableCell>
                              <div 
                                className={`size-2 rounded-full ${
                                  isManual ? "bg-purple-500" : isComputed ? "bg-amber-500" : "bg-blue-500"
                                }`} 
                              />
                            </TableCell>
                            <TableCell className="font-mono">{entry.date}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{isManual ? entry.description.replace("[Manual] ", "") : entry.description}</span>
                                {entry.asset && (
                                  <Badge variant="outline" className="text-[10px]">{entry.asset}</Badge>
                                )}
                                {!isManual && !isComputed && entry.txHash && (
                                  <a
                                    href={`https://etherscan.io/tx/${entry.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline shrink-0"
                                    title={`View on Etherscan: ${entry.txHash}`}
                                  >
                                    <ExternalLink className="size-3" />
                                    {entry.txHash.slice(0, 6)}…{entry.txHash.slice(-4)}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-blue-600">{entry.debitAccount}</TableCell>
                            <TableCell className="text-amber-600">{entry.creditAccount}</TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="underline decoration-dotted cursor-help">
                                    {formatUsd(entry.usdAmount)}
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <div className="space-y-1">
                                      <p><strong>Source:</strong> {isManual ? "Manual entry" : isComputed ? "Computed" : "On-chain"}</p>
                                      <p><strong>Asset:</strong> {entry.asset || "N/A"}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatUsd(entry.usdAmount)}
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {/* Closing Balance */}
                      <TableRow className="border-t-2 bg-muted/60 font-semibold text-xs">
                        <TableCell></TableCell>
                        <TableCell colSpan={4}>Closing Balance</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatUsd(group.closingDebt)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatUsd(group.closingCollateral)}
                        </TableCell>
                      </TableRow>

                      {/* Period Summary */}
                      <TableRow className="bg-muted/30 text-[10px] text-muted-foreground">
                        <TableCell colSpan={7} className="py-2">
                          <div className="flex gap-4">
                            <span>Borrowed: <span className="font-mono text-red-600">{formatUsd(group.totalBorrowed)}</span></span>
                            <span>Repaid: <span className="font-mono text-green-600">{formatUsd(group.totalRepaid)}</span></span>
                            <span>Interest: <span className="font-mono text-orange-600">{formatUsd(group.totalInterest)}</span></span>
                            {group.embeddedDerivative !== 0 && (
                              <span>
                                FV Adj: <span className={`font-mono ${group.embeddedDerivative > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {group.embeddedDerivative > 0 ? "+" : ""}{formatUsd(group.embeddedDerivative)}
                                </span>
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
