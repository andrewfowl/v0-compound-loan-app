import { NextRequest, NextResponse } from "next/server";
import { getWalletReports, SAMPLE_USER_IDS } from "@/lib/indexing-api";

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

    // Try all sample user IDs in parallel; return the first that yields a non-empty payload.
    const results = await Promise.allSettled(
      SAMPLE_USER_IDS.map((uid) =>
        getWalletReports(address, period || undefined, uid)
      )
    );

    let data: unknown = null;
    for (const result of results) {
      if (result.status === "fulfilled" && result.value != null) {
        data = result.value;
        break;
      }
    }

    if (data == null) {
      // All attempts failed — surface the first error
      const firstError = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      const message =
        firstError?.reason instanceof Error
          ? firstError.reason.message
          : "No report found for any user ID";
      return NextResponse.json(
        { error: message },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

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
