import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { answerConversation } from "@/lib/services/dm"

type Ctx = { params: Promise<{ id: string }> }

export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return ok(await answerConversation(await requireViewer(), id, false))
})
