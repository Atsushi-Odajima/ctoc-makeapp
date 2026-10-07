import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { Viewer } from "@/lib/api/viewer"
import { findInteractablePost } from "@/lib/policies/posts"
import { isBlockedEitherWay } from "@/lib/policies/relationships"
import { Errors } from "@/lib/api/errors"
import { enforce } from "@/lib/rate-limit"
import { notify } from "./notifications"

export type ReactionKind = "like" | "empathy" | "bookmark"

// Idempotent set/unset. PUT twice => one row; DELETE twice => no row. Concurrent PUTs are
// safe because the composite primary key (userId, postId) rejects duplicates.
export async function setReaction(viewer: Viewer, postId: string, kind: ReactionKind, on: boolean) {
  const post = await findInteractablePost(viewer.id, postId)
  if (on && kind !== "bookmark" && (await isBlockedEitherWay(viewer.id, post.userId))) throw Errors.forbidden("この投稿には反応できません", "BLOCKED")
  await enforce("reaction", viewer.id)
  let created = false
  if (on) {
    try {
      if (kind === "like") await prisma.like.create({ data: { userId: viewer.id, postId: post.id } })
      else if (kind === "empathy") await prisma.empathy.create({ data: { userId: viewer.id, postId: post.id } })
      else await prisma.bookmark.create({ data: { userId: viewer.id, postId: post.id } })
      created = true
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error
    }
    if (created && kind !== "bookmark") {
      await notify({ userId: post.userId, type: kind, fromUserId: viewer.id, postId: post.id }).catch(() => undefined)
    }
  } else {
    if (kind === "like") await prisma.like.deleteMany({ where: { userId: viewer.id, postId: post.id } })
    else if (kind === "empathy") await prisma.empathy.deleteMany({ where: { userId: viewer.id, postId: post.id } })
    else await prisma.bookmark.deleteMany({ where: { userId: viewer.id, postId: post.id } })
  }
  const [likes, empathies] = await Promise.all([
    prisma.like.count({ where: { postId: post.id } }),
    prisma.empathy.count({ where: { postId: post.id } }),
  ])
  return { postId: post.id, kind, active: on, counts: { likes, empathies } }
}
