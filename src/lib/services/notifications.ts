import { prisma } from "@/lib/db"

export type NotificationType =
  | "like" | "empathy" | "comment" | "reply" | "follow" | "follow_request" | "follow_accept"
  | "community_request" | "community_accept" | "dm_request"

/**
 * Create a notification unless: it is for yourself, either side blocked the other, or the
 * recipient muted the actor (muting is silent — the muted user is never told).
 */
export async function notify(input: { userId: string; type: NotificationType; fromUserId: string; postId?: string | null; content?: string | null }) {
  if (input.userId === input.fromUserId) return
  const [blocked, muted] = await Promise.all([
    prisma.block.count({
      where: { OR: [{ blockerId: input.userId, blockedId: input.fromUserId }, { blockerId: input.fromUserId, blockedId: input.userId }] },
    }),
    prisma.mute.count({ where: { userId: input.userId, targetUserId: input.fromUserId } }),
  ])
  if (blocked || muted) return
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      fromUserId: input.fromUserId,
      postId: input.postId ?? null,
      content: input.content ? input.content.slice(0, 140) : null,
    },
  })
}
