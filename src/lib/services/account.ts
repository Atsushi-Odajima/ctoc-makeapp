import { prisma } from "@/lib/db"
import { queueMediaDeletion } from "./media"

/** Self-service export: only the requester's own data (no other people's DMs or private data). */
export async function buildExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, username: true, bio: true, website: true, isPrivate: true, dmPolicy: true,
      footprintOptIn: true, createdAt: true,
      strengthOption: { select: { label: true } }, weaknessOption: { select: { label: true } },
      hobbies: { orderBy: { position: "asc" }, select: { option: { select: { label: true } } } },
    },
  })
  const [posts, comments, memberships, following] = await Promise.all([
    prisma.post.findMany({
      where: { userId, status: { not: "DELETED" } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, caption: true, kind: true, visibility: true, status: true, createdAt: true, publishedAt: true,
        community: { select: { slug: true, name: true } },
        media: { orderBy: { sortOrder: "asc" }, select: { id: true, kind: true, altText: true, width: true, height: true, durationMs: true } },
      },
    }),
    prisma.comment.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, postId: true, parentId: true, content: true, createdAt: true } }),
    prisma.communityMember.findMany({ where: { userId }, select: { role: true, status: true, showOnProfile: true, createdAt: true, community: { select: { slug: true, name: true } } } }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { status: true, createdAt: true, following: { select: { username: true } } } }),
  ])
  return {
    format: "daynet-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "写真・動画の原本は含まれていません（別手続きで期限付きリンクを発行します）。他の人のDM本文は含まれません。",
    profile: {
      ...user,
      strength: user.strengthOption?.label ?? null,
      weakness: user.weaknessOption?.label ?? null,
      hobbies: user.hobbies.map(h => h.option.label),
      strengthOption: undefined, weaknessOption: undefined,
    },
    posts,
    comments,
    memberships: memberships.map(m => ({ community: m.community.slug, name: m.community.name, role: m.role, status: m.status, showOnProfile: m.showOnProfile, joinedAt: m.createdAt })),
    following: following.map(f => ({ username: f.following.username, status: f.status, since: f.createdAt })),
  }
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = value instanceof Date ? value.toISOString() : String(value)
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "﻿"
  const headers = Object.keys(rows[0]!)
  return "﻿" + [headers.join(","), ...rows.map(r => headers.map(h => csvCell(r[h])).join(","))].join("\r\n") + "\r\n"
}

/** Step 1 (immediate): stop the account and hide everything public. */
export async function requestAccountDeletion(userId: string) {
  const media = await prisma.media.findMany({ where: { ownerId: userId, status: { not: "DELETING" } }, select: { id: true } })
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status: "DELETED", deletionRequestedAt: new Date(), isPrivate: true } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
  ])
  for (const m of media) await queueMediaDeletion(m.id)
}

/**
 * Step 2 (cron, within 7 days): remove personal data. The user row is kept as an anonymised
 * tombstone so existing conversations show 「削除されたユーザー」 and audit/report records stay
 * consistent (see the privacy policy for what is retained and why).
 */
export async function purgeDeletedAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, email: true } })
  if (!user || user.status !== "DELETED" || user.email.endsWith("@deleted.invalid")) return false
  const media = await prisma.media.findMany({ where: { ownerId: userId, status: { not: "DELETING" } }, select: { id: true } })
  for (const m of media) await queueMediaDeletion(m.id)
  await prisma.$transaction([
    prisma.post.updateMany({ where: { userId }, data: { status: "DELETED", deletedAt: new Date(), caption: null, images: "[]", location: null } }),
    prisma.comment.updateMany({ where: { userId }, data: { deletedAt: new Date(), content: "" } }),
    prisma.directMessage.updateMany({ where: { senderId: userId }, data: { deletedAt: new Date(), content: "" } }),
    prisma.newsComment.deleteMany({ where: { userId } }),
    prisma.like.deleteMany({ where: { userId } }),
    prisma.empathy.deleteMany({ where: { userId } }),
    prisma.bookmark.deleteMany({ where: { userId } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
    prisma.mute.deleteMany({ where: { OR: [{ userId }, { targetUserId: userId }] } }),
    prisma.communityMute.deleteMany({ where: { userId } }),
    prisma.footprint.deleteMany({ where: { OR: [{ visitorId: userId }, { visitedId: userId }] } }),
    prisma.notification.deleteMany({ where: { OR: [{ userId }, { fromUserId: userId }] } }),
    prisma.userHobby.deleteMany({ where: { userId } }),
    prisma.communityMember.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.story.deleteMany({ where: { userId } }),
    prisma.idempotencyKey.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `${userId}@deleted.invalid`, password: "", name: "", username: `deleted_${userId}`.slice(0, 60),
        bio: null, website: null, avatar: null, avatarMediaId: null, strengthOptionId: null, weaknessOptionId: null,
        footprintOptIn: false,
      },
    }),
  ])
  return true
}
