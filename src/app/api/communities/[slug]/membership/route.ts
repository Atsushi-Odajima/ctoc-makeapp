import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireViewer } from "@/lib/api/viewer"
import { membershipPatchSchema } from "@/lib/validation/schemas"
import { getCommunityAccess } from "@/lib/policies/communities"
import { getCommunityDTO } from "@/lib/services/communities"

type Ctx = { params: Promise<{ slug: string }> }

// Choose whether this (public) community appears on my profile.
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireViewer()
  const { showOnProfile } = await parseBody(request, membershipPatchSchema)
  const access = await getCommunityAccess(viewer.id, slug)
  if (!access.isActiveMember) throw Errors.forbidden("参加している集まりだけ設定できます")
  if (showOnProfile && access.community.isPrivate) throw Errors.invalid("非公開の集まりはプロフィールに表示できません")
  await prisma.communityMember.update({
    where: { communityId_userId: { communityId: access.community.id, userId: viewer.id } },
    data: { showOnProfile },
  })
  return ok(await getCommunityDTO(viewer.id, slug))
})
