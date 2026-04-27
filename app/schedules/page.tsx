"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

interface ScheduleRow {
  period: string
  startBalance: number
  additions: number
  accruals: number
  reductions: number
  endBalance: number
  isSubtotal?: boolean
}

const mockLoanSchedule: ScheduleRow[] = [
  { period: "Jan 2025", startBalance: 0, additions: 2847500, accruals: 4280, reductions: 0, endBalance: 2851780 },
  { period: "Feb 2025", startBalance: 2851780, additions: 1100000, accruals: 8420, reductions: 0, endBalance: 3960200 },
  { period: "Mar 2025", startBalance: 3960200, additions: 270900, accruals: 12594, reductions: 500000, endBalance: 3743694 },
  { period: "Q1 2025 Total", startBalance: 0, additions: 4218400, accruals: 25294, reductions: 500000, endBalance: 3743694, isSubtotal: true },
]

const mockCollateralSchedule: ScheduleRow[] = [
  { period: "Jan 2025", startBalance: 0, additions: 4230000, accruals: 1420, reductions: 0, endBalance: 4231420 },
  { period: "Feb 2025", startBalance: 4231420, additions: 4437500, accruals: 2840, reductions: 0, endBalance: 8671760 },
  { period: "Mar 2025", startBalance: 8671760, additions: 0, accruals: 4180, reductions: 27760, endBalance: 8648180 },
  { period: "Q1 2025 Total", startBalance: 0, additions: 8667500, accruals: 8440, reductions: 27760, endBalance: 8648180, isSubtotal: true },
]

const mockInterestSchedule = [
  { period: "Jan 2025", borrowInterest: 4280, supplyInterest: 1420, netInterest: -2860 },
  { period: "Feb 2025", borrowInterest: 8420, supplyInterest: 2840, netInterest: -5580 },
  { period: "Mar 2025", borrowInterest: 12594, supplyInterest: 4180, netInterest: -8414 },
  { period: "Q1 2025 Total", borrowInterest: 25294, supplyInterest: 8440, netInterest: -16854, isSubtotal: true },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function SchedulesContent() {
  const [activeTab, setActiveTab] = useState("loan")
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>(["Q1 2025 Total"])

  const togglePeriod = (period: string) => {
    setExpandedPeriods(prev => 
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Summary Schedules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Q1 2025 · Loan and Collateral Rollforward</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="size-4" />
            Export All
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Ending Loan Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-red-500">{formatUsd(3743694)}</p>
            <p className="text-xs text-muted-foreground mt-1">As of Mar 31, 2025</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Ending Collateral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-500">{formatUsd(8648180)}</p>
            <p className="text-xs text-muted-foreground mt-1">As of Mar 31, 2025</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Net Interest Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-red-500">{formatUsd(16854)}</p>
            <p className="text-xs text-muted-foreground mt-1">Q1 2025 YTD</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Coverage Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-500">231%</p>
            <p className="text-xs text-muted-foreground mt-1">Collateral / Loan</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 p-1 bg-muted/50">
          <TabsTrigger value="loan" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingDown className="size-4" />
            Loan Schedule
          </TabsTrigger>
          <TabsTrigger value="collateral" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingUp className="size-4" />
            Collateral Schedule
          </TabsTrigger>
          <TabsTrigger value="interest" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Interest Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loan">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Loan Balance Rollforward</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">USDC + ETH combined · Compound v2 & v3</p>
                </div>
                <Badge variant="secondary">ASC 310 Compliant</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Period</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Start Balance</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">New Borrows</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Interest Accrued</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Repayments</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">End Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLoanSchedule.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-b border-border/30 ${row.isSubtotal ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}`}
                    >
                      <td className="px-4 py-3 font-medium">{row.period}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatUsd(row.startBalance)}</td>
                      <td className="px-4 py-3 text-right font-mono text-blue-500">{row.additions > 0 ? `+${formatUsd(row.additions)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">{row.accruals > 0 ? `+${formatUsd(row.accruals)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-500">{row.reductions > 0 ? `-${formatUsd(row.reductions)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatUsd(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collateral">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Collateral Balance Rollforward</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">WBTC + ETH supplied · Compound v2 & v3</p>
                </div>
                <Badge variant="secondary">ASC 310 Compliant</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Period</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Start Balance</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">New Supplies</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Interest Earned</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Withdrawals</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">End Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCollateralSchedule.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-b border-border/30 ${row.isSubtotal ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}`}
                    >
                      <td className="px-4 py-3 font-medium">{row.period}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatUsd(row.startBalance)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-500">{row.additions > 0 ? `+${formatUsd(row.additions)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-500">{row.accruals > 0 ? `+${formatUsd(row.accruals)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">{row.reductions > 0 ? `-${formatUsd(row.reductions)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatUsd(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interest">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Interest Income / Expense Summary</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Net interest calculation by period</p>
                </div>
                <Badge variant="secondary">ASC 310 / ASC 820</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Period</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Borrow Interest (Expense)</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Supply Interest (Income)</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Net Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInterestSchedule.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-b border-border/30 ${row.isSubtotal ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}`}
                    >
                      <td className="px-4 py-3 font-medium">{row.period}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">({formatUsd(row.borrowInterest)})</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-500">{formatUsd(row.supplyInterest)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${row.netInterest < 0 ? "text-red-500" : "text-emerald-500"}`}>
                        {row.netInterest < 0 ? `(${formatUsd(Math.abs(row.netInterest))})` : formatUsd(row.netInterest)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground border-t border-border/50">
        <span>3 schedules</span>
        <span>Q1 2025 period</span>
        <span>All figures in USD</span>
        <span>ASC 310 / ASC 820 compliant</span>
      </div>
    </div>
  )
}

export default function SchedulesPage() {
  return (
    <AppShell>
      <SchedulesContent />
    </AppShell>
  )
}
