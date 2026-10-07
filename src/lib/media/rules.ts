// Upload constraints (spec §8). Shared by client (early feedback) and server (authoritative).
export const MEDIA_RULES = {
  image: {
    maxBytes: 20 * 1024 * 1024,
    maxCount: 5,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    formats: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
    maxSide: 12000,
    maxPixels: 80_000_000,
    deliveredMaxSide: 2048,
  },
  video: {
    maxBytes: 100 * 1024 * 1024,
    maxCount: 1,
    maxDurationMs: 60_000,
    mimeTypes: ["video/mp4", "video/quicktime"],
    formats: ["mp4", "mov"],
    maxSide: 4096,
    deliveredMaxSide: 1920, // 1080p long-side cap
  },
  deliveryTtlSeconds: 120,
  uploadSessionTtlMinutes: 30,
  unattachedRetentionHours: 24,
  failedRetentionDays: 7,
} as const

export type MediaKindName = "IMAGE" | "VIDEO"

export function rulesFor(kind: MediaKindName) {
  return kind === "IMAGE" ? MEDIA_RULES.image : MEDIA_RULES.video
}

// Allowed status transitions. Webhooks or retries can never move a media item backwards.
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "READY", "FAILED", "DELETING"],
  PROCESSING: ["READY", "FAILED", "DELETING"],
  READY: ["DELETING"],
  FAILED: ["DELETING"],
  DELETING: [],
}

export function canTransition(from: string, to: string): boolean {
  return from === to ? false : (TRANSITIONS[from] ?? []).includes(to)
}
