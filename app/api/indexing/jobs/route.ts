import { NextRequest, NextResponse } from "next/server";
import { createIndexingJob } from "@/lib/indexing-api";

function normalizeDateInput(value: string, fieldName: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${fieldName} must be YYYY-MM-DD`);
  }

  return trimmed;
}

function requireMonth(value: string, fieldName: string) {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error(`${fieldName} must be YYYY-MM`);
  }

  return trimmed;
}

function requireWalletAddress(value: string) {
  const trimmed = value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error("walletAddress must be a valid Ethereum address");
  }

  return trimmed.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const walletAddress = requireWalletAddress(String(body.walletAddress || ""));
    const walletStartDate = normalizeDateInput(
      String(body.walletStartDate || ""),
      "walletStartDate"
    );
    const reportStartDate = normalizeDateInput(
      String(body.reportStartDate || walletStartDate),
      "reportStartDate"
    );
    const reportEndMonth = requireMonth(
      String(body.reportEndMonth || ""),
      "reportEndMonth"
    );

    const frequency = String(body.frequency || "monthly") as
      | "monthly"
      | "quarterly"
      | "adhoc";

    const protocolScope =
      Array.isArray(body.protocolScope) && body.protocolScope.length > 0
        ? body.protocolScope.filter((x: unknown) => x === "v2" || x === "v3")
        : ["v2", "v3"];

    const priceSourceMode = String(
      body.priceSourceMode || "uploaded_or_fallback"
    );

    const data = await createIndexingJob({
      walletAddress,
      walletStartDate,
      reportStartDate,
      reportEndMonth,
      frequency,
      protocolScope,
      priceSourceMode,
    });

    return NextResponse.json(data, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create indexing job";

    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
