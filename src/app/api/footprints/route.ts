import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { footprintSchema } from "@/lib/validation/schemas"
import { isBlockedEitherWay } from "@/lib/policies/relationships"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import { enforce } from "@/lib/rate-limit"

const RETENTION_DAYS = 30

// Profile-visit records ("足あと"). Recorded only when BOTH the visitor and the visited user
// opted in, at most once per pair per UTC day, kept 30 days. This is not a post view counter.
export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const { username } = await parseBody(request, footprintSchema)
  const [me, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewer.id }, select: { footprintOptIn: true } }),
    prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" }, status: "ACTIVE" }, select: { id: true, footprintOptIn: true } }),
  ])
  if (!target || target.id === viewer.id || !me?.footprintOptIn || !target.footprintOptIn) return ok({ recorded: false })
  if (await isBlockedEitherWay(viewer.id, target.id)) return ok({ recorded: false })
  await enforce("footprint", viewer.id)
  const visitDay = new Date().toISOString().slice(0, 10)
  await prisma.footprint.upsert({
    where: { visitorId_visitedId_visitDay: { visitorId: viewer.id, visitedId: target.id, visitDay } },
    create: { visitorId: viewer.id, visitedId: target.id, visitDay },
    update: {},
  })
  return ok({ recorded: true })
})

// Only records about me, only from users who are (still) opted in, last 30 days.
export const GET = route(async () => {
  const viewer = await requireViewer()
  const me = await prisma.user.findUnique({ where: { id: viewer.id }, select: { footprintOptIn: true } })
  if (!me?.footprintOptIn) return ok({ optedIn: false, items: [] })
  const since = new Date(Date.now() - RETENTION_DAYS * 86400_000)
  const rows = await prisma.footprint.findMany({
    where: {
      visitedId: viewer.id,
      visitedAt: { gte: since },
      visitDay: { not: null },
      visitor: { status: "ACTIVE", footprintOptIn: true, blocksMade: { none: { blockedId: viewer.id } }, blocksReceived: { none: { blockerId: viewer.id } } },
    },
    orderBy: { visitedAt: "desc" },
    take: 100,
    select: { id: true, visitedAt: true, visitor: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok({ optedIn: true, items: rows.map(r => ({ id: r.id, visitedAt: r.visitedAt.toISOString(), visitor: toUserSummary(r.visitor, provider) })) })
})
