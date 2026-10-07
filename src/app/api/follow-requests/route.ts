import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

export const GET = route(async () => {
  const viewer = await requireViewer()
  const rows = await prisma.follow.findMany({
    where: { followingId: viewer.id, status: "PENDING", follower: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { createdAt: true, follower: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok(rows.map(r => ({ requestedAt: r.createdAt.toISOString(), user: toUserSummary(r.follower, provider) })))
})
