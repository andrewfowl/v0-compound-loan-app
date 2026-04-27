"use client"

import { useState, useMemo, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { groupLoanLedgerByPeriod } from "@/lib/compound/report-builder"
import { formatLedgerValue } from "@/lib/compound/format"
import type { LoanLedgerEntry, Period, PositionRisk } from "@/lib/compound/types"
import { ChevronDown, ChevronRight, ExternalLink, HelpCircle } from "lucide-react"
import { PositionRiskCards } from "./position-risk-cards"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LoanTabProps {
  loanLedger: LoanLedgerEntry[]
  positions: PositionRisk[]
  dataSource?: "backend" | "calculated"
}

function RiskBadge({ risk, item }: { risk: string; item: string }) {
  if (item === "Paid by borrower") return <span className="text-[10px] text-green-600 font-semibold">PAID</span>
  const cfg =
    risk === "critical" ? { label: "CRITICAL", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" } :
    risk === "at-risk" ? { label: "AT RISK", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" } :
    risk === "monitor" ? { label: "MONITOR", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" } :
    { label: "LOW", cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function LoanTab({ loanLedger, positions, dataSource = "calculated" }: LoanTabProps) {
  const [period, setPeriod] = useState<Period>("monthly")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const grouped = useMemo(
    () => groupLoanLedgerByPeriod(loanLedger, period),
    [loanLedger, period]
  )

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <>
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg p-2 bg-muted/20 mb-4">
        <Badge variant={dataSource === "backend" ? "default" : "outline"} className="text-xs">
          {dataSource === "backend" ? "Backend Data" : "Calculated"}
        </Badge>
        <span>
          {dataSource === "backend" 
            ? <>From <code className="bg-muted px-1 rounded">reconciliationRows</code> (pre-calculated by backend)</>
            : <>Calculated from <code className="bg-muted px-1 rounded">normalizedEvents</code> via <code className="bg-muted px-1 rounded">buildCompoundReport()</code></>
          }
        </span>
      </div>
      <PositionRiskCards positions={positions} />
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">LOAN</CardTitle>
          <Select value={period} onValueChange={(v) => { setPeriod(v as Period); setExpanded(new Set()) }}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {loanLedger.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No loan activity found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="w-6" />
                    <TableHead className="font-bold">Token</TableHead>
                    <TableHead className="font-bold">Item</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="text-right font-bold italic">Start</TableHead>
                    <TableHead className="text-right font-bold">Proceeds</TableHead>
                    <TableHead className="text-right font-bold">Accruals</TableHead>
                    <TableHead className="text-right font-bold">Liquidated</TableHead>
                    <TableHead className="font-bold">Risk</TableHead>
                    <TableHead className="text-right font-bold">Payments</TableHead>
                    <TableHead className="text-right font-bold italic">End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((group) => {
                    const isOpen = expanded.has(group.periodLabel)
                    return (
                      <Fragment key={group.periodLabel}>
                        {/* Period header — clickable */}
                        <TableRow
                          className="bg-muted/60 cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => toggle(group.periodLabel)}
                        >
                          <TableCell className="pr-0 pl-3">
                            {isOpen
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell colSpan={3} className="font-semibold text-sm py-2">
                            {group.periodLabel}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({group.rows.filter(r => !r.calculated).length} txn{group.rows.filter(r => !r.calculated).length !== 1 ? "s" : ""}
                              {group.rows.some(r => r.calculated) && <span className="text-blue-500/70"> + {group.rows.filter(r => r.calculated).length} est.</span>})
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.startBalance, group.subtotals.startBalance < 0)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.proceeds, true)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.accruals, true)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.liquidated)}</TableCell>
                          <TableCell />
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.payments)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.endBalance, group.subtotals.endBalance < 0)}</TableCell>
                        </TableRow>

                        {/* Drill-down rows */}
                        {isOpen && group.rows.map((entry, idx) => (
                          <TableRow
                            key={`${group.periodLabel}-${idx}`}
                            className={entry.calculated
                              ? "bg-blue-500/5 hover:bg-blue-500/10 italic"
                              : "bg-background hover:bg-muted/20"
                            }
                          >
                            <TableCell />
                            <TableCell className="font-medium pl-6">{entry.token}</TableCell>
                            <TableCell className="text-sm">
                              {entry.calculated ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1 text-blue-500/80 cursor-help">
                                        {entry.item}
                                        <HelpCircle className="size-3" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <div className="space-y-1.5">
                                        <p className="font-semibold text-sm">Calculated Interest Accrual</p>
                                        <p className="text-xs font-mono">Balance × (APR ÷ 365) × Days</p>
                                        <p className="text-xs">{entry.calculatedDays} day{entry.calculatedDays !== 1 ? "s" : ""} at {((entry.calculatedApr ?? 0) * 100).toFixed(1)}% APR (Compound v3 borrow rate estimate)</p>
                                        <p className="text-xs text-muted-foreground">Not an on-chain event. Estimated between consecutive transactions.</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground">{entry.item}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{entry.date}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.start, entry.start < 0, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.proceeds, true, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.accruals, true, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatLedgerValue(entry.liquidated, false, entry.token)}
                              {entry.liquidated > 0 && Math.abs(entry.start) > 0 && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {((entry.liquidated / Math.abs(entry.start)) * 100).toFixed(1)}% of position
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <RiskBadge risk={entry.riskAtTime} item={entry.item} />
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.payments, false, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              <span className="inline-flex items-center gap-1">
                                {formatLedgerValue(entry.end, entry.end < 0, entry.token)}
                                {entry.txHash && (
                                  <a
                                    href={`https://etherscan.io/tx/${entry.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-primary opacity-60 hover:opacity-100"
                                    title={entry.txHash}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
