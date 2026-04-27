"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { 
  FileText, 
  Plus, 
  Wallet, 
  Calendar, 
  ArrowRight, 
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

// Sample addresses to auto-fetch reports for
const SAMPLE_ADDRESSES = [
  "0xd043c56861F3e80b2C5580d7044a6771F802565D",
  "0x462cbA2dC7e2709143BcaCC86ec106354cf82108",
  "0xCB1096E77d6eAb734ffCEced1Fcd2D35EE6b8d15",
  "0x8888882f8f843896699869179fB6E4f7e3B58888",
  "0xd1a85beAED6b5D2e61D3C50C4bD56e4E46133686",
  "0x77cC571AFa264930608A109346af44bA17Fbc174",
  "0xf03852F5123E6c10F53c6ec976AC79a66982d020",
  "0x7FB4620DFfF2178A50DD611a7E7CD8f661806b50",
  "0xA9Bed40A14204557Ff41F5Ca394AA1Fd588F460A",
];

const USER_PREFS_KEY = "compound-reporting-user-prefs";

type WalletStatus = {
  address: string;
  walletId?: string;
  availablePeriods: string[];
  hasData: boolean;
};

type UserPrefs = {
  userId?: string;
  lastAddress?: string;
  lastWalletStartDate?: string;
  lastReportEndMonth?: string;
};

function loadUserPrefs(): UserPrefs {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(USER_PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUserPrefs(prefs: Partial<UserPrefs>) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadUserPrefs();
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // silently fail
  }
}

function DashboardContent() {
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [walletStartDate, setWalletStartDate] = useState("2021-04-01");
  const [reportEndMonth, setReportEndMonth] = useState("2021-05");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sampleWallets, setSampleWallets] = useState<WalletStatus[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("reports");

  useEffect(() => {
    const prefs = loadUserPrefs();
    if (prefs.lastAddress) setAddress(prefs.lastAddress);
    if (prefs.lastWalletStartDate) setWalletStartDate(prefs.lastWalletStartDate);
    if (prefs.lastReportEndMonth) setReportEndMonth(prefs.lastReportEndMonth);
  }, []);

  useEffect(() => {
    setLoadingSamples(true);

    async function fetchSampleWallets() {
      const results = await Promise.all(
        SAMPLE_ADDRESSES.map(async (addr): Promise<WalletStatus> => {
          try {
            const res = await fetch(
              `/api/indexing/wallet-catalog?address=${encodeURIComponent(addr.toLowerCase())}&multi=true`,
              { cache: "no-store" }
            );
            if (res.ok) {
              const data = await res.json();
              const periods: string[] = data?.availablePeriods || [];
              return {
                address: addr,
                walletId: data?.walletId,
                availablePeriods: periods,
                hasData: periods.length > 0,
              };
            }
          } catch {
            // silently fail
          }
          return { address: addr, availablePeriods: [], hasData: false };
        })
      );

      setSampleWallets(results);
      setLoadingSamples(false);
    }

    fetchSampleWallets();
  }, []);

  const handleViewReport = (wallet: WalletStatus, period: string) => {
    router.push(`/activity/${wallet.address}?period=${encodeURIComponent(period)}`);
  };

  const handleIndexAddress = (addr: string) => {
    setAddress(addr);
    setActiveTab("index");
  };

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address.trim()) {
      setError("Please enter an Ethereum address");
      return;
    }
    if (!isValidAddress(address)) {
      setError("Please enter a valid Ethereum address (0x...)");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(walletStartDate)) {
      setError("Wallet start date must be YYYY-MM-DD");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(reportEndMonth)) {
      setError("Report end month must be YYYY-MM");
      return;
    }

    saveUserPrefs({ lastAddress: address, lastWalletStartDate: walletStartDate, lastReportEndMonth: reportEndMonth });
    setLoading(true);

    try {
      const catalogRes = await fetch(
        `/api/indexing/wallet-catalog?address=${encodeURIComponent(address.toLowerCase())}&multi=true`,
        { cache: "no-store" }
      );

      if (catalogRes.ok) {
        const catalogData = await catalogRes.json();
        const availablePeriods: string[] = catalogData.availablePeriods || [];
        if (availablePeriods.includes(reportEndMonth)) {
          router.push(`/activity/${address.toLowerCase()}?period=${reportEndMonth}`);
          return;
        }
      }

      const response = await fetch("/api/indexing/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address.toLowerCase(),
          walletStartDate,
          reportStartDate: walletStartDate,
          reportEndMonth,
          frequency: "monthly",
          protocolScope: ["v2", "v3"],
          priceSourceMode: "uploaded_or_fallback",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create indexing job");

      const nextUrl = new URL(`/activity/${address.toLowerCase()}`, window.location.origin);
      nextUrl.searchParams.set("jobId", data.jobId);
      nextUrl.searchParams.set("walletId", data.walletId);
      nextUrl.searchParams.set("period", reportEndMonth);

      router.push(`${nextUrl.pathname}${nextUrl.search}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const walletsWithData = sampleWallets.filter((w) => w.hasData);
  const walletsWithoutData = sampleWallets.filter((w) => !w.hasData);
  const totalReports = walletsWithData.reduce((acc, w) => acc + w.availablePeriods.length, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your wallet reports and indexing activity
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <FileText className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{loadingSamples ? "-" : totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all wallets</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Wallets</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10">
              <Wallet className="size-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{loadingSamples ? "-" : walletsWithData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">With indexed data</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10">
              <Clock className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">0</div>
            <p className="text-xs text-muted-foreground mt-1">Jobs in queue</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-md bg-green-500/10">
              <TrendingUp className="size-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All services healthy</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10 p-1 bg-muted/50">
          <TabsTrigger value="reports" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="size-4" />
            View Reports
          </TabsTrigger>
          <TabsTrigger value="index" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Plus className="size-4" />
            New Request
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Wallets with reports */}
          {loadingSamples ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : walletsWithData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Available Reports
                </div>
                <Badge variant="secondary">{totalReports} reports</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {walletsWithData.map((wallet) => (
                  <Card key={wallet.address} className="group overflow-hidden transition-all duration-200 hover:shadow-elevation-md hover:border-primary/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
                            <Wallet className="size-5 text-primary" />
                          </div>
                          <div>
                            <code className="text-sm font-semibold tracking-tight">{formatAddress(wallet.address)}</code>
                            <p className="text-xs text-muted-foreground">{wallet.availablePeriods.length} periods available</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleIndexAddress(wallet.address)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1.5">
                        {wallet.availablePeriods.map((period) => (
                          <Button
                            key={period}
                            variant="secondary"
                            size="sm"
                            className="h-7 gap-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary"
                            onClick={() => handleViewReport(wallet, period)}
                          >
                            <Calendar className="size-3" />
                            {period}
                            <ArrowRight className="size-3 opacity-50 group-hover:opacity-100" />
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 mb-6">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">No reports available</h3>
                <p className="mt-2 mb-8 max-w-sm text-sm text-muted-foreground leading-relaxed">
                  Start by indexing a wallet to generate your first reconciliation report.
                </p>
                <Button onClick={() => setActiveTab("index")} size="lg" className="gap-2">
                  <Plus className="size-4" />
                  Create New Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Wallets without reports */}
          {!loadingSamples && walletsWithoutData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Sample Wallets (Not Indexed)
              </div>
              <div className="flex flex-wrap gap-2">
                {walletsWithoutData.map((wallet) => (
                  <Button
                    key={wallet.address}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 font-mono text-xs"
                    onClick={() => handleIndexAddress(wallet.address)}
                  >
                    {formatAddress(wallet.address)}
                    <Plus className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="index">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Plus className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">New Indexing Request</CardTitle>
                  <CardDescription className="mt-0.5">
                    Enter a wallet address and date range to generate a report
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Field>
                  <FieldLabel>Ethereum Address</FieldLabel>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="font-mono"
                  />
                </Field>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Quick select:</p>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_ADDRESSES.slice(0, 6).map((addr) => (
                      <Button
                        key={addr}
                        type="button"
                        variant={address.toLowerCase() === addr.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddress(addr)}
                        className="font-mono text-xs"
                      >
                        {formatAddress(addr)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Wallet Start Date</FieldLabel>
                    <Input
                      value={walletStartDate}
                      onChange={(e) => setWalletStartDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Report End Month</FieldLabel>
                    <Input
                      value={reportEndMonth}
                      onChange={(e) => setReportEndMonth(e.target.value)}
                      placeholder="YYYY-MM"
                    />
                  </Field>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" disabled={loading} size="lg" className="gap-2 min-w-[160px]">
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Start Indexing
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => setActiveTab("reports")}
                    className="text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
