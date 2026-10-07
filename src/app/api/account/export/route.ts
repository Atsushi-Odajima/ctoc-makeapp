import { z } from "zod"
import { NextResponse } from "next/server"
import { parseBody, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { enforce } from "@/lib/rate-limit"
import { buildExport, toCsv } from "@/lib/services/account"

const schema = z.object({
  format: z.enum(["json", "csv"]).optional().default("json"),
  table: z.enum(["posts", "comments", "memberships"]).optional().default("posts"),
}).strict()

export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const { format, table } = await parseBody(request, schema)
  await enforce("export", viewer.id)
  const data = await buildExport(viewer.id)
  const stamp = new Date().toISOString().slice(0, 10)
  const headers = { "Cache-Control": "private, no-store" }
  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="daynet-export-${stamp}.json"` },
    })
  }
  const rows: Array<Record<string, unknown>> = table === "posts"
    ? data.posts.map(p => ({ id: p.id, kind: p.kind, visibility: p.visibility, status: p.status, caption: p.caption, community: p.community?.slug ?? "", createdAt: p.createdAt, publishedAt: p.publishedAt, mediaCount: p.media.length }))
    : table === "comments"
      ? data.comments.map(c => ({ ...c }))
      : data.memberships.map(m => ({ ...m }))
  return new NextResponse(toCsv(rows), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="daynet-${table}-${stamp}.csv"` },
  })
})
