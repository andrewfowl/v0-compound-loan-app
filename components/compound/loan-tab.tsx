"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { groupLoanLedgerByPeriod } from "@/lib/compound/report-builder"
import { formatLedgerValue } from "@/lib/compound/format"
import type { LoanLedgerEntry, Period } from "@/lib/compound/types"

interface LoanTabProps {
  loanLedger: LoanLedgerEntry[]
}

export function LoanTab({ loanLedger }: LoanTabProps) {
  const [period, setPeriod] = useState<Period>("monthly")

  const grouped = useMemo(
    () => groupLoanLedgerByPeriod(loanLedger, period),
    [loanLedger, period]
  )

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">LOAN</CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
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
                {grouped.map((group) => (
                  <>
                    <TableRow key={`h-${group.periodLabel}`} className="bg-muted/60">
                      <TableCell colSpan={9} className="font-semibold text-sm py-1 px-4">
                        {group.periodLabel}
                      </TableCell>
                    </TableRow>
                    {group.rows.map((entry, idx) => (
                      <TableRow key={`${group.periodLabel}-${idx}`}>
                        <TableCell className="font-medium pl-6">{entry.token}</TableCell>
                        <TableCell>{entry.item}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.start, entry.start < 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.proceeds, true)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.accruals, true)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.liquidated)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.payments)}</TableCell>
                        <TableCell className="text-right font-mono">{formatLedgerValue(entry.end, entry.end < 0)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow key={`s-${group.periodLabel}`} className="border-t-2 font-semibold bg-muted/30">
                      <TableCell colSpan={3} className="pl-6 text-sm text-muted-foreground">Subtotal</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.proceeds, true)}</TableCell>
                      <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.accruals, true)}</TableCell>
                      <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.liquidated)}</TableCell>
                      <TableCell className="text-right font-mono">{formatLedgerValue(group.subtotals.payments)}</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
