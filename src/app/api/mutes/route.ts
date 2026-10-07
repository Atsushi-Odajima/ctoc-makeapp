import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

export const GET = route(async () => {
  const viewer = await requireViewer()
  const [users, communities] = await Promise.all([
    prisma.mute.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, select: { target: { select: userSummarySelect } } }),
    prisma.communityMute.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, select: { community: { select: { slug: true, name: true } } } }),
  ])
  const provider = await deliveryProvider()
  return ok({ users: users.map(m => toUserSummary(m.target, provider)), communities: communities.map(m => m.community) })
})
