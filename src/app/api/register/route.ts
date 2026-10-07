import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { registerSchema } from "@/lib/validation/schemas"
import { clientIp, enforce, hashKey } from "@/lib/rate-limit"

export const POST = route(async (request: Request) => {
  await enforce("register", hashKey(clientIp(request.headers)))
  const input = await parseBody(request, registerSchema)
  const email = input.email
  const username = input.username || `${email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20).padEnd(3, "_")}_${Math.floor(Math.random() * 9000 + 1000)}`
  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } }, select: { id: true } }),
  ])
  if (emailExists) throw Errors.conflict("このメールアドレスは登録に使えません。ログインをお試しください", "EMAIL_UNAVAILABLE")
  if (usernameExists) throw Errors.invalid("このユーザー名はすでに使われています", { username: ["別のユーザー名にしてください"] }, "USERNAME_TAKEN")
  // Same bcrypt scheme/cost as before so existing passwords keep working.
  const password = await hash(input.password, 12)
  const user = await prisma.user.create({
    data: { email, password, name: input.name.trim(), username, onboardingDone: false },
    select: { id: true, username: true },
  })
  return ok({ id: user.id, username: user.username }, { status: 201 })
})
