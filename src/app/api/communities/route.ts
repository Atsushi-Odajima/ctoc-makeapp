import { z } from "zod"
import { ok, parseBody, parseQuery, route } from "@/lib/api/http"
import { getViewer, requireCompleteProfile } from "@/lib/api/viewer"
import { communityCreateSchema } from "@/lib/validation/schemas"
import { createCommunity, getCommunityDTO, listCommunities } from "@/lib/services/communities"
import { ensureStarterCommunities } from "@/lib/starter-communities"

const query = z.object({
  q: z.string().max(60).optional(),
  scope: z.enum(["joined", "discover", "all"]).optional().default("all"),
  limit: z.string().regex(/^\d+$/).optional(),
})

export const GET = route(async (request: Request) => {
  const q = parseQuery(request.url, query)
  const viewer = await getViewer()
  await ensureStarterCommunities()
  const limit = Math.min(50, Math.max(1, Number(q.limit || 30)))
  const items = await listCommunities(viewer?.id ?? null, { q: q.q?.trim() || undefined, scope: q.scope === "all" ? undefined : q.scope, limit })
  return ok(items)
})

export const POST = route(async (request: Request) => {
  const viewer = await requireCompleteProfile()
  const input = await parseBody(request, communityCreateSchema)
  const slug = await createCommunity(viewer, input)
  return ok(await getCommunityDTO(viewer.id, slug), { status: 201 })
})
