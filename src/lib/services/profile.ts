import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import { publicUserSelect, toPublicUser, type PublicUser } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import { getRelationship } from "@/lib/policies/relationships"
import { visiblePostWhere } from "@/lib/policies/posts"
import { HOBBY_COUNT } from "@/config/profile-options"

/** Public profile. Display name, bio and the three required items are public even for private
 * accounts; posts are not. Blocked-by-target and suspended/deleted users look like 404. */
export async function getPublicProfile(viewerId: string | null, username: string): Promise<PublicUser> {
  const row = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { ...publicUserSelect, status: true },
  })
  if (!row || row.status !== "ACTIVE") throw Errors.notFound()
  const relationship = await getRelationship(viewerId, row.id)
  if (relationship.blockedBy) throw Errors.notFound()

  const [posts, followers, following, communities] = await Promise.all([
    prisma.post.count({ where: { AND: [visiblePostWhere(viewerId), { userId: row.id }] } }),
    prisma.follow.count({ where: { followingId: row.id, status: "ACCEPTED", follower: { status: "ACTIVE" } } }),
    prisma.follow.count({ where: { followerId: row.id, status: "ACCEPTED", following: { status: "ACTIVE" } } }),
    // Only communities the person chose to show AND that are public.
    prisma.communityMember.findMany({
      where: { userId: row.id, status: "ACTIVE", showOnProfile: true, community: { isPrivate: false } },
      select: { community: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
  ])
  return toPublicUser(row, await deliveryProvider(), {
    relationship,
    counts: { posts, followers, following },
    communities: communities.map(c => c.community),
  })
}

export async function getProfileOptions() {
  const options = await prisma.profileOption.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    select: { id: true, kind: true, label: true },
  })
  return {
    strengths: options.filter(o => o.kind === "STRENGTH").map(({ id, label }) => ({ id, label })),
    weaknesses: options.filter(o => o.kind === "WEAKNESS").map(({ id, label }) => ({ id, label })),
    hobbies: options.filter(o => o.kind === "HOBBY").map(({ id, label }) => ({ id, label })),
  }
}

export interface IntroductionInput {
  strengthOptionId: string
  weaknessOptionId: string
  hobbyOptionIds: string[]
}

/** Pure validation (unit-tested): returns field errors or null. */
export function validateIntroduction(
  input: IntroductionInput,
  options: Map<string, { kind: string; active: boolean }>,
  current: { strengthOptionId: string | null; weaknessOptionId: string | null; hobbyIds: string[] },
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {}
  // An option that was retired after the user picked it stays valid for that user.
  const usable = (id: string, kind: string, keep: boolean) => {
    const o = options.get(id)
    return !!o && o.kind === kind && (o.active || keep)
  }
  if (!usable(input.strengthOptionId, "STRENGTH", input.strengthOptionId === current.strengthOptionId)) {
    errors.strengthOptionId = ["イキリポイントを1つ選んでください"]
  }
  if (!usable(input.weaknessOptionId, "WEAKNESS", input.weaknessOptionId === current.weaknessOptionId)) {
    errors.weaknessOptionId = ["残念な弱点を1つ選んでください"]
  }
  const hobbies = input.hobbyOptionIds
  if (hobbies.length !== HOBBY_COUNT) errors.hobbyOptionIds = ["趣味はちょうど3つ選んでください"]
  else if (new Set(hobbies).size !== HOBBY_COUNT) errors.hobbyOptionIds = ["同じ趣味は選べません"]
  else if (hobbies.some(id => !usable(id, "HOBBY", current.hobbyIds.includes(id)))) errors.hobbyOptionIds = ["選べない趣味が含まれています"]
  return Object.keys(errors).length ? errors : null
}

/** Replace the three required items atomically and bump profileVersion. */
export async function setIntroduction(userId: string, input: IntroductionInput) {
  const ids = [input.strengthOptionId, input.weaknessOptionId, ...input.hobbyOptionIds]
  return prisma.$transaction(async tx => {
    const [options, user] = await Promise.all([
      tx.profileOption.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true, active: true } }),
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { strengthOptionId: true, weaknessOptionId: true, hobbies: { select: { optionId: true } } } }),
    ])
    const errors = validateIntroduction(input, new Map(options.map(o => [o.id, o])), {
      strengthOptionId: user.strengthOptionId,
      weaknessOptionId: user.weaknessOptionId,
      hobbyIds: user.hobbies.map(h => h.optionId),
    })
    if (errors) throw Errors.invalid("プロフィールの3項目を確認してください", errors)
    await tx.userHobby.deleteMany({ where: { userId } })
    await tx.userHobby.createMany({ data: input.hobbyOptionIds.map((optionId, position) => ({ userId, optionId, position })) })
    return tx.user.update({
      where: { id: userId },
      data: {
        strengthOptionId: input.strengthOptionId,
        weaknessOptionId: input.weaknessOptionId,
        profileVersion: { increment: 1 },
        onboardingDone: true, // derived: set only after the server validated the three items
      },
      select: { profileVersion: true },
    })
  })
}
