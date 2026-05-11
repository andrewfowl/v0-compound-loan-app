"use client"

import { useState } from "react"
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
} from "lucide-react"

interface Job {
  id: string
  walletAddress: string
  status: "completed" | "processing" | "queued" | "failed"
  period: string
  startedAt: string
  completedAt?: string
  progress?: number
}

const mockJobs: Job[] = [
  { id: "job_1", walletAddress: "0xd043...565D", status: "completed", period: "2025-03", startedAt: "2025-03-28T10:00:00Z", completedAt: "2025-03-28T10:02:30Z" },
  { id: "job_2", walletAddress: "0x462c...2108", status: "processing", period: "2025-03", startedAt: "2025-03-28T10:05:00Z", progress: 67 },
  { id: "job_3", walletAddress: "0xCB10...8d15", status: "queued", period: "2025-03", startedAt: "2025-03-28T10:06:00Z" },
  { id: "job_4", walletAddress: "0x1f2c...9a1f", status: "completed", period: "2025-02", startedAt: "2025-02-28T14:30:00Z", completedAt: "2025-02-28T14:35:15Z" },
  { id: "job_5", walletAddress: "0x3d4e...5b2a", status: "failed", period: "2025-02", startedAt: "2025-02-27T09:15:00Z" },
  { id: "job_6", walletAddress: "0x2e5f...7c3d", status: "completed", period: "2025-01", startedAt: "2025-01-31T11:45:00Z", completedAt: "2025-01-31T11:52:00Z" },
]

export default function JobsPage() {
  const [jobs] = useState<Job[]>(mockJobs)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 2000)
  }

  const completedCount = jobs.filter(j => j.status === "completed").length
  const processingCount = jobs.filter(j => j.status === "processing").length
  const queuedCount = jobs.filter(j => j.status === "queued").length
  const failedCount = jobs.filter(j => j.status === "failed").length

  return (
    <AppShell>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
              <ChevronLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Indexing Jobs</h1>
              <p className="text-sm text-muted-foreground mt-0.5">View all wallet indexing jobs and their status</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCw className="size-4" />
            )}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{completedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{((completedCount / jobs.length) * 100).toFixed(0)}% of total</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{processingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">In progress now</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Queued</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{queuedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting to start</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{failedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Needs retry</p>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">All Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10 border-b border-border/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Wallet</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Period</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Progress</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Started</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="border-b border-border/30 hover:bg-muted/25 transition-colors">
                      <TableCell className="text-xs font-mono text-foreground/70">{job.id}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">{job.walletAddress}</TableCell>
                      <TableCell className="text-xs font-mono">{job.period}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {job.status === "completed" && <CheckCircle2 className="size-4 text-success" />}
                          {job.status === "processing" && <Loader2 className="size-4 text-primary animate-spin" />}
                          {job.status === "queued" && <Clock className="size-4 text-muted-foreground" />}
                          {job.status === "failed" && <AlertCircle className="size-4 text-destructive" />}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              job.status === "completed" ? "border-success/50 text-success bg-success/5" :
                              job.status === "processing" ? "border-primary/50 text-primary bg-primary/5" :
                              job.status === "queued" ? "border-muted-foreground/50 text-muted-foreground" :
                              "border-destructive/50 text-destructive bg-destructive/5"
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
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{job.progress}%</span>
                          </div>
                        ) : job.status === "completed" ? (
                          <span className="text-xs text-muted-foreground">100%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(job.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {job.completedAt 
                          ? new Date(job.completedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
