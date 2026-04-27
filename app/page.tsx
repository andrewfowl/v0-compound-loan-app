"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { UserBadge } from "@/components/user-identity";
import { FileText, Plus, Wallet, Calendar, ArrowRight } from "lucide-react";

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

export default function HomePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string>("user_123");
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
    setUserId(prefs.userId || "");
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
  }, [userId]); // re-fetch when user switches

  const handleSwitchUser = (newId: string) => {
    const id = newId || "user_123";
    setUserId(id);
    saveUserPrefs({ userId: id });
    setSampleWallets([]);
  };

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
          router.push(
            `/activity/${address.toLowerCase()}?period=${reportEndMonth}&userId=${encodeURIComponent(userId!)}`
          );
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Compound Reporting</h1>
            </div>
          </div>
          <UserBadge userId={userId} onSwitch={handleSwitchUser} />

        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              View Reports
            </TabsTrigger>
            <TabsTrigger value="index" className="gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Wallets with reports */}
            {loadingSamples ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : walletsWithData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Available Reports
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {walletsWithData.map((wallet) => (
                    <Card key={wallet.address} className="overflow-hidden transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <Wallet className="h-4 w-4 text-primary" />
                            </div>
                            <code className="text-sm font-medium">{formatAddress(wallet.address)}</code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => handleIndexAddress(wallet.address)}
                          >
                            <Plus className="h-3 w-3" />
                            Index
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {wallet.availablePeriods.map((period) => (
                            <Button
                              key={period}
                              variant="secondary"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() => handleViewReport(wallet, period)}
                            >
                              <Calendar className="h-3 w-3" />
                              {period}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-medium">No reports available</h3>
                  <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                    Start by indexing a wallet to generate your first report.
                  </p>
                  <Button onClick={() => setActiveTab("index")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Request
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Wallets without reports */}
            {!loadingSamples && walletsWithoutData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Sample Wallets (Not Indexed)
                </div>
                <div className="flex flex-wrap gap-2">
                  {walletsWithoutData.map((wallet) => (
                    <Button
                      key={wallet.address}
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 font-mono text-xs"
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
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  New Indexing Request
                </CardTitle>
                <CardDescription>
                  Enter a wallet address and date range to generate a reconciliation report.
                </CardDescription>
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
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={loading} className="gap-2">
                      {loading ? (
                        "Starting..."
                      ) : (
                        <>
                          Start Indexing
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("reports")}
                    >
                      View Existing Reports
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
