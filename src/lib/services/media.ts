import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { enforce } from "@/lib/rate-limit"
import { MEDIA_RULES, canTransition, rulesFor, type MediaKindName } from "@/lib/media/rules"
import {
  MediaRejectedError, MediaUnavailableError, selectMediaProvider,
  type MediaProvider, type ProviderWebhookEvent,
} from "@/lib/media/provider"

function mediaFolder() {
  return (process.env.CLOUDINARY_FOLDER || "daynet/media").replace(/[^A-Za-z0-9_\/-]/g, "").replace(/^\/+|\/+$/g, "")
}

async function provider(): Promise<MediaProvider> {
  try {
    return await selectMediaProvider()
  } catch (error) {
    if (error instanceof MediaUnavailableError) {
      console.error("[media] provider unavailable:", error.message)
      throw Errors.unavailable("写真・動画のアップロードは現在利用できません（配信設定が未完了です）", "MEDIA_UNAVAILABLE")
    }
    throw error
  }
}

export async function signUpload(viewer: Viewer, input: { kind: MediaKindName; mimeType: string; bytes: number; purpose: "POST" | "AVATAR" }) {
  if (input.purpose === "POST" && !viewer.profileComplete) throw Errors.profileRequired()
  if (input.purpose === "AVATAR" && input.kind !== "IMAGE") throw Errors.invalid("アイコンには画像を選んでください")
  const rules = rulesFor(input.kind)
  if (!(rules.mimeTypes as readonly string[]).includes(input.mimeType.toLowerCase())) {
    throw Errors.invalid(input.kind === "IMAGE" ? "JPEG・PNG・WebP・HEICの画像を選んでください" : "MP4またはMOVの動画を選んでください", { mimeType: ["対応していない形式です"] }, "UNSUPPORTED_TYPE")
  }
  if (input.bytes > rules.maxBytes) {
    throw Errors.tooLarge(input.kind === "IMAGE" ? "画像は1枚20MBまでです" : "動画は100MBまでです")
  }
  const p = await provider()
  await enforce("mediaSign", viewer.id)

  const expiresAt = new Date(Date.now() + MEDIA_RULES.uploadSessionTtlMinutes * 60_000)
  const created = await prisma.$transaction(async tx => {
    const media = await tx.media.create({
      data: { ownerId: viewer.id, kind: input.kind, purpose: input.purpose, provider: p.name, status: "PENDING", resourceType: input.kind === "IMAGE" ? "image" : "video" },
      select: { id: true },
    })
    // Server-generated, owner-scoped public id. The client can never choose where it uploads.
    const publicId = `${mediaFolder()}/${viewer.id}/${media.id}`
    await tx.media.update({ where: { id: media.id }, data: { providerPublicId: publicId } })
    const session = await tx.uploadSession.create({
      data: { ownerId: viewer.id, mediaId: media.id, expiresAt, expectedKind: input.kind, maxBytes: rules.maxBytes, providerPublicId: publicId },
      select: { id: true },
    })
    return { mediaId: media.id, sessionId: session.id, publicId }
  })
  const upload = p.signUpload({ mediaId: created.mediaId, ownerId: viewer.id, kind: input.kind, publicId: created.publicId, maxBytes: rules.maxBytes, sessionId: created.sessionId, expiresAt })
  return { mediaId: created.mediaId, expiresAt: expiresAt.toISOString(), upload, maxBytes: rules.maxBytes }
}

function validateVerified(kind: MediaKindName, asset: { bytes: number | null; width: number | null; height: number | null; durationMs: number | null; format: string | null }) {
  const rules = rulesFor(kind)
  if (asset.bytes !== null && asset.bytes > rules.maxBytes) throw new MediaRejectedError("FILE_TOO_LARGE", "ファイルが大きすぎます")
  if (asset.format && !(rules.formats as readonly string[]).includes(asset.format)) throw new MediaRejectedError("UNSUPPORTED_TYPE", "対応していない形式です")
  if (asset.width && asset.height && (asset.width > rules.maxSide || asset.height > rules.maxSide)) {
    throw new MediaRejectedError("DIMENSIONS", "縦横のサイズが大きすぎます")
  }
  if (kind === "IMAGE" && asset.width && asset.height && asset.width * asset.height > MEDIA_RULES.image.maxPixels) {
    throw new MediaRejectedError("DIMENSIONS", "画素数が大きすぎます")
  }
  if (kind === "VIDEO") {
    if (asset.durationMs === null) throw new MediaRejectedError("VIDEO_UNREADABLE", "動画の長さを確認できませんでした")
    if (asset.durationMs > MEDIA_RULES.video.maxDurationMs) throw new MediaRejectedError("VIDEO_TOO_LONG", "動画は60秒以内にしてください")
  }
}

/** Confirm an upload. Width/height/duration/bytes come from the provider, not the client. */
export async function completeUpload(viewer: Viewer, mediaId: string, clientResult: unknown) {
  const media = await prisma.media.findFirst({
    where: { id: mediaId, ownerId: viewer.id },
    select: { id: true, kind: true, status: true, providerPublicId: true, provider: true, uploadSession: true },
  })
  if (!media || !media.uploadSession || !media.providerPublicId) throw Errors.notFound()
  if (media.status === "READY" || media.status === "FAILED") return media.status
  if (media.status === "DELETING") throw Errors.conflict("このメディアは削除されています")
  const session = media.uploadSession
  if (session.ownerId !== viewer.id || session.providerPublicId !== media.providerPublicId) throw Errors.notFound()
  if (media.status === "PENDING" && (session.state !== "OPEN" || session.expiresAt.getTime() < Date.now())) {
    await prisma.uploadSession.update({ where: { id: session.id }, data: { state: "EXPIRED" } })
    throw Errors.conflict("アップロードの有効期限が切れました。もう一度選んでください", "UPLOAD_EXPIRED")
  }

  const p = await provider()
  if (p.name !== media.provider) throw Errors.conflict("配信設定が変わったため、もう一度選んでください", "PROVIDER_CHANGED")
  let asset
  try {
    asset = await p.verifyUpload({ publicId: media.providerPublicId, kind: media.kind, clientResult })
    validateVerified(media.kind, asset)
  } catch (error) {
    if (error instanceof MediaRejectedError) {
      await transition(media.id, "FAILED", { errorCode: error.code })
      await prisma.uploadSession.update({ where: { id: session.id }, data: { state: "COMPLETED" } })
      await queueMediaDeletion(media.id).catch(() => undefined)
      throw Errors.invalid(error.message, undefined, error.code)
    }
    if (error instanceof MediaUnavailableError) throw Errors.unavailable("メディアの確認ができませんでした。時間をおいて再試行してください", "MEDIA_UNAVAILABLE")
    throw error
  }
  await prisma.$transaction([
    prisma.media.update({
      where: { id: media.id },
      data: {
        providerAssetId: asset.providerAssetId, resourceType: asset.resourceType, deliveryType: asset.deliveryType,
        version: asset.version, width: asset.width, height: asset.height, durationMs: asset.durationMs,
        bytes: asset.bytes, format: asset.format,
      },
    }),
    prisma.uploadSession.update({ where: { id: session.id }, data: { state: "COMPLETED" } }),
  ])
  const next = asset.ready ? "READY" : "PROCESSING"
  if (media.status !== next) await transition(media.id, next)
  if (next === "READY") await publishWaitingPosts(media.id)
  return next
}

/** Apply a status change only if the transition is allowed (no rollbacks). */
export async function transition(mediaId: string, to: "PROCESSING" | "READY" | "FAILED" | "DELETING", extra: { errorCode?: string } = {}) {
  const current = await prisma.media.findUnique({ where: { id: mediaId }, select: { status: true } })
  if (!current || !canTransition(current.status, to)) return false
  const updated = await prisma.media.updateMany({
    where: { id: mediaId, status: current.status },
    data: { status: to, errorCode: extra.errorCode ?? null, lastEventAt: new Date() },
  })
  return updated.count === 1
}

/** When all media of a PROCESSING post are READY, publish it; if any failed, mark the post FAILED. */
export async function publishWaitingPosts(mediaId: string) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { postId: true } })
  if (!media?.postId) return
  const post = await prisma.post.findUnique({ where: { id: media.postId }, select: { id: true, status: true, media: { select: { status: true } } } })
  if (!post || post.status !== "PROCESSING") return
  if (post.media.some(m => m.status === "FAILED")) {
    await prisma.post.updateMany({ where: { id: post.id, status: "PROCESSING" }, data: { status: "FAILED" } })
  } else if (post.media.every(m => m.status === "READY")) {
    await prisma.post.updateMany({ where: { id: post.id, status: "PROCESSING" }, data: { status: "PUBLISHED", publishedAt: new Date() } })
  }
}

export async function applyWebhookEvent(event: ProviderWebhookEvent): Promise<"duplicate" | "ignored" | "applied" | "unknown"> {
  try {
    await prisma.webhookEvent.create({ data: { id: event.eventId, provider: "cloudinary" } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate"
    throw error
  }
  if (event.outcome === "IGNORED" || !event.publicId) return "ignored"
  const media = await prisma.media.findUnique({
    where: { providerPublicId: event.publicId },
    select: { id: true, ownerId: true, version: true, providerAssetId: true, uploadSession: { select: { ownerId: true, providerPublicId: true } } },
  })
  // The resource must belong to an upload session we issued, for the same owner.
  if (!media || !media.uploadSession || media.uploadSession.ownerId !== media.ownerId || media.uploadSession.providerPublicId !== event.publicId) return "unknown"
  if (media.providerAssetId && event.providerAssetId && media.providerAssetId !== event.providerAssetId) return "ignored"
  if (media.version && event.version && Number(event.version) < Number(media.version)) return "ignored" // stale event
  const changed = await transition(media.id, event.outcome, event.outcome === "FAILED" ? { errorCode: event.errorCode ?? "PROCESSING_FAILED" } : {})
  if (changed) await publishWaitingPosts(media.id)
  return changed ? "applied" : "ignored"
}

/** Mark for deletion and enqueue provider-side removal (original + derived + CDN invalidation). */
export async function queueMediaDeletion(mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { id: true, status: true, provider: true, providerPublicId: true, resourceType: true, deliveryType: true },
  })
  if (!media) return
  if (media.status !== "DELETING") await prisma.media.update({ where: { id: media.id }, data: { status: "DELETING", lastEventAt: new Date() } })
  if (media.provider === "legacy-url" || !media.providerPublicId) return // handled by the legacy migration tool
  const existing = await prisma.mediaDeletionJob.findFirst({ where: { mediaId: media.id, doneAt: null }, select: { id: true } })
  if (existing) return
  await prisma.mediaDeletionJob.create({
    data: {
      mediaId: media.id,
      provider: media.provider,
      providerPublicId: media.providerPublicId,
      resourceType: media.resourceType || "image",
      deliveryType: media.deliveryType || "authenticated",
    },
  })
}

/** Cron: process due deletion jobs with exponential backoff. Idempotent and bounded. */
export async function runDeletionJobs(limit = 25) {
  const jobs = await prisma.mediaDeletionJob.findMany({
    where: { doneAt: null, nextAttemptAt: { lte: new Date() }, attempts: { lt: 12 } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  })
  let done = 0
  let failed = 0
  for (const job of jobs) {
    try {
      const p = await selectMediaProvider()
      if (p.name !== job.provider) throw new Error(`provider mismatch (${job.provider})`)
      await p.deleteAsset({ publicId: job.providerPublicId, resourceType: job.resourceType, deliveryType: job.deliveryType })
      await prisma.$transaction([
        prisma.mediaDeletionJob.update({ where: { id: job.id }, data: { doneAt: new Date(), attempts: { increment: 1 }, lastError: null } }),
        ...(job.mediaId ? [prisma.media.deleteMany({ where: { id: job.mediaId, status: "DELETING" } })] : []),
      ])
      done++
    } catch (error) {
      failed++
      const attempts = job.attempts + 1
      await prisma.mediaDeletionJob.update({
        where: { id: job.id },
        data: {
          attempts,
          lastError: error instanceof Error ? error.message.slice(0, 300) : "unknown",
          nextAttemptAt: new Date(Date.now() + Math.min(24 * 3600, 60 * 2 ** attempts) * 1000),
        },
      })
    }
  }
  return { processed: jobs.length, done, failed }
}

/** Cron: unattached media after 24h, FAILED media after 7 days, expired sessions. */
export async function cleanupStaleMedia(limit = 200) {
  const now = Date.now()
  await prisma.uploadSession.updateMany({ where: { state: "OPEN", expiresAt: { lt: new Date(now) } }, data: { state: "EXPIRED" } })
  const unattached = await prisma.media.findMany({
    where: {
      postId: null,
      avatarOf: null,
      status: { in: ["PENDING", "PROCESSING", "READY"] },
      createdAt: { lt: new Date(now - MEDIA_RULES.unattachedRetentionHours * 3600_000) },
      provider: { not: "legacy-url" },
    },
    select: { id: true },
    take: limit,
  })
  const failed = await prisma.media.findMany({
    where: { status: "FAILED", updatedAt: { lt: new Date(now - MEDIA_RULES.failedRetentionDays * 86400_000) } },
    select: { id: true },
    take: limit,
  })
  for (const m of [...unattached, ...failed]) await queueMediaDeletion(m.id)
  return { unattached: unattached.length, failed: failed.length }
}
