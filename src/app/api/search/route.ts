import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseQuery, route } from "@/lib/api/http"
import { getViewer } from "@/lib/api/viewer"
import { notBlockedUserWhere } from "@/lib/policies/relationships"
import { visiblePostWhere } from "@/lib/policies/posts"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import { listCommunities } from "@/lib/services/communities"
import { listPosts } from "@/lib/services/posts"

const query = z.object({ q: z.string().trim().min(1).max(60) })

// One search entry point with the same ACL as everything else (blocked users, private posts and
// private community content never appear).
export const GET = route(async (request: Request) => {
  const { q } = parseQuery(request.url, query)
  const viewer = await getViewer()
  const viewerId = viewer?.id ?? null
  const [users, communities, posts] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          notBlockedUserWhere(viewerId),
          { OR: [{ username: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] },
          ...(viewerId ? [{ id: { not: viewerId } }] : []),
        ],
      },
      orderBy: { username: "asc" },
      take: 20,
      select: userSummarySelect,
    }),
    listCommunities(viewerId, { q, limit: 10 }),
    listPosts(viewerId, { AND: [visiblePostWhere(viewerId), { caption: { contains: q, mode: "insensitive" } }] }, { limit: 20 }),
  ])
  const provider = await deliveryProvider()
  return ok({ users: users.map(u => toUserSummary(u, provider)), communities, posts: posts.items })
})
