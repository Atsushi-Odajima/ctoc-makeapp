import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { findInteractablePost, findViewablePostId } from "@/lib/policies/posts"
import { isBlockedEitherWay } from "@/lib/policies/relationships"
import { deliveryProvider } from "@/lib/media/delivery"
import { toUserSummary, userSummarySelect, type UserSummary } from "@/lib/dto/user"
import { enforce } from "@/lib/rate-limit"
import { notify } from "./notifications"

export interface CommentDTO {
  id: string
  postId: string
  parentId: string | null
  content: string | null // null when removed
  removed: boolean
  createdAt: string
  author: UserSummary | null
  isOwner: boolean
  replies: CommentDTO[]
}

const commentSelect = {
  id: true, postId: true, parentId: true, content: true, createdAt: true, deletedAt: true, hiddenAt: true, userId: true,
  user: { select: userSummarySelect },
} as const

/** Comments of a viewable post. One reply level. Blocked users' comments are omitted for the viewer. */
export async function listComments(viewerId: string | null, postId: string): Promise<CommentDTO[]> {
  const id = await findViewablePostId(viewerId, postId)
  const blockedIds = viewerId
    ? (await prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } }))
      .map(b => (b.blockerId === viewerId ? b.blockedId : b.blockerId))
    : []
  const rows = await prisma.comment.findMany({
    where: { postId: id, userId: { notIn: blockedIds }, user: { status: { not: "SUSPENDED" } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 500,
    select: commentSelect,
  })
  const provider = await deliveryProvider()
  const toDTO = (row: (typeof rows)[number]): CommentDTO => {
    const removed = !!row.deletedAt || !!row.hiddenAt
    return {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      content: removed ? null : row.content,
      removed,
      createdAt: row.createdAt.toISOString(),
      author: removed ? null : toUserSummary(row.user, provider),
      isOwner: viewerId === row.userId,
      replies: [],
    }
  }
  const top = rows.filter(r => !r.parentId).map(toDTO)
  const byId = new Map(top.map(c => [c.id, c]))
  for (const r of rows) {
    if (!r.parentId) continue
    const parent = byId.get(r.parentId)
    if (parent && !r.deletedAt && !r.hiddenAt) parent.replies.push(toDTO(r))
  }
  // Drop removed top-level comments that have no visible replies.
  return top.filter(c => !c.removed || c.replies.length > 0)
}

export async function addComment(viewer: Viewer, postId: string, input: { content: string; parentId?: string | null }) {
  const post = await findInteractablePost(viewer.id, postId)
  if (await isBlockedEitherWay(viewer.id, post.userId)) throw Errors.forbidden("この投稿には返信できません", "BLOCKED")
  let parentAuthor: string | null = null
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: input.parentId, postId: post.id, deletedAt: null, hiddenAt: null },
      select: { id: true, parentId: true, userId: true },
    })
    if (!parent) throw Errors.invalid("返信先のコメントが見つかりません", { parentId: ["見つかりません"] })
    if (parent.parentId) throw Errors.invalid("返信は1階層までです", { parentId: ["返信への返信はできません"] })
    if (await isBlockedEitherWay(viewer.id, parent.userId)) throw Errors.forbidden("このコメントには返信できません", "BLOCKED")
    parentAuthor = parent.userId
  }
  await enforce("comment", viewer.id)
  const comment = await prisma.comment.create({
    data: { postId: post.id, userId: viewer.id, content: input.content, parentId: input.parentId ?? null },
    select: { id: true },
  })
  await notify({ userId: post.userId, type: "comment", fromUserId: viewer.id, postId: post.id, content: input.content }).catch(() => undefined)
  if (parentAuthor && parentAuthor !== post.userId) {
    await notify({ userId: parentAuthor, type: "reply", fromUserId: viewer.id, postId: post.id, content: input.content }).catch(() => undefined)
  }
  return comment.id
}

/** Comment author or the post owner may remove a comment (soft delete). */
export async function removeComment(viewer: Viewer, commentId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, userId: true, postId: true, post: { select: { userId: true } } },
  })
  if (!comment) throw Errors.notFound()
  await findViewablePostId(viewer.id, comment.postId)
  if (comment.userId !== viewer.id && comment.post.userId !== viewer.id) throw Errors.forbidden("このコメントは削除できません")
  await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } })
}
