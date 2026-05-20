"use client"

import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { 
  RefreshCw,
  Download,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react"
import {
  mockPositions,
  mockActivity,
  formatAddress,
  formatUsd,
  type WalletPosition,
  type RecentActivity,
} from "@/lib/mock-data"

// Normalize backend job shape — same logic as jobs/page.tsx
interface BackendJob {
  id?: string; jobId?: string
  walletAddress?: string; wallet_address?: string
  status?: string; state?: string
  period?: string; reportEndMonth?: string; report_end_month?: string
  startedAt?: string; started_at?: string; createdAt?: string; created_at?: string
  progress?: number
}
interface NormalizedJob {
  id: string; walletAddress: string
  status: "queued" | "processing" | "completed" | "failed"
  period: string; startedAt: string; progress?: number
}
function normalizeStatus(raw?: string): NormalizedJob["status"] {
  const s = (raw ?? "").toLowerCase()
  if (s === "completed" || s === "done" || s === "success") return "completed"
  if (s === "processing" || s === "running" || s === "in_progress") return "processing"
  if (s === "failed" || s === "error") return "failed"
  return "queued"
}
function normalizeJob(j: BackendJob): NormalizedJob {
  return {
    id: j.id ?? j.jobId ?? crypto.randomUUID(),
    walletAddress: j.walletAddress ?? j.wallet_address ?? "",
    status: normalizeStatus(j.status ?? j.state),
    period: j.period ?? j.reportEndMonth ?? j.report_end_month ?? "—",
    startedAt: j.startedAt ?? j.started_at ?? j.createdAt ?? j.created_at ?? new Date().toISOString(),
    progress: j.progress,
  }
}

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })

function DashboardContent() {
  const router = useRouter()
  const [positions] = useState<WalletPosition[]>(mockPositions)
  const [activity] = useState<RecentActivity[]>(mockActivity)
  const [syncing, setSyncing] = useState(false)

  const { data: jobsData, isLoading: jobsLoading, mutate: mutateJobs } = useSWR(
    "/api/indexing/jobs",
    fetcher,
    { refreshInterval: 30000 }
  )

  const rawJobs: BackendJob[] = Array.isArray(jobsData)
    ? jobsData
    : Array.isArray(jobsData?.jobs) ? jobsData.jobs
    : Array.isArray(jobsData?.data) ? jobsData.data
    : []
  const jobs: NormalizedJob[] = rawJobs.map(normalizeJob)

  const totalBorrowed = positions.reduce((sum, p) => sum + p.principalUsd, 0)
  const totalCollateral = 8640000
  const accruedInterest = 38294
  const openJeDrafts = 7

  const handleSync = () => {
    setSyncing(true)
    mutateJobs()
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
              <span className="text-positive">+$240k</span> since last period
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
                          act.type === "Supply" ? "border-success/50 text-success" :
                          act.type === "Borrow" ? "border-foreground/30 text-foreground/70" :
                          act.type === "Repay" ? "border-warning/50 text-warning" :
                          "border-destructive/50 text-destructive"
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
              {jobsLoading ? "Loading..." : `${completedJobs} completed, ${processingJobs} processing`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/jobs")}>
            View All
            <ChevronRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground justify-center">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Inbox className="size-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No indexing jobs yet</p>
              <p className="text-xs text-muted-foreground/70">Jobs will appear here once wallets are added.</p>
            </div>
          ) : (
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
                {jobs.slice(0, 5).map((job) => (
                  <tr key={job.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{formatAddress(job.walletAddress)}</td>
                    <td className="px-4 py-3 text-xs">{job.period}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {job.status === "completed" && <CheckCircle2 className="size-4 text-success" />}
                        {job.status === "processing" && <Loader2 className="size-4 text-primary animate-spin" />}
                        {job.status === "queued" && <Clock className="size-4 text-muted-foreground" />}
                        {job.status === "failed" && <AlertCircle className="size-4 text-destructive" />}
                        <span className={`text-xs capitalize ${
                          job.status === "completed" ? "text-success" :
                          job.status === "processing" ? "text-primary" :
                          job.status === "failed" ? "text-destructive" :
                          "text-muted-foreground"
                        }`}>{job.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {job.status === "processing" && job.progress !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress}%` }} />
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
                      {new Date(job.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
