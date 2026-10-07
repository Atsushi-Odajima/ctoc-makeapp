import type { Prisma, PostVisibility } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { beforeCursor, decodeCursor, paginate } from "@/lib/api/pagination"
import { postSelect, toPostDTO, type PostDTO } from "@/lib/dto/post"
import { deliveryProvider } from "@/lib/media/delivery"
import { MEDIA_RULES } from "@/lib/media/rules"
import { feedWhere, findViewablePostId, visiblePostWhere, type FeedTab } from "@/lib/policies/posts"
import { getCommunityAccess } from "@/lib/policies/communities"
import { notBlockedUserWhere } from "@/lib/policies/relationships"
import { enforce } from "@/lib/rate-limit"
import { requestHash, withIdempotency } from "@/lib/idempotency"
import { graphemeLength } from "@/lib/validation/text"
import { queueMediaDeletion } from "./media"

const ORDER: Prisma.PostOrderByWithRelationInput[] = [{ publishedAt: "desc" }, { id: "desc" }]

export async function listPosts(
  viewerId: string | null,
  where: Prisma.PostWhereInput,
  opts: { cursor?: string | null; limit: number },
): Promise<{ items: PostDTO[]; nextCursor: string | null }> {
  const cursor = decodeCursor(opts.cursor)
  const rows = await prisma.post.findMany({
    where: { AND: [where, beforeCursor("publishedAt", cursor)] },
    orderBy: ORDER,
    take: opts.limit + 1,
    select: postSelect(viewerId),
  })
  const provider = await deliveryProvider()
  const page = paginate(rows, opts.limit, row => row.publishedAt ?? row.createdAt)
  const excerpts = await latestComments(viewerId, page.items.map(r => r.id))
  return {
    items: page.items.map(row => ({ ...toPostDTO(row, viewerId, provider), latestComment: excerpts.get(row.id) ?? null })),
    nextCursor: page.nextCursor,
  }
}

/** One short reply excerpt per post for list views (blocked/suspended authors excluded). */
async function latestComments(viewerId: string | null, postIds: string[]) {
  const out = new Map<string, { authorName: string; authorUsername: string; content: string }>()
  if (!postIds.length) return out
  const rows = await prisma.comment.findMany({
    where: {
      postId: { in: postIds },
      parentId: null,
      deletedAt: null,
      hiddenAt: null,
      user: notBlockedUserWhere(viewerId),
    },
    orderBy: [{ postId: "asc" }, { createdAt: "desc" }],
    distinct: ["postId"],
    select: { postId: true, content: true, user: { select: { name: true, username: true } } },
  })
  for (const r of rows) out.set(r.postId, { authorName: r.user.name, authorUsername: r.user.username, content: r.content.slice(0, 80) })
  return out
}

export function listFeed(viewerId: string | null, tab: FeedTab, opts: { cursor?: string | null; limit: number }) {
  return listPosts(viewerId, feedWhere(viewerId, tab), opts)
}

/** Number of posts newer than `since` in the same tab (drives the 「新しい投稿」 button). */
export async function countNewer(viewerId: string | null, tab: FeedTab, since: string) {
  const cursor = decodeCursor(since)
  if (!cursor) return 0
  return prisma.post.count({
    where: {
      AND: [
        feedWhere(viewerId, tab),
        { OR: [{ publishedAt: { gt: cursor.t } }, { publishedAt: cursor.t, id: { gt: cursor.id } }] },
      ],
    },
  })
}

export async function getPostDTO(viewerId: string | null, postId: string): Promise<PostDTO> {
  const id = await findViewablePostId(viewerId, postId)
  const row = await prisma.post.findUniqueOrThrow({ where: { id }, select: postSelect(viewerId) })
  return toPostDTO(row, viewerId, await deliveryProvider())
}

export interface CreatePostInput {
  caption: string
  mediaIds: string[]
  altTexts: Record<string, string>
  visibility: PostVisibility
  communitySlug?: string
  publish: boolean
  confirmPublicCommunity: boolean
  location?: string
}

/** Validate media ownership/state and decide the post kind. Media of another user is rejected. */
async function resolveMedia(viewerId: string, mediaIds: string[], postId: string | null) {
  if (new Set(mediaIds).size !== mediaIds.length) throw Errors.invalid("同じ添付が重複しています", { mediaIds: ["重複しています"] })
  if (mediaIds.length === 0) return { kind: "NOTE" as const, media: [] as Array<{ id: string; status: string; kind: string }> }
  const media = await prisma.media.findMany({
    where: { id: { in: mediaIds } },
    select: { id: true, ownerId: true, postId: true, purpose: true, status: true, kind: true },
  })
  if (media.length !== mediaIds.length || media.some(m => m.ownerId !== viewerId)) {
    // Do not reveal whether the id belongs to someone else.
    throw Errors.invalid("添付できないメディアが含まれています", { mediaIds: ["添付できないメディアです"] }, "MEDIA_NOT_ATTACHABLE")
  }
  if (media.some(m => m.purpose !== "POST" || (m.postId !== null && m.postId !== postId))) {
    throw Errors.invalid("添付できないメディアが含まれています", { mediaIds: ["すでに使われています"] }, "MEDIA_NOT_ATTACHABLE")
  }
  if (media.some(m => m.status === "FAILED" || m.status === "DELETING" || m.status === "PENDING")) {
    throw Errors.invalid("アップロードが完了していないか、処理に失敗したメディアがあります", { mediaIds: ["再選択してください"] }, "MEDIA_NOT_READY")
  }
  const videos = media.filter(m => m.kind === "VIDEO")
  const images = media.filter(m => m.kind === "IMAGE")
  if (videos.length && images.length) throw Errors.invalid("写真と動画は同じ投稿に混ぜられません", { mediaIds: ["写真5枚まで、または動画1本"] })
  if (videos.length > MEDIA_RULES.video.maxCount) throw Errors.invalid("動画は1本までです", { mediaIds: ["動画は1本まで"] })
  if (images.length > MEDIA_RULES.image.maxCount) throw Errors.invalid("写真は5枚までです", { mediaIds: ["写真は5枚まで"] })
  if (images.some(m => m.status !== "READY")) throw Errors.invalid("写真の処理が終わっていません", { mediaIds: ["処理中です"] }, "MEDIA_NOT_READY")
  const ordered = mediaIds.map(id => media.find(m => m.id === id)!)
  return { kind: videos.length ? ("VIDEO" as const) : ("PHOTO" as const), media: ordered }
}

export async function createPost(viewer: Viewer, input: CreatePostInput, idempotencyKey: string | null) {
  const caption = input.caption.trim() ? input.caption : ""
  const { kind, media } = await resolveMedia(viewer.id, input.mediaIds, null)
  if (kind === "NOTE" && graphemeLength(caption.trim()) === 0) {
    throw Errors.invalid("本文を入力するか、写真・動画を添付してください", { caption: ["入力してください"] })
  }
  for (const key of Object.keys(input.altTexts)) {
    if (!input.mediaIds.includes(key)) throw Errors.invalid("代替テキストの対象が正しくありません", { altTexts: ["対象がありません"] })
  }

  let communityId: string | null = null
  let visibility: PostVisibility = input.visibility
  if (input.communitySlug) {
    const access = await getCommunityAccess(viewer.id, input.communitySlug)
    if (!access.isActiveMember) throw Errors.forbidden("参加している集まりにだけ投稿できます", "NOT_A_MEMBER")
    // A private account posting into a PUBLIC community: that post is readable by anyone,
    // so the author must confirm this range before posting.
    if (!access.community.isPrivate && viewer.isPrivate && !input.confirmPublicCommunity) {
      throw Errors.invalid("この集まりは公開です。非公開アカウントでも、この投稿は誰でも読めます。確認のうえ投稿してください", { confirmPublicCommunity: ["確認が必要です"] }, "CONFIRMATION_REQUIRED")
    }
    communityId = access.community.id
    visibility = "COMMUNITY"
  } else {
    if (visibility === "COMMUNITY") throw Errors.invalid("個人の投稿に「集まり」の公開範囲は選べません", { visibility: ["公開 または フォロワー"] })
    if (viewer.isPrivate && visibility === "PUBLIC") visibility = "FOLLOWERS"
  }

  const hasProcessing = media.some(m => m.status === "PROCESSING")
  const status = !input.publish ? "DRAFT" : hasProcessing ? "PROCESSING" : "PUBLISHED"
  const hash = requestHash({ ...input, caption })

  const outcome = await withIdempotency(viewer.id, "post.create", idempotencyKey, hash, async () => {
    await enforce("postCreate", viewer.id)
    return prisma.$transaction(async tx => {
      const post = await tx.post.create({
        data: {
          userId: viewer.id,
          caption: caption || null,
          kind,
          visibility,
          status,
          communityId,
          location: input.location?.trim() || null,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
        select: { id: true },
      })
      for (const [index, m] of media.entries()) {
        // Conditional update: guarantees the media is still unattached and owned by the viewer.
        const updated = await tx.media.updateMany({
          where: { id: m.id, ownerId: viewer.id, postId: null, purpose: "POST" },
          data: { postId: post.id, sortOrder: index, altText: input.altTexts[m.id] ?? null },
        })
        if (updated.count !== 1) throw Errors.conflict("メディアが別の投稿で使われました。選び直してください", "MEDIA_CONFLICT")
      }
      return post.id
    })
  })
  return { postId: outcome.resultId, replayed: outcome.replayed }
}

export async function loadOwnPost(viewerId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, userId: viewerId, status: { not: "DELETED" }, deletedAt: null },
    select: { id: true, userId: true, status: true, revision: true, visibility: true, communityId: true, kind: true, caption: true },
  })
  // Non-owners get 404 (if they cannot see it) or 403 (if they can).
  if (!post) {
    await findViewablePostId(viewerId, postId)
    throw Errors.forbidden("自分の投稿だけ編集できます")
  }
  return post
}

export async function editPost(viewer: Viewer, postId: string, input: {
  revision: number; caption?: string; altTexts?: Record<string, string>; visibility?: "PUBLIC" | "FOLLOWERS"; confirmVisibilityExpansion: boolean
}) {
  const post = await loadOwnPost(viewer.id, postId)
  if (post.revision !== input.revision) throw Errors.conflict("ほかの端末で更新されています。再読み込みしてから編集してください", "REVISION_MISMATCH")

  let visibility = post.visibility
  if (input.visibility && input.visibility !== post.visibility) {
    if (post.communityId) throw Errors.invalid("集まりの投稿の公開範囲は集まりの設定に従います")
    const expanding = post.visibility === "FOLLOWERS" && input.visibility === "PUBLIC"
    if (expanding && !input.confirmVisibilityExpansion) {
      throw Errors.invalid("公開範囲を広げると、フォロワー以外も読めるようになります。確認してください", { confirmVisibilityExpansion: ["確認が必要です"] }, "CONFIRMATION_REQUIRED")
    }
    // Re-run the ACL rule: a private account cannot publish personal posts publicly.
    visibility = viewer.isPrivate && input.visibility === "PUBLIC" ? "FOLLOWERS" : input.visibility
  }

  if (input.caption !== undefined && post.kind === "NOTE" && graphemeLength(input.caption.trim()) === 0) {
    throw Errors.invalid("本文を入力してください", { caption: ["入力してください"] })
  }

  await prisma.$transaction(async tx => {
    const updated = await tx.post.updateMany({
      where: { id: post.id, userId: viewer.id, revision: input.revision },
      data: {
        ...(input.caption !== undefined ? { caption: input.caption.trim() ? input.caption : null } : {}),
        visibility,
        revision: { increment: 1 },
      },
    })
    if (updated.count !== 1) throw Errors.conflict("ほかの端末で更新されています。再読み込みしてから編集してください", "REVISION_MISMATCH")
    for (const [mediaId, alt] of Object.entries(input.altTexts ?? {})) {
      const r = await tx.media.updateMany({ where: { id: mediaId, postId: post.id, ownerId: viewer.id }, data: { altText: alt || null } })
      if (r.count !== 1) throw Errors.invalid("代替テキストの対象が正しくありません")
    }
  })
}

export async function publishDraft(viewer: Viewer, postId: string, revision: number) {
  const post = await loadOwnPost(viewer.id, postId)
  if (post.status !== "DRAFT" && post.status !== "FAILED") throw Errors.conflict("下書きではありません", "NOT_A_DRAFT")
  if (post.revision !== revision) throw Errors.conflict("ほかの端末で更新されています", "REVISION_MISMATCH")
  const media = await prisma.media.findMany({ where: { postId: post.id }, select: { status: true } })
  if (media.some(m => m.status === "FAILED")) throw Errors.invalid("処理に失敗したメディアがあります。削除または再選択してください", undefined, "MEDIA_FAILED")
  const processing = media.some(m => m.status === "PROCESSING" || m.status === "PENDING")
  await enforce("postCreate", viewer.id)
  await prisma.post.updateMany({
    where: { id: post.id, revision },
    data: processing
      ? { status: "PROCESSING", revision: { increment: 1 } }
      : { status: "PUBLISHED", publishedAt: new Date(), revision: { increment: 1 } },
  })
}

export async function deletePost(viewer: Viewer, postId: string) {
  const post = await loadOwnPost(viewer.id, postId)
  const media = await prisma.$transaction(async tx => {
    await tx.post.update({ where: { id: post.id }, data: { status: "DELETED", deletedAt: new Date(), revision: { increment: 1 } } })
    const rows = await tx.media.findMany({ where: { postId: post.id, status: { not: "DELETING" } }, select: { id: true } })
    return rows
  })
  for (const m of media) await queueMediaDeletion(m.id)
}

/** Visible posts by one author (profile grid) — same ACL, applied before pagination. */
export function authorPostsWhere(viewerId: string | null, authorId: string, opts: { notesOnly?: boolean } = {}): Prisma.PostWhereInput {
  return { AND: [visiblePostWhere(viewerId), { userId: authorId }, ...(opts.notesOnly ? [{ kind: "NOTE" as const }] : [])] }
}
