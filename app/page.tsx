"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { 
  RefreshCw,
  Download,
  Wallet,
  TrendingUp,
  Clock,
  FileText,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

// Sample wallet addresses
const SAMPLE_WALLETS = [
  { address: "0xd043c56861F3e80b2C5580d7044a6771F802565D", label: "Treasury 1" },
  { address: "0x462cbA2dC7e2709143BcaCC86ec106354cf82108", label: "Treasury 2" },
  { address: "0xCB1096E77d6eAb734ffCEced1Fcd2D35EE6b8d15", label: "Operations" },
]

type JobStatus = "queued" | "processing" | "completed" | "failed"

interface Job {
  id: string
  walletAddress: string
  status: JobStatus
  period: string
  startedAt: string
  completedAt?: string
  progress?: number
}

interface WalletPosition {
  asset: string
  protocol: string
  protocolVersion: "v2" | "v3"
  principal: number
  principalUsd: number
  collateralRatio: number
}

interface RecentActivity {
  date: string
  type: "Supply" | "Borrow" | "Repay" | "Withdraw"
  asset: string
  amount: number
}

// Mock data for demo
const mockJobs: Job[] = [
  { id: "job_1", walletAddress: "0xd043...565D", status: "completed", period: "2025-03", startedAt: "2025-03-28T10:00:00Z", completedAt: "2025-03-28T10:02:30Z" },
  { id: "job_2", walletAddress: "0x462c...2108", status: "processing", period: "2025-03", startedAt: "2025-03-28T10:05:00Z", progress: 67 },
  { id: "job_3", walletAddress: "0xCB10...8d15", status: "queued", period: "2025-03", startedAt: "2025-03-28T10:06:00Z" },
]

const mockPositions: WalletPosition[] = [
  { asset: "USDC", protocol: "cUSDCv3", protocolVersion: "v3", principal: 2847500, principalUsd: 2847500, collateralRatio: 149 },
  { asset: "USDC", protocol: "cUSDC", protocolVersion: "v2", principal: 1100000, principalUsd: 1100000, collateralRatio: 128 },
  { asset: "ETH", protocol: "cETH", protocolVersion: "v2", principal: 0.077, principalUsd: 270900, collateralRatio: 210 },
]

const mockActivity: RecentActivity[] = [
  { date: "Mar 28", type: "Repay", asset: "USDC", amount: 500000 },
  { date: "Mar 15", type: "Supply", asset: "WBTC", amount: 240000 },
  { date: "Mar 02", type: "Borrow", asset: "USDC", amount: 1100000 },
  { date: "Feb 18", type: "Supply", asset: "ETH", amount: 3200000 },
  { date: "Feb 01", type: "Borrow", asset: "USDC", amount: 2847500 },
]

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function DashboardContent() {
  const router = useRouter()
  const [jobs] = useState<Job[]>(mockJobs)
  const [positions] = useState<WalletPosition[]>(mockPositions)
  const [activity] = useState<RecentActivity[]>(mockActivity)
  const [syncing, setSyncing] = useState(false)

  // Calculate totals
  const totalBorrowed = positions.reduce((sum, p) => sum + p.principalUsd, 0)
  const totalCollateral = 8640000 // Mock value
  const accruedInterest = 38294 // Mock value
  const openJeDrafts = 7 // Mock value

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 2000)
  }

  const completedJobs = jobs.filter(j => j.status === "completed").length
  const processingJobs = jobs.filter(j => j.status === "processing").length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Period: Q1 2025</span>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync Onchain
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Total Borrowed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totalBorrowed)}</p>
            <p className="text-xs text-muted-foreground mt-1">USDC + ETH combined</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Collateral Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(totalCollateral)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500">+$240k</span> since last period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Accrued Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatUsd(accruedInterest)}</p>
            <p className="text-xs text-muted-foreground mt-1">YTD through Mar 31, 2025</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Open JE Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{openJeDrafts}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Borrow Positions */}
        <Card className="bg-card border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Open Borrow Positions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">As of March 31, 2025</p>
            </div>
            <Badge variant="outline" className="text-xs">{positions.length} Active</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Asset</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Protocol</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Principal</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Collateral Ratio</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => (
                  <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold">{pos.asset}</p>
                        <p className="text-xs text-muted-foreground">{pos.protocol}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {pos.protocolVersion} · ETH
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono font-semibold">{formatUsd(pos.principalUsd)}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {pos.principal.toLocaleString()} {pos.asset}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${pos.collateralRatio > 150 ? 'bg-emerald-500' : pos.collateralRatio > 120 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(pos.collateralRatio / 2, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm w-12">{pos.collateralRatio}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Latest onchain events</p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Asset</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((act, idx) => (
                  <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{act.date}</td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          act.type === "Supply" ? "border-emerald-500/50 text-emerald-500" :
                          act.type === "Borrow" ? "border-blue-500/50 text-blue-500" :
                          act.type === "Repay" ? "border-amber-500/50 text-amber-500" :
                          "border-red-500/50 text-red-500"
                        }`}
                      >
                        {act.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{act.asset}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatUsd(act.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Status Section */}
      <Card className="bg-card border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Indexing Jobs</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedJobs} completed, {processingJobs} processing
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/jobs")}>
            View All
            <ChevronRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Wallet</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Period</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Progress</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{job.walletAddress}</td>
                  <td className="px-4 py-3">{job.period}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && <CheckCircle2 className="size-4 text-emerald-500" />}
                      {job.status === "processing" && <Loader2 className="size-4 text-blue-500 animate-spin" />}
                      {job.status === "queued" && <Clock className="size-4 text-muted-foreground" />}
                      {job.status === "failed" && <AlertCircle className="size-4 text-red-500" />}
                      <span className={`text-sm capitalize ${
                        job.status === "completed" ? "text-emerald-500" :
                        job.status === "processing" ? "text-blue-500" :
                        job.status === "failed" ? "text-red-500" :
                        "text-muted-foreground"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {job.status === "processing" && job.progress !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{job.progress}%</span>
                      </div>
                    ) : job.status === "completed" ? (
                      <span className="text-xs text-muted-foreground">100%</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {new Date(job.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Wallets Section */}
      <Card className="bg-card border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Portfolio Wallets</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Managed wallet addresses</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-4" />
            Add Wallet
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_WALLETS.map((wallet) => (
              <div 
                key={wallet.address}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/activity/${wallet.address}`)}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wallet.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{formatAddress(wallet.address)}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Synced 2 min ago
        </div>
        <span>Wallet: 0x4f2a...8bc3</span>
        <span>Compound v2 + v3</span>
        <span>Ethereum Mainnet</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}
