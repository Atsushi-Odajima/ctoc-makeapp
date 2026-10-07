import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

export type FollowState = "NONE" | "PENDING" | "ACCEPTED"

export interface Relationship {
  isSelf: boolean
  following: FollowState // viewer -> target
  followedBy: FollowState // target -> viewer
  blocking: boolean // viewer blocked target
  blockedBy: boolean // target blocked viewer
  muting: boolean
}

export const NO_RELATIONSHIP: Relationship = {
  isSelf: false, following: "NONE", followedBy: "NONE", blocking: false, blockedBy: false, muting: false,
}

export async function getRelationship(viewerId: string | null, targetId: string): Promise<Relationship> {
  if (!viewerId) return NO_RELATIONSHIP
  if (viewerId === targetId) return { ...NO_RELATIONSHIP, isSelf: true }
  const [out, inc, blocks, mute] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: targetId } }, select: { status: true } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: viewerId } }, select: { status: true } }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId, blockedId: targetId }, { blockerId: targetId, blockedId: viewerId }] },
      select: { blockerId: true },
    }),
    prisma.mute.findUnique({ where: { userId_targetUserId: { userId: viewerId, targetUserId: targetId } }, select: { userId: true } }),
  ])
  return {
    isSelf: false,
    following: out?.status ?? "NONE",
    followedBy: inc?.status ?? "NONE",
    blocking: blocks.some(b => b.blockerId === viewerId),
    blockedBy: blocks.some(b => b.blockerId === targetId),
    muting: !!mute,
  }
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  if (a === b) return false
  const count = await prisma.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  })
  return count > 0
}

export async function isMutual(a: string, b: string): Promise<boolean> {
  const count = await prisma.follow.count({
    where: {
      status: "ACCEPTED",
      OR: [{ followerId: a, followingId: b }, { followerId: b, followingId: a }],
    },
  })
  return count === 2
}

/** Users the viewer can interact with / see in authenticated listings. */
export function notBlockedUserWhere(viewerId: string | null): Prisma.UserWhereInput {
  if (!viewerId) return { status: "ACTIVE" }
  return {
    status: "ACTIVE",
    blocksMade: { none: { blockedId: viewerId } },
    blocksReceived: { none: { blockerId: viewerId } },
  }
}
