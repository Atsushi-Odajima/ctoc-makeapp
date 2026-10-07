import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireRole } from "@/lib/api/viewer"
import { MODERATOR_ROLES, reportedSnapshot } from "@/lib/services/moderation"

type Ctx = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  await requireRole(MODERATOR_ROLES)
  const { id } = await ctx.params
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, targetType: true, targetId: true, reasonCode: true, detail: true, state: true, createdAt: true } })
  if (!report) throw Errors.notFound()
  const [target, history] = await Promise.all([
    reportedSnapshot(report.targetType, report.targetId),
    prisma.moderationAction.findMany({
      where: { targetType: report.targetType, targetId: report.targetId },
      orderBy: { createdAt: "desc" },
      select: { action: true, reason: true, createdAt: true, actor: { select: { username: true } } },
    }),
  ])
  return ok({ report: { ...report, createdAt: report.createdAt.toISOString() }, target, history })
})
