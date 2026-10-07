import { ok, parseBody, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { mediaSignSchema } from "@/lib/validation/schemas"
import { signUpload } from "@/lib/services/media"

// Issued only after: signed-in + active account, complete profile (for posts), type/size limits,
// and the 20/hour rate limit. The browser then uploads DIRECTLY to the provider.
export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const input = await parseBody(request, mediaSignSchema)
  return ok(await signUpload(viewer, input), { status: 201 })
})
