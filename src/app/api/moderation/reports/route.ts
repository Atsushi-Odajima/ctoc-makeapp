import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseQuery, route } from "@/lib/api/http"
import { requireRole } from "@/lib/api/viewer"
import { MODERATOR_ROLES } from "@/lib/services/moderation"

const query = z.object({ state: z.enum(["OPEN", "REVIEWING", "RESOLVED"]).optional().default("OPEN") })

// Role checked server-side. Non-moderators get 404 (the queue's existence is not revealed).
export const GET = route(async (request: Request) => {
  await requireRole(MODERATOR_ROLES)
  const { state } = parseQuery(request.url, query)
  const reports = await prisma.report.findMany({
    where: { state },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, targetType: true, targetId: true, reasonCode: true, detail: true, state: true, createdAt: true },
  })
  return ok(reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })))
})
