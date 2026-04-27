"use client";

import React, { useMemo, type ReactNode } from "react";
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

type GenericRow = Record<string, any>;

type ReportPeriod = {
  periodLabel?: string;
  monthStart?: Record<string, any>;
  monthEnd?: Record<string, any>;
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

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function display(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s === "" ? "—" : s;
}

function fmtMoney(value: unknown): string {
  const n = num(value);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(value: unknown): string {
  const n = num(value);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function familyOf(row: GenericRow): string {
  return String(
    row.positionFamily ?? row.position_family ?? row.positionType ?? row.position_type ?? ""
  ).toLowerCase();
}

function typeOfPosition(row: GenericRow): string {
  return String(
    row.positionType ?? row.position_type ?? row.positionFamily ?? row.position_family ?? ""
  ).toLowerCase();
}

function activityOf(row: GenericRow): string {
  return String(
    row.activityType ?? row.activity_type ?? row.syntheticType ?? row.rowType ?? row.row_type ?? ""
  ).toLowerCase();
}

function rowLabel(row: GenericRow): string {
  const rt = String(
    row.syntheticType ??
      row.rowType ??
      row.row_type ??
      row.activityType ??
      row.activity_type ??
      row.sourceAction ??
      row.source_action ??
      ""
  ).toLowerCase();

  if (rt.includes("opening") || rt.includes("backsolved")) return "Opening";
  if (rt.includes("interest")) return "Interest";
  if (rt.includes("closing")) return "Closing";
  if (rt.includes("variance")) return "Variance";
  if (rt.includes("funding_remeasurement")) return "Funding Remeasurement";
  if (num(row.proceeds) !== 0) return "Borrowing";
  if (num(row.repaid) !== 0) return "Repayment";
  if (num(row.liquidated) !== 0) return "Liquidation";
  if (num(row.provided) !== 0) return "Provided";
  if (num(row.reclaimed) !== 0) return "Reclaimed";
  if (num(row.collateralLiquidated) !== 0) return "Collateral Liquidation";
  if (num(row.liquidationFees) !== 0) return "Liquidation Fee";
  if (num(row.fundingReceived) !== 0) return "Funding Received";
  if (num(row.fundingIncreaseRepayment) !== 0) return "Increase from Repayment";
  if (num(row.fundingIncreaseLiquidation) !== 0) return "Increase from Liquidation";

  return rt || "Entry";
}

function classForVariance(value: unknown): string {
  return num(value) !== 0 ? "text-red-600 font-medium" : "";
}

function buildLegacySummary(
  normalizedEvents: GenericRow[],
  reconciliationRows: GenericRow[]
) {
  const collateralSummary: Record<string, Record<string, number>> = {
    deposited: {},
    redeemed: {},
    liquidated: {},
    "interest income": {},
  };

  const debtSummary: Record<string, Record<string, number>> = {
    borrowing: {},
    repayment: {},
    liquidation: {},
    "interest expense": {},
  };

  const collateralTokens = new Set<string>();
  const debtTokens = new Set<string>();

  for (const event of normalizedEvents) {
    const token = text(event.tokenSymbol ?? event.token_symbol);
    if (!token) continue;

    const amountUsd = num(event.amountUsd ?? event.amount_usd);
    const positionType = String(
      event.positionType ?? event.position_type ?? ""
    ).toLowerCase();
    const activityType = String(
      event.activityType ?? event.activity_type ?? ""
    ).toLowerCase();

    if (positionType === "collateral") {
      collateralTokens.add(token);

      if (activityType === "deposit") {
        collateralSummary.deposited[token] =
          (collateralSummary.deposited[token] || 0) + amountUsd;
      } else if (activityType === "redemption") {
        collateralSummary.redeemed[token] =
          (collateralSummary.redeemed[token] || 0) + amountUsd;
      } else if (activityType === "liquidation") {
        collateralSummary.liquidated[token] =
          (collateralSummary.liquidated[token] || 0) + amountUsd;
      }
    } else {
      debtTokens.add(token);

      if (activityType === "borrowing" || activityType === "base_out") {
        debtSummary.borrowing[token] =
          (debtSummary.borrowing[token] || 0) + amountUsd;
      } else if (activityType === "repayment" || activityType === "base_in") {
        debtSummary.repayment[token] =
          (debtSummary.repayment[token] || 0) + amountUsd;
      } else if (activityType === "liquidation") {
        debtSummary.liquidation[token] =
          (debtSummary.liquidation[token] || 0) + amountUsd;
      }
    }
  }

  for (const row of reconciliationRows) {
    const token = text(row.tokenSymbol ?? row.token_symbol);
    if (!token) continue;

    const family = familyOf(row);

    if (family === "loan" || family === "debt") {
      debtTokens.add(token);
      debtSummary["interest expense"][token] =
        (debtSummary["interest expense"][token] || 0) + num(row.interestExpense);
    }

    if (family === "collateral") {
      collateralTokens.add(token);
      collateralSummary["interest income"][token] =
        (collateralSummary["interest income"][token] || 0) + num(row.interestIncome);
    }
  }

  return {
    collateralSummary,
    debtSummary,
    collateralTokens: Array.from(collateralTokens).sort(),
    debtTokens: Array.from(debtTokens).sort(),
  };
}

function reportRowsByFamily(rows: GenericRow[], familyNames: string[]) {
  const familySet = new Set(familyNames);
  return rows.filter((row) => familySet.has(familyOf(row)));
}

function groupKey(row: GenericRow) {
  return [
    row.protocolVersion ?? row.protocol_version ?? "—",
    row.marketSymbol ?? row.market_symbol ?? row.marketId ?? row.market_id ?? "—",
    row.tokenSymbol ?? row.token_symbol ?? "—",
  ].join(" | ");
}

function buildGroupedLedger(rows: GenericRow[]) {
  const groups = new Map<string, GenericRow[]>();

  for (const row of rows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  return Array.from(groups.entries()).map(([key, groupedRows]) => ({
    key,
    rows: groupedRows,
  }));
}

function extractUnifiedSummary(summaryObj: Record<string, any> | null) {
  if (!summaryObj || typeof summaryObj !== "object") return [];

  return [
    {
      label: "Total Collateral USD",
      value: summaryObj.totalCollateralUsd,
    },
    {
      label: "Total Borrow USD",
      value: summaryObj.totalBorrowUsd,
    },
    {
      label: "Total Base Supply USD",
      value: summaryObj.totalBaseSupplyUsd,
    },
    {
      label: "Additional Borrow Capacity USD",
      value: summaryObj.additionalBorrowCapacityUsd,
    },
    {
      label: "Liquidation Buffer USD",
      value: summaryObj.liquidationBufferUsd,
    },
    {
      label: "Any Liquidatable",
      value: summaryObj.anyLiquidatable,
    },
  ];
}

function ExcelCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SummaryGrid({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: unknown }>;
}) {
  return (
    <ExcelCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No summary data.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border p-4">
              <div className="text-xs uppercase text-muted-foreground">
                {row.label}
              </div>
              <div className="mt-1 text-lg font-semibold">{display(row.value)}</div>
            </div>
          ))}
        </div>
      )}
    </ExcelCard>
  );
}

function RollforwardSummaryTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: GenericRow[];
  columns: Array<{ key: string; label: string; money?: boolean; qty?: boolean; variance?: boolean }>;
}) {
  return (
    <ExcelCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${title}-${idx}`}>
                  {columns.map((col) => {
                    const value = row[col.key];
                    return (
                      <TableCell
                        key={col.key}
                        className={col.variance ? classForVariance(value) : ""}
                      >
                        {col.money
                          ? fmtMoney(value)
                          : col.qty
                            ? fmtQty(value)
                            : display(value)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ExcelCard>
  );
}

function DetailedLedger({
  title,
  rows,
  family,
}: {
  title: string;
  rows: GenericRow[];
  family: "loan" | "collateral" | "funding";
}) {
  const groups = useMemo(() => buildGroupedLedger(rows), [rows]);

  const renderFamilyCells = (row: GenericRow) => {
    if (family === "loan") {
      return (
        <>
          <TableCell>{fmtQty(row.beginningBalance)}</TableCell>
          <TableCell>{fmtQty(row.proceeds)}</TableCell>
          <TableCell>{fmtQty(row.interestExpense)}</TableCell>
          <TableCell>{fmtQty(row.liquidated)}</TableCell>
          <TableCell>{fmtQty(row.repaid)}</TableCell>
          <TableCell>{fmtQty(row.ending)}</TableCell>
          <TableCell className={classForVariance(row.unresolvedVariance)}>
            {fmtQty(row.unresolvedVariance)}
          </TableCell>
        </>
      );
    }

    if (family === "collateral") {
      return (
        <>
          <TableCell>{fmtQty(row.beginningSupplied)}</TableCell>
          <TableCell>{fmtQty(row.provided)}</TableCell>
          <TableCell>{fmtQty(row.reclaimed)}</TableCell>
          <TableCell>{fmtQty(row.interestIncome)}</TableCell>
          <TableCell>{fmtQty(row.collateralLiquidated)}</TableCell>
          <TableCell>{fmtQty(row.liquidationFees)}</TableCell>
          <TableCell>{fmtQty(row.collateralEnding)}</TableCell>
          <TableCell className={classForVariance(row.unresolvedVariance)}>
            {fmtQty(row.unresolvedVariance)}
          </TableCell>
        </>
      );
    }

    return (
      <>
        <TableCell>{fmtQty(row.beginningFundingAvailable)}</TableCell>
        <TableCell>{fmtQty(row.fundingReceived)}</TableCell>
        <TableCell>{fmtQty(row.fundingIncreaseRepayment)}</TableCell>
        <TableCell>{fmtQty(row.fundingIncreaseLiquidation)}</TableCell>
        <TableCell>{fmtQty(row.fundingEffectChangeLiqRatio)}</TableCell>
        <TableCell>{fmtQty(row.endingFundingAvailable)}</TableCell>
        <TableCell className={classForVariance(row.unresolvedVariance)}>
          {fmtQty(row.unresolvedVariance)}
        </TableCell>
      </>
    );
  };

  const renderFamilyHeader = () => {
    if (family === "loan") {
      return (
        <>
          <TableHead>Beginning</TableHead>
          <TableHead>Proceeds</TableHead>
          <TableHead>Interest Expense</TableHead>
          <TableHead>Liquidated</TableHead>
          <TableHead>Repaid</TableHead>
          <TableHead>Ending</TableHead>
          <TableHead>Unresolved Variance</TableHead>
        </>
      );
    }

    if (family === "collateral") {
      return (
        <>
          <TableHead>Beginning Supplied</TableHead>
          <TableHead>Provided</TableHead>
          <TableHead>Reclaimed</TableHead>
          <TableHead>Interest Income</TableHead>
          <TableHead>Liquidated</TableHead>
          <TableHead>Liquidation Fees</TableHead>
          <TableHead>Ending</TableHead>
          <TableHead>Unresolved Variance</TableHead>
        </>
      );
    }

    return (
      <>
        <TableHead>Beginning Funding Available</TableHead>
        <TableHead>Funding Received</TableHead>
        <TableHead>Increase from Repayment</TableHead>
        <TableHead>Increase from Liquidation</TableHead>
        <TableHead>Effect of Change in Ratio</TableHead>
        <TableHead>Ending Funding Available</TableHead>
        <TableHead>Unresolved Variance</TableHead>
      </>
    );
  };

  return (
    <ExcelCard title={title}>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No detailed rows returned.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="rounded-lg border">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
                {group.key}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>TX Hash</TableHead>
                      {renderFamilyHeader()}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {group.rows.map((row, idx) => (
                      <TableRow key={`${group.key}-${idx}`}>
                        <TableCell>{fmtDate(row.blockTimestamp)}</TableCell>
                        <TableCell>{rowLabel(row)}</TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs">
                          {row.txHash ? String(row.txHash) : "—"}
                        </TableCell>
                        {renderFamilyCells(row)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExcelCard>
  );
}

function SummaryMatrix({
  title,
  tokens,
  data,
}: {
  title: string;
  tokens: string[];
  data: Record<string, Record<string, number>>;
}) {
  return (
    <ExcelCard title={title}>
      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                {tokens.map((token) => (
                  <TableHead key={token}>{token}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data).map(([activity, tokenMap]) => (
                <TableRow key={activity}>
                  <TableCell className="font-medium capitalize">
                    {activity}
                  </TableCell>
                  {tokens.map((token) => (
                    <TableCell key={token}>{fmtMoney(tokenMap[token] || 0)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ExcelCard>
  );
}

function LegacyLedger({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: GenericRow[];
  columns: Array<{ key: string; label: string; money?: boolean; qty?: boolean }>;
}) {
  return (
    <ExcelCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${title}-${idx}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.money
                        ? fmtMoney(row[col.key])
                        : col.qty
                          ? fmtQty(row[col.key])
                          : display(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ExcelCard>
  );
}

export function CompoundReportView({ report, loading = false }: Props) {
  console.log("[v0] CompoundReportView received report:", report);
  const period = report?.period ?? null;
  console.log("[v0] CompoundReportView period:", period);

  const normalizedEvents = useMemo(
    () => (Array.isArray(period?.normalizedEvents) ? period.normalizedEvents : []),
    [period]
  );

  const reconciliationRows = useMemo(
    () =>
      Array.isArray(period?.reconciliationRows) ? period.reconciliationRows : [],
    [period]
  );

  const reconciliationSummary = useMemo(
    () =>
      Array.isArray(period?.reconciliationSummary)
        ? period.reconciliationSummary
        : [],
    [period]
  );

  const monthStartSummary =
    (period?.monthStart as any)?.unifiedSummary ??
    (period?.monthStart as any)?.summary ??
    null;

  const monthEndSummary =
    (period?.monthEnd as any)?.unifiedSummary ??
    (period?.monthEnd as any)?.summary ??
    null;

  const startSummaryRows = useMemo(
    () => extractUnifiedSummary(monthStartSummary),
    [monthStartSummary]
  );

  const endSummaryRows = useMemo(
    () => extractUnifiedSummary(monthEndSummary),
    [monthEndSummary]
  );

  const financeLoanRows = useMemo(
    () => reconciliationSummary.filter((row) => familyOf(row) === "loan"),
    [reconciliationSummary]
  );

  const financeCollateralRows = useMemo(
    () => reconciliationSummary.filter((row) => familyOf(row) === "collateral"),
    [reconciliationSummary]
  );

  const financeFundingRows = useMemo(
    () => reconciliationSummary.filter((row) => familyOf(row) === "funding"),
    [reconciliationSummary]
  );

  const detailedLoanRows = useMemo(
    () => reportRowsByFamily(reconciliationRows, ["loan", "debt"]),
    [reconciliationRows]
  );

  const detailedCollateralRows = useMemo(
    () => reportRowsByFamily(reconciliationRows, ["collateral"]),
    [reconciliationRows]
  );

  const detailedFundingRows = useMemo(
    () => reportRowsByFamily(reconciliationRows, ["funding"]),
    [reconciliationRows]
  );

  const legacySummary = useMemo(
    () => buildLegacySummary(normalizedEvents, reconciliationRows),
    [normalizedEvents, reconciliationRows]
  );

  const legacyLoanRows = useMemo(
    () =>
      reconciliationRows
        .filter((row) => familyOf(row) === "loan" || typeOfPosition(row) === "debt")
        .map((row) => ({
          token: row.tokenSymbol ?? row.token_symbol ?? "—",
          item: rowLabel(row),
          date: row.blockTimestamp ? fmtDate(row.blockTimestamp) : period?.periodLabel ?? "—",
          start: row.beginningBalance ?? null,
          proceeds: row.proceeds ?? null,
          accruals: row.interestExpense ?? null,
          liquidated: row.liquidated ?? null,
          payments: row.repaid ?? null,
          end: row.ending ?? null,
        })),
    [reconciliationRows, period?.periodLabel]
  );

  const legacyCollateralRows = useMemo(
    () =>
      reconciliationRows
        .filter((row) => familyOf(row) === "collateral")
        .map((row) => ({
          token: row.tokenSymbol ?? row.token_symbol ?? "—",
          item: rowLabel(row),
          date: row.blockTimestamp ? fmtDate(row.blockTimestamp) : period?.periodLabel ?? "—",
          start: row.beginningSupplied ?? null,
          provided: row.provided ?? null,
          accruals: row.interestIncome ?? null,
          liquidated: row.collateralLiquidated ?? null,
          reclaimed: row.reclaimed ?? null,
          end: row.collateralEnding ?? null,
        })),
    [reconciliationRows, period?.periodLabel]
  );

  const transactionRows = useMemo(
    () =>
      normalizedEvents.map((event) => ({
        txHash: event.txHash ?? event.tx_hash ?? "—",
        protocolVersion: event.protocolVersion ?? event.protocol_version ?? "—",
        marketSymbol: event.marketSymbol ?? event.market_symbol ?? "—",
        positionType: event.positionType ?? event.position_type ?? "—",
        activityType: event.activityType ?? event.activity_type ?? "—",
        timestamp: fmtDate(event.blockTimestamp ?? event.block_timestamp),
        sourceAction: event.sourceAction ?? event.source_action ?? "—",
        tokenSymbol: event.tokenSymbol ?? event.token_symbol ?? "—",
        amount: event.amount ?? event.amount_token ?? null,
        amountUsd: event.amountUsd ?? event.amount_usd ?? null,
      })),
    [normalizedEvents]
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

  return (
    <Tabs defaultValue="report-pack" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap gap-2">
        <TabsTrigger value="report-pack">Finance Report Pack</TabsTrigger>
        <TabsTrigger value="legacy">Legacy Views</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="report-pack" className="space-y-4">
        <SummaryGrid title="Beginning Net Position" rows={startSummaryRows} />
        <SummaryGrid title="Ending Net Position" rows={endSummaryRows} />

        <RollforwardSummaryTable
          title="Loan Roll-forward Summary"
          rows={financeLoanRows}
          columns={[
            { key: "protocolVersion", label: "Protocol" },
            { key: "marketSymbol", label: "Market" },
            { key: "tokenSymbol", label: "Token" },
            { key: "beginningBalance", label: "Beginning", qty: true },
            { key: "proceeds", label: "Proceeds", qty: true },
            { key: "interestExpense", label: "Interest Expense", qty: true },
            { key: "liquidated", label: "Liquidated", qty: true },
            { key: "repaid", label: "Repaid", qty: true },
            { key: "ending", label: "Ending", qty: true },
            { key: "unresolvedVariance", label: "Unresolved Variance", qty: true, variance: true },
          ]}
        />

        <DetailedLedger
          title="Loan Detailed Ledger"
          rows={detailedLoanRows}
          family="loan"
        />

        <RollforwardSummaryTable
          title="Collateral Roll-forward Summary"
          rows={financeCollateralRows}
          columns={[
            { key: "protocolVersion", label: "Protocol" },
            { key: "marketSymbol", label: "Market" },
            { key: "tokenSymbol", label: "Token" },
            { key: "beginningSupplied", label: "Beginning Supplied", qty: true },
            { key: "provided", label: "Provided", qty: true },
            { key: "reclaimed", label: "Reclaimed", qty: true },
            { key: "interestIncome", label: "Interest Income", qty: true },
            { key: "collateralLiquidated", label: "Liquidated", qty: true },
            { key: "liquidationFees", label: "Liquidation Fees", qty: true },
            { key: "collateralEnding", label: "Ending", qty: true },
            { key: "unresolvedVariance", label: "Unresolved Variance", qty: true, variance: true },
          ]}
        />

        <DetailedLedger
          title="Collateral Detailed Ledger"
          rows={detailedCollateralRows}
          family="collateral"
        />

        <RollforwardSummaryTable
          title="Funding Roll-forward Summary"
          rows={financeFundingRows}
          columns={[
            { key: "protocolVersion", label: "Protocol" },
            { key: "marketSymbol", label: "Market" },
            { key: "tokenSymbol", label: "Token" },
            { key: "beginningFundingAvailable", label: "Beginning Funding Available", qty: true },
            { key: "fundingReceived", label: "Funding Received", qty: true },
            { key: "fundingIncreaseRepayment", label: "Increase from Repayment", qty: true },
            { key: "fundingIncreaseLiquidation", label: "Increase from Liquidation", qty: true },
            { key: "fundingEffectChangeLiqRatio", label: "Effect of Change in Ratio", qty: true },
            { key: "endingFundingAvailable", label: "Ending Funding Available", qty: true },
            { key: "unresolvedVariance", label: "Unresolved Variance", qty: true, variance: true },
          ]}
        />

        <DetailedLedger
          title="Funding Detailed Ledger"
          rows={detailedFundingRows}
          family="funding"
        />

        {Array.isArray(report?.notes) && report.notes.length > 0 ? (
          <ExcelCard title="Notes">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {report.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </ExcelCard>
        ) : null}
      </TabsContent>

      <TabsContent value="legacy" className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <SummaryMatrix
            title="Legacy Collateral Activity"
            tokens={legacySummary.collateralTokens}
            data={legacySummary.collateralSummary}
          />
          <SummaryMatrix
            title="Legacy Debt Activity"
            tokens={legacySummary.debtTokens}
            data={legacySummary.debtSummary}
          />
        </div>

        <LegacyLedger
          title="Legacy Loan Ledger"
          rows={legacyLoanRows}
          columns={[
            { key: "token", label: "Crypto" },
            { key: "item", label: "Item" },
            { key: "date", label: "Date" },
            { key: "start", label: "Start", qty: true },
            { key: "proceeds", label: "Borrowed Crypto", qty: true },
            { key: "accruals", label: "Accruals", qty: true },
            { key: "liquidated", label: "Liquidate", qty: true },
            { key: "payments", label: "Payments", qty: true },
            { key: "end", label: "End", qty: true },
          ]}
        />

        <LegacyLedger
          title="Legacy Collateral Ledger"
          rows={legacyCollateralRows}
          columns={[
            { key: "token", label: "Crypto" },
            { key: "item", label: "Item" },
            { key: "date", label: "Date" },
            { key: "start", label: "Start" },
            { key: "provided", label: "Deposit", qty: true },
            { key: "accruals", label: "Accruals", qty: true },
            { key: "liquidated", label: "Liquidate", qty: true },
            { key: "reclaimed", label: "Redeem", qty: true },
            { key: "end", label: "End" },
          ]}
        />
      </TabsContent>

      <TabsContent value="transactions">
        <LegacyLedger
          title="Normalized Transactions"
          rows={transactionRows}
          columns={[
            { key: "txHash", label: "TX Hash" },
            { key: "protocolVersion", label: "Protocol" },
            { key: "marketSymbol", label: "Market" },
            { key: "positionType", label: "Position Type" },
            { key: "activityType", label: "Activity Type" },
            { key: "timestamp", label: "Date" },
            { key: "sourceAction", label: "Source Action" },
            { key: "tokenSymbol", label: "Token" },
            { key: "amount", label: "Amount", qty: true },
            { key: "amountUsd", label: "Amount USD", money: true },
          ]}
        />
      </TabsContent>

      <TabsContent value="raw">
        <ExcelCard title="Raw Report Payload">
          <pre className="max-h-[800px] overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(report, null, 2)}
          </pre>
        </ExcelCard>
      </TabsContent>
    </Tabs>
  );
}
