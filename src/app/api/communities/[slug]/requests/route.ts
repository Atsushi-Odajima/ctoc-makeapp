import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { requireModerator } from "@/lib/services/communities"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

type Ctx = { params: Promise<{ slug: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const access = await requireModerator(await requireViewer(), slug)
  const rows = await prisma.communityMember.findMany({
    where: { communityId: access.community.id, status: "PENDING", user: { status: "ACTIVE" } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, user: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok(rows.map(r => ({ requestedAt: r.createdAt.toISOString(), user: toUserSummary(r.user, provider) })))
})
