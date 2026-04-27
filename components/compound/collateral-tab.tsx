"use client"

import { useState, useMemo, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { groupCollateralLedgerByPeriod } from "@/lib/compound/report-builder"
import { formatLedgerValue } from "@/lib/compound/format"
import type { CollateralLedgerEntry, Period, BorrowerRecon } from "@/lib/compound/types"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { CollateralRiskBanner } from "./collateral-risk-banner"

interface CollateralTabProps {
  collateralLedger: CollateralLedgerEntry[]
  borrowerRecon: BorrowerRecon
  dataSource?: "backend" | "calculated"
}

function SeizureRiskBadge({ risk, item }: { risk: string; item: string }) {
  if (item === "Redeem") return <span className="text-[10px] text-green-600 font-semibold">WITHDRAWN</span>
  if (risk === "healthy") return <span className="text-[10px] text-green-600 font-semibold">SAFE</span>
  const cfg =
    risk === "critical" ? { label: "SEIZABLE", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" } :
    risk === "at-risk" ? { label: "AT RISK", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" } :
    { label: "MONITOR", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function CollateralTab({ collateralLedger, borrowerRecon, dataSource = "calculated" }: CollateralTabProps) {
  const [period, setPeriod] = useState<Period>("monthly")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const grouped = useMemo(
    () => groupCollateralLedgerByPeriod(collateralLedger, period),
    [collateralLedger, period]
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
      <CollateralRiskBanner borrowerRecon={borrowerRecon} />
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">COLLATERAL</CardTitle>
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
          {collateralLedger.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No collateral activity found</p>
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
                    <TableHead className="text-right font-bold">Provided</TableHead>
                    <TableHead className="text-right font-bold">Accruals</TableHead>
                    <TableHead className="text-right font-bold">Liquidated</TableHead>
                    <TableHead className="font-bold">Seizure Risk</TableHead>
                    <TableHead className="text-right font-bold">Reclaimed</TableHead>
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
                              ({group.rows.length} txn{group.rows.length !== 1 ? "s" : ""})
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.startBalance, group.subtotals.startBalance < 0)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.provided)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.accruals)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.liquidated, true)}</TableCell>
                          <TableCell />
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.reclaimed, true)}</TableCell>
                          <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.endBalance, group.subtotals.endBalance < 0)}</TableCell>
                        </TableRow>

                        {/* Drill-down rows */}
                        {isOpen && group.rows.map((entry, idx) => (
                          <TableRow key={`${group.periodLabel}-${idx}`} className="bg-background hover:bg-muted/20">
                            <TableCell />
                            <TableCell className="font-medium pl-6">{entry.token}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{entry.item}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{entry.date}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.start, entry.start < 0, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.provided, false, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.accruals, false, entry.token)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatLedgerValue(entry.liquidated, true, entry.token)}
                              {entry.liquidated > 0 && entry.start > 0 && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {((entry.liquidated / entry.start) * 100).toFixed(1)}% of collateral
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <SeizureRiskBadge risk={entry.riskAtTime} item={entry.item} />
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatLedgerValue(entry.reclaimed, true, entry.token)}
                              {entry.reclaimed > 0 && entry.start > 0 && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {((entry.reclaimed / entry.start) * 100).toFixed(1)}% of collateral
                                </span>
                              )}
                            </TableCell>
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
