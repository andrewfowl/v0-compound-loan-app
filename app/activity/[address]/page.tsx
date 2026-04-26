"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type JobStatus = {
  jobId: string;
  status: string;
  progressPercent: number;
  currentStage: string;
  currentStageDetail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  heartbeatAt: string | null;
  error?: { code?: string; message?: string } | null;
};

type ReconciliationSummaryRow = Record<string, unknown>;
type NormalizedEventRow = Record<string, unknown>;

type ReportPayload = {
  metadata?: Record<string, unknown>;
  notes?: string[];
  period?: {
    periodLabel?: string;
    monthStart?: Record<string, unknown>;
    monthEnd?: Record<string, unknown>;
    normalizedEvents?: NormalizedEventRow[];
    reconciliationRows?: Record<string, unknown>[];
    reconciliationSummary?: ReconciliationSummaryRow[];
  };
};

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function extractReportPayload(input: unknown): ReportPayload | null {
  if (!input) return null;
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if (obj.payload_json) return obj.payload_json as ReportPayload;
    if (obj.payloadJson) return obj.payloadJson as ReportPayload;
    if (obj.report) return obj.report as ReportPayload;
  }
  return input as ReportPayload;
}

export default function ActivityPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const address = params.address as string;
  const jobId = searchParams.get("jobId") || "";
  const walletId = searchParams.get("walletId") || "";
  const period = searchParams.get("period") || "";

  const [job, setJob] = useState<JobStatus | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const fetchJob = async () => {
    if (!jobId) return;
    setError("");

    try {
      const res = await fetch(`/api/indexing/jobs/${jobId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch job status");
      }

      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job");
    } finally {
      setLoadingJob(false);
    }
  };

  const fetchReport = async () => {
    if (!walletId || !period) return;

    setLoadingReport(true);
    setError("");

    try {
      const res = await fetch(
        `/api/indexing/reports?walletId=${encodeURIComponent(walletId)}&period=${encodeURIComponent(period)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch report");
      }

      setReport(extractReportPayload(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/indexing/jobs/${jobId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) return;

        setJob(data);

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(timer);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [jobId]);

  useEffect(() => {
    if (job?.status === "completed" && walletId && period && !report) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, walletId, period, report]);

  const periodData = report?.period ?? null;

  const overviewRows = useMemo(() => {
    const unifiedEnd =
      (periodData?.monthEnd as Record<string, unknown>)?.unifiedSummary ||
      (periodData?.monthEnd as Record<string, unknown>)?.summary ||
      null;

    if (!unifiedEnd || typeof unifiedEnd !== "object") return [];

    return Object.entries(unifiedEnd as Record<string, unknown>).map(([key, value]) => ({ key, value }));
  }, [periodData]);

  const reconciliationSummary = Array.isArray(periodData?.reconciliationSummary)
    ? periodData?.reconciliationSummary
    : [];

  const normalizedEvents = Array.isArray(periodData?.normalizedEvents)
    ? periodData?.normalizedEvents
    : [];

  const summaryColumns = reconciliationSummary.length
    ? Object.keys(reconciliationSummary[0])
    : [];

  const eventColumns = normalizedEvents.length
    ? Object.keys(normalizedEvents[0]).slice(0, 10)
    : [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>

          <h1 className="text-2xl font-semibold">Compound Reporting</h1>
          <p className="text-sm text-muted-foreground">
            {formatAddress(address)} {period ? `• ${period}` : ""}
          </p>
        </div>

        <Button variant="outline" onClick={() => { fetchJob(); if (job?.status === "completed") fetchReport(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!jobId ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              Missing job context. Start a new indexing job from the home page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Indexing status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingJob ? (
                <Skeleton className="h-24 w-full" />
              ) : job ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Status</div>
                      <div className="font-medium">{job.status}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Progress</div>
                      <div className="font-medium">{job.progressPercent}%</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Stage</div>
                      <div className="font-medium">{job.currentStage || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Detail</div>
                      <div className="font-medium">{job.currentStageDetail || "—"}</div>
                    </div>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, job.progressPercent || 0))}%` }}
                    />
                  </div>

                  {job.error?.message ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {job.error.message}
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          {error ? (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {job?.status === "completed" ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Period overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReport ? (
                      <Skeleton className="h-40 w-full" />
                    ) : overviewRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No overview data returned yet.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        {overviewRows.map((row) => (
                          <div key={row.key} className="rounded-lg border p-4">
                            <div className="text-xs uppercase text-muted-foreground">
                              {row.key}
                            </div>
                            <div className="mt-1 text-lg font-semibold">
                              {formatValue(row.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reconciliation">
                <Card>
                  <CardHeader>
                    <CardTitle>Reconciliation summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReport ? (
                      <Skeleton className="h-40 w-full" />
                    ) : reconciliationSummary.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No reconciliation summary returned yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {summaryColumns.map((col) => (
                                <TableHead key={col}>{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reconciliationSummary.map((row, idx) => (
                              <TableRow key={idx}>
                                {summaryColumns.map((col) => (
                                  <TableCell key={col}>
                                    {formatValue((row as Record<string, unknown>)[col])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <CardTitle>Normalized events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReport ? (
                      <Skeleton className="h-40 w-full" />
                    ) : normalizedEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No normalized events returned yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {eventColumns.map((col) => (
                                <TableHead key={col}>{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {normalizedEvents.slice(0, 100).map((row, idx) => (
                              <TableRow key={idx}>
                                {eventColumns.map((col) => (
                                  <TableCell key={col}>
                                    {formatValue((row as Record<string, unknown>)[col])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="raw">
                <Card>
                  <CardHeader>
                    <CardTitle>Raw report payload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-[700px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">
                  Waiting for indexing to finish before loading reporting tabs.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
