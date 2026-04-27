import { NextResponse } from "next/server"
import crypto from "crypto"

const WEBHOOK_SECRET = process.env.KRYPTOS_WEBHOOK_SECRET

/**
 * Verify HMAC signature from Kryptos webhook
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  
  try {
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(payload)
      .digest("hex")
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-kryptos-signature")

  // Verify webhook signature
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    )
  }

  // Parse and process the webhook payload
  try {
    const payload = JSON.parse(rawBody)
    
    // Log in development only
    if (process.env.NODE_ENV === "development") {
      console.log("[Kryptos Webhook]", payload.type || "unknown event")
    }

    // TODO: Handle different webhook event types
    // - sync_completed
    // - account_linked
    // - portfolio_updated

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    )
  }
}
