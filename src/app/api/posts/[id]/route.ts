import { ok, parseBody, route } from "@/lib/api/http"
import { getViewer, requireViewer } from "@/lib/api/viewer"
import { editPostSchema } from "@/lib/validation/schemas"
import { deletePost, editPost, getPostDTO } from "@/lib/services/posts"

type Ctx = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await getViewer()
  return ok(await getPostDTO(viewer?.id ?? null, id))
})

// Owner + revision check. Only caption / alt text (and visibility with explicit confirmation).
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  const input = await parseBody(request, editPostSchema)
  await editPost(viewer, id, input)
  return ok(await getPostDTO(viewer.id, id))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  await deletePost(viewer, id)
  return ok({ id, deleted: true })
})
