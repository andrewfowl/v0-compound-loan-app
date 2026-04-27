"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { Input } from "@/components/ui/input"
import { 
  Download,
  Filter,
  Search,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Plus,
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

  const filteredTransactions = mockTransactions.filter(tx => {
    if (filterType && tx.eventType !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return tx.asset.toLowerCase().includes(q) || 
             tx.txHash.toLowerCase().includes(q) ||
             tx.eventType.toLowerCase().includes(q)
    }
    return true
  })

  const totalTransactions = mockTransactions.length
  const mappedTransactions = mockTransactions.filter(tx => tx.status === "Mapped").length
  const chainlinkPriced = mockTransactions.filter(tx => tx.priceSource === "Chainlink").length
  const internalPriced = mockTransactions.filter(tx => tx.priceSource === "Internal").length

  const eventTypes = ["Supply", "Borrow", "Repay", "Withdraw", "Liquidation"]

  const getEventColor = (type: string) => {
    switch (type) {
      case "Supply": return "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
      case "Borrow": return "border-blue-500/50 text-blue-500 bg-blue-500/10"
      case "Repay": return "border-amber-500/50 text-amber-500 bg-amber-500/10"
      case "Withdraw": return "border-red-500/50 text-red-500 bg-red-500/10"
      case "Liquidation": return "border-purple-500/50 text-purple-500 bg-purple-500/10"
      default: return "border-muted-foreground/50 text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Onchain Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Transaction ledger with ASC 820 fair value pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
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

      {/* Import Success Banner */}
      <Card className="bg-muted/30 border-border/60">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Download className="size-5 text-emerald-500" />
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
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <ArrowRight className="size-4" />
              Generate JEs
            </Button>
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
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
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
                    <Badge 
                      variant="outline" 
                      className={tx.status === "Mapped" 
                        ? "border-emerald-500/50 text-emerald-500" 
                        : "border-amber-500/50 text-amber-500"
                      }
                    >
                      {tx.status}
                    </Badge>
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
        <span>{totalTransactions - mappedTransactions} pending review</span>
        <span>ASC 820 pricing: {chainlinkPriced} Chainlink · {internalPriced} Internal</span>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsContent />
    </AppShell>
  )
}
