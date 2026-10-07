import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { isBlockedEitherWay } from "@/lib/policies/relationships"
import { enforce } from "@/lib/rate-limit"
import { notify } from "./notifications"

export async function follow(viewer: Viewer, targetId: string) {
  if (viewer.id === targetId) throw Errors.invalid("自分はフォローできません")
  const target = await prisma.user.findFirst({ where: { id: targetId, status: "ACTIVE" }, select: { id: true, isPrivate: true } })
  if (!target) throw Errors.notFound()
  if (await isBlockedEitherWay(viewer.id, target.id)) throw Errors.forbidden("この相手はフォローできません", "BLOCKED")
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } } })
  if (existing) return { status: existing.status }
  await enforce("follow", viewer.id)
  const status = target.isPrivate ? "PENDING" : "ACCEPTED"
  try {
    await prisma.follow.create({
      data: { followerId: viewer.id, followingId: target.id, status, acceptedAt: status === "ACCEPTED" ? new Date() : null },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.follow.findUniqueOrThrow({ where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } } })
      return { status: row.status }
    }
    throw error
  }
  await notify({ userId: target.id, type: status === "PENDING" ? "follow_request" : "follow", fromUserId: viewer.id }).catch(() => undefined)
  return { status }
}

export async function unfollow(viewer: Viewer, targetId: string) {
  await prisma.follow.deleteMany({ where: { followerId: viewer.id, followingId: targetId } })
  return { status: "NONE" as const }
}

export async function answerFollowRequest(viewer: Viewer, requesterId: string, accept: boolean) {
  const request = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: requesterId, followingId: viewer.id } } })
  if (!request || request.status !== "PENDING") throw Errors.notFound()
  if (!accept) {
    await prisma.follow.deleteMany({ where: { followerId: requesterId, followingId: viewer.id, status: "PENDING" } })
    return { status: "NONE" as const }
  }
  if (await isBlockedEitherWay(viewer.id, requesterId)) throw Errors.forbidden("この相手は承認できません", "BLOCKED")
  await prisma.follow.updateMany({
    where: { followerId: requesterId, followingId: viewer.id, status: "PENDING" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  })
  await notify({ userId: requesterId, type: "follow_accept", fromUserId: viewer.id }).catch(() => undefined)
  return { status: "ACCEPTED" as const }
}

/** Block: no DMs, follows, reactions or replies in either direction. Follows/requests are removed. */
export async function block(viewer: Viewer, targetId: string) {
  if (viewer.id === targetId) throw Errors.invalid("自分はブロックできません")
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })
  if (!target) throw Errors.notFound()
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: target.id } },
      create: { blockerId: viewer.id, blockedId: target.id },
      update: {},
    }),
    prisma.follow.deleteMany({
      where: { OR: [{ followerId: viewer.id, followingId: target.id }, { followerId: target.id, followingId: viewer.id }] },
    }),
  ])
  return { blocked: true }
}

export async function unblock(viewer: Viewer, targetId: string) {
  await prisma.block.deleteMany({ where: { blockerId: viewer.id, blockedId: targetId } })
  return { blocked: false }
}
