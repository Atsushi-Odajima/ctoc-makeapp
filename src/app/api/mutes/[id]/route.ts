import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer } from "@/lib/api/viewer"

type Ctx = { params: Promise<{ id: string }> }

// Muting is private: only the muting user ever sees it; the muted user is not notified.
export const PUT = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  if (id === viewer.id) throw Errors.invalid("自分はミュートできません")
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) throw Errors.notFound()
  await prisma.mute.upsert({
    where: { userId_targetUserId: { userId: viewer.id, targetUserId: id } },
    create: { userId: viewer.id, targetUserId: id },
    update: {},
  })
  return ok({ muted: true })
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  await prisma.mute.deleteMany({ where: { userId: viewer.id, targetUserId: id } })
  return ok({ muted: false })
})
