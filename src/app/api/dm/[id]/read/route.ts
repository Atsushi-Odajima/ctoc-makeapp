import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { markRead } from "@/lib/services/dm"

type Ctx = { params: Promise<{ id: string }> }

export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await markRead(await requireViewer(), id))
})
