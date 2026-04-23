"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { groupLoanLedgerByPeriod } from "@/lib/compound/report-builder"
import { formatLedgerValue } from "@/lib/compound/format"
import type { LoanLedgerEntry, Period } from "@/lib/compound/types"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

interface LoanTabProps {
  loanLedger: LoanLedgerEntry[]
}

export function LoanTab({ loanLedger }: LoanTabProps) {
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
                  <TableHead className="text-right font-bold">Payments</TableHead>
                  <TableHead className="text-right font-bold italic">End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((group) => {
                  const isOpen = expanded.has(group.periodLabel)
                  return (
                    <>
                      {/* Period header — clickable */}
                      <TableRow
                        key={`h-${group.periodLabel}`}
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
                            ({group.rows.length} transaction{group.rows.length !== 1 ? "s" : ""})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.proceeds, true)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.accruals, true)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.liquidated)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.payments)}</TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                      </TableRow>

                      {/* Drill-down rows */}
                      {isOpen && group.rows.map((entry, idx) => (
                        <TableRow key={`${group.periodLabel}-${idx}`} className="bg-background hover:bg-muted/20">
                          <TableCell />
                          <TableCell className="font-medium pl-6">{entry.token}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{entry.item}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{entry.date}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.start, entry.start < 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.proceeds, true)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.accruals, true)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.liquidated)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatLedgerValue(entry.payments)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            <span className="inline-flex items-center gap-1">
                              {formatLedgerValue(entry.end, entry.end < 0)}
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
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
