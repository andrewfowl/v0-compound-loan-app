import { NextRequest, NextResponse } from "next/server";
import { getIndexingReport } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const walletId = String(url.searchParams.get("walletId") || "").trim();
    const period = String(url.searchParams.get("period") || "").trim();

    if (!walletId) {
      return NextResponse.json(
        { error: "walletId is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "period must be YYYY-MM" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await getIndexingReport(walletId, period);

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch report";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
