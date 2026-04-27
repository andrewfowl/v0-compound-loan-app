"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  ChevronDown,
} from "lucide-react"

interface Position {
  id: string
  asset: string
  cToken: string
  protocol: "v2" | "v3"
  network: string
  type: "borrow" | "supply"
  principal: number
  principalUsd: number
  interestAccrued: number
  interestAccruedUsd: number
  currentBalance: number
  currentBalanceUsd: number
  collateralRatio?: number
  liquidationThreshold?: number
  healthFactor?: number
  apy: number
  lastUpdated: string
}

const mockBorrowPositions: Position[] = [
  {
    id: "pos_1",
    asset: "USDC",
    cToken: "cUSDCv3",
    protocol: "v3",
    network: "Ethereum",
    type: "borrow",
    principal: 2847500,
    principalUsd: 2847500,
    interestAccrued: 12840,
    interestAccruedUsd: 12840,
    currentBalance: 2860340,
    currentBalanceUsd: 2860340,
    collateralRatio: 149,
    liquidationThreshold: 83,
    healthFactor: 1.49,
    apy: 5.2,
    lastUpdated: "2025-03-31T12:00:00Z",
  },
  {
    id: "pos_2",
    asset: "USDC",
    cToken: "cUSDC",
    protocol: "v2",
    network: "Ethereum",
    type: "borrow",
    principal: 1100000,
    principalUsd: 1100000,
    interestAccrued: 4820,
    interestAccruedUsd: 4820,
    currentBalance: 1104820,
    currentBalanceUsd: 1104820,
    collateralRatio: 128,
    liquidationThreshold: 75,
    healthFactor: 1.28,
    apy: 4.8,
    lastUpdated: "2025-03-31T12:00:00Z",
  },
  {
    id: "pos_3",
    asset: "ETH",
    cToken: "cETH",
    protocol: "v2",
    network: "Ethereum",
    type: "borrow",
    principal: 0.077,
    principalUsd: 270900,
    interestAccrued: 0.0021,
    interestAccruedUsd: 7380,
    currentBalance: 0.0791,
    currentBalanceUsd: 278280,
    collateralRatio: 210,
    liquidationThreshold: 82.5,
    healthFactor: 2.10,
    apy: 3.1,
    lastUpdated: "2025-03-31T12:00:00Z",
  },
]

const mockSupplyPositions: Position[] = [
  {
    id: "pos_4",
    asset: "WBTC",
    cToken: "cWBTC",
    protocol: "v2",
    network: "Ethereum",
    type: "supply",
    principal: 3.5,
    principalUsd: 4230000,
    interestAccrued: 0.012,
    interestAccruedUsd: 14496,
    currentBalance: 3.512,
    currentBalanceUsd: 4244496,
    apy: 0.4,
    lastUpdated: "2025-03-31T12:00:00Z",
  },
  {
    id: "pos_5",
    asset: "ETH",
    cToken: "cETHv3",
    protocol: "v3",
    network: "Ethereum",
    type: "supply",
    principal: 1250,
    principalUsd: 4437500,
    interestAccrued: 2.8,
    interestAccruedUsd: 9940,
    currentBalance: 1252.8,
    currentBalanceUsd: 4447440,
    apy: 2.1,
    lastUpdated: "2025-03-31T12:00:00Z",
  },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function PositionsContent() {
  const [activeTab, setActiveTab] = useState("borrow")

  const totalBorrowed = mockBorrowPositions.reduce((sum, p) => sum + p.currentBalanceUsd, 0)
  const totalSupplied = mockSupplyPositions.reduce((sum, p) => sum + p.currentBalanceUsd, 0)
  const totalInterestOwed = mockBorrowPositions.reduce((sum, p) => sum + p.interestAccruedUsd, 0)
  const totalInterestEarned = mockSupplyPositions.reduce((sum, p) => sum + p.interestAccruedUsd, 0)
  const netPosition = totalSupplied - totalBorrowed

  const getHealthColor = (hf: number) => {
    if (hf >= 2) return "text-emerald-500"
    if (hf >= 1.5) return "text-green-500"
    if (hf >= 1.2) return "text-amber-500"
    return "text-red-500"
  }

  const getHealthBadge = (hf: number) => {
    if (hf >= 2) return { label: "Safe", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" }
    if (hf >= 1.5) return { label: "Healthy", color: "bg-green-500/10 text-green-500 border-green-500/30" }
    if (hf >= 1.2) return { label: "Monitor", color: "bg-amber-500/10 text-amber-500 border-amber-500/30" }
    return { label: "At Risk", color: "bg-red-500/10 text-red-500 border-red-500/30" }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Positions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detailed view of all borrow and supply positions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Net Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono tracking-tight ${netPosition >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {netPosition >= 0 ? "+" : ""}{formatUsd(netPosition)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Supply - Borrow</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Total Supplied
              <TrendingUp className="size-3 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totalSupplied)}</p>
            <p className="text-xs text-emerald-500 mt-1">+{formatUsd(totalInterestEarned)} interest earned</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Total Borrowed
              <TrendingDown className="size-3 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totalBorrowed)}</p>
            <p className="text-xs text-red-500 mt-1">-{formatUsd(totalInterestOwed)} interest owed</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Avg Health Factor
              <Shield className="size-3 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-500">1.62x</p>
            <p className="text-xs text-muted-foreground mt-1">Across all positions</p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 p-1 bg-muted/50">
          <TabsTrigger value="borrow" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingDown className="size-4" />
            Borrow Positions ({mockBorrowPositions.length})
          </TabsTrigger>
          <TabsTrigger value="supply" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingUp className="size-4" />
            Supply Positions ({mockSupplyPositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="borrow">
          <Card className="bg-card border-border/60">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Asset / Protocol</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Principal</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Interest Accrued</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Current Balance</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">APY</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Health Factor</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBorrowPositions.map((pos) => {
                    const healthBadge = getHealthBadge(pos.healthFactor || 0)
                    return (
                      <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                              <TrendingDown className="size-5 text-red-500" />
                            </div>
                            <div>
                              <p className="font-semibold">{pos.asset}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs font-mono">{pos.protocol}</Badge>
                                <span className="text-xs text-muted-foreground">{pos.cToken}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-mono font-semibold">{formatUsd(pos.principalUsd)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatNumber(pos.principal, 4)} {pos.asset}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-mono text-red-500">{formatUsd(pos.interestAccruedUsd)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatNumber(pos.interestAccrued, 4)} {pos.asset}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-mono font-semibold">{formatUsd(pos.currentBalanceUsd)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatNumber(pos.currentBalance, 4)} {pos.asset}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-mono text-red-500">{pos.apy}%</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <p className={`font-mono font-bold ${getHealthColor(pos.healthFactor || 0)}`}>
                            {pos.healthFactor?.toFixed(2)}x
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="outline" className={healthBadge.color}>
                            {healthBadge.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supply">
          <Card className="bg-card border-border/60">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Asset / Protocol</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Principal</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Interest Earned</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Current Balance</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">APY</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSupplyPositions.map((pos) => (
                    <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <TrendingUp className="size-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-semibold">{pos.asset}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-xs font-mono">{pos.protocol}</Badge>
                              <span className="text-xs text-muted-foreground">{pos.cToken}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-mono font-semibold">{formatUsd(pos.principalUsd)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatNumber(pos.principal, 4)} {pos.asset}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-mono text-emerald-500">+{formatUsd(pos.interestAccruedUsd)}</p>
                        <p className="text-xs text-muted-foreground font-mono">+{formatNumber(pos.interestAccrued, 4)} {pos.asset}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-mono font-semibold">{formatUsd(pos.currentBalanceUsd)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatNumber(pos.currentBalance, 4)} {pos.asset}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-mono text-emerald-500">{pos.apy}%</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function PositionsPage() {
  return (
    <AppShell>
      <PositionsContent />
    </AppShell>
  )
}
