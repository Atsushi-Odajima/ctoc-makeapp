import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { removeComment } from "@/lib/services/comments"

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  await removeComment(await requireViewer(), id)
  return ok({ id, deleted: true })
})
