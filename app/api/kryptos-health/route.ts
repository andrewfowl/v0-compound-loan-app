import { NextResponse } from "next/server"
// import { kryptosFetch } from "@/lib/kryptos"

export async function GET() {
  return NextResponse.json(
    { error: "Kryptos health check endpoint is deprecated" },
    { status: 410 }
  );
}
