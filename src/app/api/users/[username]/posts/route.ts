import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseQuery, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { getViewer } from "@/lib/api/viewer"
import { pageSize } from "@/lib/api/pagination"
import { isBlockedEitherWay } from "@/lib/policies/relationships"
import { authorPostsWhere, listPosts } from "@/lib/services/posts"

type Ctx = { params: Promise<{ username: string }> }
const query = z.object({ cursor: z.string().max(200).optional(), limit: z.string().optional(), kind: z.enum(["NOTE", "PHOTO", "VIDEO"]).optional() })

export const GET = route(async (request: Request, ctx: Ctx) => {
  const { username } = await ctx.params
  const q = parseQuery(request.url, query)
  const viewer = await getViewer()
  const user = await prisma.user.findFirst({
    where: { username: { equals: decodeURIComponent(username), mode: "insensitive" }, status: "ACTIVE" },
    select: { id: true },
  })
  if (!user || (viewer && (await isBlockedEitherWay(viewer.id, user.id)))) throw Errors.notFound()
  const page = await listPosts(viewer?.id ?? null, {
    AND: [authorPostsWhere(viewer?.id ?? null, user.id), ...(q.kind ? [{ kind: q.kind }] : [])],
  }, { cursor: q.cursor, limit: pageSize(q.limit) })
  return ok(page.items, { nextCursor: page.nextCursor })
})
