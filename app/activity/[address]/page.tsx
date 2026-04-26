"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import { buildCompoundReport } from "@/lib/compound/report-builder"
import { formatAddress } from "@/lib/compound/format"
import { SummaryTab } from "@/components/compound/summary-tab"
import { LoanTab } from "@/components/compound/loan-tab"
import { CollateralTab } from "@/components/compound/collateral-tab"
import { TransactionsTab } from "@/components/compound/transactions-tab"
import { JournalEntriesTab } from "@/components/compound/journal-entries-tab"
import type { CompoundEvent } from "@/lib/compound/types"

export default function ActivityPage() {
  const params = useParams()
  const address = params.address as string

  const [events, setEvents] = useState<CompoundEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchActivity = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/compound-activity?address=${address}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to fetch activity")
      setEvents(data.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) fetchActivity()
  }, [address])

  const report = useMemo(() => buildCompoundReport(events), [events])

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Compound Protocol</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {formatAddress(address)}
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center ml-2 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchActivity} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-destructive mb-6">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchActivity}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full max-w-md" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="loan">Loan</TabsTrigger>
              <TabsTrigger value="collateral">Collateral</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="journal">JE</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <SummaryTab
                collateralSummary={report.collateralSummary}
                debtSummary={report.debtSummary}
                collateralTokens={report.collateralTokens}
                debtTokens={report.debtTokens}
              />
            </TabsContent>

            <TabsContent value="loan">
              <LoanTab
                loanLedger={report.loanLedger}
                positions={report.borrowerRecon.positions}
              />
            </TabsContent>

            <TabsContent value="collateral">
              <CollateralTab
                collateralLedger={report.collateralLedger}
                borrowerRecon={report.borrowerRecon}
              />
            </TabsContent>

            <TabsContent value="transactions">
              <TransactionsTab events={events} />
            </TabsContent>

            <TabsContent value="journal" className="space-y-6">
              <JournalEntriesTab borrowerRecon={report.borrowerRecon} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  )
}
