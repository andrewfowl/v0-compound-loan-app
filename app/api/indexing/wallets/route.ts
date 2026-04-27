import { NextResponse } from "next/server";
import { listWallets } from "@/lib/indexing-api";

export async function GET() {
  try {
    const data = await listWallets();

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
