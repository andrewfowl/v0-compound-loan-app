"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SummaryTab } from "@/components/compound/summary-tab";
import { LoanTab } from "@/components/compound/loan-tab";
import { CollateralTab } from "@/components/compound/collateral-tab";
import { TransactionsTab } from "@/components/compound/transactions-tab";
import { JournalEntriesTab } from "@/components/compound/journal-entries-tab";
import { CompoundReportViewRaw } from "@/components/compound-report-view-raw";
import { buildCompoundReport } from "@/lib/compound/report-builder";
import type {
  CompoundEvent,
  CompoundReport,
  CollateralLedgerEntry,
  LoanLedgerEntry,
  RiskLevel,
} from "@/lib/compound/types";

type GenericRow = Record<string, unknown>;

type ReportPeriod = {
  periodLabel?: string;
  monthStart?: Record<string, unknown>;
  monthEnd?: Record<string, unknown>;
  normalizedEvents?: GenericRow[];
  reconciliationRows?: GenericRow[];
  reconciliationSummary?: GenericRow[];
};

type ReportPayload = {
  metadata?: Record<string, unknown>;
  notes?: string[];
  period?: ReportPeriod;
};

type Props = {
  report: ReportPayload | null;
  loading?: boolean;
};

function formatDateFromTimestamp(ts: unknown): string {
  if (!ts) return "-";
  const d = new Date(String(ts));
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString("en-US");
}

/**
 * Transform backend normalizedEvents to CompoundEvent format for the Transactions tab
 */
function transformToCompoundEvents(normalizedEvents: GenericRow[]): CompoundEvent[] {
  return normalizedEvents.map((event, idx) => {
    const positionType = String(event.positionType ?? event.position_type ?? "").toLowerCase();
    const activityType = String(event.activityType ?? event.activity_type ?? "").toLowerCase();
    const sourceAction = String(event.sourceAction ?? event.source_action ?? "").toLowerCase();

    const accountType: "collateral" | "debt" =
      positionType === "collateral" ? "collateral" : "debt";

    let activity: CompoundEvent["activity"] = "borrowing";
    if (activityType === "deposit" || sourceAction.includes("supply") || sourceAction.includes("mint")) {
      activity = "deposit";
    } else if (activityType === "redemption" || activityType === "withdraw" || sourceAction.includes("redeem") || sourceAction.includes("withdraw")) {
      activity = "redemption";
    } else if (activityType === "borrowing" || activityType === "borrow" || sourceAction.includes("borrow")) {
      activity = "borrowing";
    } else if (activityType === "repayment" || activityType === "repay" || sourceAction.includes("repay")) {
      activity = "repayment";
    } else if (activityType === "liquidation" || sourceAction.includes("liquidat")) {
      activity = "liquidation";
    } else if (activityType === "interest" || activityType.includes("accrual")) {
      activity = "interest";
    }

    let eventName: CompoundEvent["eventName"] = "Borrow";
    if (activity === "deposit") eventName = "Mint";
    else if (activity === "redemption") eventName = "Redeem";
    else if (activity === "borrowing") eventName = "Borrow";
    else if (activity === "repayment") eventName = "RepayBorrow";
    else if (activity === "liquidation") eventName = "LiquidateBorrow";

    return {
      id: String(event.txHash ?? event.tx_hash ?? idx),
      blockNumber: String(event.blockNumber ?? event.block_number ?? "0"),
      timestamp: String(event.blockTimestamp ?? event.block_timestamp ?? new Date().toISOString()),
      transactionHash: String(event.txHash ?? event.tx_hash ?? ""),
      accountType,
      activity,
      eventName,
      asset: String(event.tokenSymbol ?? event.token_symbol ?? "UNKNOWN"),
      amount: String(event.amount ?? event.amount_token ?? "0"),
      amountUsd: String(event.amountUsd ?? event.amount_usd ?? "0"),
    };
  });
}

/**
 * Transform backend reconciliationRows directly to CollateralLedgerEntry format
 * This uses the pre-calculated data from the backend instead of recalculating
 */
function transformToCollateralLedger(rows: GenericRow[]): CollateralLedgerEntry[] {
  return rows
    .filter((row) => {
      const posType = String(row.positionType ?? row.position_type ?? "").toLowerCase();
      return posType === "collateral";
    })
    .map((row) => {
      const activityType = String(row.activityType ?? row.activity_type ?? row.item ?? "").toLowerCase();
      let item = "Deposit";
      if (activityType.includes("redeem") || activityType.includes("withdraw") || activityType === "redemption") {
        item = "Redeem";
      } else if (activityType.includes("liquidat")) {
        item = "Liquidate";
      } else if (activityType.includes("interest") || activityType.includes("accrual")) {
        item = "Interest";
      }

      return {
        token: String(row.tokenSymbol ?? row.token_symbol ?? row.token ?? ""),
        item,
        date: formatDateFromTimestamp(row.blockTimestamp ?? row.block_timestamp ?? row.date),
        start: Number(row.startBalance ?? row.start ?? 0),
        provided: Number(row.provided ?? row.deposits ?? row.amount ?? 0),
        accruals: Number(row.accruals ?? row.interest ?? 0),
        liquidated: Number(row.liquidated ?? 0),
        reclaimed: Number(row.reclaimed ?? row.withdrawals ?? 0),
        end: Number(row.endBalance ?? row.end ?? 0),
        txHash: String(row.txHash ?? row.tx_hash ?? ""),
        eventName: String(row.sourceAction ?? row.source_action ?? row.eventName ?? ""),
        riskAtTime: "healthy" as RiskLevel,
      };
    });
}

/**
 * Transform backend reconciliationRows directly to LoanLedgerEntry format
 */
function transformToLoanLedger(rows: GenericRow[]): LoanLedgerEntry[] {
  return rows
    .filter((row) => {
      const posType = String(row.positionType ?? row.position_type ?? "").toLowerCase();
      return posType === "debt" || posType === "loan";
    })
    .map((row) => {
      const activityType = String(row.activityType ?? row.activity_type ?? row.item ?? "").toLowerCase();
      let item = "Borrowed crypto";
      if (activityType.includes("repay") || activityType === "repayment") {
        item = "Paid by borrower";
      } else if (activityType.includes("liquidat")) {
        item = "Paid by liquidator";
      } else if (activityType.includes("interest") || activityType.includes("accrual")) {
        item = "Interest";
      }

      return {
        token: String(row.tokenSymbol ?? row.token_symbol ?? row.token ?? ""),
        item,
        date: formatDateFromTimestamp(row.blockTimestamp ?? row.block_timestamp ?? row.date),
        start: Number(row.startBalance ?? row.start ?? 0),
        proceeds: Number(row.proceeds ?? row.borrows ?? row.amount ?? 0),
        accruals: Number(row.accruals ?? row.interest ?? 0),
        liquidated: Number(row.liquidated ?? 0),
        payments: Number(row.payments ?? row.repayments ?? 0),
        end: Number(row.endBalance ?? row.end ?? 0),
        txHash: String(row.txHash ?? row.tx_hash ?? ""),
        eventName: String(row.sourceAction ?? row.source_action ?? row.eventName ?? ""),
        riskAtTime: "healthy" as RiskLevel,
      };
    });
}

export function CompoundReportView({ report, loading = false }: Props) {
  const [viewMode, setViewMode] = useState<"calculated" | "raw">("calculated");
  const period = report?.period ?? null;

  const normalizedEvents = useMemo(
    () => (Array.isArray(period?.normalizedEvents) ? period.normalizedEvents : []),
    [period]
  );

  const reconciliationRows = useMemo(
    () => (Array.isArray(period?.reconciliationRows) ? period.reconciliationRows : []),
    [period]
  );

  // Build report from normalizedEvents for calculated view
  const compoundReport: CompoundReport | null = useMemo(() => {
    if (normalizedEvents.length === 0) return null;
    const events = transformToCompoundEvents(normalizedEvents);
    return buildCompoundReport(events);
  }, [normalizedEvents]);

  // Also extract ledger data directly from reconciliationRows (backend pre-calculated)
  const backendCollateralLedger = useMemo(
    () => transformToCollateralLedger(reconciliationRows),
    [reconciliationRows]
  );

  const backendLoanLedger = useMemo(
    () => transformToLoanLedger(reconciliationRows),
    [reconciliationRows]
  );

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!period) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">
            No report payload returned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Decide which data source to use:
  // - If we have reconciliationRows, prefer them (backend pre-calculated)
  // - Otherwise fall back to buildCompoundReport calculation
  const hasBackendLedger = backendCollateralLedger.length > 0 || backendLoanLedger.length > 0;
  const collateralLedger = hasBackendLedger ? backendCollateralLedger : (compoundReport?.collateralLedger ?? []);
  const loanLedger = hasBackendLedger ? backendLoanLedger : (compoundReport?.loanLedger ?? []);

  // For other parts, still use compoundReport if available
  const borrowerRecon = compoundReport?.borrowerRecon ?? {
    monthlyGroups: [],
    currentDebt: 0,
    currentCollateral: 0,
    currentLtv: 0,
    positions: [],
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">View Mode:</span>
        <Button
          variant={viewMode === "calculated" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("calculated")}
        >
          Calculated Report
        </Button>
        <Button
          variant={viewMode === "raw" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("raw")}
        >
          Raw API Data
        </Button>
      </div>

      {/* Raw API Data View */}
      {viewMode === "raw" && <CompoundReportViewRaw report={report} />}

      {/* Calculated Report View */}
      {viewMode === "calculated" && normalizedEvents.length === 0 && reconciliationRows.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              No events to calculate report from. Try the Raw API Data view.
            </p>
          </CardContent>
        </Card>
      )}

      {viewMode === "calculated" && (normalizedEvents.length > 0 || reconciliationRows.length > 0) && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="loan">Loan</TabsTrigger>
            <TabsTrigger value="collateral">Collateral</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="je">JE</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SummaryTab
              collateralSummary={compoundReport?.collateralSummary ?? {}}
              debtSummary={compoundReport?.debtSummary ?? {}}
              collateralTokens={compoundReport?.collateralTokens ?? []}
              debtTokens={compoundReport?.debtTokens ?? []}
            />
          </TabsContent>

          <TabsContent value="loan">
            <LoanTab
              loanLedger={loanLedger}
              positions={borrowerRecon.positions}
            />
          </TabsContent>

          <TabsContent value="collateral">
            <CollateralTab
              collateralLedger={collateralLedger}
              borrowerRecon={borrowerRecon}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab
              events={transformToCompoundEvents(normalizedEvents)}
            />
          </TabsContent>

          <TabsContent value="je">
            <JournalEntriesTab borrowerRecon={borrowerRecon} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
