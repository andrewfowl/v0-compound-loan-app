"use client"

import { useState } from "react"
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
} from "lucide-react"
import { mockJobs, formatAddress, type Job } from "@/lib/mock-data"

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
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Wallet</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Network</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Period</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Progress</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Reports</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="border-b border-border/30 hover:bg-muted/25 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{job.walletLabel || "Unknown"}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">{formatAddress(job.walletAddress)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {job.network || "Ethereum"}
                        </Badge>
                      </TableCell>
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
                        ) : job.status === "failed" ? (
                          <span className="text-xs text-destructive">Error</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">0%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {job.reportsGenerated ? (
                          <span className="text-foreground">{job.reportsGenerated}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {job.status === "completed" && (
                            <Button variant="ghost" size="icon" className="size-7">
                              <Download className="size-3.5" />
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button variant="ghost" size="icon" className="size-7">
                              <RotateCw className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="size-7">
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </div>
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
