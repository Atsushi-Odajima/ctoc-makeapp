import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer } from "@/lib/api/viewer"
import { reportSchema } from "@/lib/validation/schemas"
import { findViewablePostId } from "@/lib/policies/posts"
import { loadConversationForParticipant } from "@/lib/policies/messaging"
import { enforce } from "@/lib/rate-limit"

// Anyone signed in can report what they can see. Reporting never grants any extra access.
export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const input = await parseBody(request, reportSchema)
  if (input.targetType === "POST") {
    await findViewablePostId(viewer.id, input.targetId)
  } else if (input.targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({ where: { id: input.targetId }, select: { postId: true } })
    if (!comment) throw Errors.notFound()
    await findViewablePostId(viewer.id, comment.postId)
  } else if (input.targetType === "USER") {
    if (input.targetId === viewer.id) throw Errors.invalid("自分は通報できません")
    const user = await prisma.user.findUnique({ where: { id: input.targetId }, select: { id: true } })
    if (!user) throw Errors.notFound()
  } else {
    const message = await prisma.directMessage.findUnique({ where: { id: input.targetId }, select: { conversationId: true, senderId: true } })
    if (!message) throw Errors.notFound()
    await loadConversationForParticipant(message.conversationId, viewer.id) // only participants may report a message
    if (message.senderId === viewer.id) throw Errors.invalid("自分のメッセージは通報できません")
  }
  await enforce("report", viewer.id)
  const report = await prisma.report.create({
    data: { reporterId: viewer.id, targetType: input.targetType, targetId: input.targetId, reasonCode: input.reasonCode, detail: input.detail?.trim() || null },
    select: { id: true, state: true, createdAt: true },
  })
  return ok({ id: report.id, state: report.state, createdAt: report.createdAt.toISOString() }, { status: 201 })
})
