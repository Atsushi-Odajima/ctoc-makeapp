import { z } from "zod"
import { ok, parseQuery, route } from "@/lib/api/http"
import { getViewer } from "@/lib/api/viewer"
import { pageSize } from "@/lib/api/pagination"
import { countNewer, listFeed } from "@/lib/services/posts"

const query = z.object({
  tab: z.enum(["following", "communities", "discover"]).optional().default("following"),
  cursor: z.string().max(200).optional(),
  limit: z.string().optional(),
  since: z.string().max(200).optional(),
})

// Chronological only (publishedAt desc, id desc). No ranking / synthetic popularity.
export const GET = route(async (request: Request) => {
  const q = parseQuery(request.url, query)
  const viewer = await getViewer()
  const tab = viewer ? q.tab : "discover"
  if (q.since) return ok({ newCount: await countNewer(viewer?.id ?? null, tab, q.since) })
  const page = await listFeed(viewer?.id ?? null, tab, { cursor: q.cursor, limit: pageSize(q.limit) })
  return ok(page.items, { nextCursor: page.nextCursor })
})
