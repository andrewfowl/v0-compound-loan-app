import { NextRequest, NextResponse } from "next/server";
import {
  getWalletCatalog,
  getWalletCatalogMultiUser,
  discoverWalletPeriods,
  discoverWalletPeriodsMultiUser,
  SAMPLE_USER_IDS,
} from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address")?.trim();
    // Optional: caller can request multi-user merge (used for sample wallets)
    const multi = url.searchParams.get("multi") === "true";
    // Optional: caller can pass a specific userId to forward
    const userId = url.searchParams.get("userId")?.trim() || undefined;

    let data: { walletId?: string; availablePeriods: string[] };

    if (address && multi) {
      // Merge results from all sample user IDs using both catalog AND reports discovery
      const [catalogResult, reportsResult] = await Promise.all([
        getWalletCatalogMultiUser(address, SAMPLE_USER_IDS),
        discoverWalletPeriodsMultiUser(address, SAMPLE_USER_IDS),
      ]);

      // Merge periods from both sources
      const allPeriods = new Set([
        ...(catalogResult.availablePeriods || []),
        ...reportsResult,
      ]);

      data = {
        walletId: catalogResult.walletId,
        availablePeriods: Array.from(allPeriods).sort(),
      };
    } else {
      // Single user query - try catalog first, fall back to reports discovery
      const catalogData = await getWalletCatalog(address || undefined, userId);
      const catalogPeriods: string[] = catalogData?.availablePeriods || [];

      let finalPeriods = catalogPeriods;
      if (address && catalogPeriods.length === 0) {
        // Fallback: discover periods from wallet-reports endpoint
        const discoveredPeriods = await discoverWalletPeriods(address, userId);
        finalPeriods = discoveredPeriods;
      }

      data = {
        walletId: catalogData?.walletId,
        availablePeriods: finalPeriods,
      };
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch wallet catalog";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
