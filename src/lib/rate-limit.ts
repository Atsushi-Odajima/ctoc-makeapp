import { createHash } from "node:crypto"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"

// Shared (database-backed) fixed-window rate limiting. Works across serverless instances;
// nothing is kept in process memory. Keys never contain raw emails/IPs (hashed).

export const LIMITS = {
  postCreate: { limit: 10, windowSec: 60 * 60 },
  comment: { limit: 60, windowSec: 60 * 60 },
  dmMessage: { limit: 60, windowSec: 60 },
  dmNewPeer: { limit: 10, windowSec: 24 * 60 * 60 },
  mediaSign: { limit: 20, windowSec: 60 * 60 },
  report: { limit: 10, windowSec: 60 * 60 },
  loginAccount: { limit: 8, windowSec: 15 * 60 },
  loginIp: { limit: 30, windowSec: 15 * 60 },
  register: { limit: 10, windowSec: 60 * 60 },
  follow: { limit: 120, windowSec: 60 * 60 },
  reaction: { limit: 600, windowSec: 60 * 60 },
  footprint: { limit: 300, windowSec: 60 * 60 },
  export: { limit: 5, windowSec: 60 * 60 },
} as const

export type LimitName = keyof typeof LIMITS

export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32)
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  retryAfter: number
}

// RATE_LIMIT_SCALE multiplies every limit (default 1). Only for automated test environments;
// never set it in Preview/Production.
function scaled(limit: number) {
  const scale = Number(process.env.RATE_LIMIT_SCALE || 1)
  return Number.isFinite(scale) && scale >= 1 ? Math.floor(limit * scale) : limit
}

export async function hit(name: LimitName, subject: string): Promise<RateLimitResult> {
  const { windowSec } = LIMITS[name]
  const limit = scaled(LIMITS[name].limit)
  const key = `${name}:${subject}`
  const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date; now: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE "RateLimitBucket"."windowStart" END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + make_interval(secs => ${windowSec}) ELSE "RateLimitBucket"."expiresAt" END
    RETURNING "count", "expiresAt", CURRENT_TIMESTAMP AS "now"
  `
  const row = rows[0]
  const retryAfter = Math.max(1, Math.ceil((row.expiresAt.getTime() - row.now.getTime()) / 1000))
  return { allowed: row.count <= limit, count: row.count, retryAfter }
}

/** Count one attempt and throw 429 (with retryAfter) when the limit is exceeded. */
export async function enforce(name: LimitName, subject: string): Promise<void> {
  const result = await hit(name, subject)
  if (!result.allowed) throw Errors.rateLimited(result.retryAfter)
}

/** Peek without counting (used to refuse before doing expensive work). */
export async function isLimited(name: LimitName, subject: string): Promise<RateLimitResult | null> {
  const limit = scaled(LIMITS[name].limit)
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key: `${name}:${subject}` } })
  if (!bucket || bucket.expiresAt.getTime() <= Date.now() || bucket.count < limit) return null
  return { allowed: false, count: bucket.count, retryAfter: Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000)) }
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return headers.get("x-real-ip") || "unknown"
}
