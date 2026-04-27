import { NextRequest, NextResponse } from "next/server";
import { getWalletReport } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = String(url.searchParams.get("address") || "").trim();
    const period = url.searchParams.get("period")?.trim();

    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Period is optional - if omitted, returns all reports for the wallet
    if (period && !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "period must be YYYY-MM" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await getWalletReport(address, period || undefined);

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
