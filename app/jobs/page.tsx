"use client"

import useSWR from "swr"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  ChevronLeft,
  RotateCw,
  Download,
  ExternalLink,
  Inbox,
} from "lucide-react"

// Backend job shape — map loosely so we handle evolving API responses
interface BackendJob {
  id?: string
  jobId?: string
  walletAddress?: string
  wallet_address?: string
  status?: string
  state?: string
  period?: string
  reportEndMonth?: string
  report_end_month?: string
  startedAt?: string
  started_at?: string
  createdAt?: string
  created_at?: string
  completedAt?: string
  completed_at?: string
  progress?: number
  reportsGenerated?: number
  reports_generated?: number
  network?: string
}

interface NormalizedJob {
  id: string
  walletAddress: string
  status: "queued" | "processing" | "completed" | "failed"
  period: string
  startedAt: string
  completedAt?: string
  progress?: number
  reportsGenerated?: number
  network: string
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
    walletAddress: j.walletAddress ?? j.wallet_address ?? "0x0000000000000000000000000000000000000000",
    status: normalizeStatus(j.status ?? j.state),
    period: j.period ?? j.reportEndMonth ?? j.report_end_month ?? "—",
    startedAt: j.startedAt ?? j.started_at ?? j.createdAt ?? j.created_at ?? new Date().toISOString(),
    completedAt: j.completedAt ?? j.completed_at,
    progress: j.progress,
    reportsGenerated: j.reportsGenerated ?? j.reports_generated,
    network: j.network ?? "Ethereum",
  }
}

function formatAddress(addr: string) {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

export default function JobsPage() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR(
    "/api/indexing/jobs",
    fetcher,
    { refreshInterval: 15000 }
  )

  // Normalize whatever shape the backend returns
  const rawJobs: BackendJob[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.jobs)
    ? data.jobs
    : Array.isArray(data?.data)
    ? data.data
    : []

  const jobs: NormalizedJob[] = rawJobs.map(normalizeJob)

  const completedCount = jobs.filter((j) => j.status === "completed").length
  const processingCount = jobs.filter((j) => j.status === "processing").length
  const queuedCount = jobs.filter((j) => j.status === "queued").length
  const failedCount = jobs.filter((j) => j.status === "failed").length

  return (
    <AppShell>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-2"
              onClick={() => router.back()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Indexing Jobs</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                All wallet indexing jobs and their current status
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCw className="size-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-success">{completedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {jobs.length > 0 ? `${((completedCount / jobs.length) * 100).toFixed(0)}% of total` : "No jobs yet"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-primary">{processingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">In progress now</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Queued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{queuedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting to start</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-destructive">{failedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Needs retry</p>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              All Jobs
              {jobs.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({jobs.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Loading jobs...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertCircle className="size-8 text-destructive/60" />
                <p className="text-sm font-medium">Failed to load jobs</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {error.message ?? "Could not reach the backend. Check your connection and try again."}
                </p>
                <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-2 gap-2">
                  <RotateCw className="size-3.5" />
                  Retry
                </Button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Inbox className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No jobs yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Indexing jobs will appear here once wallets are added and processing begins.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 hover:bg-muted/10 border-b border-border/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Wallet</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Network</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Period</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Progress</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Reports</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                        Started
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="border-b border-border/30 hover:bg-muted/25 transition-colors"
                      >
                        <TableCell className="font-mono text-xs">
                          {formatAddress(job.walletAddress)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {job.network}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{job.period}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {job.status === "completed" && (
                              <CheckCircle2 className="size-4 text-success" />
                            )}
                            {job.status === "processing" && (
                              <Loader2 className="size-4 text-primary animate-spin" />
                            )}
                            {job.status === "queued" && (
                              <Clock className="size-4 text-muted-foreground" />
                            )}
                            {job.status === "failed" && (
                              <AlertCircle className="size-4 text-destructive" />
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                job.status === "completed"
                                  ? "border-success/50 text-success bg-success/5"
                                  : job.status === "processing"
                                  ? "border-primary/50 text-primary bg-primary/5"
                                  : job.status === "queued"
                                  ? "border-muted-foreground/50 text-muted-foreground"
                                  : "border-destructive/50 text-destructive bg-destructive/5"
                              }`}
                            >
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.status === "processing" && job.progress !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{job.progress}%</span>
                            </div>
                          ) : job.status === "completed" ? (
                            <span className="text-xs text-muted-foreground">100%</span>
                          ) : job.status === "failed" ? (
                            <span className="text-xs text-destructive">Error</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {job.reportsGenerated != null ? (
                            <span>{job.reportsGenerated}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                          {new Date(job.startedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
