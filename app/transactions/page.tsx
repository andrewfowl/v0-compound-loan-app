"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Download,
  Search,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  HelpCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
} from "lucide-react"

interface Transaction {
  id: string
  date: string
  block: number
  eventType: "Supply" | "Borrow" | "Repay" | "Withdraw" | "Liquidation"
  asset: string
  cToken: string
  protocol: "v2" | "v3"
  amount: number
  amountUsd: number
  fairValue: number
  priceSource: string
  pricePerUnit: number
  txHash: string
  status: "Mapped" | "Pending" | "Review"
  jeStatus?: "none" | "generating" | "generated" | "error"
  jeId?: string
}

interface GeneratedJE {
  id: string
  txId: string
  debitAccount: string
  creditAccount: string
  amount: number
  memo: string
  createdAt: string
}

const mockTransactions: Transaction[] = [
  {
    id: "tx_1",
    date: "Mar 28, 2025",
    block: 21842011,
    eventType: "Repay",
    asset: "USDC",
    cToken: "cUSDCv3",
    protocol: "v3",
    amount: 500000,
    amountUsd: 500000,
    fairValue: 500000,
    priceSource: "Chainlink",
    pricePerUnit: 1.0000,
    txHash: "0x8f3c...a42d",
    status: "Mapped",
  },
  {
    id: "tx_2",
    date: "Mar 15, 2025",
    block: 21790448,
    eventType: "Supply",
    asset: "WBTC",
    cToken: "cWBTC",
    protocol: "v2",
    amount: 3.2841,
    amountUsd: 240000,
    fairValue: 240000,
    priceSource: "Internal",
    pricePerUnit: 73070,
    txHash: "0x1d7a...c91f",
    status: "Mapped",
  },
  {
    id: "tx_3",
    date: "Mar 02, 2025",
    block: 21724199,
    eventType: "Borrow",
    asset: "USDC",
    cToken: "cUSDC v2",
    protocol: "v2",
    amount: 1100000,
    amountUsd: 1100000,
    fairValue: 1100000,
    priceSource: "Chainlink",
    pricePerUnit: 1.0000,
    txHash: "0x55b2...e38c",
    status: "Mapped",
  },
  {
    id: "tx_4",
    date: "Feb 18, 2025",
    block: 21648820,
    eventType: "Supply",
    asset: "ETH",
    cToken: "cETH",
    protocol: "v3",
    amount: 1206.43,
    amountUsd: 3200000,
    fairValue: 3200000,
    priceSource: "Chainlink",
    pricePerUnit: 2652,
    txHash: "0xf9a1...7744",
    status: "Mapped",
  },
  {
    id: "tx_5",
    date: "Feb 01, 2025",
    block: 21598432,
    eventType: "Borrow",
    asset: "USDC",
    cToken: "cUSDCv3",
    protocol: "v3",
    amount: 2847500,
    amountUsd: 2847500,
    fairValue: 2847500,
    priceSource: "Chainlink",
    pricePerUnit: 1.0000,
    txHash: "0x3c8e...4f5a",
    status: "Mapped",
  },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 4 : 2 })
}

function TransactionsContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions.map(tx => ({ ...tx, jeStatus: "none" as const })))
  const [generatedJEs, setGeneratedJEs] = useState<GeneratedJE[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [showJEDialog, setShowJEDialog] = useState(false)
  const [selectedJE, setSelectedJE] = useState<GeneratedJE | null>(null)

  const filteredTransactions = transactions.filter(tx => {
    if (filterType && tx.eventType !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return tx.asset.toLowerCase().includes(q) || 
             tx.txHash.toLowerCase().includes(q) ||
             tx.eventType.toLowerCase().includes(q)
    }
    return true
  })

  const totalTransactions = transactions.length
  const mappedTransactions = transactions.filter(tx => tx.status === "Mapped").length
  const chainlinkPriced = transactions.filter(tx => tx.priceSource === "Chainlink").length
  const internalPriced = transactions.filter(tx => tx.priceSource === "Internal").length
  const jeGeneratedCount = transactions.filter(tx => tx.jeStatus === "generated").length

  // Get accounting accounts based on event type
  const getJEAccounts = (tx: Transaction) => {
    switch (tx.eventType) {
      case "Supply":
        return { debit: "1200 - DeFi Collateral", credit: "1100 - Digital Assets" }
      case "Borrow":
        return { debit: "1100 - Digital Assets", credit: "2100 - DeFi Loans Payable" }
      case "Repay":
        return { debit: "2100 - DeFi Loans Payable", credit: "1100 - Digital Assets" }
      case "Withdraw":
        return { debit: "1100 - Digital Assets", credit: "1200 - DeFi Collateral" }
      case "Liquidation":
        return { debit: "6500 - Liquidation Loss", credit: "1200 - DeFi Collateral" }
      default:
        return { debit: "9999 - Suspense", credit: "9999 - Suspense" }
    }
  }

  // Generate JE for a single transaction
  const generateJE = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId)
    if (!tx || tx.jeStatus === "generated") return

    // Set generating state
    setTransactions(prev => prev.map(t => 
      t.id === txId ? { ...t, jeStatus: "generating" as const } : t
    ))

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200))

    const accounts = getJEAccounts(tx)
    const jeId = `JE-${Date.now()}-${txId}`
    
    const newJE: GeneratedJE = {
      id: jeId,
      txId: tx.id,
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
      amount: tx.fairValue,
      memo: `${tx.eventType} ${tx.amount} ${tx.asset} on ${tx.date} (Block ${tx.block})`,
      createdAt: new Date().toISOString(),
    }

    setGeneratedJEs(prev => [...prev, newJE])
    setTransactions(prev => prev.map(t => 
      t.id === txId ? { ...t, jeStatus: "generated" as const, jeId } : t
    ))

    return newJE
  }

  // Generate JEs for all mapped transactions without JEs
  const generateAllJEs = async () => {
    const eligibleTxs = transactions.filter(tx => tx.status === "Mapped" && tx.jeStatus === "none")
    if (eligibleTxs.length === 0) return

    setBulkGenerating(true)

    for (const tx of eligibleTxs) {
      await generateJE(tx.id)
    }

    setBulkGenerating(false)
  }

  // View generated JE details
  const viewJE = (txId: string) => {
    const je = generatedJEs.find(j => j.txId === txId)
    if (je) {
      setSelectedJE(je)
      setShowJEDialog(true)
    }
  }

  const eventTypes = ["Supply", "Borrow", "Repay", "Withdraw", "Liquidation"]

  const getEventColor = (type: string) => {
    switch (type) {
      case "Supply": return "border-positive/50 text-positive bg-success-muted"
      case "Borrow": return "border-foreground/30 text-foreground/70 bg-muted"
      case "Repay": return "border-warning/50 text-warning bg-warning-muted"
      case "Withdraw": return "border-negative/50 text-negative bg-destructive-muted"
      case "Liquidation": return "border-destructive/50 text-destructive bg-destructive-muted"
      default: return "border-muted-foreground/50 text-muted-foreground"
    }
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Onchain Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Transaction ledger with ASC 820 fair value pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            Ethereum
          </Badge>
          <Badge variant="outline">Compound v3</Badge>
          <Badge variant="outline">Compound v2</Badge>
          <Button size="sm" className="gap-2">
            <Download className="size-4" />
            Import Wallet
          </Button>
        </div>
      </div>

      {/* JE Generation Summary Banner */}
      {jeGeneratedCount > 0 && (
        <Card className="bg-success-muted/50 border-success/30">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-success/20">
                <BookOpen className="size-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm text-success">{jeGeneratedCount} Journal Entries Generated</p>
                <p className="text-xs text-muted-foreground">
                  JEs are ready for review in the Journal Entries page
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-success/30 text-success hover:bg-success/10">
              <ArrowRight className="size-4" />
              View Journal Entries
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Success Banner */}
      <Card className="bg-muted/30 border-border/60">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success-muted">
              <Download className="size-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-sm">Wallet imported successfully</p>
              <p className="text-xs text-muted-foreground">0x4f2a8d1c3b6e5f0a9d7c4e2b8a1f3d6c9b4e7a8bc3 · {totalTransactions} transactions found · Q1 2025</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{totalTransactions} Events</Badge>
            <span className="text-xs text-muted-foreground">Last block: 21,842,011</span>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Ledger */}
      <Card className="bg-card border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Transaction Ledger</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supply · Borrow · Repay · Withdraw · Liquidation events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search transactions..." 
                className="pl-9 w-64 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">Filter:</span>
              <Button 
                variant={filterType === null ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setFilterType(null)}
              >
                All Types
              </Button>
              {eventTypes.slice(0, 3).map(type => (
                <Button 
                  key={type}
                  variant={filterType === type ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterType(filterType === type ? null : type)}
                >
                  {type}
                </Button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2 h-9"
                  onClick={generateAllJEs}
                  disabled={bulkGenerating || transactions.filter(tx => tx.status === "Mapped" && tx.jeStatus === "none").length === 0}
                >
                  {bulkGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="size-4" />
                      Generate All JEs
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Generate Journal Entries</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates double-entry accounting records (debits &amp; credits) for all mapped transactions. 
                  JEs can then be exported to your GL system.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date / Block</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Event Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Asset</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Protocol</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Amount (Tokens)</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Fair Value (ASC 820)</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Tx Hash</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    JE Status
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p><strong>Journal Entry (JE)</strong> status shows whether an accounting entry has been created for this transaction.</p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          <li>• <strong>Pending</strong>: No JE generated yet</li>
                          <li>• <strong>Generated</strong>: JE created and ready for review</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{tx.date}</p>
                    <p className="text-xs text-muted-foreground">Block {tx.block.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${getEventColor(tx.eventType)}`}>
                      {tx.eventType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{tx.asset}</p>
                    <p className="text-xs text-muted-foreground">{tx.cToken}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs font-mono">{tx.protocol}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono font-semibold">{formatNumber(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">{tx.asset}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono font-semibold">{formatUsd(tx.fairValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.priceSource} · ${tx.pricePerUnit.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <a 
                      href={`https://etherscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
                    >
                      {tx.txHash}
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.jeStatus === "generating" ? (
                      <Badge variant="outline" className="border-primary/50 text-primary gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        Creating...
                      </Badge>
                    ) : tx.jeStatus === "generated" ? (
                      <Badge 
                        variant="outline" 
                        className="border-success/50 text-success gap-1 cursor-pointer hover:bg-success/10"
                        onClick={() => viewJE(tx.id)}
                      >
                        <CheckCircle2 className="size-3" />
                        Generated
                      </Badge>
                    ) : tx.jeStatus === "error" ? (
                      <Badge variant="outline" className="border-destructive/50 text-destructive gap-1">
                        <AlertCircle className="size-3" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.jeStatus === "generated" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => viewJE(tx.id)}
                          >
                            <BookOpen className="size-3" />
                            View JE
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View the generated journal entry</TooltipContent>
                      </Tooltip>
                    ) : tx.jeStatus === "generating" ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                        <Loader2 className="size-3 animate-spin" />
                      </Button>
                    ) : tx.status === "Mapped" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => generateJE(tx.id)}
                          >
                            <FileText className="size-3" />
                            Generate JE
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-xs">
                          <p>Create a journal entry for this transaction</p>
                          <p className="text-muted-foreground mt-1">
                            Generates debit/credit entries based on the {tx.eventType.toLowerCase()} event type
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                            <AlertCircle className="size-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Transaction must be mapped before generating JE</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground border-t border-border/50">
        <span>{totalTransactions} transactions</span>
        <span>{mappedTransactions} mapped</span>
        <span>{jeGeneratedCount} JEs generated</span>
        <span>ASC 820 pricing: {chainlinkPriced} Chainlink · {internalPriced} Internal</span>
      </div>

      {/* JE Detail Dialog */}
      <Dialog open={showJEDialog} onOpenChange={setShowJEDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Journal Entry Details
            </DialogTitle>
            <DialogDescription>
              Double-entry accounting record generated from the onchain transaction
            </DialogDescription>
          </DialogHeader>
          {selectedJE && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 border-b border-border/40">
                  <p className="text-xs font-medium text-muted-foreground">JE Reference</p>
                  <p className="font-mono text-sm">{selectedJE.id}</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-dashed border-border/40">
                    <div>
                      <p className="text-xs text-muted-foreground">Debit</p>
                      <p className="text-sm font-medium">{selectedJE.debitAccount}</p>
                    </div>
                    <p className="font-mono font-semibold text-foreground">
                      {formatUsd(selectedJE.amount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Credit</p>
                      <p className="text-sm font-medium">{selectedJE.creditAccount}</p>
                    </div>
                    <p className="font-mono font-semibold text-foreground">
                      {formatUsd(selectedJE.amount)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Memo / Description</p>
                <p className="text-sm">{selectedJE.memo}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                <span>Created: {new Date(selectedJE.createdAt).toLocaleString()}</span>
                <Badge variant="outline" className="border-success/50 text-success gap-1">
                  <CheckCircle2 className="size-3" />
                  Ready for Review
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsContent />
    </AppShell>
  )
}
