import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"

export const MODERATOR_ROLES: Array<Viewer["role"]> = ["MODERATOR", "ADMIN"]

/**
 * The minimum a moderator needs to judge ONE report: the reported item itself.
 * For a message, only that single message (never the rest of the conversation).
 */
export async function reportedSnapshot(targetType: string, targetId: string) {
  if (targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: targetId },
      select: { id: true, caption: true, kind: true, status: true, hiddenAt: true, createdAt: true, user: { select: { id: true, username: true, name: true } }, _count: { select: { media: true } } },
    })
    return post ? { kind: "POST", id: post.id, text: post.caption, mediaCount: post._count.media, hidden: !!post.hiddenAt, status: post.status, author: post.user, createdAt: post.createdAt } : null
  }
  if (targetType === "COMMENT") {
    const c = await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true, content: true, hiddenAt: true, deletedAt: true, createdAt: true, postId: true, user: { select: { id: true, username: true, name: true } } } })
    return c ? { kind: "COMMENT", id: c.id, text: c.content, hidden: !!c.hiddenAt, deleted: !!c.deletedAt, postId: c.postId, author: c.user, createdAt: c.createdAt } : null
  }
  if (targetType === "USER") {
    const u = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, username: true, name: true, bio: true, status: true, createdAt: true } })
    return u ? { kind: "USER", id: u.id, text: u.bio, status: u.status, author: { id: u.id, username: u.username, name: u.name }, createdAt: u.createdAt } : null
  }
  const m = await prisma.directMessage.findUnique({ where: { id: targetId }, select: { id: true, content: true, deletedAt: true, createdAt: true, sender: { select: { id: true, username: true, name: true } } } })
  return m ? { kind: "MESSAGE", id: m.id, text: m.deletedAt ? null : m.content, author: m.sender, createdAt: m.createdAt } : null
}

export async function applyModerationAction(actor: Viewer, input: {
  reportId?: string; targetType: "POST" | "COMMENT" | "USER" | "MESSAGE"; targetId: string; action: string; reason: string
}) {
  if (input.targetType === "USER" && input.targetId === actor.id) throw Errors.forbidden("自分自身は対象にできません")
  const now = new Date()
  await prisma.$transaction(async tx => {
    switch (input.action) {
      case "hide":
        if (input.targetType === "POST") await tx.post.update({ where: { id: input.targetId }, data: { hiddenAt: now } })
        else if (input.targetType === "COMMENT") await tx.comment.update({ where: { id: input.targetId }, data: { hiddenAt: now } })
        else if (input.targetType === "MESSAGE") await tx.directMessage.update({ where: { id: input.targetId }, data: { deletedAt: now } })
        else throw Errors.invalid("ユーザーには suspend_user を使ってください")
        break
      case "restore":
        if (input.targetType === "POST") await tx.post.update({ where: { id: input.targetId }, data: { hiddenAt: null } })
        else if (input.targetType === "COMMENT") await tx.comment.update({ where: { id: input.targetId }, data: { hiddenAt: null } })
        else throw Errors.invalid("この対象は復元できません")
        break
      case "suspend_user": {
        if (input.targetType !== "USER") throw Errors.invalid("ユーザーにだけ使えます")
        const target = await tx.user.findUnique({ where: { id: input.targetId }, select: { role: true } })
        if (!target) throw Errors.notFound()
        if (target.role !== "USER" && actor.role !== "ADMIN") throw Errors.forbidden("運営メンバーの停止は管理者だけができます")
        await tx.user.update({ where: { id: input.targetId }, data: { status: "SUSPENDED", suspendedAt: now } })
        break
      }
      case "unsuspend_user":
        if (input.targetType !== "USER") throw Errors.invalid("ユーザーにだけ使えます")
        await tx.user.updateMany({ where: { id: input.targetId, status: "SUSPENDED" }, data: { status: "ACTIVE", suspendedAt: null } })
        break
      case "dismiss":
      case "review":
        break
      default:
        throw Errors.invalid("不明な操作です")
    }
    if (input.reportId) {
      const state = input.action === "review" ? "REVIEWING" : "RESOLVED"
      await tx.report.update({ where: { id: input.reportId }, data: { state } })
    }
    // Append-only audit record (UPDATE/DELETE are blocked by a DB trigger).
    await tx.moderationAction.create({
      data: { actorId: actor.id, targetType: input.targetType, targetId: input.targetId, action: input.action, reason: input.reason, reportId: input.reportId ?? null },
    })
  })
}
