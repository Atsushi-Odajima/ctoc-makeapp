import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { setReaction } from "@/lib/services/reactions"

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await setReaction(await requireViewer(), id, "empathy", true))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await setReaction(await requireViewer(), id, "empathy", false))
})
