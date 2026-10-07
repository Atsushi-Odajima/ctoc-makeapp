import { createHash } from "node:crypto"
import { v2 as cloudinary } from "cloudinary"
import { MEDIA_RULES } from "./rules"
import {
  MediaRejectedError, MediaUnavailableError,
  type Delivery, type DeliveryVariantInput, type MediaProvider, type ProviderWebhookEvent,
  type SignUploadInput, type SignedUpload, type VerifiedAsset,
} from "./provider"

// Cloudinary adapter.
//  * uploads are `type: authenticated` (never public `upload`), signed by the server
//  * delivery uses token-based CDN access: URL-specific HMAC token valid for 120 s, bound to the
//    exact transformation path (changing the transformation invalidates the token)
//  * originals are never delivered; every URL carries a transformation (which also drops EXIF/GPS)
//  * NO fallback to public URLs, permanent signed URLs or private_download_url.
// Token-based access requires a Cloudinary plan/feature that must be enabled per environment.

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

const IMAGE_DISPLAY = [
  { crop: "limit", width: MEDIA_RULES.image.deliveredMaxSide, height: MEDIA_RULES.image.deliveredMaxSide },
  { fetch_format: "auto", quality: "auto" },
]
const VIDEO_DISPLAY = [
  { crop: "limit", width: MEDIA_RULES.video.deliveredMaxSide, height: MEDIA_RULES.video.deliveredMaxSide, video_codec: "h264", audio_codec: "aac" },
]
const VIDEO_POSTER = [
  { start_offset: "0", crop: "limit", width: 1280, height: 1280 },
]

export function videoEagerTransformation(): string {
  return `${cloudinary.utils.generate_transformation_string(VIDEO_DISPLAY.map(t => ({ ...t })))}/mp4`
}

function webhookUrl(): string | undefined {
  const origin = process.env.APP_ORIGIN
  return origin ? `${origin.replace(/\/$/, "")}/api/media/webhook` : undefined
}

export function createCloudinaryProvider(): MediaProvider {
  configure()
  const apiSecret = process.env.CLOUDINARY_API_SECRET!
  const tokenKey = process.env.CLOUDINARY_AUTH_TOKEN_KEY!
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!
  const apiKey = process.env.CLOUDINARY_API_KEY!

  return {
    name: "cloudinary",

    signUpload(input: SignUploadInput): SignedUpload {
      const resourceType = input.kind === "IMAGE" ? "image" : "video"
      const params: Record<string, string | number | boolean> = {
        timestamp: Math.floor(Date.now() / 1000),
        public_id: input.publicId,
        type: "authenticated",
        overwrite: false,
        unique_filename: false,
        allowed_formats: (input.kind === "IMAGE" ? MEDIA_RULES.image.formats : MEDIA_RULES.video.formats).join(","),
      }
      const notify = webhookUrl()
      if (notify) params.notification_url = notify
      if (input.kind === "VIDEO") {
        params.eager = videoEagerTransformation()
        params.eager_async = true
        if (notify) params.eager_notification_url = notify
      }
      const signature = cloudinary.utils.api_sign_request(params, apiSecret)
      const fields: Record<string, string> = { api_key: apiKey, signature }
      for (const [k, v] of Object.entries(params)) fields[k] = String(v)
      return {
        url: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        method: "POST",
        fields,
        fileField: "file",
      }
    },

    async verifyUpload({ publicId, kind, clientResult }): Promise<VerifiedAsset> {
      const result = (clientResult ?? {}) as { public_id?: unknown; version?: unknown; signature?: unknown }
      if (result.public_id !== publicId || typeof result.signature !== "string" || result.version === undefined) {
        throw new MediaRejectedError("UPLOAD_RESULT_INVALID", "アップロード結果を確認できませんでした")
      }
      // verify_api_response_signature exists in the SDK (lib/utils/index.js) but is missing from its typings.
      const utils = cloudinary.utils as unknown as { verify_api_response_signature(p: string, v: string, s: string): boolean }
      const signatureOk = utils.verify_api_response_signature(publicId, String(result.version), result.signature)
      if (!signatureOk) throw new MediaRejectedError("UPLOAD_SIGNATURE_INVALID", "アップロード結果の署名が一致しません")

      const resourceType = kind === "IMAGE" ? "image" : "video"
      let resource: Record<string, unknown>
      try {
        resource = await cloudinary.api.resource(publicId, { resource_type: resourceType, type: "authenticated" })
      } catch {
        throw new MediaUnavailableError("Cloudinary resource lookup failed")
      }
      const derived = Array.isArray(resource.derived) ? resource.derived : []
      return {
        providerAssetId: typeof resource.asset_id === "string" ? resource.asset_id : null,
        publicId,
        resourceType,
        deliveryType: "authenticated",
        version: resource.version !== undefined ? String(resource.version) : null,
        width: typeof resource.width === "number" ? resource.width : null,
        height: typeof resource.height === "number" ? resource.height : null,
        durationMs: typeof resource.duration === "number" ? Math.round(resource.duration * 1000) : null,
        bytes: typeof resource.bytes === "number" ? resource.bytes : null,
        format: typeof resource.format === "string" ? resource.format.toLowerCase() : null,
        ready: kind === "IMAGE" ? true : derived.length > 0,
      }
    },

    async verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderWebhookEvent | null> {
      const timestamp = Number(headers.get("x-cld-timestamp"))
      const signature = headers.get("x-cld-signature") || ""
      if (!Number.isFinite(timestamp) || !signature) return null
      // 5 minute tolerance on both sides.
      if (Math.abs(Date.now() / 1000 - timestamp) > 300) return null
      const valid = cloudinary.utils.verifyNotificationSignature(rawBody, timestamp, signature, 300)
      if (!valid) return null
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(rawBody)
      } catch {
        return null
      }
      const publicId = typeof payload.public_id === "string" ? payload.public_id : ""
      const type = payload.notification_type
      const failed = payload.status === "failed" || typeof payload.error === "object"
      let outcome: ProviderWebhookEvent["outcome"] = "IGNORED"
      if (type === "eager") outcome = failed ? "FAILED" : (Array.isArray(payload.eager) && payload.eager.length > 0 ? "READY" : "IGNORED")
      return {
        eventId: `cld_${createHash("sha256").update(rawBody).digest("hex")}`,
        publicId,
        providerAssetId: typeof payload.asset_id === "string" ? payload.asset_id : null,
        version: payload.version !== undefined ? String(payload.version) : null,
        outcome,
        errorCode: failed ? "TRANSCODE_FAILED" : undefined,
      }
    },

    issueDelivery(input: DeliveryVariantInput, variant): Delivery {
      const expiresAt = new Date(Date.now() + MEDIA_RULES.deliveryTtlSeconds * 1000)
      const common = {
        type: "authenticated",
        sign_url: true,
        secure: true,
        version: input.version ?? undefined,
        auth_token: { key: tokenKey, duration: MEDIA_RULES.deliveryTtlSeconds },
      }
      let url: string
      if (input.resourceType === "video") {
        url = variant === "poster"
          ? cloudinary.url(input.publicId, { ...common, resource_type: "video", format: "jpg", transformation: VIDEO_POSTER })
          : cloudinary.url(input.publicId, { ...common, resource_type: "video", format: "mp4", transformation: VIDEO_DISPLAY })
      } else {
        url = cloudinary.url(input.publicId, { ...common, resource_type: "image", transformation: IMAGE_DISPLAY })
      }
      return { url, expiresAt }
    },

    async deleteAsset({ publicId, resourceType, deliveryType }) {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType, invalidate: true })
      if (result?.result !== "ok" && result?.result !== "not found") {
        throw new Error(`destroy failed: ${String(result?.result)}`)
      }
    },
  }
}
