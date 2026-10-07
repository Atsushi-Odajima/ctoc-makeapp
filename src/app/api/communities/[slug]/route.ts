import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { getViewer, requireViewer } from "@/lib/api/viewer"
import { communityPatchSchema } from "@/lib/validation/schemas"
import { getCommunityDTO, requireModerator } from "@/lib/services/communities"

type Ctx = { params: Promise<{ slug: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await getViewer()
  return ok(await getCommunityDTO(viewer?.id ?? null, slug))
})

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  const access = await requireModerator(viewer, slug)
  const input = await parseBody(request, communityPatchSchema)
  await prisma.community.update({ where: { id: access.community.id }, data: input })
  return ok(await getCommunityDTO(viewer.id, slug))
})
