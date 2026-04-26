"use client";

import { useMemo } from "react";
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

function fmtNumber(value: unknown): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

function fmtMoney(value: unknown): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function display(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return fmtNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s === "" ? "—" : s;
}

function familyOf(row: GenericRow): string {
  return String(row.positionFamily ?? row.position_family ?? "").toLowerCase();
}

function typeOfPosition(row: GenericRow): string {
  return String(row.positionType ?? row.position_type ?? "").toLowerCase();
}

function rowTypeOf(row: GenericRow): string {
  return String(
    row.syntheticType ??
      row.rowType ??
      row.row_type ??
      row.activityType ??
      row.activity_type ??
      row.sourceAction ??
      row.source_action ??
      ""
  );
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
    const token = text(event.tokenSymbol || event.asset || event.token_symbol);
    if (!token) continue;

    const amountUsd = num(event.amountUsd ?? event.amount_usd);
    const positionType = typeOfPosition(event);
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
    } else if (positionType === "debt" || positionType === "loan" || positionType === "base") {
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

    if (family === "loan") {
      debtTokens.add(token);
      debtSummary["interest expense"][token] =
        (debtSummary["interest expense"][token] || 0) + num(row.interestExpense);
    }

    if (family === "collateral") {
      collateralTokens.add(token);
      collateralSummary["interest income"][token] =
        (collateralSummary["interest income"][token] || 0) +
        num(row.interestIncome);
    }
  }

  return {
    collateralSummary,
    debtSummary,
    collateralTokens: Array.from(collateralTokens).sort(),
    debtTokens: Array.from(debtTokens).sort(),
  };
}

function loanItemLabel(row: GenericRow) {
  const rt = rowTypeOf(row).toLowerCase();

  if (rt.includes("opening") || rt.includes("backsolved")) return "Opening";
  if (rt.includes("interest")) return "Interest";
  if (rt.includes("closing")) return "Closing";
  if (rt.includes("variance")) return "Variance";
  if (num(row.proceeds) !== 0) return "Borrowed crypto";
  if (num(row.liquidated) !== 0) return "Paid by liquidator";
  if (num(row.repaid) !== 0) return "Paid by borrower";

  return rowTypeOf(row) || "Entry";
}

function collateralItemLabel(row: GenericRow) {
  const rt = rowTypeOf(row).toLowerCase();

  if (rt.includes("opening") || rt.includes("backsolved")) return "Opening";
  if (rt.includes("interest")) return "Interest";
  if (rt.includes("closing")) return "Closing";
  if (rt.includes("variance")) return "Variance";
  if (num(row.provided) !== 0) return "Deposit";
  if (num(row.collateralLiquidated) !== 0) return "Liquidate";
  if (num(row.reclaimed) !== 0) return "Redeem";

  return rowTypeOf(row) || "Entry";
}

function renderSummaryMatrix(
  title: string,
  tokens: string[],
  data: Record<string, Record<string, number>>
) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  );
}

function renderGenericTable(title: string, rows: GenericRow[], columns: string[]) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rows returned.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${title}-${idx}`}>
                    {columns.map((col) => (
                      <TableCell key={col}>{display(row[col])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CompoundReportView({ report, loading = false }: Props) {
  const period = report?.period ?? null;

  const normalizedEvents = useMemo(
    () => (Array.isArray(period?.normalizedEvents) ? period!.normalizedEvents! : []),
    [period]
  );

  const reconciliationRows = useMemo(
    () =>
      Array.isArray(period?.reconciliationRows) ? period!.reconciliationRows! : [],
    [period]
  );

  const reconciliationSummary = useMemo(
    () =>
      Array.isArray(period?.reconciliationSummary)
        ? period!.reconciliationSummary!
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

  const legacyLoanRows = useMemo(
    () =>
      reconciliationRows
        .filter((row) => familyOf(row) === "loan" || typeOfPosition(row) === "debt")
        .map((row) => ({
          token: row.tokenSymbol ?? row.token_symbol ?? "—",
          item: loanItemLabel(row),
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
        .filter(
          (row) =>
            familyOf(row) === "collateral" || typeOfPosition(row) === "collateral"
        )
        .map((row) => ({
          token: row.tokenSymbol ?? row.token_symbol ?? "—",
          item: collateralItemLabel(row),
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

  const legacySummary = useMemo(
    () => buildLegacySummary(normalizedEvents, reconciliationRows),
    [normalizedEvents, reconciliationRows]
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
    return <Skeleton className="h-[520px] w-full" />;
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
    <Tabs defaultValue="net-position" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap gap-2">
        <TabsTrigger value="net-position">Net Position</TabsTrigger>
        <TabsTrigger value="loan-rollforward">Loan Roll-forward</TabsTrigger>
        <TabsTrigger value="collateral-rollforward">Collateral Roll-forward</TabsTrigger>
        <TabsTrigger value="funding-rollforward">Funding Roll-forward</TabsTrigger>
        <TabsTrigger value="legacy-summary">Legacy Summary</TabsTrigger>
        <TabsTrigger value="legacy-loan">Legacy Loan</TabsTrigger>
        <TabsTrigger value="legacy-collateral">Legacy Collateral</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="net-position">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Beginning position</CardTitle>
            </CardHeader>
            <CardContent>
              {!monthStartSummary ? (
                <p className="text-sm text-muted-foreground">No opening summary.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(monthStartSummary).map(([key, value]) => (
                    <div key={key} className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">
                        {key}
                      </div>
                      <div className="mt-1 text-lg font-semibold">{display(value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ending position</CardTitle>
            </CardHeader>
            <CardContent>
              {!monthEndSummary ? (
                <p className="text-sm text-muted-foreground">No ending summary.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(monthEndSummary).map(([key, value]) => (
                    <div key={key} className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">
                        {key}
                      </div>
                      <div className="mt-1 text-lg font-semibold">{display(value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="loan-rollforward">
        {renderGenericTable(
          "Loan roll-forward",
          financeLoanRows,
          [
            "periodLabel",
            "protocolVersion",
            "marketSymbol",
            "tokenSymbol",
            "beginningBalance",
            "proceeds",
            "interestExpense",
            "liquidated",
            "repaid",
            "ending",
            "unresolvedVariance",
          ]
        )}
      </TabsContent>

      <TabsContent value="collateral-rollforward">
        {renderGenericTable(
          "Collateral roll-forward",
          financeCollateralRows,
          [
            "periodLabel",
            "protocolVersion",
            "marketSymbol",
            "tokenSymbol",
            "beginningSupplied",
            "provided",
            "reclaimed",
            "interestIncome",
            "collateralLiquidated",
            "liquidationFees",
            "collateralEnding",
            "unresolvedVariance",
          ]
        )}
      </TabsContent>

      <TabsContent value="funding-rollforward">
        {renderGenericTable(
          "Funding roll-forward",
          financeFundingRows,
          [
            "periodLabel",
            "protocolVersion",
            "marketSymbol",
            "tokenSymbol",
            "beginningFundingAvailable",
            "fundingReceived",
            "fundingIncreaseRepayment",
            "fundingIncreaseLiquidation",
            "fundingEffectChangeLiqRatio",
            "endingFundingAvailable",
            "unresolvedVariance",
          ]
        )}
      </TabsContent>

      <TabsContent value="legacy-summary">
        <div className="grid gap-4 xl:grid-cols-2">
          {renderSummaryMatrix(
            "Collateral Activity",
            legacySummary.collateralTokens,
            legacySummary.collateralSummary
          )}
          {renderSummaryMatrix(
            "Debt Activity",
            legacySummary.debtTokens,
            legacySummary.debtSummary
          )}
        </div>
      </TabsContent>

      <TabsContent value="legacy-loan">
        {renderGenericTable("Legacy Loan Ledger", legacyLoanRows, [
          "token",
          "item",
          "date",
          "start",
          "proceeds",
          "accruals",
          "liquidated",
          "payments",
          "end",
        ])}
      </TabsContent>

      <TabsContent value="legacy-collateral">
        {renderGenericTable("Legacy Collateral Ledger", legacyCollateralRows, [
          "token",
          "item",
          "date",
          "start",
          "provided",
          "accruals",
          "liquidated",
          "reclaimed",
          "end",
        ])}
      </TabsContent>

      <TabsContent value="transactions">
        {renderGenericTable("Transaction History", transactionRows, [
          "txHash",
          "protocolVersion",
          "marketSymbol",
          "positionType",
          "activityType",
          "timestamp",
          "sourceAction",
          "tokenSymbol",
          "amount",
          "amountUsd",
        ])}
      </TabsContent>

      <TabsContent value="raw">
        <Card>
          <CardHeader>
            <CardTitle>Raw report payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[800px] overflow-auto rounded-lg bg-muted p-4 text-xs">
              {JSON.stringify(report, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
