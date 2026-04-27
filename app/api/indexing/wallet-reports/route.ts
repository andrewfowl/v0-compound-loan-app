import { NextRequest, NextResponse } from "next/server";
import { getWalletReports } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address")?.trim();
    const period = url.searchParams.get("period")?.trim();

    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Default to user_123 if no userId provided (for sample wallets)
    const userId = url.searchParams.get("userId")?.trim() || "user_123";
    console.log("[v0] wallet-reports request:", { address, period, userId });
    const data = await getWalletReports(address, period || undefined, userId);
    console.log("[v0] wallet-reports response:", data);

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch wallet reports";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
