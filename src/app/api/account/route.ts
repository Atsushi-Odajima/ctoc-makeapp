import { compare } from "bcryptjs"
import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer } from "@/lib/api/viewer"
import { accountDeleteSchema } from "@/lib/validation/schemas"
import { requestAccountDeletion } from "@/lib/services/account"

const REAUTH_WINDOW_SEC = 15 * 60

// Re-authentication: password accounts must re-enter the password; OAuth-only accounts must
// have signed in within the last 15 minutes. Plus a typed confirmation.
export const DELETE = route(async (request: Request) => {
  const viewer = await requireViewer()
  const input = await parseBody(request, accountDeleteSchema)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id }, select: { password: true } })
  if (user.password) {
    if (!input.password || !(await compare(input.password, user.password))) {
      throw Errors.forbidden("パスワードが違います", "REAUTH_FAILED")
    }
  } else if (!viewer.authTime || Date.now() / 1000 - viewer.authTime > REAUTH_WINDOW_SEC) {
    throw Errors.forbidden("確認のため、もう一度ログインしてから退会してください", "REAUTH_REQUIRED")
  }
  await requestAccountDeletion(viewer.id)
  return ok({ status: "DELETED", purgeWithinDays: 7 })
})
