"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/**
 * Convert value to number, handling strings and BigInt
 */
function toNumeric(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "bigint") return Number(val);
  return 0;
}

function formatUsd(val: unknown): string {
  const num = Number(val);
  if (isNaN(num)) return "-";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(val: unknown): string {
  if (!val) return "-";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-US");
}

function truncateHash(hash: string): string {
  if (!hash || hash.length < 12) return hash || "-";
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

// Colors for different types
const accountColors: Record<string, string> = {
  collateral: "text-cyan-400",
  debt: "text-orange-400",
};

const activityColors: Record<string, string> = {
  deposit: "text-green-400",
  borrowing: "text-yellow-400",
  repayment: "text-blue-400",
  redemption: "text-purple-400",
  liquidation: "text-red-400",
  interest: "text-gray-400",
};

const eventColors: Record<string, string> = {
  Mint: "text-green-400",
  Borrow: "text-yellow-400",
  RepayBorrow: "text-blue-400",
  Redeem: "text-purple-400",
  LiquidateBorrow: "text-red-400",
};

export function CompoundReportViewRaw({ report }: Props) {
  const period = report?.period ?? null;
  const [viewMode, setViewMode] = useState<"monthly" | "cumulative">("monthly");

  const normalizedEvents = useMemo(
    () => (Array.isArray(period?.normalizedEvents) ? period.normalizedEvents : []),
    [period]
  );

  const reconciliationRows = useMemo(
    () => (Array.isArray(period?.reconciliationRows) ? period.reconciliationRows : []),
    [period]
  );

  const reconciliationSummary = useMemo(
    () => (Array.isArray(period?.reconciliationSummary) ? period.reconciliationSummary : []),
    [period]
  );

  if (!period) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">
            No raw data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="transactions" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap gap-2">
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>

      {/* Transactions Tab */}
      <TabsContent value="transactions">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Transaction History (Raw)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {normalizedEvents.length === 0 ? (
              <p className="text-muted-foreground">No transactions found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TX HASH</TableHead>
                    <TableHead>ACCOUNT</TableHead>
                    <TableHead>ACTIVITY</TableHead>
                    <TableHead>TIMESTAMP</TableHead>
                    <TableHead>EVENT NAME</TableHead>
                    <TableHead>TOKEN</TableHead>
                    <TableHead className="text-right">AMOUNT</TableHead>
                    <TableHead className="text-right">AMOUNT USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedEvents.map((event, idx) => {
                    const positionType = String(event.positionType ?? event.position_type ?? "").toLowerCase();
                    const activityType = String(event.activityType ?? event.activity_type ?? "").toLowerCase();
                    const sourceAction = String(event.sourceAction ?? event.source_action ?? "");
                    const txHash = String(event.txHash ?? event.tx_hash ?? "");
                    const timestamp = event.blockTimestamp ?? event.block_timestamp;
                    const token = String(event.tokenSymbol ?? event.token_symbol ?? "");
                    const amount = Number(event.amount ?? event.amount_token ?? 0);
                    const amountUsd = Number(event.amountUsd ?? event.amount_usd ?? 0);

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs text-blue-400">
                          {truncateHash(txHash)}
                        </TableCell>
                        <TableCell className={accountColors[positionType] || ""}>
                          {positionType || "-"}
                        </TableCell>
                        <TableCell className={activityColors[activityType] || ""}>
                          {activityType || "-"}
                        </TableCell>
                        <TableCell>{formatDate(timestamp)}</TableCell>
                        <TableCell className={eventColors[sourceAction] || "text-cyan-400"}>
                          {sourceAction || "-"}
                        </TableCell>
                        <TableCell className="font-semibold">{token}</TableCell>
                        <TableCell className="text-right font-mono text-green-400">
                          {formatValue(amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatUsd(amountUsd)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Reconciliation Tab - Dynamic fields with verification */}
      <TabsContent value="reconciliation">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reconciliation Rows</CardTitle>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as "monthly" | "cumulative")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="cumulative">Cumulative</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            {reconciliationRows.length === 0 ? (
              <p className="text-muted-foreground">No reconciliation data found.</p>
            ) : (
              <>
                {/* Show all field names */}
                <div className="p-3 bg-muted/30 rounded text-xs">
                  <strong>Available fields:</strong> 
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {Object.keys(reconciliationRows[0]).map((key) => (
                      <div key={key} className="font-mono text-xs">{key}</div>
                    ))}
                  </div>
                </div>

                {/* Reconciliation formula explanation */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                  <strong>Formula:</strong> End Balance = Start + Proceeds + Accruals - Liquidated - Repayments
                </div>

                {/* Data table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(reconciliationRows[0]).map((key) => (
                          <TableHead key={key} className="text-xs uppercase">
                            {key}
                          </TableHead>
                        ))}
                        <TableHead className="text-xs uppercase bg-amber-500/10">Calculated End</TableHead>
                        <TableHead className="text-xs uppercase bg-amber-500/10">Actual End</TableHead>
                        <TableHead className="text-xs uppercase bg-amber-500/10">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationRows.map((row, idx) => {
                        // Try to find the numeric fields
                        const start = toNumeric(row.startBalance ?? row.start ?? row.opening_balance ?? 0);
                        const proceeds = toNumeric(row.proceeds ?? row.deposits ?? row.provided ?? 0);
                        const accruals = toNumeric(row.accruals ?? row.interest ?? row.interest_accrued ?? 0);
                        const liquidated = toNumeric(row.liquidated ?? row.liquidation ?? 0);
                        const repayments = toNumeric(row.repayments ?? row.payments ?? row.paid ?? 0);
                        const actualEnd = toNumeric(row.endBalance ?? row.end ?? row.closing_balance ?? 0);
                        
                        const calculatedEnd = start + proceeds + accruals - liquidated - repayments;
                        const variance = actualEnd - calculatedEnd;
                        
                        return (
                          <TableRow key={idx}>
                            {Object.entries(row).map(([key, value], cellIdx) => (
                              <TableCell key={cellIdx} className="font-mono text-xs">
                                {formatValue(value)}
                              </TableCell>
                            ))}
                            <TableCell className="font-mono text-xs bg-amber-500/5">
                              {formatValue(calculatedEnd)}
                            </TableCell>
                            <TableCell className="font-mono text-xs bg-amber-500/5">
                              {formatValue(actualEnd)}
                            </TableCell>
                            <TableCell className={`font-mono text-xs bg-amber-500/5 ${variance === 0 ? 'text-green-600' : 'text-red-600 font-bold'}`}>
                              {formatValue(variance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Summary Tab */}
      <TabsContent value="summary">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Reconciliation Summary</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {reconciliationSummary.length === 0 ? (
              <p className="text-muted-foreground">No summary data found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TOKEN</TableHead>
                    <TableHead>POSITION</TableHead>
                    <TableHead className="text-right">TOTAL DEPOSITS</TableHead>
                    <TableHead className="text-right">TOTAL WITHDRAWALS</TableHead>
                    <TableHead className="text-right">TOTAL INTEREST</TableHead>
                    <TableHead className="text-right">ENDING BALANCE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationSummary.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold">{String(row.tokenSymbol ?? row.token ?? "-")}</TableCell>
                      <TableCell className={accountColors[String(row.positionType ?? "").toLowerCase()] || ""}>
                        {String(row.positionType ?? "-")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-400">
                        {formatValue(row.totalDeposits ?? row.deposits ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-400">
                        {formatValue(row.totalWithdrawals ?? row.withdrawals ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatValue(row.totalInterest ?? row.interest ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatValue(row.endingBalance ?? row.end ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Raw JSON Tab */}
      <TabsContent value="raw">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Raw JSON Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto rounded bg-muted/50 p-4 text-xs">
              {JSON.stringify(report, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
