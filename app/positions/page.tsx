"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  HelpCircle,
  Wallet,
  ChevronRight,
  Lock,
  Zap,
  AlertCircle,
} from "lucide-react"
import { SAMPLE_WALLETS } from "@/lib/mock-data"

// Unified wallet position showing collateral and borrows together
interface WalletPositionData {
  walletAddress: string
  walletLabel: string
  network: string
  protocol: "v2" | "v3"
  // Collateral (supplied assets)
  collateral: {
    asset: string
    cToken: string
    amount: number
    amountUsd: number
    interestEarned: number
    interestEarnedUsd: number
    apy: number
    collateralFactor: number // e.g. 0.83 means 83% can be borrowed against
  }[]
  // Borrow obligations
  borrows: {
    asset: string
    cToken: string
    amount: number
    amountUsd: number
    interestOwed: number
    interestOwedUsd: number
    apy: number
  }[]
  // Computed metrics
  totalCollateralUsd: number
  totalBorrowedUsd: number
  borrowCapacityUsd: number // Max borrowable based on collateral factors
  availableToBorrowUsd: number // borrowCapacity - totalBorrowed
  healthFactor: number
  liquidationThreshold: number // % at which liquidation occurs
  liquidationPriceChange: number // % price drop before liquidation
}

// Mock wallet positions with unified data
const mockWalletPositions: WalletPositionData[] = [
  {
    walletAddress: "0xd043c56861F3e80b2C5580d7044a6771F802565D",
    walletLabel: "Treasury 1",
    network: "Ethereum",
    protocol: "v3",
    collateral: [
      {
        asset: "WBTC",
        cToken: "cWBTCv3",
        amount: 3.5,
        amountUsd: 4230000,
        interestEarned: 0.012,
        interestEarnedUsd: 14496,
        apy: 0.4,
        collateralFactor: 0.70,
      },
      {
        asset: "ETH",
        cToken: "cETHv3",
        amount: 1250,
        amountUsd: 4437500,
        interestEarned: 2.8,
        interestEarnedUsd: 9940,
        apy: 2.1,
        collateralFactor: 0.83,
      },
    ],
    borrows: [
      {
        asset: "USDC",
        cToken: "cUSDCv3",
        amount: 2847500,
        amountUsd: 2847500,
        interestOwed: 12840,
        interestOwedUsd: 12840,
        apy: 5.2,
      },
    ],
    totalCollateralUsd: 8691936,
    totalBorrowedUsd: 2860340,
    borrowCapacityUsd: 6644125, // weighted by collateral factors
    availableToBorrowUsd: 3783785,
    healthFactor: 1.93,
    liquidationThreshold: 0.85,
    liquidationPriceChange: -48.2,
  },
  {
    walletAddress: "0x462cbA2dC7e2709143BcaCC86ec106354cf82108",
    walletLabel: "Treasury 2",
    network: "Ethereum",
    protocol: "v2",
    collateral: [
      {
        asset: "ETH",
        cToken: "cETH",
        amount: 420,
        amountUsd: 1491000,
        interestEarned: 0.84,
        interestEarnedUsd: 2982,
        apy: 1.8,
        collateralFactor: 0.82,
      },
    ],
    borrows: [
      {
        asset: "USDC",
        cToken: "cUSDC",
        amount: 1100000,
        amountUsd: 1100000,
        interestOwed: 4820,
        interestOwedUsd: 4820,
        apy: 4.8,
      },
    ],
    totalCollateralUsd: 1493982,
    totalBorrowedUsd: 1104820,
    borrowCapacityUsd: 1225066,
    availableToBorrowUsd: 120246,
    healthFactor: 1.11,
    liquidationThreshold: 0.85,
    liquidationPriceChange: -9.5,
  },
  {
    walletAddress: "0xCB1096E77d6eAb734ffCEcd1Fcd2D35EE6b8d15",
    walletLabel: "Operations",
    network: "Ethereum",
    protocol: "v2",
    collateral: [
      {
        asset: "WBTC",
        cToken: "cWBTC",
        amount: 0.85,
        amountUsd: 1027000,
        interestEarned: 0.0028,
        interestEarnedUsd: 3382,
        apy: 0.35,
        collateralFactor: 0.70,
      },
    ],
    borrows: [
      {
        asset: "ETH",
        cToken: "cETH",
        amount: 0.077,
        amountUsd: 270900,
        interestOwed: 0.0021,
        interestOwedUsd: 7380,
        apy: 3.1,
      },
    ],
    totalCollateralUsd: 1030382,
    totalBorrowedUsd: 278280,
    borrowCapacityUsd: 721267,
    availableToBorrowUsd: 442987,
    healthFactor: 2.59,
    liquidationThreshold: 0.85,
    liquidationPriceChange: -61.3,
  },
]

function formatUsd(value: number) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatUsdFull(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function PositionsContent() {
  const [selectedWallet, setSelectedWallet] = useState<string>("all")

  const positions = selectedWallet === "all" 
    ? mockWalletPositions 
    : mockWalletPositions.filter(p => p.walletAddress === selectedWallet)

  // Aggregate totals
  const totals = positions.reduce((acc, p) => ({
    collateral: acc.collateral + p.totalCollateralUsd,
    borrowed: acc.borrowed + p.totalBorrowedUsd,
    availableToBorrow: acc.availableToBorrow + p.availableToBorrowUsd,
    interestEarned: acc.interestEarned + p.collateral.reduce((s, c) => s + c.interestEarnedUsd, 0),
    interestOwed: acc.interestOwed + p.borrows.reduce((s, b) => s + b.interestOwedUsd, 0),
  }), { collateral: 0, borrowed: 0, availableToBorrow: 0, interestEarned: 0, interestOwed: 0 })

  const avgHealthFactor = positions.length > 0 
    ? positions.reduce((s, p) => s + p.healthFactor, 0) / positions.length 
    : 0

  const getHealthColor = (hf: number) => {
    if (hf >= 2) return "text-success"
    if (hf >= 1.5) return "text-success"
    if (hf >= 1.2) return "text-warning"
    return "text-destructive"
  }

  const getHealthBadge = (hf: number) => {
    if (hf >= 2) return { label: "Safe", color: "bg-success/10 text-success border-success/30", icon: Shield }
    if (hf >= 1.5) return { label: "Healthy", color: "bg-success/10 text-success border-success/30", icon: Shield }
    if (hf >= 1.2) return { label: "Monitor", color: "bg-warning/10 text-warning border-warning/30", icon: AlertTriangle }
    return { label: "At Risk", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertCircle }
  }

  const getRiskLevel = (priceChange: number) => {
    if (priceChange <= -50) return { label: "Low Risk", color: "text-success" }
    if (priceChange <= -25) return { label: "Medium", color: "text-warning" }
    return { label: "High Risk", color: "text-destructive" }
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Positions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified view of collateral, borrows, and liquidation risk by wallet
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedWallet} onValueChange={setSelectedWallet}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="All Wallets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wallets</SelectItem>
              {mockWalletPositions.map(p => (
                <SelectItem key={p.walletAddress} value={p.walletAddress}>
                  {p.walletLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Total Collateral
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Assets supplied to secure borrow positions. Earns interest while locked as collateral.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totals.collateral)}</p>
            <p className="text-xs text-positive mt-1">+{formatUsd(totals.interestEarned)} earned</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Total Borrowed
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Outstanding loan obligations secured by collateral. Accrues interest expense.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totals.borrowed)}</p>
            <p className="text-xs text-negative mt-1">-{formatUsd(totals.interestOwed)} owed</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Available to Borrow
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Remaining borrowing capacity based on collateral factors. (Borrow Capacity - Current Borrows)
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-primary">{formatUsd(totals.availableToBorrow)}</p>
            <p className="text-xs text-muted-foreground mt-1">Unused capacity</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Avg Health Factor
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Collateral value vs liquidation threshold. Above 1.0 = safe. Below 1.0 = liquidation risk.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono tracking-tight ${getHealthColor(avgHealthFactor)}`}>
              {avgHealthFactor.toFixed(2)}x
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across {positions.length} wallets</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Net Interest
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Interest earned on collateral minus interest owed on borrows.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono tracking-tight ${totals.interestEarned - totals.interestOwed >= 0 ? "text-positive" : "text-negative"}`}>
              {totals.interestEarned - totals.interestOwed >= 0 ? "+" : ""}{formatUsd(totals.interestEarned - totals.interestOwed)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Earned - Owed</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Position Cards */}
      <div className="space-y-4">
        {positions.map((pos) => {
          const healthBadge = getHealthBadge(pos.healthFactor)
          const riskLevel = getRiskLevel(pos.liquidationPriceChange)
          const HealthIcon = healthBadge.icon
          const utilizationPercent = pos.borrowCapacityUsd > 0 
            ? ((pos.totalBorrowedUsd / pos.borrowCapacityUsd) * 100).toFixed(0)
            : 0

          return (
            <Card key={pos.walletAddress} className="bg-card border-border/60">
              {/* Wallet Header */}
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Wallet className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{pos.walletLabel}</p>
                        <Badge variant="secondary" className="text-xs font-mono">{pos.protocol}</Badge>
                        <Badge variant="outline" className="text-xs">{pos.network}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{formatAddress(pos.walletAddress)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Health Factor */}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Health Factor</p>
                      <div className="flex items-center gap-2 justify-end">
                        <p className={`text-lg font-bold font-mono ${getHealthColor(pos.healthFactor)}`}>
                          {pos.healthFactor.toFixed(2)}x
                        </p>
                        <Badge variant="outline" className={`${healthBadge.color} gap-1`}>
                          <HealthIcon className="size-3" />
                          {healthBadge.label}
                        </Badge>
                      </div>
                    </div>
                    {/* Liquidation Risk */}
                    <div className="text-right border-l border-border/50 pl-4">
                      <p className="text-xs text-muted-foreground">Liquidation at</p>
                      <div className="flex items-center gap-2 justify-end">
                        <p className={`text-sm font-mono ${riskLevel.color}`}>
                          {pos.liquidationPriceChange.toFixed(1)}% drop
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-xs">
                            Collateral price would need to drop {Math.abs(pos.liquidationPriceChange).toFixed(1)}% for liquidation to begin.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Collateral Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">Collateral Supplied</h3>
                      </div>
                      <p className="text-sm font-mono font-semibold">{formatUsd(pos.totalCollateralUsd)}</p>
                    </div>
                    <div className="space-y-2">
                      {pos.collateral.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded bg-primary/10">
                              <TrendingUp className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.asset}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(c.amount, 4)} @ {(c.collateralFactor * 100).toFixed(0)}% CF
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-semibold">{formatUsd(c.amountUsd)}</p>
                            <p className="text-xs text-positive">+{formatUsd(c.interestEarnedUsd)} ({c.apy}% APY)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Borrows Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-4 text-destructive" />
                        <h3 className="text-sm font-semibold">Borrow Obligations</h3>
                      </div>
                      <p className="text-sm font-mono font-semibold">{formatUsd(pos.totalBorrowedUsd)}</p>
                    </div>
                    <div className="space-y-2">
                      {pos.borrows.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded bg-destructive/10">
                              <TrendingDown className="size-4 text-destructive" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{b.asset}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(b.amount, b.amount < 1 ? 4 : 0)} borrowed
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-semibold">{formatUsd(b.amountUsd)}</p>
                            <p className="text-xs text-negative">-{formatUsd(b.interestOwedUsd)} ({b.apy}% APY)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Borrow Capacity Bar */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-primary" />
                      <span className="text-sm font-medium">Borrow Capacity</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="size-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          Maximum you can borrow based on collateral factors. Using more increases liquidation risk.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{utilizationPercent}% used</span>
                      <span className="text-sm font-mono">
                        {formatUsd(pos.totalBorrowedUsd)} / {formatUsd(pos.borrowCapacityUsd)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        Number(utilizationPercent) >= 90 ? "bg-destructive" :
                        Number(utilizationPercent) >= 75 ? "bg-warning" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(Number(utilizationPercent), 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      <span className="text-primary font-medium">{formatUsd(pos.availableToBorrowUsd)}</span> available to borrow
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Liquidation threshold: {(pos.liquidationThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {positions.length === 0 && (
        <Card className="bg-card border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">No positions found for selected wallet</p>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  )
}

export default function PositionsPage() {
  return (
    <AppShell>
      <PositionsContent />
    </AppShell>
  )
}
