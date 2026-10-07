import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { getCommunityAccess } from "@/lib/policies/communities"

type Ctx = { params: Promise<{ slug: string }> }

export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  const access = await getCommunityAccess(viewer.id, slug)
  await prisma.communityMute.upsert({
    where: { userId_communityId: { userId: viewer.id, communityId: access.community.id } },
    create: { userId: viewer.id, communityId: access.community.id },
    update: {},
  })
  return ok({ muted: true })
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  const access = await getCommunityAccess(viewer.id, slug)
  await prisma.communityMute.deleteMany({ where: { userId: viewer.id, communityId: access.community.id } })
  return ok({ muted: false })
})
