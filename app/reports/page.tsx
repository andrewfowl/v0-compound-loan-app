"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Download, 
  FileText, 
  RefreshCw, 
  Share2,
  File,
  Table2,
  Eye,
  Loader2
} from "lucide-react"
import Link from "next/link"

const packetContents = [
  { name: "Executive Summary", count: 1, format: "PDF", status: "Generated" },
  { name: "Protocol Overview", count: 1, format: "PDF", status: "Generated" },
  { name: "Reconciliation Summary", count: 1, format: "PDF", status: "Generated" },
  { name: "Support Schedules", count: 46, format: "XLSX", status: "Generated" },
  { name: "Transaction Detail", count: 12, format: "CSV", status: "Generated" },
  { name: "Audit Trail & Logs", count: 1, format: "PDF", status: "Generated" },
]

const reconciliationChecklist = [
  { item: "USDC Cash Balance", status: "Matched", hasEvidence: true },
  { item: "cUSDC Supply", status: "Matched", hasEvidence: true },
  { item: "Interest Accrual", status: "Matched", hasEvidence: true },
  { item: "Reserve Factor", status: "Matched", hasEvidence: true },
  { item: "Liquidation Activity", status: "Investigating", hasEvidence: true },
  { item: "Protocol Fees", status: "Matched", hasEvidence: true },
]

const interestScheduleData = [
  { date: "May 12", balance: 94210.33, interest: 1234.59, endBalance: 95444.92 },
  { date: "May 13", balance: 95444.92, interest: 1278.41, endBalance: 96723.33 },
  { date: "May 14", balance: 96723.33, interest: 1312.18, endBalance: 98035.51 },
  { date: "May 15", balance: 98035.51, interest: 1356.72, endBalance: 99392.23 },
  { date: "May 16", balance: 99392.23, interest: 1401.45, endBalance: 100793.68 },
  { date: "May 17", balance: 100793.68, interest: 1448.92, endBalance: 102242.60 },
  { date: "May 18", balance: 102242.60, interest: 1498.33, endBalance: 103740.93 },
  { date: "May 19", balance: 103740.93, interest: 1550.21, endBalance: 105291.14 },
]

export default function ReportsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"PDF" | "Excel" | "CSV">("Excel")
  const [showShareToast, setShowShareToast] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    // Simulate export generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create a mock download
    const blob = new Blob([`Compound v3 Weekly Report Packet\nFormat: ${exportFormat}\nGenerated: ${new Date().toISOString()}\n\nThis is a sample export file.`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compound-report-packet-${new Date().toISOString().split('T')[0]}.${exportFormat.toLowerCase() === 'excel' ? 'xlsx' : exportFormat.toLowerCase()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setIsExporting(false)
  }

  const handleShare = async () => {
    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Compound v3 Weekly Report Packet',
          text: 'Complete working papers with reconciliations, support schedules, and activity summaries.',
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or error - fall back to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    setShowShareToast(true)
    setTimeout(() => setShowShareToast(false), 3000)
  }

  const formatUsd = (val: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)

  // Calculate chart max for scaling
  const maxBalance = Math.max(...interestScheduleData.map(d => d.endBalance))

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="size-8">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Audit Report Packet</h1>
              <p className="text-sm text-muted-foreground">Generate and export working papers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="size-4" />
              May 12 – May 19, 2024
            </Button>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-primary border-primary">
              <CheckCircle2 className="size-3.5" />
              Verified
            </Badge>
          </div>
        </div>

        {/* Main Report Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Compound v3 Weekly Report Packet</CardTitle>
            <p className="text-sm text-muted-foreground">May 12 – May 19, 2024</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete working papers with reconciliations, support schedules, and activity summaries.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Total Reports</p>
                <p className="text-3xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">All reports generated</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Reconciliations</p>
                <p className="text-3xl font-bold">28</p>
                <p className="text-xs text-muted-foreground">All completed</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Support Schedules</p>
                <p className="text-3xl font-bold">46</p>
                <p className="text-xs text-muted-foreground">All generated</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Status</p>
                <p className="text-3xl font-bold text-primary">Verified</p>
                <p className="text-xs text-muted-foreground">Audit-ready</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Packet Contents */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Packet Contents</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground"></th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground"></th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground"></th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {packetContents.map((item, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5 flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            {item.name}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{item.count}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{item.format}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-primary text-xs font-medium">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reconciliation Summary Donut */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Reconciliation Summary</h3>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative size-28 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle 
                          cx="18" cy="18" r="15.915" fill="none" 
                          stroke="hsl(var(--primary))" strokeWidth="3"
                          strokeDasharray="85.7 14.3" strokeLinecap="round"
                        />
                        <circle 
                          cx="18" cy="18" r="15.915" fill="none" 
                          stroke="hsl(var(--warning))" strokeWidth="3"
                          strokeDasharray="10.7 89.3" strokeDashoffset="-85.7" strokeLinecap="round"
                        />
                        <circle 
                          cx="18" cy="18" r="15.915" fill="none" 
                          stroke="hsl(var(--info))" strokeWidth="3"
                          strokeDasharray="3.6 96.4" strokeDashoffset="-96.4" strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    {/* Legend */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Matched</span>
                        <span className="ml-auto font-mono">24</span>
                        <span className="text-muted-foreground">85.7%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-warning" />
                        <span className="text-muted-foreground">Investigating</span>
                        <span className="ml-auto font-mono">3</span>
                        <span className="text-muted-foreground">10.7%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-info" />
                        <span className="text-muted-foreground">Unmatched</span>
                        <span className="ml-auto font-mono">1</span>
                        <span className="text-muted-foreground">3.6%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Export Packet</h4>
                    <p className="text-xs text-muted-foreground">Choose format</p>
                  </div>
                  <div className="flex gap-2">
                    {(["PDF", "Excel", "CSV"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        variant={exportFormat === fmt ? "default" : "outline"}
                        size="sm"
                        onClick={() => setExportFormat(fmt)}
                        className="flex-1"
                      >
                        {fmt}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        Export Report Packet
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row - 3 Cards */}
        <div className="grid grid-cols-3 gap-6">
          {/* Reconciliation Checklist */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Reconciliation Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Check Item</th>
                    <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationChecklist.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{item.item}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${
                          item.status === "Matched" ? "text-primary" : "text-warning"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Support Schedules */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Support Schedules</CardTitle>
              <p className="text-xs text-muted-foreground">Interest Accrual Schedule (cUSDC)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mini Chart */}
              <div className="h-24 flex items-end gap-0.5">
                {interestScheduleData.map((d, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-primary/80 rounded-t transition-all hover:bg-primary"
                    style={{ height: `${(d.endBalance / maxBalance) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                {interestScheduleData.map((d, i) => (
                  <span key={i}>{d.date.split(' ')[1]}</span>
                ))}
              </div>

              {/* Table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-1.5 font-medium text-muted-foreground">Date</th>
                    <th className="text-right pb-1.5 font-medium text-muted-foreground">Begin Balance</th>
                    <th className="text-right pb-1.5 font-medium text-muted-foreground">Interest</th>
                    <th className="text-right pb-1.5 font-medium text-muted-foreground">End Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {interestScheduleData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5">{row.date}</td>
                      <td className="py-1.5 text-right font-mono">{formatUsd(row.balance)}</td>
                      <td className="py-1.5 text-right font-mono">{formatUsd(row.interest)}</td>
                      <td className="py-1.5 text-right font-mono">{formatUsd(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-muted/50 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <File className="size-12 opacity-50" />
                <div className="text-center">
                  <p className="text-sm font-medium">Report Preview</p>
                  <p className="text-xs">Click to view full report</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 mt-2">
                  <Eye className="size-4" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleShare}
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Refresh
              </>
            )}
          </Button>
          <Button 
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Export All
              </>
            )}
          </Button>
        </div>

        {/* Share Toast */}
        {showShareToast && (
          <div className="fixed bottom-6 right-6 bg-card border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="size-5 text-primary" />
            <span className="text-sm">Link copied to clipboard</span>
          </div>
        )}
      </div>
    </AppShell>
  )
}
