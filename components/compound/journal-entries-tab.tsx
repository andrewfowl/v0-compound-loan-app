"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BorrowerRecon } from "@/lib/compound/types"
import { formatUsd } from "@/lib/compound/format"

interface JournalEntriesTabProps {
  borrowerRecon: BorrowerRecon
}

export function JournalEntriesTab({ borrowerRecon }: JournalEntriesTabProps) {
  if (borrowerRecon.monthlyGroups.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">No journal entries found</p>
  }

  return (
    <div className="space-y-6">
      {borrowerRecon.monthlyGroups.map((group) => (
        <Card key={group.period}>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base">{group.periodLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="font-bold">Debit Account</TableHead>
                  <TableHead className="font-bold">Credit Account</TableHead>
                  <TableHead className="text-right font-bold">DR (USD)</TableHead>
                  <TableHead className="text-right font-bold">CR (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening balance row */}
                <TableRow className="bg-muted/60 text-sm text-muted-foreground">
                  <TableCell colSpan={4} className="pl-4 italic">Opening Balance</TableCell>
                  <TableCell className="text-right font-mono">
                    {group.openingDebt > 0 ? formatUsd(group.openingDebt) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {group.openingCollateral > 0 ? formatUsd(group.openingCollateral) : "—"}
                  </TableCell>
                </TableRow>

                {/* Journal entries */}
                {group.entries.map((entry, idx) => (
                  <TableRow key={idx} className={entry.computed ? "bg-muted/30 italic" : ""}>
                    <TableCell className="text-sm text-muted-foreground">{entry.date}</TableCell>
                    <TableCell className="text-sm">{entry.description}</TableCell>
                    <TableCell className="text-sm text-blue-600">{entry.debitAccount}</TableCell>
                    <TableCell className="text-sm text-amber-600 pl-6">{entry.creditAccount}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      {formatUsd(entry.usdAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      {formatUsd(entry.usdAmount)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Closing balance row */}
                <TableRow className="border-t-2 bg-muted/60 font-semibold">
                  <TableCell colSpan={4} className="pl-4">Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">
                    {group.closingDebt > 0 ? formatUsd(group.closingDebt) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {group.closingCollateral > 0 ? formatUsd(group.closingCollateral) : "—"}
                  </TableCell>
                </TableRow>

                {/* Period summary */}
                <TableRow className="bg-muted text-xs text-muted-foreground">
                  <TableCell colSpan={6} className="pl-4 py-2">
                    <span className="mr-4">
                      Borrowed: <span className="font-mono font-medium text-red-600">{formatUsd(group.totalBorrowed)}</span>
                    </span>
                    <span className="mr-4">
                      Repaid: <span className="font-mono font-medium text-green-600">{formatUsd(group.totalRepaid)}</span>
                    </span>
                    <span className="mr-4">
                      Interest: <span className="font-mono font-medium text-red-600">{formatUsd(group.totalInterest)}</span>
                    </span>
                    {Math.abs(group.embeddedDerivative) >= 0.01 && (
                      <span className={`mr-4 ${group.embeddedDerivative > 0 ? "text-red-600" : "text-green-600"}`}>
                        FV Adj: <span className="font-mono font-medium">
                          {group.embeddedDerivative > 0 ? "+" : "-"}{formatUsd(Math.abs(group.embeddedDerivative))}
                        </span>
                      </span>
                    )}
                    {group.totalLiquidated > 0 && (
                      <span className="text-red-600">
                        Liquidated: <span className="font-mono font-medium">{formatUsd(group.totalLiquidated)}</span>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
