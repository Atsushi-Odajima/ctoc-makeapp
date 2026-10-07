import { ok, parseBody, route } from "@/lib/api/http"
import { requireRole } from "@/lib/api/viewer"
import { moderationActionSchema } from "@/lib/validation/schemas"
import { MODERATOR_ROLES, applyModerationAction } from "@/lib/services/moderation"

export const POST = route(async (request: Request) => {
  const actor = await requireRole(MODERATOR_ROLES)
  const input = await parseBody(request, moderationActionSchema)
  await applyModerationAction(actor, input)
  return ok({ applied: true }, { status: 201 })
})
