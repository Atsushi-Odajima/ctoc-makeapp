import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseQuery, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { decodeCursor, encodeCursor, pageSize } from "@/lib/api/pagination"
import { postSelect, toPostDTO } from "@/lib/dto/post"
import { deliveryProvider } from "@/lib/media/delivery"
import { visiblePostWhere } from "@/lib/policies/posts"

const query = z.object({ cursor: z.string().max(200).optional(), limit: z.string().optional() })

// Only the owner can read their bookmarks. Posts that are no longer viewable are skipped by the
// SQL filter (before pagination), so nothing private leaks through a stale bookmark.
export const GET = route(async (request: Request) => {
  const viewer = await requireViewer()
  const q = parseQuery(request.url, query)
  const limit = pageSize(q.limit)
  const c = decodeCursor(q.cursor)
  const rows = await prisma.bookmark.findMany({
    where: {
      userId: viewer.id,
      post: visiblePostWhere(viewer.id),
      ...(c ? { OR: [{ createdAt: { lt: c.t } }, { createdAt: c.t, postId: { lt: c.id } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
    take: limit + 1,
    select: { createdAt: true, postId: true, post: { select: postSelect(viewer.id) } },
  })
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const provider = await deliveryProvider()
  return ok(items.map(r => toPostDTO(r.post, viewer.id, provider)), {
    nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: last.postId }) : null,
  })
})
