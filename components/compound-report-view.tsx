"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "@/components/compound/summary-tab";
import { LoanTab } from "@/components/compound/loan-tab";
import { CollateralTab } from "@/components/compound/collateral-tab";
import { TransactionsTab } from "@/components/compound/transactions-tab";
import { JournalEntriesTab } from "@/components/compound/journal-entries-tab";
import { buildCompoundReport } from "@/lib/compound/report-builder";
import type { CompoundEvent, CompoundReport } from "@/lib/compound/types";

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

/**
 * Transform backend normalizedEvents to CompoundEvent format
 */
function transformToCompoundEvents(normalizedEvents: GenericRow[]): CompoundEvent[] {
  return normalizedEvents.map((event, idx) => {
    const positionType = String(event.positionType ?? event.position_type ?? "").toLowerCase();
    const activityType = String(event.activityType ?? event.activity_type ?? "").toLowerCase();
    const sourceAction = String(event.sourceAction ?? event.source_action ?? "").toLowerCase();
    
    // Map positionType to accountType
    const accountType: "collateral" | "debt" = 
      positionType === "collateral" ? "collateral" : "debt";
    
    // Map activityType to our activity types
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
    
    // Map to eventName
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

export function CompoundReportView({ report, loading = false }: Props) {
  const period = report?.period ?? null;
  
  const normalizedEvents = useMemo(
    () => (Array.isArray(period?.normalizedEvents) ? period.normalizedEvents : []),
    [period]
  );

  // Transform backend events to CompoundEvent format and build report
  const compoundReport: CompoundReport | null = useMemo(() => {
    if (normalizedEvents.length === 0) return null;
    const events = transformToCompoundEvents(normalizedEvents);
    return buildCompoundReport(events);
  }, [normalizedEvents]);

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!period || !compoundReport) {
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

  return (
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
          collateralSummary={compoundReport.collateralSummary}
          debtSummary={compoundReport.debtSummary}
          collateralTokens={compoundReport.collateralTokens}
          debtTokens={compoundReport.debtTokens}
        />
      </TabsContent>

      <TabsContent value="loan">
        <LoanTab
          loanLedger={compoundReport.loanLedger}
          positions={compoundReport.borrowerRecon.positions}
        />
      </TabsContent>

      <TabsContent value="collateral">
        <CollateralTab
          collateralLedger={compoundReport.collateralLedger}
          borrowerRecon={compoundReport.borrowerRecon}
        />
      </TabsContent>

      <TabsContent value="transactions">
        <TransactionsTab
          events={transformToCompoundEvents(normalizedEvents)}
        />
      </TabsContent>

      <TabsContent value="je">
        <JournalEntriesTab
          borrowerRecon={compoundReport.borrowerRecon}
        />
      </TabsContent>
    </Tabs>
  );
}
