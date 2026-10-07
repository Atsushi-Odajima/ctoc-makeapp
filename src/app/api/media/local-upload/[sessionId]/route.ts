import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { configuredProviderName } from "@/lib/media/provider"
import { originalPath, verifyLocalUploadToken } from "@/lib/media/local"

type Ctx = { params: Promise<{ sessionId: string }> }

// DEVELOPMENT ONLY (MEDIA_PROVIDER=local, never on Vercel). Stands in for the provider's
// direct-upload endpoint so the full flow can be exercised without Cloudinary credentials.
export async function PUT(request: Request, ctx: Ctx) {
  if (configuredProviderName() !== "local" || process.env.VERCEL) return new NextResponse(null, { status: 404 })
  const { sessionId } = await ctx.params
  const url = new URL(request.url)
  const exp = Number(url.searchParams.get("exp"))
  const token = request.headers.get("x-upload-token") || ""
  if (!verifyLocalUploadToken(sessionId, exp, token)) return NextResponse.json({ error: { code: "INVALID_TOKEN", message: "invalid" } }, { status: 403 })
  const session = await prisma.uploadSession.findUnique({ where: { id: sessionId }, select: { state: true, maxBytes: true, providerPublicId: true, expiresAt: true } })
  if (!session || session.state !== "OPEN" || session.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: { code: "UPLOAD_EXPIRED", message: "expired" } }, { status: 409 })
  if (!request.body) return NextResponse.json({ error: { code: "EMPTY", message: "empty" } }, { status: 422 })
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = request.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > session.maxBytes) {
      await reader.cancel()
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "too large" } }, { status: 413 })
    }
    chunks.push(value)
  }
  const file = originalPath(session.providerPublicId)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, Buffer.concat(chunks))
  return NextResponse.json({ data: { bytes: total } }, { status: 200 })
}
