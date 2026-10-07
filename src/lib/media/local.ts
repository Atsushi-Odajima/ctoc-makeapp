import { createHmac, timingSafeEqual } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"
import { MEDIA_RULES } from "./rules"
import { heicInfo, mp4Info, sniff } from "./sniff"
import { signMediaToken } from "./tokens"
import {
  MediaRejectedError,
  type Delivery, type DeliveryVariantInput, type MediaProvider, type SignUploadInput, type SignedUpload, type VerifiedAsset,
} from "./provider"

// DEVELOPMENT / E2E ONLY. Stores files under .data/media and serves short-lived HMAC URLs
// through /api/media/local-file. It refuses to load on Vercel (see selectMediaProvider).
// Limitations vs. Cloudinary: no video transcoding/poster, HEIC is rejected (no decoder).

export const LOCAL_ROOT = path.join(process.cwd(), ".data", "media")

function safeName(publicId: string) {
  if (!/^[A-Za-z0-9_\/-]+$/.test(publicId)) throw new Error("invalid publicId")
  return publicId.replace(/\//g, "__")
}
export const originalPath = (publicId: string) => path.join(LOCAL_ROOT, "originals", safeName(publicId))
export const derivedPath = (publicId: string, variant: "display" | "poster") => path.join(LOCAL_ROOT, "derived", `${safeName(publicId)}.${variant}`)

function uploadSecret() {
  const s = process.env.MEDIA_URL_SECRET
  if (!s) throw new Error("MEDIA_URL_SECRET is not configured")
  return s
}

export function localUploadToken(sessionId: string, expiresAtSec: number): string {
  return createHmac("sha256", uploadSecret()).update(`upload|${sessionId}|${expiresAtSec}`).digest("base64url")
}

export function verifyLocalUploadToken(sessionId: string, expiresAtSec: number, token: string): boolean {
  if (expiresAtSec < Date.now() / 1000) return false
  const expected = Buffer.from(localUploadToken(sessionId, expiresAtSec))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function createLocalProvider(): MediaProvider {
  return {
    name: "local",

    signUpload(input: SignUploadInput): SignedUpload {
      const exp = Math.floor(input.expiresAt.getTime() / 1000)
      return {
        url: `/api/media/local-upload/${input.sessionId}?exp=${exp}`,
        method: "PUT",
        headers: { "x-upload-token": localUploadToken(input.sessionId, exp) },
      }
    },

    async verifyUpload({ publicId, kind }): Promise<VerifiedAsset> {
      let buf: Buffer
      try {
        buf = await fs.readFile(originalPath(publicId))
      } catch {
        throw new MediaRejectedError("UPLOAD_NOT_FOUND", "アップロードされたファイルが見つかりません")
      }
      const type = sniff(buf)
      const rules = kind === "IMAGE" ? MEDIA_RULES.image : MEDIA_RULES.video
      if (buf.length > rules.maxBytes) throw new MediaRejectedError("FILE_TOO_LARGE", "ファイルが大きすぎます")

      if (kind === "IMAGE") {
        if (!["jpeg", "png", "webp", "heic"].includes(type)) throw new MediaRejectedError("UNSUPPORTED_TYPE", "JPEG・PNG・WebP・HEICの画像を選んでください")
        if (type === "heic") {
          const info = heicInfo(buf)
          throw new MediaRejectedError("HEIC_UNSUPPORTED_LOCAL", `開発用ストレージではHEICを変換できません（${info.width ?? "?"}×${info.height ?? "?"}）。本番(Cloudinary)では変換されます`)
        }
        const sharp = (await import("sharp")).default
        const meta = await sharp(buf).metadata()
        const swap = (meta.orientation ?? 1) >= 5
        const width = (swap ? meta.height : meta.width) ?? null
        const height = (swap ? meta.width : meta.height) ?? null
        if (!width || !height || width > rules.maxSide || height > rules.maxSide || width * height > MEDIA_RULES.image.maxPixels) {
          throw new MediaRejectedError("IMAGE_DIMENSIONS", "画像のサイズが大きすぎます")
        }
        await fs.mkdir(path.dirname(derivedPath(publicId, "display")), { recursive: true })
        // rotate() applies EXIF orientation; sharp drops EXIF/GPS metadata unless asked to keep it.
        await sharp(buf).rotate().resize({ width: MEDIA_RULES.image.deliveredMaxSide, height: MEDIA_RULES.image.deliveredMaxSide, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82 }).toFile(derivedPath(publicId, "display"))
        return { providerAssetId: null, publicId, resourceType: "image", deliveryType: "local", version: "1", width, height, durationMs: null, bytes: buf.length, format: type, ready: true }
      }

      if (!["mp4", "mov"].includes(type)) throw new MediaRejectedError("UNSUPPORTED_TYPE", "MP4またはMOVの動画を選んでください")
      const info = mp4Info(buf)
      if (info.durationMs === null) throw new MediaRejectedError("VIDEO_UNREADABLE", "動画の長さを読み取れませんでした")
      if (info.durationMs > MEDIA_RULES.video.maxDurationMs) throw new MediaRejectedError("VIDEO_TOO_LONG", "動画は60秒以内にしてください")
      await fs.mkdir(path.dirname(derivedPath(publicId, "display")), { recursive: true })
      await fs.copyFile(originalPath(publicId), derivedPath(publicId, "display"))
      return { providerAssetId: null, publicId, resourceType: "video", deliveryType: "local", version: "1", width: info.width, height: info.height, durationMs: info.durationMs, bytes: buf.length, format: type, ready: true }
    },

    async verifyWebhook() {
      return null
    },

    issueDelivery(input: DeliveryVariantInput, variant): Delivery {
      const expiresAt = new Date(Date.now() + MEDIA_RULES.deliveryTtlSeconds * 1000)
      const exp = Math.floor(expiresAt.getTime() / 1000)
      const sig = signMediaToken(input.mediaId, variant, exp)
      return { url: `/api/media/local-file/${input.mediaId}?variant=${variant}&exp=${exp}&sig=${sig}`, expiresAt }
    },

    async deleteAsset({ publicId }) {
      await Promise.all([
        fs.rm(originalPath(publicId), { force: true }),
        fs.rm(derivedPath(publicId, "display"), { force: true }),
        fs.rm(derivedPath(publicId, "poster"), { force: true }),
      ])
    },
  }
}
