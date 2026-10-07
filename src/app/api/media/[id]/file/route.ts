import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyMediaToken } from "@/lib/media/tokens"

type Ctx = { params: Promise<{ id: string }> }

// Short-lived token (issued only after an ACL check) for legacy public images that have not yet
// been migrated to authenticated delivery. NOTE: the legacy URL itself is still public on the
// CDN until `npm run media:migrate-legacy` copies it and destroys the public original.
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const url = new URL(request.url)
  const exp = Number(url.searchParams.get("exp"))
  const sig = url.searchParams.get("sig") || ""
  const variant = url.searchParams.get("variant") || "display"
  if (!verifyMediaToken(id, variant, exp, sig)) return new NextResponse(null, { status: 404 })
  const media = await prisma.media.findUnique({ where: { id }, select: { provider: true, legacyUrl: true, status: true } })
  if (!media || media.provider !== "legacy-url" || media.status !== "READY" || !media.legacyUrl || !/^https?:\/\//.test(media.legacyUrl)) {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.redirect(media.legacyUrl, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } })
}
