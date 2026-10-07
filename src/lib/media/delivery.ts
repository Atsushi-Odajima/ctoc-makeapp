import type { Media } from "@prisma/client"
import { MEDIA_RULES } from "./rules"
import { hasMediaUrlSecret, signMediaToken } from "./tokens"
import { configuredProviderName, selectMediaProvider, type MediaProvider } from "./provider"

// MediaDTO (spec §6): { id, kind, width, height, durationMs, altText, deliveryUrl, expiresAt, posterUrl? }
// Never contains the provider public id, the legacy public URL or any secret.
export interface MediaDTO {
  id: string
  kind: "IMAGE" | "VIDEO"
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "DELETING"
  width: number | null
  height: number | null
  durationMs: number | null
  altText: string | null
  deliveryUrl: string | null
  expiresAt: string | null
  posterUrl?: string | null
  /** true while the item is still a legacy public upload that has not been migrated */
  legacyPublic?: boolean
  errorCode?: string | null
}

export type MediaForDelivery = Pick<Media,
  "id" | "kind" | "status" | "width" | "height" | "durationMs" | "altText" | "provider" | "providerPublicId" | "resourceType" | "version" | "errorCode">

let cachedProvider: Promise<MediaProvider | null> | null = null

/** Provider used for delivery URLs; null when not configured (URLs are then omitted, never faked). */
export function deliveryProvider(): Promise<MediaProvider | null> {
  if (!cachedProvider) cachedProvider = selectMediaProvider().catch(() => null)
  return cachedProvider
}

export function resetDeliveryProviderCache() {
  cachedProvider = null
}

function legacyDelivery(mediaId: string): { url: string; expiresAt: Date } | null {
  if (!hasMediaUrlSecret()) return null
  const expiresAt = new Date(Date.now() + MEDIA_RULES.deliveryTtlSeconds * 1000)
  const exp = Math.floor(expiresAt.getTime() / 1000)
  return { url: `/api/media/${mediaId}/file?variant=display&exp=${exp}&sig=${signMediaToken(mediaId, "display", exp)}`, expiresAt }
}

/**
 * Build the DTO. Call ONLY after the caller has established that the viewer may see the media
 * (post ACL, avatar visibility, or ownership). Not-READY media gets no URL.
 */
export function toMediaDTO(media: MediaForDelivery, provider: MediaProvider | null, opts: { owner?: boolean } = {}): MediaDTO {
  const base: MediaDTO = {
    id: media.id,
    kind: media.kind,
    status: media.status,
    width: media.width,
    height: media.height,
    durationMs: media.durationMs,
    altText: media.altText,
    deliveryUrl: null,
    expiresAt: null,
    ...(opts.owner ? { errorCode: media.errorCode } : {}),
  }
  if (media.status !== "READY") return base

  if (media.provider === "legacy-url") {
    const d = legacyDelivery(media.id)
    return { ...base, deliveryUrl: d?.url ?? null, expiresAt: d?.expiresAt.toISOString() ?? null, legacyPublic: true }
  }
  if (!provider || provider.name !== media.provider || !media.providerPublicId) return base
  const input = {
    mediaId: media.id,
    publicId: media.providerPublicId,
    resourceType: (media.resourceType === "video" ? "video" : "image") as "image" | "video",
    version: media.version,
    kind: media.kind,
  }
  const display = provider.issueDelivery(input, "display")
  const dto: MediaDTO = { ...base, deliveryUrl: display.url, expiresAt: display.expiresAt.toISOString() }
  if (media.kind === "VIDEO" && provider.name === "cloudinary") dto.posterUrl = provider.issueDelivery(input, "poster").url
  return dto
}

export { configuredProviderName }
