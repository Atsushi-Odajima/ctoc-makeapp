import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseQuery, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { decodeCursor, encodeCursor, pageSize } from "@/lib/api/pagination"
import { visiblePostWhere } from "@/lib/policies/posts"
import { toUserSummary, userSummarySelect, mediaDeliverySelect } from "@/lib/dto/user"
import { deliveryProvider, toMediaDTO } from "@/lib/media/delivery"

const query = z.object({
  filter: z.enum(["all", "unread"]).optional().default("all"),
  cursor: z.string().max(200).optional(),
  limit: z.string().optional(),
  countOnly: z.enum(["true"]).optional(),
})

export const GET = route(async (request: Request) => {
  const viewer = await requireViewer()
  const q = parseQuery(request.url, query)
  // Notifications from users I muted or who are blocked either way are not shown.
  const [muted, blocks] = await Promise.all([
    prisma.mute.findMany({ where: { userId: viewer.id }, select: { targetUserId: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] }, select: { blockerId: true, blockedId: true } }),
  ])
  const hidden = [...muted.map(m => m.targetUserId), ...blocks.map(b => (b.blockerId === viewer.id ? b.blockedId : b.blockerId))]
  const baseWhere = {
    userId: viewer.id,
    ...(hidden.length ? { OR: [{ fromUserId: null }, { fromUserId: { notIn: hidden } }] } : {}),
  }
  if (q.countOnly) return ok({ unread: await prisma.notification.count({ where: { ...baseWhere, read: false } }) })

  const limit = pageSize(q.limit)
  const c = decodeCursor(q.cursor)
  const rows = await prisma.notification.findMany({
    where: {
      AND: [
        baseWhere,
        q.filter === "unread" ? { read: false } : {},
        c ? { OR: [{ createdAt: { lt: c.t } }, { createdAt: c.t, id: { lt: c.id } }] } : {},
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  })
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const actorIds = [...new Set(items.map(n => n.fromUserId).filter((v): v is string => !!v))]
  const postIds = [...new Set(items.map(n => n.postId).filter((v): v is string => !!v))]
  const [actors, posts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: actorIds } }, select: userSummarySelect }),
    // Same ACL as everywhere else: a post the viewer can no longer see yields no preview/link.
    prisma.post.findMany({
      where: { AND: [visiblePostWhere(viewer.id), { id: { in: postIds } }] },
      select: { id: true, media: { where: { status: "READY" }, orderBy: { sortOrder: "asc" }, take: 1, select: mediaDeliverySelect } },
    }),
  ])
  const provider = await deliveryProvider()
  const actorMap = new Map(actors.map(a => [a.id, a]))
  const postMap = new Map(posts.map(p => [p.id, p]))
  const last = items[items.length - 1]
  return ok(items.map(n => {
    const actor = n.fromUserId ? actorMap.get(n.fromUserId) : undefined
    const post = n.postId ? postMap.get(n.postId) : undefined
    const thumb = post?.media[0]
    return {
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: actor && actor.status === "ACTIVE" ? toUserSummary(actor, provider) : null,
      post: post ? { id: post.id, thumbnail: thumb && thumb.kind === "IMAGE" ? toMediaDTO(thumb, provider) : null } : null,
      content: post || !n.postId ? n.content : null,
    }
  }), { nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: last.id }) : null })
})
