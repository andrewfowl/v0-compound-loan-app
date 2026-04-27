import { NextRequest, NextResponse } from "next/server"
import type { AccountType, ActivityType, EventName, CompoundEvent } from "@/lib/compound/types"

type EventMapping = {
  accountType: AccountType
  activity: ActivityType
  eventName: EventName
}

function generateMockCompoundEvents(address: string): CompoundEvent[] {
  const eventMappings: EventMapping[] = [
    { accountType: "collateral", activity: "deposit", eventName: "Mint" },
    { accountType: "collateral", activity: "redemption", eventName: "Redeem" },
    { accountType: "debt", activity: "borrowing", eventName: "Borrow" },
    { accountType: "debt", activity: "repayment", eventName: "RepayBorrow" },
    { accountType: "collateral", activity: "liquidation", eventName: "LiquidateBorrow" },
  ]
  const collateralAssets = ["USDC", "USDT", "COMP"]
  const debtAssets = ["WETH", "WBTC"]
  const assetPrices: Record<string, number> = {
    WETH: 3200,
    USDC: 1,
    COMP: 85,
    WBTC: 65000,
    USDT: 1,
  }

  const seed = parseInt(address.slice(2, 10), 16)
  const numEvents = 12 + (seed % 10)
  const events: CompoundEvent[] = []
  const baseDate = new Date("2021-02-19")

  for (let i = 0; i < numEvents; i++) {
    const mapping = eventMappings[(seed + i) % eventMappings.length]
    const assets = mapping.accountType === "collateral" ? collateralAssets : debtAssets
    const asset = assets[(seed + i * 3) % assets.length]
    const amount = (((seed + i * 7) % 100000) + 1000).toFixed(2)
    const price = assetPrices[asset]
    const amountUsd = (parseFloat(amount) * price).toFixed(2)
    const timestamp = new Date(baseDate.getTime() + i * 86400000 * ((seed % 10) + 1)).toISOString()
    const blockNumber = (12000000 + i * 1000 + (seed % 500)).toString()
    const txHashSeed = (seed + i * 13).toString(16).padStart(64, "0")
    const transactionHash = `0x${txHashSeed.slice(0, 64)}`

    events.push({
      id: `${transactionHash}-${i}`,
      blockNumber,
      timestamp,
      transactionHash,
      accountType: mapping.accountType,
      activity: mapping.activity,
      eventName: mapping.eventName,
      asset,
      amount,
      amountUsd,
    })
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 })
  }

  // Legacy endpoint - always return mock data
  // For real data, use the new /api/indexing/* endpoints
  return NextResponse.json({
    events: generateMockCompoundEvents(address),
    source: "mock",
    deprecated: true,
    message: "This endpoint is deprecated. Use /api/indexing/jobs to start indexing.",
  })
}
