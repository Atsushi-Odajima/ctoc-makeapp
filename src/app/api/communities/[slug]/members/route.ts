import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { getViewer } from "@/lib/api/viewer"
import { getCommunityAccess } from "@/lib/policies/communities"
import { notBlockedUserWhere } from "@/lib/policies/relationships"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

type Ctx = { params: Promise<{ slug: string }> }

// Member list of a private community is only for its ACTIVE members.
export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await getViewer()
  const access = await getCommunityAccess(viewer?.id ?? null, slug)
  if (!access.canViewContent) throw Errors.notFound()
  const rows = await prisma.communityMember.findMany({
    where: { communityId: access.community.id, status: "ACTIVE", user: notBlockedUserWhere(viewer?.id ?? null) },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { role: true, user: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok(rows.map(r => ({ role: r.role, user: toUserSummary(r.user, provider) })))
})
