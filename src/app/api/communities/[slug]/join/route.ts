import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { getCommunityDTO, joinCommunity, leaveCommunity } from "@/lib/services/communities"

type Ctx = { params: Promise<{ slug: string }> }

// Public community: joins immediately. Private community: creates a PENDING request.
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  await joinCommunity(viewer, slug)
  return ok(await getCommunityDTO(viewer.id, slug))
})

// Leave, or cancel a pending request.
export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  await leaveCommunity(viewer, slug)
  return ok(await getCommunityDTO(viewer.id, slug))
})
