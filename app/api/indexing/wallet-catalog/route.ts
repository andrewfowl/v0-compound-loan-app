import { NextRequest, NextResponse } from "next/server";
import { getWalletCatalog, getWalletCatalogMultiUser, SAMPLE_USER_IDS } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address")?.trim();
    // Optional: caller can request multi-user merge (used for sample wallets)
    const multi = url.searchParams.get("multi") === "true";
    // Optional: caller can pass a specific userId to forward
    const userId = url.searchParams.get("userId")?.trim() || undefined;

    let data;
    if (address && multi) {
      // Merge results from all sample user IDs
      data = await getWalletCatalogMultiUser(address, SAMPLE_USER_IDS);
    } else {
      data = await getWalletCatalog(address || undefined, userId);
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
