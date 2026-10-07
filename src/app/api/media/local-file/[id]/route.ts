import { promises as fs } from "node:fs"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { configuredProviderName } from "@/lib/media/provider"
import { derivedPath } from "@/lib/media/local"
import { verifyMediaToken } from "@/lib/media/tokens"

type Ctx = { params: Promise<{ id: string }> }

// DEVELOPMENT ONLY. Serves the derived (EXIF-stripped) file for a 120 s HMAC token that is
// issued only after the ACL check. Original uploads are never served.
export async function GET(request: Request, ctx: Ctx) {
  if (configuredProviderName() !== "local" || process.env.VERCEL) return new NextResponse(null, { status: 404 })
  const { id } = await ctx.params
  const url = new URL(request.url)
  const variant = url.searchParams.get("variant") === "poster" ? "poster" : "display"
  if (!verifyMediaToken(id, variant, Number(url.searchParams.get("exp")), url.searchParams.get("sig") || "")) {
    return new NextResponse(null, { status: 404 })
  }
  const media = await prisma.media.findUnique({ where: { id }, select: { provider: true, providerPublicId: true, status: true, kind: true } })
  if (!media || media.provider !== "local" || !media.providerPublicId || media.status === "DELETING") return new NextResponse(null, { status: 404 })
  let buf: Buffer
  try {
    buf = await fs.readFile(derivedPath(media.providerPublicId, variant))
  } catch {
    return new NextResponse(null, { status: 404 })
  }
  const type = media.kind === "VIDEO" ? "video/mp4" : "image/jpeg"
  const range = request.headers.get("range")
  const headers: Record<string, string> = { "Content-Type": type, "Cache-Control": "private, no-store", "Accept-Ranges": "bytes" }
  if (range && media.kind === "VIDEO") {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    const start = m && m[1] ? Number(m[1]) : 0
    const end = m && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1
    if (start >= buf.length || start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${buf.length}` } })
    return new NextResponse(new Uint8Array(buf.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${buf.length}`, "Content-Length": String(end - start + 1) } })
  }
  return new NextResponse(new Uint8Array(buf), { status: 200, headers: { ...headers, "Content-Length": String(buf.length) } })
}
