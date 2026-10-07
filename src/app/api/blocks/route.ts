import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

export const GET = route(async () => {
  const viewer = await requireViewer()
  const rows = await prisma.block.findMany({
    where: { blockerId: viewer.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, blocked: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok(rows.map(r => ({ since: r.createdAt.toISOString(), user: toUserSummary(r.blocked, provider) })))
})
