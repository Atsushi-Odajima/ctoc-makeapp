import { ok, route } from "@/lib/api/http"
import { getViewer } from "@/lib/api/viewer"
import { getPublicProfile } from "@/lib/services/profile"

type Ctx = { params: Promise<{ username: string }> }

// Public DTO only (explicit select). No side effects: footprints are recorded via POST /api/footprints.
export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { username } = await ctx.params
  const viewer = await getViewer()
  return ok(await getPublicProfile(viewer?.id ?? null, decodeURIComponent(username)))
})
