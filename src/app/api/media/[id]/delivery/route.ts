import { ok, route } from "@/lib/api/http"
import { getViewer } from "@/lib/api/viewer"
import { loadViewableMedia } from "@/lib/policies/media"
import { deliveryProvider, toMediaDTO } from "@/lib/media/delivery"

type Ctx = { params: Promise<{ id: string }> }

// Re-issue a 120 s delivery URL after re-checking the ACL (used when a URL expires mid-view).
// Limit: a URL issued before a block/visibility change stays usable for at most 120 s.
export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await getViewer()
  const { media, owner } = await loadViewableMedia(viewer?.id ?? null, id)
  return ok(toMediaDTO(media, await deliveryProvider(), { owner }))
})
