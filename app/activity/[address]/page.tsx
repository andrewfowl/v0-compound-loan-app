"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RefreshCw, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CompoundReportView } from "@/components/compound-report-view";
import { AppShell } from "@/components/app-shell";

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

function ActivityContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const address = params.address as string;
  const jobId = searchParams.get("jobId") || "";
  const walletId = searchParams.get("walletId") || "";
  const period = searchParams.get("period") || "";

  const [isHydrated, setIsHydrated] = useState(false);

  const [job, setJob] = useState<JobStatus | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  // Load userId from localStorage on mount
  useEffect(() => {
    loadUserIdFromStorage();
    setIsHydrated(true);
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

  const directView = !jobId && period;

  useEffect(() => {
    if (!isHydrated) return;
    
    if (directView) {
      setLoadingJob(false);
      fetchReport();
    } else {
      fetchJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, walletId, period, isHydrated]);

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
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">Wallet Report</h1>
            {period && <Badge variant="secondary">{period}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={() => { fetchJob(); if (job?.status === "completed") fetchReport(); }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {directView ? (
        <CompoundReportView report={report} loading={loadingReport} />
      ) : !jobId ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              Missing job context. Start a new indexing job from the dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Indexing Progress
                {job?.status === "completed" && (
                  <Badge variant="default" className="bg-green-600">Completed</Badge>
                )}
                {job?.status === "failed" && (
                  <Badge variant="destructive">Failed</Badge>
                )}
                {job?.status && !["completed", "failed"].includes(job.status) && (
                  <Badge variant="secondary">{job.status}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingJob ? (
                <Skeleton className="h-24 w-full" />
              ) : job ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Status</div>
                      <div className="font-medium capitalize">{job.status}</div>
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
                      <div className="font-medium truncate">{job.currentStageDetail || "—"}</div>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, job.progressPercent || 0))}%` }}
                    />
                  </div>

                  {job.error?.message ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-muted" />
                <p className="text-sm text-muted-foreground">
                  Waiting for indexing to complete...
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AppShell>
      <ActivityContent />
    </AppShell>
  );
}
