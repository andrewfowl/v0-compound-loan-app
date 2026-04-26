"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";

export default function HomePage() {
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [walletStartDate, setWalletStartDate] = useState("2021-04-01");
  const [reportEndMonth, setReportEndMonth] = useState("2021-05");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddress("0xd043c56861f3e80b2c5580d7044a6771f802565d");
                  setWalletStartDate("2021-04-01");
                  setReportEndMonth("2021-05");
                }}
              >
                Load sample wallet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
