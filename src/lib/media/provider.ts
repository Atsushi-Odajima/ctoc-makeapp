// MediaProvider boundary (spec §10). To move off Cloudinary, implement this interface and
// change selectMediaProvider(); nothing else in the app talks to the provider directly.
import type { MediaKindName } from "./rules"

export interface SignUploadInput {
  mediaId: string
  ownerId: string
  kind: MediaKindName
  publicId: string
  maxBytes: number
  sessionId: string
  expiresAt: Date
}

export interface SignedUpload {
  url: string
  method: "POST" | "PUT"
  fields?: Record<string, string> // multipart fields (POST)
  headers?: Record<string, string>
  fileField?: string
}

export interface VerifiedAsset {
  providerAssetId: string | null
  publicId: string
  resourceType: "image" | "video"
  deliveryType: string
  version: string | null
  width: number | null
  height: number | null
  durationMs: number | null
  bytes: number | null
  format: string | null
  /** false while the provider is still transcoding (video) */
  ready: boolean
}

export interface ProviderWebhookEvent {
  eventId: string
  publicId: string
  providerAssetId: string | null
  version: string | null
  outcome: "READY" | "FAILED" | "IGNORED"
  errorCode?: string
}

export interface DeliveryVariantInput {
  mediaId: string
  publicId: string
  resourceType: "image" | "video"
  version: string | null
  kind: MediaKindName
}

export interface Delivery {
  url: string
  expiresAt: Date
}

export interface MediaProvider {
  readonly name: "cloudinary" | "local"
  signUpload(input: SignUploadInput): SignedUpload
  /** Server-side confirmation: never trusts width/duration/bytes from the client. */
  verifyUpload(input: { publicId: string; kind: MediaKindName; clientResult: unknown }): Promise<VerifiedAsset>
  /** Returns null when the signature/timestamp is invalid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderWebhookEvent | null>
  issueDelivery(input: DeliveryVariantInput, variant: "display" | "poster"): Delivery
  deleteAsset(input: { publicId: string; resourceType: string; deliveryType: string }): Promise<void>
}

export class MediaUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MediaUnavailableError"
  }
}

export class MediaRejectedError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "MediaRejectedError"
  }
}

export type MediaProviderName = "cloudinary" | "local"

/**
 * Which provider is active. There is deliberately NO silent fallback to public or permanently
 * signed URLs: if Cloudinary token delivery is not configured, uploads are refused (503).
 * The local provider exists only for development/E2E and refuses to run on Vercel.
 */
export function configuredProviderName(): MediaProviderName {
  return process.env.MEDIA_PROVIDER === "local" ? "local" : "cloudinary"
}

export function cloudinaryConfigProblems(): string[] {
  const missing: string[] = []
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_AUTH_TOKEN_KEY"]) {
    if (!process.env[key]) missing.push(key)
  }
  if (process.env.CLOUDINARY_AUTH_TOKEN_KEY && process.env.CLOUDINARY_AUTH_TOKEN_KEY === process.env.CLOUDINARY_API_SECRET) {
    missing.push("CLOUDINARY_AUTH_TOKEN_KEY must differ from CLOUDINARY_API_SECRET")
  }
  if (process.env.CLOUDINARY_AUTH_TOKEN_KEY && !/^[0-9a-fA-F]{32,}$/.test(process.env.CLOUDINARY_AUTH_TOKEN_KEY)) {
    missing.push("CLOUDINARY_AUTH_TOKEN_KEY must be the hex token key from the Cloudinary console")
  }
  return missing
}

export async function selectMediaProvider(): Promise<MediaProvider> {
  if (configuredProviderName() === "local") {
    if (process.env.VERCEL) throw new MediaUnavailableError("MEDIA_PROVIDER=local is not allowed on Vercel")
    const { createLocalProvider } = await import("./local")
    return createLocalProvider()
  }
  const problems = cloudinaryConfigProblems()
  if (problems.length) throw new MediaUnavailableError(`Cloudinary token delivery is not configured: ${problems.join(", ")}`)
  const { createCloudinaryProvider } = await import("./cloudinary")
  return createCloudinaryProvider()
}
