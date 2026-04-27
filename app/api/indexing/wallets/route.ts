import { NextRequest, NextResponse } from "next/server";
import { getWalletCatalog, getWalletByAddress } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address")?.trim();

    // If address provided, get specific wallet info
    // Otherwise, get all wallets for user
    const data = address
      ? await getWalletByAddress(address)
      : await getWalletCatalog();

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch wallets";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
