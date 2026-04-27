"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

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
const DEFAULT_USER_ID = "user_123";

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

function saveUserPrefs(prefs: UserPrefs) {
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

  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [address, setAddress] = useState("");
  const [walletStartDate, setWalletStartDate] = useState("2021-04-01");
  const [reportEndMonth, setReportEndMonth] = useState("2021-05");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sampleWallets, setSampleWallets] = useState<WalletStatus[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("reports");

  // Load user preferences on mount
  useEffect(() => {
    const prefs = loadUserPrefs();
    if (prefs.userId) setUserId(prefs.userId);
    if (prefs.lastAddress) setAddress(prefs.lastAddress);
    if (prefs.lastWalletStartDate) setWalletStartDate(prefs.lastWalletStartDate);
    if (prefs.lastReportEndMonth) setReportEndMonth(prefs.lastReportEndMonth);
  }, []);

  // Fetch reports for all sample addresses in parallel
  useEffect(() => {
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
            // silently fail for this address
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
    router.push(`/activity/${wallet.address}?period=${period}&userId=${encodeURIComponent(userId)}`);
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

    // Save user preferences
    saveUserPrefs({
      userId,
      lastAddress: address,
      lastWalletStartDate: walletStartDate,
      lastReportEndMonth: reportEndMonth,
    });

    setLoading(true);

    try {
      // Check if wallet already has this period indexed
      const catalogRes = await fetch(
        `/api/indexing/wallet-catalog?address=${encodeURIComponent(address.toLowerCase())}`,
        { cache: "no-store" }
      );

      if (catalogRes.ok) {
        const catalogData = await catalogRes.json();
        const availablePeriods: string[] = catalogData.availablePeriods || [];

        // If period already exists, go directly to report view
        if (availablePeriods.includes(reportEndMonth)) {
          router.push(`/activity/${address.toLowerCase()}?period=${reportEndMonth}`);
          return;
        }
      }

      // Period not found or wallet not indexed, create new indexing job
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to create indexing job");
      }

      const nextUrl = new URL(
        `/activity/${address.toLowerCase()}`,
        window.location.origin
      );

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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Compound Reporting</h1>
        <p className="mt-2 text-muted-foreground">
          View existing reports or start a new indexing request
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports">View Reports</TabsTrigger>
          <TabsTrigger value="index">New Index Request</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Wallets</CardTitle>
              <CardDescription>
                Click a period to view a report, or index a new period for any wallet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSamples ? (
                <div className="space-y-3">
                  {SAMPLE_ADDRESSES.map((addr) => (
                    <Skeleton key={addr} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {sampleWallets.map((wallet) => (
                    <div
                      key={wallet.address}
                      className="flex flex-col gap-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <code className="text-sm font-mono font-medium">
                            {formatAddress(wallet.address)}
                          </code>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {wallet.hasData
                              ? `${wallet.availablePeriods.length} period(s) available`
                              : "No indexed reports yet"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIndexAddress(wallet.address)}
                          className="shrink-0"
                        >
                          Index Period
                        </Button>
                      </div>

                      {wallet.hasData && (
                        <div className="flex flex-wrap gap-2">
                          {wallet.availablePeriods.map((period) => (
                            <Button
                              key={period}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewReport(wallet, period)}
                            >
                              {period}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="index">
          <Card>
            <CardHeader>
              <CardTitle>New Indexing Request</CardTitle>
              <CardDescription>
                Enter a wallet and period to start backend indexing and reconciliation.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Field>
                  <FieldLabel>User ID</FieldLabel>
                  <Input
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      saveUserPrefs({ userId: e.target.value });
                    }}
                    placeholder="user_123"
                    className="font-mono"
                  />
                </Field>

                <Field>
                  <FieldLabel>Ethereum Address</FieldLabel>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="font-mono"
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  {SAMPLE_ADDRESSES.map((addr) => (
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

                <div className="grid gap-4 md:grid-cols-2">
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

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Starting..." : "Start Indexing"}
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
    </div>
  );
}
