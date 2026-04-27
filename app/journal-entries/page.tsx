"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { 
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

interface JournalEntryLine {
  account: string
  description: string
  debit: number
  credit: number
}

interface JournalEntry {
  id: string
  jeNumber: string
  date: string
  description: string
  block?: number
  txHash?: string
  status: "Approved" | "Draft" | "Pending"
  preparedBy: string
  lines: JournalEntryLine[]
}

interface WorkingPaper {
  id: string
  wpNumber: string
  title: string
  period: string
  preparer: string
  reviewer: string | null
  standard: string
  conclusion: string
  totalJEs: number
  txsLinked: string
  pricingSources: number
  exceptions: number
}

const mockJournalEntries: JournalEntry[] = [
  {
    id: "je_1",
    jeNumber: "JE-2025-031",
    date: "Feb 01, 2025",
    description: "Borrow — USDC (Compound v3)",
    block: 21570031,
    txHash: "0x3c8e...d652",
    status: "Approved",
    preparedBy: "System",
    lines: [
      { account: "1100 - Cash & Cash Equivalents", description: "USDC received from borrow", debit: 2847500, credit: 0 },
      { account: "2200 - Loans Payable - Compound v3", description: "USDC loan obligation", debit: 0, credit: 2847500 },
    ],
  },
  {
    id: "je_2",
    jeNumber: "JE-2025-032",
    date: "Mar 31, 2025",
    description: "Accrued Interest — Q1 2025",
    status: "Draft",
    preparedBy: "System",
    lines: [
      { account: "6100 - Interest Expense", description: "Q1 2025 borrow interest", debit: 38294, credit: 0 },
      { account: "2210 - Accrued Interest Payable", description: "Interest accrual", debit: 0, credit: 38294 },
    ],
  },
]

const mockWorkingPaper: WorkingPaper = {
  id: "wp_1",
  wpNumber: "WP-CLA-2025-Q1",
  title: "Borrowing Activity Summary — Working Paper",
  period: "Q1 2025 (Jan 1 – Mar 31)",
  preparer: "System (Auto-generated)",
  reviewer: "—",
  standard: "ASC 310 / ASC 820",
  conclusion: `All borrow positions on Compound Protocol v2 and v3 have been reviewed against onchain transaction data. Fair values are sourced from Chainlink price feeds (Level 2 inputs under ASC 820) or internal pricing datasets where applicable. Journal entries JE-2025-031 through JE-2025-037 reflect period borrowing activity, collateral movements, and Q1 accrued interest. No material exceptions noted. Liquidation event (Tx 0xa21f...bb9e, Jan 14) recognized as gain on debt extinguishment — pending auditor confirmation.`,
  totalJEs: 47,
  txsLinked: "47/47",
  pricingSources: 2,
  exceptions: 1,
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function JournalEntriesContent() {
  const [expandedJE, setExpandedJE] = useState<string | null>("je_1")

  const approvedCount = mockJournalEntries.filter(je => je.status === "Approved").length
  const draftCount = mockJournalEntries.filter(je => je.status === "Draft").length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Journal Entries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Q1 2025 · GAAP / ASC 310</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="size-4" />
            Export XLSX
          </Button>
          <Button size="sm" className="gap-2">
            <FileText className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Journal Entry Cards */}
      <div className="space-y-4">
        {mockJournalEntries.map((je) => {
          const isExpanded = expandedJE === je.id
          const totalDebit = je.lines.reduce((sum, l) => sum + l.debit, 0)
          const totalCredit = je.lines.reduce((sum, l) => sum + l.credit, 0)

          return (
            <Card key={je.id} className="bg-card border-border/60 overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
                onClick={() => setExpandedJE(isExpanded ? null : je.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="size-6">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{je.jeNumber} · {je.description}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {je.date}
                        {je.block && ` · Block ${je.block.toLocaleString()}`}
                        {je.txHash && ` · Tx ${je.txHash}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant="outline" 
                      className={je.status === "Approved" 
                        ? "border-emerald-500/50 text-emerald-500" 
                        : "border-amber-500/50 text-amber-500"
                      }
                    >
                      {je.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Prepared by: {je.preparedBy}</span>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <table className="w-full text-sm border-t border-border/50">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Account</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Description</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Debit</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {je.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-border/20">
                          <td className="px-4 py-2 font-mono text-sm">{line.account}</td>
                          <td className="px-4 py-2 text-muted-foreground">{line.description}</td>
                          <td className="px-4 py-2 text-right font-mono">{line.debit > 0 ? formatUsd(line.debit) : ""}</td>
                          <td className="px-4 py-2 text-right font-mono">{line.credit > 0 ? formatUsd(line.credit) : ""}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td colSpan={2} className="px-4 py-2 text-right">Totals</td>
                        <td className="px-4 py-2 text-right font-mono">{formatUsd(totalDebit)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatUsd(totalCredit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Working Paper Section */}
      <Card className="bg-card border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{mockWorkingPaper.wpNumber} · COMPOUND LOAN ACCOUNTING</p>
              <CardTitle className="text-lg font-semibold mt-1">{mockWorkingPaper.title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs">
            <span><strong>Period:</strong> {mockWorkingPaper.period}</span>
            <span><strong>Preparer:</strong> {mockWorkingPaper.preparer}</span>
            <span><strong>Reviewer:</strong> {mockWorkingPaper.reviewer}</span>
            <span><strong>Standard:</strong> {mockWorkingPaper.standard}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Accounting Conclusion</p>
            <p className="text-sm leading-relaxed">{mockWorkingPaper.conclusion}</p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total JEs Generated</p>
              <p className="text-2xl font-bold font-mono mt-1">{mockWorkingPaper.totalJEs}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">TXs Linked</p>
              <p className="text-2xl font-bold font-mono mt-1">{mockWorkingPaper.txsLinked}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pricing Sources</p>
              <p className="text-2xl font-bold font-mono mt-1">{mockWorkingPaper.pricingSources}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Exceptions</p>
              <p className="text-2xl font-bold font-mono mt-1">{mockWorkingPaper.exceptions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground border-t border-border/50">
        <span>{mockJournalEntries.length} journal entries</span>
        <span>{approvedCount} approved</span>
        <span>{draftCount} draft</span>
        <span>Working paper {mockWorkingPaper.wpNumber}</span>
        <span>Ready for export</span>
        <span>ASC 310 · ASC 820 compliant</span>
      </div>
    </div>
  )
}

export default function JournalEntriesPage() {
  return (
    <AppShell>
      <JournalEntriesContent />
    </AppShell>
  )
}
