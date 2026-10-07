import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { answerJoinRequest } from "@/lib/services/communities"

type Ctx = { params: Promise<{ slug: string; userId: string }> }

export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { slug, userId } = await ctx.params
  return ok(await answerJoinRequest(await requireViewer(), slug, userId, false))
})
