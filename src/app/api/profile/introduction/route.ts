import { ok, parseBody, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { introductionSchema } from "@/lib/validation/schemas"
import { setIntroduction } from "@/lib/services/profile"

// Replaces イキリポイント / 残念な弱点 / 趣味3つ in one transaction and bumps profileVersion.
export const PUT = route(async (request: Request) => {
  const viewer = await requireViewer()
  const input = await parseBody(request, introductionSchema)
  const result = await setIntroduction(viewer.id, input)
  return ok({ profileVersion: result.profileVersion, profileComplete: true })
})
