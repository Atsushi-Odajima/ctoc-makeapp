import { NextResponse } from "next/server"
import { selectMediaProvider } from "@/lib/media/provider"
import { applyWebhookEvent } from "@/lib/services/media"

// Provider → server notification. Verified on the RAW body with the official SDK helper,
// ±5 minutes timestamp tolerance, deduplicated by event id, owner/session cross-checked, and
// status changes only move forward (PENDING→PROCESSING→READY/FAILED).
export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > 256 * 1024) return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "too large" } }, { status: 413 })
  let provider
  try {
    provider = await selectMediaProvider()
  } catch {
    return NextResponse.json({ error: { code: "MEDIA_UNAVAILABLE", message: "unavailable" } }, { status: 503 })
  }
  const event = await provider.verifyWebhook(raw, request.headers)
  if (!event) return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "invalid signature" } }, { status: 401 })
  const result = await applyWebhookEvent(event)
  return NextResponse.json({ data: { result } }, { status: 200, headers: { "Cache-Control": "no-store" } })
}
