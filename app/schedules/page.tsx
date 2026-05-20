"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/app-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react"

// Transaction-level detail for drill-down
interface TransactionDetail {
  id: string
  date: string
  txHash: string
  wallet: string
  asset: string
  type: string
  amount: number
  amountUsd: number
  protocol: string
}

interface ScheduleRow {
  period: string
  startBalance: number
  additions: number
  accruals: number
  reductions: number
  endBalance: number
  isSubtotal?: boolean
  // Transaction details for each column (for drill-down)
  details?: {
    additions: TransactionDetail[]
    accruals: TransactionDetail[]
    reductions: TransactionDetail[]
  }
}

// Mock transaction-level data that sums to the rollforward values
const janLoanDetails: ScheduleRow["details"] = {
  additions: [
    { id: "tx1", date: "2025-01-05", txHash: "0x1a2b...3c4d", wallet: "0xd043...565D", asset: "USDC", type: "Borrow", amount: 1500000, amountUsd: 1500000, protocol: "Compound v3" },
    { id: "tx2", date: "2025-01-12", txHash: "0x2b3c...4d5e", wallet: "0xd043...565D", asset: "USDC", type: "Borrow", amount: 847500, amountUsd: 847500, protocol: "Compound v3" },
    { id: "tx3", date: "2025-01-20", txHash: "0x3c4d...5e6f", wallet: "0x462c...2108", asset: "USDC", type: "Borrow", amount: 500000, amountUsd: 500000, protocol: "Compound v2" },
  ],
  accruals: [
    { id: "tx4", date: "2025-01-31", txHash: "—", wallet: "0xd043...565D", asset: "USDC", type: "Interest Accrual", amount: 2850, amountUsd: 2850, protocol: "Compound v3" },
    { id: "tx5", date: "2025-01-31", txHash: "—", wallet: "0x462c...2108", asset: "USDC", type: "Interest Accrual", amount: 1430, amountUsd: 1430, protocol: "Compound v2" },
  ],
  reductions: [],
}

const febLoanDetails: ScheduleRow["details"] = {
  additions: [
    { id: "tx6", date: "2025-02-08", txHash: "0x4d5e...6f7g", wallet: "0xCB10...8d15", asset: "USDC", type: "Borrow", amount: 600000, amountUsd: 600000, protocol: "Compound v3" },
    { id: "tx7", date: "2025-02-22", txHash: "0x5e6f...7g8h", wallet: "0xd043...565D", asset: "USDC", type: "Borrow", amount: 500000, amountUsd: 500000, protocol: "Compound v2" },
  ],
  accruals: [
    { id: "tx8", date: "2025-02-28", txHash: "—", wallet: "0xd043...565D", asset: "USDC", type: "Interest Accrual", amount: 5120, amountUsd: 5120, protocol: "Compound v3" },
    { id: "tx9", date: "2025-02-28", txHash: "—", wallet: "0x462c...2108", asset: "USDC", type: "Interest Accrual", amount: 2100, amountUsd: 2100, protocol: "Compound v2" },
    { id: "tx10", date: "2025-02-28", txHash: "—", wallet: "0xCB10...8d15", asset: "USDC", type: "Interest Accrual", amount: 1200, amountUsd: 1200, protocol: "Compound v3" },
  ],
  reductions: [],
}

const marLoanDetails: ScheduleRow["details"] = {
  additions: [
    { id: "tx11", date: "2025-03-10", txHash: "0x6f7g...8h9i", wallet: "0xd043...565D", asset: "ETH", type: "Borrow", amount: 100, amountUsd: 270900, protocol: "Compound v2" },
  ],
  accruals: [
    { id: "tx12", date: "2025-03-31", txHash: "—", wallet: "0xd043...565D", asset: "USDC", type: "Interest Accrual", amount: 7200, amountUsd: 7200, protocol: "Compound v3" },
    { id: "tx13", date: "2025-03-31", txHash: "—", wallet: "0x462c...2108", asset: "USDC", type: "Interest Accrual", amount: 3100, amountUsd: 3100, protocol: "Compound v2" },
    { id: "tx14", date: "2025-03-31", txHash: "—", wallet: "0xCB10...8d15", asset: "USDC", type: "Interest Accrual", amount: 1800, amountUsd: 1800, protocol: "Compound v3" },
    { id: "tx15", date: "2025-03-31", txHash: "—", wallet: "0xd043...565D", asset: "ETH", type: "Interest Accrual", amount: 494, amountUsd: 494, protocol: "Compound v2" },
  ],
  reductions: [
    { id: "tx16", date: "2025-03-28", txHash: "0x7g8h...9i0j", wallet: "0xd043...565D", asset: "USDC", type: "Repayment", amount: 500000, amountUsd: 500000, protocol: "Compound v3" },
  ],
}

// Collateral details
const janCollateralDetails: ScheduleRow["details"] = {
  additions: [
    { id: "ctx1", date: "2025-01-03", txHash: "0xa1b2...c3d4", wallet: "0xd043...565D", asset: "WBTC", type: "Supply Collateral", amount: 50, amountUsd: 2100000, protocol: "Compound v3" },
    { id: "ctx2", date: "2025-01-15", txHash: "0xb2c3...d4e5", wallet: "0xd043...565D", asset: "ETH", type: "Supply Collateral", amount: 700, amountUsd: 2130000, protocol: "Compound v2" },
  ],
  accruals: [
    { id: "ctx3", date: "2025-01-31", txHash: "—", wallet: "0xd043...565D", asset: "WBTC", type: "Supply Interest", amount: 0.02, amountUsd: 840, protocol: "Compound v3" },
    { id: "ctx4", date: "2025-01-31", txHash: "—", wallet: "0xd043...565D", asset: "ETH", type: "Supply Interest", amount: 0.19, amountUsd: 580, protocol: "Compound v2" },
  ],
  reductions: [],
}

const febCollateralDetails: ScheduleRow["details"] = {
  additions: [
    { id: "ctx5", date: "2025-02-05", txHash: "0xc3d4...e5f6", wallet: "0x462c...2108", asset: "ETH", type: "Supply Collateral", amount: 1200, amountUsd: 3600000, protocol: "Compound v3" },
    { id: "ctx6", date: "2025-02-18", txHash: "0xd4e5...f6g7", wallet: "0xCB10...8d15", asset: "WBTC", type: "Supply Collateral", amount: 20, amountUsd: 837500, protocol: "Compound v2" },
  ],
  accruals: [
    { id: "ctx7", date: "2025-02-28", txHash: "—", wallet: "0xd043...565D", asset: "WBTC", type: "Supply Interest", amount: 0.025, amountUsd: 1050, protocol: "Compound v3" },
    { id: "ctx8", date: "2025-02-28", txHash: "—", wallet: "0xd043...565D", asset: "ETH", type: "Supply Interest", amount: 0.24, amountUsd: 730, protocol: "Compound v2" },
    { id: "ctx9", date: "2025-02-28", txHash: "—", wallet: "0x462c...2108", asset: "ETH", type: "Supply Interest", amount: 0.35, amountUsd: 1060, protocol: "Compound v3" },
  ],
  reductions: [],
}

const marCollateralDetails: ScheduleRow["details"] = {
  additions: [],
  accruals: [
    { id: "ctx10", date: "2025-03-31", txHash: "—", wallet: "0xd043...565D", asset: "WBTC", type: "Supply Interest", amount: 0.03, amountUsd: 1260, protocol: "Compound v3" },
    { id: "ctx11", date: "2025-03-31", txHash: "—", wallet: "0xd043...565D", asset: "ETH", type: "Supply Interest", amount: 0.29, amountUsd: 885, protocol: "Compound v2" },
    { id: "ctx12", date: "2025-03-31", txHash: "—", wallet: "0x462c...2108", asset: "ETH", type: "Supply Interest", amount: 0.42, amountUsd: 1280, protocol: "Compound v3" },
    { id: "ctx13", date: "2025-03-31", txHash: "—", wallet: "0xCB10...8d15", asset: "WBTC", type: "Supply Interest", amount: 0.018, amountUsd: 755, protocol: "Compound v2" },
  ],
  reductions: [
    { id: "ctx14", date: "2025-03-25", txHash: "0xe5f6...g7h8", wallet: "0xd043...565D", asset: "ETH", type: "Withdraw Collateral", amount: 9.1, amountUsd: 27760, protocol: "Compound v2" },
  ],
}

const mockLoanSchedule: ScheduleRow[] = [
  { period: "Jan 2025", startBalance: 0, additions: 2847500, accruals: 4280, reductions: 0, endBalance: 2851780, details: janLoanDetails },
  { period: "Feb 2025", startBalance: 2851780, additions: 1100000, accruals: 8420, reductions: 0, endBalance: 3960200, details: febLoanDetails },
  { period: "Mar 2025", startBalance: 3960200, additions: 270900, accruals: 12594, reductions: 500000, endBalance: 3743694, details: marLoanDetails },
  { period: "Q1 2025 Total", startBalance: 0, additions: 4218400, accruals: 25294, reductions: 500000, endBalance: 3743694, isSubtotal: true },
]

const mockCollateralSchedule: ScheduleRow[] = [
  { period: "Jan 2025", startBalance: 0, additions: 4230000, accruals: 1420, reductions: 0, endBalance: 4231420, details: janCollateralDetails },
  { period: "Feb 2025", startBalance: 4231420, additions: 4437500, accruals: 2840, reductions: 0, endBalance: 8671760, details: febCollateralDetails },
  { period: "Mar 2025", startBalance: 8671760, additions: 0, accruals: 4180, reductions: 27760, endBalance: 8648180, details: marCollateralDetails },
  { period: "Q1 2025 Total", startBalance: 0, additions: 8667500, accruals: 8440, reductions: 27760, endBalance: 8648180, isSubtotal: true },
]

const mockInterestSchedule = [
  { period: "Jan 2025", borrowInterest: 4280, supplyInterest: 1420, netInterest: -2860, isSubtotal: false },
  { period: "Feb 2025", borrowInterest: 8420, supplyInterest: 2840, netInterest: -5580, isSubtotal: false },
  { period: "Mar 2025", borrowInterest: 12594, supplyInterest: 4180, netInterest: -8414, isSubtotal: false },
  { period: "Q1 2025 Total", borrowInterest: 25294, supplyInterest: 8440, netInterest: -16854, isSubtotal: true },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

type DrillDownType = "additions" | "accruals" | "reductions"

interface DrillDownState {
  open: boolean
  period: string
  columnType: DrillDownType
  columnLabel: string
  transactions: TransactionDetail[]
  total: number
}

function SchedulesContent() {
  const [activeTab, setActiveTab] = useState("loan")
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([])
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    open: false,
    period: "",
    columnType: "additions",
    columnLabel: "",
    transactions: [],
    total: 0,
  })

  const togglePeriod = (period: string) => {
    setExpandedPeriods(prev => 
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    )
  }

  const openDrillDown = (
    row: ScheduleRow,
    columnType: DrillDownType,
    columnLabel: string,
    value: number
  ) => {
    if (row.isSubtotal || !row.details || value === 0) return
    const transactions = row.details[columnType] || []
    if (transactions.length === 0) return
    
    setDrillDown({
      open: true,
      period: row.period,
      columnType,
      columnLabel,
      transactions,
      total: value,
    })
  }

  const closeDrillDown = () => {
    setDrillDown(prev => ({ ...prev, open: false }))
  }

  // Clickable cell component
  const ClickableCell = ({
    row,
    columnType,
    columnLabel,
    value,
    colorClass,
    prefix = "",
  }: {
    row: ScheduleRow
    columnType: DrillDownType
    columnLabel: string
    value: number
    colorClass?: string
    prefix?: string
  }) => {
    const hasDetails = !row.isSubtotal && row.details && row.details[columnType]?.length > 0
    const displayValue = value > 0 ? `${prefix}${formatUsd(value)}` : "—"
    
    if (!hasDetails || value === 0) {
      return <span className={`font-mono ${colorClass || ""}`}>{displayValue}</span>
    }

    return (
      <button
        onClick={() => openDrillDown(row, columnType, columnLabel, value)}
        className={`font-mono underline decoration-dotted underline-offset-4 hover:decoration-solid cursor-pointer transition-all ${colorClass || ""}`}
        title="Click to see transaction details"
      >
        {displayValue}
      </button>
    )
  }

  // Expandable row with inline transaction preview
  const ExpandableRow = ({ row, idx, schedule }: { row: ScheduleRow; idx: number; schedule: "loan" | "collateral" }) => {
    const isExpanded = expandedPeriods.includes(row.period)
    const hasDetails = !row.isSubtotal && row.details

    return (
      <>
        <tr 
          className={`border-b border-border/30 ${row.isSubtotal ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}`}
        >
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {hasDetails && (
                <button
                  onClick={() => togglePeriod(row.period)}
                  className="p-0.5 hover:bg-muted rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>
              )}
              <span className="font-medium">{row.period}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-right font-mono">{formatUsd(row.startBalance)}</td>
          <td className="px-4 py-3 text-right">
            <ClickableCell
              row={row}
              columnType="additions"
              columnLabel={schedule === "loan" ? "New Borrows" : "New Supplies"}
              value={row.additions}
              colorClass={schedule === "loan" ? "text-foreground/70" : "text-positive"}
              prefix="+"
            />
          </td>
          <td className="px-4 py-3 text-right">
            <ClickableCell
              row={row}
              columnType="accruals"
              columnLabel={schedule === "loan" ? "Interest Accrued" : "Interest Earned"}
              value={row.accruals}
              colorClass={schedule === "loan" ? "text-negative" : "text-positive"}
              prefix="+"
            />
          </td>
          <td className="px-4 py-3 text-right">
            <ClickableCell
              row={row}
              columnType="reductions"
              columnLabel={schedule === "loan" ? "Repayments" : "Withdrawals"}
              value={row.reductions}
              colorClass={schedule === "loan" ? "text-positive" : "text-negative"}
              prefix="-"
            />
          </td>
          <td className="px-4 py-3 text-right font-mono font-semibold">{formatUsd(row.endBalance)}</td>
        </tr>
        
        {/* Inline expanded details */}
        {isExpanded && hasDetails && (
          <tr className="bg-muted/10">
            <td colSpan={6} className="px-8 py-3">
              <div className="text-xs space-y-3">
                {row.details!.additions.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">
                      {schedule === "loan" ? "Borrows" : "Supplies"} ({row.details!.additions.length})
                    </p>
                    <div className="space-y-1">
                      {row.details!.additions.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="flex items-center gap-4 text-foreground/80">
                          <span className="text-muted-foreground w-20">{tx.date}</span>
                          <span className="font-mono w-24">{tx.wallet}</span>
                          <span className="w-16">{tx.asset}</span>
                          <span className="font-mono ml-auto">{formatUsd(tx.amountUsd)}</span>
                        </div>
                      ))}
                      {row.details!.additions.length > 3 && (
                        <button
                          onClick={() => openDrillDown(row, "additions", schedule === "loan" ? "New Borrows" : "New Supplies", row.additions)}
                          className="text-primary hover:underline"
                        >
                          + {row.details!.additions.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {row.details!.accruals.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">
                      Interest ({row.details!.accruals.length})
                    </p>
                    <div className="space-y-1">
                      {row.details!.accruals.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="flex items-center gap-4 text-foreground/80">
                          <span className="text-muted-foreground w-20">{tx.date}</span>
                          <span className="font-mono w-24">{tx.wallet}</span>
                          <span className="w-16">{tx.asset}</span>
                          <span className="font-mono ml-auto">{formatUsd(tx.amountUsd)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {row.details!.reductions.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">
                      {schedule === "loan" ? "Repayments" : "Withdrawals"} ({row.details!.reductions.length})
                    </p>
                    <div className="space-y-1">
                      {row.details!.reductions.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="flex items-center gap-4 text-foreground/80">
                          <span className="text-muted-foreground w-20">{tx.date}</span>
                          <span className="font-mono w-24">{tx.wallet}</span>
                          <span className="w-16">{tx.asset}</span>
                          <span className="font-mono ml-auto">{formatUsd(tx.amountUsd)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
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
          <Badge variant="outline" className="text-xs">Mock Data</Badge>
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
            <p className="text-2xl font-bold font-mono tracking-tight text-negative">{formatUsd(3743694)}</p>
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
            <p className="text-2xl font-bold font-mono tracking-tight text-positive">{formatUsd(8648180)}</p>
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
            <p className="text-2xl font-bold font-mono tracking-tight text-negative">{formatUsd(16854)}</p>
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
            <p className="text-2xl font-bold font-mono tracking-tight text-positive">231%</p>
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
                  <p className="text-xs text-muted-foreground mt-0.5">Click any value to see transaction details</p>
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
                    <ExpandableRow key={idx} row={row} idx={idx} schedule="loan" />
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
                  <p className="text-xs text-muted-foreground mt-0.5">Click any value to see transaction details</p>
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
                    <ExpandableRow key={idx} row={row} idx={idx} schedule="collateral" />
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
                      <td className="px-4 py-3 text-right font-mono text-negative">({formatUsd(row.borrowInterest)})</td>
                      <td className="px-4 py-3 text-right font-mono text-positive">{formatUsd(row.supplyInterest)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${row.netInterest < 0 ? "text-negative" : "text-positive"}`}>
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

      {/* Drill-Down Dialog */}
      <Dialog open={drillDown.open} onOpenChange={(open) => !open && closeDrillDown()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{drillDown.columnLabel} — {drillDown.period}</span>
              <Badge variant="outline" className="font-mono">{formatUsd(drillDown.total)}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Wallet</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Asset</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Protocol</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Amount (USD)</th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {drillDown.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{tx.date}</td>
                    <td className="px-3 py-2 font-mono text-xs">{tx.wallet}</td>
                    <td className="px-3 py-2">{tx.asset}</td>
                    <td className="px-3 py-2 text-muted-foreground">{tx.protocol}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUsd(tx.amountUsd)}</td>
                    <td className="px-3 py-2 text-center">
                      {tx.txHash !== "—" ? (
                        <button className="text-primary hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="size-3" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatUsd(drillDown.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </DialogContent>
      </Dialog>
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
