"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Wallet, 
  ArrowRight, 
  Calendar, 
  Search,
  FileText,
  Clock,
} from "lucide-react"

interface WalletData {
  address: string
  availablePeriods: string[]
}

function formatAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ActivityPage() {
  const router = useRouter()
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchWallets() {
      try {
        const res = await fetch("/api/indexing/sample-wallets")
        if (res.ok) {
          const data = await res.json()
          const walletsWithData = (data.wallets || []).filter(
            (w: WalletData) => w.availablePeriods && w.availablePeriods.length > 0
          )
          setWallets(walletsWithData)
        }
      } catch (error) {
        console.error("Failed to fetch wallets:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchWallets()
  }, [])

  const filteredWallets = wallets.filter((w) =>
    w.address.toLowerCase().includes(search.toLowerCase())
  )

  const totalReports = wallets.reduce((sum, w) => sum + w.availablePeriods.length, 0)

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Activity Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage wallet transaction reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search wallets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Wallets</CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "-" : wallets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "-" : totalReports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet List */}
        <Card>
          <CardHeader>
            <CardTitle>Indexed Wallets</CardTitle>
            <CardDescription>
              Select a wallet and period to view the transaction report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredWallets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-4">
                  <Wallet className="size-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium">No wallets found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Index a wallet from the Dashboard to get started"}
                </p>
                {!search && (
                  <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className="group flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <Wallet className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-semibold">{formatAddress(wallet.address)}</code>
                        <p className="text-xs text-muted-foreground">
                          {wallet.availablePeriods.length} period{wallet.availablePeriods.length !== 1 ? "s" : ""} available
                        </p>
                      </div>
                      <Badge variant="secondary" className="hidden sm:flex">
                        {wallet.availablePeriods.length} reports
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {wallet.availablePeriods.map((period) => (
                        <Button
                          key={period}
                          variant="secondary"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => router.push(`/activity/${wallet.address}?period=${period}`)}
                        >
                          <Calendar className="size-3" />
                          {period}
                          <ArrowRight className="size-3 opacity-50 group-hover:opacity-100" />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
