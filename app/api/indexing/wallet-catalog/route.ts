import { NextRequest, NextResponse } from "next/server";
import { getWalletCatalog } from "@/lib/indexing-api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address")?.trim();

    const data = await getWalletCatalog(address || undefined);

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
