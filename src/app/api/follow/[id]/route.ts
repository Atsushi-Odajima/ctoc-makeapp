import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { prisma } from "@/lib/db"
import { follow, unfollow } from "@/lib/services/follows"

type Ctx = { params: Promise<{ id: string }> }

// PUT = follow (or request to follow a private account), DELETE = unfollow / cancel request.
export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await follow(await requireViewer(), id))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await unfollow(await requireViewer(), id))
})

/** DEPRECATED toggle kept for old clients until 2027-01-31. */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewer.id, followingId: id } } })
  const result = existing ? await unfollow(viewer, id) : await follow(viewer, id)
  return ok({ ...result, following: result.status !== "NONE" }, { headers: { Deprecation: "true", Sunset: "Sun, 31 Jan 2027 00:00:00 GMT" } })
})
