import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { v2 as cloudinary } from "cloudinary"
import { canTransition, MEDIA_RULES } from "@/lib/media/rules"
import { heicInfo, mp4Info, sniff } from "@/lib/media/sniff"
import { signMediaToken, verifyMediaToken } from "@/lib/media/tokens"
import { toCsv } from "@/lib/services/account"
import { cloudinaryConfigProblems } from "@/lib/media/provider"

function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(8 + payload.length, 0)
  header.write(type, 4, "ascii")
  return Buffer.concat([header, payload])
}

export function syntheticMp4(durationSec: number, width = 1920, height = 1080, brand = "isom"): Buffer {
  const ftyp = box("ftyp", Buffer.concat([Buffer.from(brand), Buffer.alloc(4)]))
  const mvhd = Buffer.alloc(100)
  mvhd.writeUInt32BE(1000, 12) // timescale
  mvhd.writeUInt32BE(Math.round(durationSec * 1000), 16)
  const tkhd = Buffer.alloc(84)
  tkhd.writeUInt32BE(width << 16, 76)
  tkhd.writeUInt32BE(height << 16, 80)
  const moov = box("moov", Buffer.concat([box("mvhd", mvhd), box("trak", box("tkhd", tkhd))]))
  return Buffer.concat([ftyp, moov])
}

describe("content sniffing (extensions are never trusted)", () => {
  it("identifies real types and rejects disguised ones", () => {
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg")
    expect(sniff(Buffer.from("\x89PNG\r\n\x1a\n", "latin1"))).toBe("png")
    expect(sniff(Buffer.from("RIFF0000WEBPVP8 ", "latin1"))).toBe("webp")
    expect(sniff(Buffer.from("GIF89a....", "latin1"))).toBe("gif")
    expect(sniff(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBe("svg")
    expect(sniff(Buffer.from("<!DOCTYPE html><html>"))).toBe("html")
    expect(sniff(syntheticMp4(1))).toBe("mp4")
    expect(sniff(syntheticMp4(1, 10, 10, "qt  "))).toBe("mov")
    expect(sniff(syntheticMp4(1, 10, 10, "heic"))).toBe("heic")
  })
  it("reads MP4 duration/dimensions for the 60 s boundary", () => {
    expect(mp4Info(syntheticMp4(60))).toEqual({ durationMs: 60000, width: 1920, height: 1080 })
    expect(mp4Info(syntheticMp4(60.001)).durationMs! > MEDIA_RULES.video.maxDurationMs).toBe(true)
    expect(mp4Info(Buffer.from("garbage")).durationMs).toBeNull()
    expect(heicInfo(Buffer.from("x"))).toEqual({ width: null, height: null })
  })
})

describe("media status transitions", () => {
  it("only moves forward", () => {
    expect(canTransition("PENDING", "PROCESSING")).toBe(true)
    expect(canTransition("PROCESSING", "READY")).toBe(true)
    expect(canTransition("READY", "PROCESSING")).toBe(false)
    expect(canTransition("READY", "FAILED")).toBe(false)
    expect(canTransition("FAILED", "READY")).toBe(false)
    expect(canTransition("READY", "DELETING")).toBe(true)
  })
})

describe("short-lived media tokens", () => {
  beforeEach(() => { process.env.MEDIA_URL_SECRET = "unit-test-media-secret-0123456789abcdef" })
  it("verify only for the same media, variant and unexpired time", () => {
    const exp = Math.floor(Date.now() / 1000) + 120
    const sig = signMediaToken("m1", "display", exp)
    expect(verifyMediaToken("m1", "display", exp, sig)).toBe(true)
    expect(verifyMediaToken("m2", "display", exp, sig)).toBe(false)
    expect(verifyMediaToken("m1", "poster", exp, sig)).toBe(false)
    expect(verifyMediaToken("m1", "display", exp + 1, sig)).toBe(false)
    expect(verifyMediaToken("m1", "display", exp, sig, exp + 1)).toBe(false)
  })
})

describe("Cloudinary adapter (fixture credentials, no network)", () => {
  const env = {
    CLOUDINARY_CLOUD_NAME: "daynet-test",
    CLOUDINARY_API_KEY: "123456789012345",
    CLOUDINARY_API_SECRET: "api-secret-fixture",
    CLOUDINARY_AUTH_TOKEN_KEY: "a".repeat(32) + "b".repeat(32),
    APP_ORIGIN: "https://daynet.example",
  }
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => { for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; process.env[k] = v } })
  afterEach(() => { for (const k of Object.keys(env)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] } })

  it("requires a distinct hex token key", () => {
    expect(cloudinaryConfigProblems()).toEqual([])
    process.env.CLOUDINARY_AUTH_TOKEN_KEY = env.CLOUDINARY_API_SECRET
    expect(cloudinaryConfigProblems().length).toBeGreaterThan(0)
  })

  it("signs authenticated uploads with server-chosen public ids", async () => {
    const { createCloudinaryProvider } = await import("@/lib/media/cloudinary")
    const p = createCloudinaryProvider()
    const signed = p.signUpload({ mediaId: "m1", ownerId: "u1", kind: "VIDEO", publicId: "daynet/media/u1/m1", maxBytes: 1, sessionId: "s1", expiresAt: new Date() })
    expect(signed.url).toBe("https://api.cloudinary.com/v1_1/daynet-test/video/upload")
    expect(signed.fields).toMatchObject({ type: "authenticated", public_id: "daynet/media/u1/m1", eager_async: "true", notification_url: "https://daynet.example/api/media/webhook" })
    const { signature, api_key, ...params } = signed.fields!
    void api_key
    expect(signature).toBe(cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET))
  })

  it("issues 120 s tokens bound to the transformation path (a changed path fails the HMAC)", async () => {
    const { createCloudinaryProvider } = await import("@/lib/media/cloudinary")
    const p = createCloudinaryProvider()
    const d = p.issueDelivery({ mediaId: "m1", publicId: "daynet/media/u1/m1", resourceType: "image", version: "17", kind: "IMAGE" }, "display")
    const url = new URL(d.url)
    expect(url.pathname).toContain("/image/authenticated/")
    expect(url.pathname).toContain("c_limit,h_2048,w_2048")
    const token = url.searchParams.get("__cld_token__")!
    expect(token).toMatch(/exp=\d+~hmac=[0-9a-f]{64}/)
    const exp = Number(/exp=(\d+)/.exec(token)![1])
    expect(exp - Date.now() / 1000).toBeLessThanOrEqual(121)
    const hmac = /hmac=([0-9a-f]+)/.exec(token)![1]
    const recompute = (path: string) => cloudinary.utils.generate_auth_token({ key: env.CLOUDINARY_AUTH_TOKEN_KEY, expiration: exp, url: path } as unknown as Parameters<typeof cloudinary.utils.generate_auth_token>[0])
    expect(recompute(url.pathname)).toContain(hmac)
    expect(recompute(url.pathname.replace("w_2048", "w_4096"))).not.toContain(hmac)
    const video = p.issueDelivery({ mediaId: "m2", publicId: "daynet/media/u1/m2", resourceType: "video", version: "3", kind: "VIDEO" }, "display")
    expect(video.url).toMatch(/\/video\/authenticated\/.*vc_h264.*\.mp4\?__cld_token__=/)
  })

  it("verifies webhook signatures with a 5 minute window", async () => {
    const { createCloudinaryProvider } = await import("@/lib/media/cloudinary")
    const p = createCloudinaryProvider()
    const body = JSON.stringify({ notification_type: "eager", public_id: "daynet/media/u1/m1", eager: [{ secure_url: "x" }] })
    const ts = Math.floor(Date.now() / 1000)
    const sig = createHash("sha1").update(body + ts + env.CLOUDINARY_API_SECRET).digest("hex")
    const ok = await p.verifyWebhook(body, new Headers({ "x-cld-timestamp": String(ts), "x-cld-signature": sig }))
    expect(ok).toMatchObject({ publicId: "daynet/media/u1/m1", outcome: "READY" })
    expect(await p.verifyWebhook(body, new Headers({ "x-cld-timestamp": String(ts), "x-cld-signature": "0".repeat(40) }))).toBeNull()
    const old = ts - 301
    const oldSig = createHash("sha1").update(body + old + env.CLOUDINARY_API_SECRET).digest("hex")
    expect(await p.verifyWebhook(body, new Headers({ "x-cld-timestamp": String(old), "x-cld-signature": oldSig }))).toBeNull()
    expect(await p.verifyWebhook(body.replace("m1", "m2"), new Headers({ "x-cld-timestamp": String(ts), "x-cld-signature": sig }))).toBeNull()
  })

  it("rejects a forged upload response before any network call", async () => {
    const { createCloudinaryProvider } = await import("@/lib/media/cloudinary")
    const p = createCloudinaryProvider()
    await expect(p.verifyUpload({ publicId: "daynet/media/u1/m1", kind: "IMAGE", clientResult: { public_id: "daynet/media/u1/m1", version: 1, signature: "forged" } })).rejects.toMatchObject({ code: "UPLOAD_SIGNATURE_INVALID" })
    await expect(p.verifyUpload({ publicId: "daynet/media/u1/m1", kind: "IMAGE", clientResult: { public_id: "daynet/media/OTHER/m9", version: 1, signature: "x" } })).rejects.toMatchObject({ code: "UPLOAD_RESULT_INVALID" })
  })
})

describe("CSV export", () => {
  it("is UTF-8 with BOM and neutralises formula injection", () => {
    const csv = toCsv([{ a: "=HYPERLINK(\"x\")", b: "日本語,カンマ", c: "+1" }])
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain('"日本語,カンマ"')
    expect(csv).toContain("'+1")
  })
})
