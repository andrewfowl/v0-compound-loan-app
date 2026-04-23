import { NextResponse } from "next/server"
import { kryptosFetch } from "@/lib/kryptos"

export async function GET() {
  try {
    const data = await kryptosFetch("/health", {
      method: "GET",
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health check failed" },
      { status: 500 }
    )
  }
}
