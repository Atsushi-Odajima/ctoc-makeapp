import { ok, parseBody, route } from "@/lib/api/http"
import { requireCompleteProfile } from "@/lib/api/viewer"
import { publishPostSchema } from "@/lib/validation/schemas"
import { getPostDTO, publishDraft } from "@/lib/services/posts"

type Ctx = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireCompleteProfile()
  const { revision } = await parseBody(request, publishPostSchema)
  await publishDraft(viewer, id, revision)
  return ok(await getPostDTO(viewer.id, id))
})
