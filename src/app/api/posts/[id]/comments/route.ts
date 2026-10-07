import { ok, parseBody, route } from "@/lib/api/http"
import { getViewer, requireCompleteProfile } from "@/lib/api/viewer"
import { commentSchema } from "@/lib/validation/schemas"
import { addComment, listComments } from "@/lib/services/comments"

type Ctx = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await getViewer()
  return ok(await listComments(viewer?.id ?? null, id))
})

export const POST = route(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireCompleteProfile()
  const input = await parseBody(request, commentSchema)
  const commentId = await addComment(viewer, id, input)
  const comments = await listComments(viewer.id, id)
  const created = comments.flatMap(c => [c, ...c.replies]).find(c => c.id === commentId)
  return ok(created, { status: 201 })
})
