import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { setReaction } from "@/lib/services/reactions"

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await setReaction(await requireViewer(), id, "like", true))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await setReaction(await requireViewer(), id, "like", false))
})

/**
 * DEPRECATED compatibility endpoint (old clients toggled with POST). Kept until 2027-01-31 for
 * external callers, if any. New code must use PUT/DELETE which are idempotent.
 */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  const { prisma } = await import("@/lib/db")
  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId: viewer.id, postId: id } } })
  const result = await setReaction(viewer, id, "like", !existing)
  return ok({ ...result, liked: result.active }, { headers: { Deprecation: "true", Sunset: "Sun, 31 Jan 2027 00:00:00 GMT" } })
})
