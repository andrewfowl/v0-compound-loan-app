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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { BorrowerRecon, JournalEntry } from "@/lib/compound/types"
import { formatUsd } from "@/lib/compound/format"
import { Info } from "lucide-react"

interface JournalEntriesTabProps {
  borrowerRecon: BorrowerRecon
}

/**
 * Get explanation text for how the JE amount was calculated
 */
function getCalculationExplanation(entry: JournalEntry): string {
  const asset = entry.asset || "crypto"
  const amount = formatUsd(entry.usdAmount)
  
  if (entry.computed) {
    // Fair value adjustment entries
    if (entry.description.includes("FV")) {
      return `Fair Value Adjustment: This is a computed entry based on monthly price volatility simulation. The ${amount} represents the estimated change in fair value of ${asset} borrowings due to market price movements during the period.`
    }
    return `Computed Entry: This journal entry was calculated by the system, not from an on-chain transaction.`
  }
  
  // Transaction-based entries
  if (entry.description.includes("Borrow")) {
    return `Borrow Transaction:
• Asset: ${asset}
• USD Value: ${amount}
• Source: On-chain borrow event
• Debit: Cash/Crypto Received (asset in)
• Credit: Crypto Borrowings (liability up)`
  }
  
  if (entry.description.includes("Repay")) {
    return `Repayment Transaction:
• Asset: ${asset}  
• USD Value: ${amount}
• Source: On-chain repayment event
• Debit: Crypto Borrowings (liability down)
• Credit: Cash/Crypto Paid (asset out)`
  }
  
  if (entry.description.includes("Interest Expense")) {
    return `Interest Accrual:
• Asset: ${asset}
• USD Value: ${amount}
• Source: Calculated interest on borrowings
• Debit: Interest Expense (expense up)
• Credit: Accrued Interest Payable (liability up)`
  }
  
  if (entry.description.includes("Deposit") && entry.description.includes("collateral")) {
    return `Collateral Deposit:
• Asset: ${asset}
• USD Value: ${amount}
• Source: On-chain supply/mint event
• Debit: Collateral Deposited (asset in protocol)
• Credit: Crypto Holdings (asset transferred)`
  }
  
  if (entry.description.includes("Withdraw") && entry.description.includes("collateral")) {
    return `Collateral Withdrawal:
• Asset: ${asset}
• USD Value: ${amount}
• Source: On-chain redeem/withdraw event
• Debit: Crypto Holdings (asset received back)
• Credit: Collateral Deposited (asset out of protocol)`
  }
  
  if (entry.description.includes("seized") || entry.description.includes("Liquidation")) {
    return `Liquidation Event:
• Asset: ${asset}
• USD Value: ${amount}
• Source: On-chain liquidation event
• Collateral was seized to repay debt
• This represents a realized loss`
  }
  
  if (entry.description.includes("Interest Income")) {
    return `Interest Income:
• Asset: ${asset}
• USD Value: ${amount}
• Source: Interest earned on supplied collateral
• Debit: Collateral Deposited (value increase)
• Credit: Interest Income (revenue)`
  }
  
  return `Transaction-based entry from on-chain event. USD value: ${amount}`
}

function JournalEntryRow({ entry }: { entry: JournalEntry }) {
  const explanation = getCalculationExplanation(entry)
  
  return (
    <TableRow className={entry.computed ? "bg-muted/30 italic" : ""}>
      <TableCell className="text-sm text-muted-foreground">{entry.date}</TableCell>
      <TableCell className="text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-help">
                {entry.description}
                <Info className="h-3 w-3 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm whitespace-pre-line text-xs">
              {explanation}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-sm text-blue-600">{entry.debitAccount}</TableCell>
      <TableCell className="text-sm text-amber-600 pl-6">{entry.creditAccount}</TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm text-red-600 cursor-help underline decoration-dotted">
                {formatUsd(entry.usdAmount)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-xs">
              <div className="space-y-1">
                <p><strong>Asset:</strong> {entry.asset || "N/A"}</p>
                <p><strong>Amount USD:</strong> {formatUsd(entry.usdAmount)}</p>
                <p><strong>Source:</strong> {entry.computed ? "Computed" : "On-chain transaction"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm text-green-600 cursor-help underline decoration-dotted">
                {formatUsd(entry.usdAmount)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-xs">
              <div className="space-y-1">
                <p><strong>Asset:</strong> {entry.asset || "N/A"}</p>
                <p><strong>Amount USD:</strong> {formatUsd(entry.usdAmount)}</p>
                <p><strong>Note:</strong> DR = CR for double-entry bookkeeping</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  )
}

export function JournalEntriesTab({ borrowerRecon }: JournalEntriesTabProps) {
  if (borrowerRecon.monthlyGroups.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">No journal entries found</p>
  }

  return (
    <div className="space-y-6">
      {/* Data Source + Legend */}
      <div className="flex flex-col gap-2 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-600 dark:text-amber-400">Warning:</span>
          <span>JE entries are <strong>calculated</strong> from <code className="bg-muted px-1 rounded">normalizedEvents</code>. USD values use hardcoded prices (WETH=$3200, WBTC=$65000), NOT actual on-chain values.</span>
        </div>
        <div className="flex items-center gap-4 border-t pt-2">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Hover over descriptions and amounts to see calculation details
          </span>
          <span className="border-l pl-4">
            <span className="italic">Italic rows</span> = computed/estimated entries (FV adjustments)
          </span>
        </div>
      </div>

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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {group.openingDebt > 0 ? formatUsd(group.openingDebt) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Opening debt balance carried forward from prior period
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {group.openingCollateral > 0 ? formatUsd(group.openingCollateral) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Opening collateral balance carried forward from prior period
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>

                {/* Journal entries with tooltips */}
                {group.entries.map((entry, idx) => (
                  <JournalEntryRow key={idx} entry={entry} />
                ))}

                {/* Closing balance row */}
                <TableRow className="border-t-2 bg-muted/60 font-semibold">
                  <TableCell colSpan={4} className="pl-4">Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {group.closingDebt > 0 ? formatUsd(group.closingDebt) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm text-xs">
                          <div>
                            <p><strong>Closing Debt Calculation:</strong></p>
                            <p>Opening: {formatUsd(group.openingDebt)}</p>
                            <p>+ Borrowed: {formatUsd(group.totalBorrowed)}</p>
                            <p>+ Interest: {formatUsd(group.totalInterest)}</p>
                            <p>- Repaid: {formatUsd(group.totalRepaid)}</p>
                            <p>- Liquidated: {formatUsd(group.totalLiquidated)}</p>
                            <p className="border-t mt-1 pt-1">= Closing: {formatUsd(group.closingDebt)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {group.closingCollateral > 0 ? formatUsd(group.closingCollateral) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Collateral balance at end of period (deposits - withdrawals - liquidations + interest)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>

                {/* Period summary with explanations */}
                <TableRow className="bg-muted text-xs text-muted-foreground">
                  <TableCell colSpan={6} className="pl-4 py-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="mr-4 cursor-help">
                            Borrowed: <span className="font-mono font-medium text-red-600">{formatUsd(group.totalBorrowed)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Sum of all borrow transactions this period</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="mr-4 cursor-help">
                            Repaid: <span className="font-mono font-medium text-green-600">{formatUsd(group.totalRepaid)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Sum of all repayment transactions this period</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="mr-4 cursor-help">
                            Interest: <span className="font-mono font-medium text-red-600">{formatUsd(group.totalInterest)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Accrued interest expense for the period</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {Math.abs(group.embeddedDerivative) >= 0.01 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`mr-4 cursor-help ${group.embeddedDerivative > 0 ? "text-red-600" : "text-green-600"}`}>
                              FV Adj: <span className="font-mono font-medium">
                                {group.embeddedDerivative > 0 ? "+" : "-"}{formatUsd(Math.abs(group.embeddedDerivative))}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            Fair Value Adjustment: Estimated change in value of crypto borrowings due to price volatility. 
                            This is a computed entry based on simulated monthly price movements.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {group.totalLiquidated > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-red-600 cursor-help">
                              Liquidated: <span className="font-mono font-medium">{formatUsd(group.totalLiquidated)}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Debt cleared via liquidation (collateral was seized to cover this amount)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
