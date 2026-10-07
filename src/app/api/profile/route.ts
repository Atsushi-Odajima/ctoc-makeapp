import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer, isProfileComplete } from "@/lib/api/viewer"
import { profilePatchSchema } from "@/lib/validation/schemas"
import { publicUserSelect, toUserSummary } from "@/lib/dto/user"
import { deliveryProvider, toMediaDTO } from "@/lib/media/delivery"
import { getPublicProfile } from "@/lib/services/profile"

async function ownProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      email: true, dmPolicy: true, footprintOptIn: true, role: true, profileVersion: true,
      strengthOptionId: true, weaknessOptionId: true, password: true,
      _count: { select: { hobbies: true } },
    },
  })
  const provider = await deliveryProvider()
  const publicView = await getPublicProfile(userId, user.username)
  return {
    ...publicView,
    ...toUserSummary(user, provider),
    avatarMedia: user.avatarMedia?.status === "READY" ? toMediaDTO(user.avatarMedia, provider) : null,
    // Self-only fields (never part of PublicUser):
    email: user.email,
    dmPolicy: user.dmPolicy,
    footprintOptIn: user.footprintOptIn,
    role: user.role,
    hasPassword: !!user.password,
    profileVersion: user.profileVersion,
    profileComplete: isProfileComplete(user),
  }
}

export const GET = route(async () => {
  const viewer = await requireViewer()
  return ok(await ownProfile(viewer.id))
})

export const PATCH = route(async (request: Request) => {
  const viewer = await requireViewer()
  // .strict(): onboardingDone / role / status / email / password are rejected with 422.
  const input = await parseBody(request, profilePatchSchema)
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.bio !== undefined) data.bio = input.bio?.trim() ? input.bio : null
  if (input.website !== undefined) data.website = input.website ? input.website : null
  if (input.isPrivate !== undefined) data.isPrivate = input.isPrivate // existing ACCEPTED followers are kept
  if (input.dmPolicy !== undefined) data.dmPolicy = input.dmPolicy
  if (input.footprintOptIn !== undefined) data.footprintOptIn = input.footprintOptIn
  if (input.avatarMediaId !== undefined) {
    if (input.avatarMediaId === null) {
      data.avatarMediaId = null
      data.avatar = null
    } else {
      const media = await prisma.media.findFirst({
        where: { id: input.avatarMediaId, ownerId: viewer.id, purpose: "AVATAR", status: "READY", kind: "IMAGE" },
        select: { id: true },
      })
      if (!media) throw Errors.invalid("アイコンに使えない画像です", { avatarMediaId: ["選び直してください"] })
      data.avatarMediaId = media.id
    }
  }
  await prisma.user.update({ where: { id: viewer.id }, data })
  if (input.isPrivate === false) {
    // Becoming public: pending follow requests no longer need approval.
    await prisma.follow.updateMany({ where: { followingId: viewer.id, status: "PENDING" }, data: { status: "ACCEPTED", acceptedAt: new Date() } })
  }
  return ok(await ownProfile(viewer.id))
})
