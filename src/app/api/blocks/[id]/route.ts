import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { block, unblock } from "@/lib/services/follows"

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await block(await requireViewer(), id))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await unblock(await requireViewer(), id))
})
