"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

type Wallet = {
  // Original format
  id?: string;
  walletAddress?: string;
  reports?: { period: string }[];
  // New wallet-catalog format
  walletId?: string;
  address?: string;
  availablePeriods?: string[];
};

export default function HomePage() {
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [walletStartDate, setWalletStartDate] = useState("2021-04-01");
  const [reportEndMonth, setReportEndMonth] = useState("2021-05");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);

  useEffect(() => {
    async function fetchWallets() {
      try {
        const res = await fetch("/api/indexing/wallets", { cache: "no-store" });
        const data = await res.json();
        console.log("[v0] Wallets API response:", { status: res.status, data });
        if (res.ok && Array.isArray(data)) {
          setWallets(data);
        } else if (res.ok && data.wallets) {
          setWallets(data.wallets);
        } else if (res.ok && data.data && Array.isArray(data.data)) {
          setWallets(data.data);
        } else {
          console.log("[v0] Unexpected wallets response format");
        }
      } catch (err) {
        console.log("[v0] Failed to fetch wallets:", err);
      } finally {
        setLoadingWallets(false);
      }
    }
    fetchWallets();
  }, []);

  const handleViewReport = (wallet: Wallet, period: string) => {
    const addr = wallet.address || wallet.walletAddress;
    const wid = wallet.walletId || wallet.id;
    // Include walletId if available for backward compatibility
    const url = wid
      ? `/activity/${addr}?walletId=${wid}&period=${period}`
      : `/activity/${addr}?period=${period}`;
    router.push(url);
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

    setLoading(true);

    try {
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

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Compound Reporting Builder</CardTitle>
          <CardDescription>
            Enter a wallet and period to start backend indexing and reconciliation.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field>
              <FieldLabel>Ethereum Address</FieldLabel>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
            </Field>

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
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Existing Reports</CardTitle>
          <CardDescription>
            Previously indexed wallets with available reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingWallets ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No existing wallets found. Start indexing a wallet above.
            </p>
          ) : (
            <div className="space-y-4">
              {wallets.map((wallet) => {
                const key = wallet.walletId || wallet.id || wallet.address || wallet.walletAddress;
                const displayAddress = wallet.address || wallet.walletAddress;
                const periods = wallet.availablePeriods || wallet.reports?.map(r => r.period) || [];
                
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono">
                        {displayAddress}
                      </code>
                    </div>
                    {periods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {periods.map((period) => (
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
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No reports available yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
