import { z } from "zod"
import { ok, parseBody, parseQuery, route } from "@/lib/api/http"
import { requireCompleteProfile, requireViewer } from "@/lib/api/viewer"
import { dmStartSchema } from "@/lib/validation/schemas"
import { listConversations, startConversation } from "@/lib/services/dm"

const query = z.object({ box: z.enum(["inbox", "requests"]).optional().default("inbox") })

export const GET = route(async (request: Request) => {
  const viewer = await requireViewer()
  const { box } = parseQuery(request.url, query)
  return ok(await listConversations(viewer, box))
})

// Find-or-create by the unique pairKey (no participants.every scan).
export const POST = route(async (request: Request) => {
  const viewer = await requireCompleteProfile()
  const { targetUserId } = await parseBody(request, dmStartSchema)
  const result = await startConversation(viewer, targetUserId)
  return ok(result, { status: result.created ? 201 : 200 })
})
