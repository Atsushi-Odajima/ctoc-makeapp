import { createHmac, timingSafeEqual } from "node:crypto"

// Short-lived HMAC URLs used for (a) the local development provider and (b) legacy public
// images that have not been migrated yet. Issued only after an ACL check.

function secret(): string {
  const value = process.env.MEDIA_URL_SECRET
  if (!value || value.length < 32) throw new Error("MEDIA_URL_SECRET is not configured")
  return value
}

export function signMediaToken(mediaId: string, variant: string, expiresAtSec: number): string {
  return createHmac("sha256", secret()).update(`${mediaId}|${variant}|${expiresAtSec}`).digest("base64url")
}

export function verifyMediaToken(mediaId: string, variant: string, expiresAtSec: number, signature: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!Number.isInteger(expiresAtSec) || expiresAtSec < nowSec) return false
  const expected = Buffer.from(signMediaToken(mediaId, variant, expiresAtSec))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function hasMediaUrlSecret(): boolean {
  return !!process.env.MEDIA_URL_SECRET && process.env.MEDIA_URL_SECRET.length >= 32
}
