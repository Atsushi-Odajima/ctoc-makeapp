import { z } from "zod"
import { ok, parseBody, parseQuery, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { pageSize } from "@/lib/api/pagination"
import { dmSendSchema } from "@/lib/validation/schemas"
import { conversationDetail, sendMessage } from "@/lib/services/dm"

type Ctx = { params: Promise<{ id: string }> }
const query = z.object({ after: z.string().max(200).optional(), before: z.string().max(200).optional(), limit: z.string().optional() })

// Participant check happens inside the service for every call (404 for non-participants).
export const GET = route(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  const q = parseQuery(request.url, query)
  return ok(await conversationDetail(viewer, id, { after: q.after, before: q.before, limit: pageSize(q.limit ?? "50") }))
})

// P0 fix: previously any signed-in user could POST into any conversation id.
// Now: participant + block + conversation state + idempotent clientMessageId.
export const POST = route(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await requireViewer()
  const input = await parseBody(request, dmSendSchema)
  const { message, replayed } = await sendMessage(viewer, id, input)
  return ok(message, { status: replayed ? 200 : 201 })
})
