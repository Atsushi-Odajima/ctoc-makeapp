import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer } from "@/lib/api/viewer"
import { notificationsReadSchema } from "@/lib/validation/schemas"

// Marks only the caller's own notifications (ids belonging to others are ignored).
export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const input = await parseBody(request, notificationsReadSchema)
  if (!input.all && !input.ids?.length) throw Errors.invalid("idsまたはallを指定してください")
  const result = await prisma.notification.updateMany({
    where: { userId: viewer.id, read: false, ...(input.all ? {} : { id: { in: input.ids } }) },
    data: { read: true },
  })
  return ok({ updated: result.count })
})
