"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundReportView } from "@/components/compound-report-view";

const USER_PREFS_KEY = "compound-reporting-user-prefs";

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

type ReportPayload = {
  metadata?: Record<string, unknown>;
  notes?: string[];
  period?: {
    periodLabel?: string;
    monthStart?: Record<string, unknown>;
    monthEnd?: Record<string, unknown>;
    normalizedEvents?: Record<string, unknown>[];
    reconciliationRows?: Record<string, unknown>[];
    reconciliationSummary?: Record<string, unknown>[];
  };
};

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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

function loadUserIdFromStorage(): string {
  if (typeof window === "undefined") return "user_123";
  try {
    const stored = localStorage.getItem(USER_PREFS_KEY);
    const prefs = stored ? JSON.parse(stored) : {};
    return prefs.userId || "user_123";
  } catch {
    return "user_123";
  }
}

export default function ActivityPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const address = params.address as string;
  const jobId = searchParams.get("jobId") || "";
  const walletId = searchParams.get("walletId") || "";
  const period = searchParams.get("period") || "";

  const [userId, setUserId] = useState("user_123");

  const [job, setJob] = useState<JobStatus | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  // Load userId from localStorage on mount
  useEffect(() => {
    setUserId(loadUserIdFromStorage());
  }, []);

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
    if (!period) return;

    setLoadingReport(true);
    setError("");

    try {
      // Use walletId-based endpoint if available (from job flow), otherwise use address-based endpoint
      // userId will be sent via x-user-id header by the API route (no query param needed)
      const endpoint = walletId
        ? `/api/indexing/reports?walletId=${encodeURIComponent(walletId)}&period=${encodeURIComponent(period)}`
        : `/api/indexing/wallet-reports?address=${encodeURIComponent(address)}&period=${encodeURIComponent(period)}`;

      const res = await fetch(endpoint, { cache: "no-store" });
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

  // If no jobId but we have period (and address from URL), load report directly
  const directView = !jobId && period;

  useEffect(() => {
    if (directView) {
      setLoadingJob(false);
      fetchReport();
    } else {
      fetchJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, walletId, period]);

  useEffect(() => {
    if (!jobId || directView) return;

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
  }, [jobId, directView]);

  useEffect(() => {
    if (job?.status === "completed" && period && !report) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, period, report]);

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

      {error ? (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {directView ? (
        <CompoundReportView report={report} loading={loadingReport} />
      ) : !jobId ? (
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

          {job?.status === "completed" ? (
            <CompoundReportView report={report} loading={loadingReport} />
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
