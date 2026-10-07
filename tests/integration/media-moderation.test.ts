import { beforeEach, describe, expect, it } from "vitest"
import sharp from "sharp"
import { prisma } from "@/lib/db"
import { call, createUser, follow, makePost, resetDb, signInAs } from "../helpers/api"
import * as signRoute from "@/app/api/media/sign/route"
import * as completeRoute from "@/app/api/media/complete/route"
import * as deliveryRoute from "@/app/api/media/[id]/delivery/route"
import * as localUploadRoute from "@/app/api/media/local-upload/[sessionId]/route"
import * as localFileRoute from "@/app/api/media/local-file/[id]/route"
import * as legacyFileRoute from "@/app/api/media/[id]/file/route"
import * as postsRoute from "@/app/api/posts/route"
import * as postRoute from "@/app/api/posts/[id]/route"
import * as reportsRoute from "@/app/api/reports/route"
import * as modReportsRoute from "@/app/api/moderation/reports/route"
import * as modActionsRoute from "@/app/api/moderation/actions/route"
import * as cronMediaRoute from "@/app/api/cron/media/route"
import { applyWebhookEvent } from "@/lib/services/media"
import { canViewPostPure } from "@/lib/policies/posts"
import { visiblePostWhere } from "@/lib/policies/posts"

beforeEach(async () => {
  await resetDb()
  signInAs(null)
})

async function jpegWithGps(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 239, g: 124, b: 104 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "DayNetTestCam" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "35/1 40/1 0/1" } })
    .toBuffer()
}

async function uploadImage(userId: string, bytes?: Buffer) {
  signInAs(userId)
  const body = bytes ?? (await jpegWithGps())
  const sign = await call(signRoute.POST, { method: "POST", body: { kind: "IMAGE", mimeType: "image/jpeg", bytes: body.length } })
  expect(sign.status).toBe(201)
  const data = sign.json.data as { mediaId: string; upload: { url: string; headers: Record<string, string> } }
  const url = new URL(data.upload.url, "http://localhost:3000")
  const sessionId = url.pathname.split("/").pop()!
  const put = await localUploadRoute.PUT(
    new Request(url, { method: "PUT", headers: data.upload.headers, body: new Uint8Array(body) }),
    { params: Promise.resolve({ sessionId }) },
  )
  expect(put.status).toBe(200)
  const done = await call(completeRoute.POST, { method: "POST", body: { mediaId: data.mediaId } })
  return { mediaId: data.mediaId, complete: done }
}

describe("Media upload and ACL delivery (local provider)", () => {
  it("uploads, verifies server-side, strips EXIF/GPS from the delivered file, and serves only via ACL", async () => {
    const owner = await createUser({ isPrivate: true })
    const fan = await createUser()
    const stranger = await createUser()
    await follow(fan.id, owner.id)
    const { mediaId, complete } = await uploadImage(owner.id)
    expect(complete.status).toBe(200)
    const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })
    expect(media).toMatchObject({ status: "READY", width: 64, height: 48 })

    // Before the post is published, only the owner can read the media.
    signInAs(fan.id)
    expect((await call(deliveryRoute.GET, { params: { id: mediaId } })).status).toBe(404)

    signInAs(owner.id)
    const post = await call(postsRoute.POST, { method: "POST", body: { caption: "花", mediaIds: [mediaId], altTexts: { [mediaId]: "オレンジの花" } } })
    expect(post.status).toBe(201)
    const dto = post.json.data as { id: string; kind: string; media: Array<{ deliveryUrl: string; expiresAt: string; altText: string }> }
    expect(dto.kind).toBe("PHOTO")
    expect(dto.media[0]!.altText).toBe("オレンジの花")
    expect(JSON.stringify(post.json)).not.toContain("daynet/media") // no provider public id in DTOs

    signInAs(stranger.id)
    expect((await call(deliveryRoute.GET, { params: { id: mediaId } })).status).toBe(404)
    signInAs(fan.id)
    const delivery = await call(deliveryRoute.GET, { params: { id: mediaId } })
    expect(delivery.status).toBe(200)
    const { deliveryUrl, expiresAt } = delivery.json.data as { deliveryUrl: string; expiresAt: string }
    expect(new Date(expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(121_000)

    const fileUrl = new URL(deliveryUrl, "http://localhost:3000")
    const file = await localFileRoute.GET(new Request(fileUrl), { params: Promise.resolve({ id: mediaId }) })
    expect(file.status).toBe(200)
    const served = Buffer.from(await file.arrayBuffer())
    const meta = await sharp(served).metadata()
    expect(meta.exif).toBeUndefined()
    expect(served.includes(Buffer.from("DayNetTestCam"))).toBe(false)

    // Tampered or expired tokens are refused.
    fileUrl.searchParams.set("sig", "x" + fileUrl.searchParams.get("sig")!.slice(1))
    expect((await localFileRoute.GET(new Request(fileUrl), { params: Promise.resolve({ id: mediaId }) })).status).toBe(404)
    const expired = new URL(deliveryUrl, "http://localhost:3000")
    expired.searchParams.set("exp", String(Math.floor(Date.now() / 1000) - 5))
    expect((await localFileRoute.GET(new Request(expired), { params: Promise.resolve({ id: mediaId }) })).status).toBe(404)
  })

  it("rejects attaching another user's media and media that are not READY", async () => {
    const alice = await createUser()
    const mallory = await createUser()
    const { mediaId } = await uploadImage(alice.id)
    signInAs(mallory.id)
    const res = await call(postsRoute.POST, { method: "POST", body: { caption: "盗用", mediaIds: [mediaId] } })
    expect(res.status).toBe(422)
    expect(res.json.error?.code).toBe("MEDIA_NOT_ATTACHABLE")
    expect(await prisma.media.count({ where: { id: mediaId, postId: { not: null } } })).toBe(0)

    signInAs(alice.id)
    const pending = await call(signRoute.POST, { method: "POST", body: { kind: "IMAGE", mimeType: "image/png", bytes: 100 } })
    const pendingId = (pending.json.data as { mediaId: string }).mediaId
    expect((await call(postsRoute.POST, { method: "POST", body: { mediaIds: [pendingId] } })).json.error?.code).toBe("MEDIA_NOT_READY")
  })

  it("rejects disguised files (SVG/HTML/GIF), oversize declarations and unsupported MIME types", async () => {
    const user = await createUser()
    signInAs(user.id)
    expect((await call(signRoute.POST, { method: "POST", body: { kind: "IMAGE", mimeType: "image/gif", bytes: 10 } })).status).toBe(422)
    expect((await call(signRoute.POST, { method: "POST", body: { kind: "IMAGE", mimeType: "image/svg+xml", bytes: 10 } })).status).toBe(422)
    expect((await call(signRoute.POST, { method: "POST", body: { kind: "IMAGE", mimeType: "image/jpeg", bytes: 21 * 1024 * 1024 } })).status).toBe(413)
    expect((await call(signRoute.POST, { method: "POST", body: { kind: "VIDEO", mimeType: "video/mp4", bytes: 101 * 1024 * 1024 } })).status).toBe(413)
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const { complete } = await uploadImage(user.id, svg)
    expect(complete.status).toBe(422)
    expect(complete.json.error?.code).toBe("UNSUPPORTED_TYPE")
  })

  it("webhook events are deduplicated, owner-checked and never move status backwards", async () => {
    const owner = await createUser()
    signInAs(owner.id)
    const sign = await call(signRoute.POST, { method: "POST", body: { kind: "VIDEO", mimeType: "video/mp4", bytes: 1000 } })
    const mediaId = (sign.json.data as { mediaId: string }).mediaId
    const media = await prisma.media.update({ where: { id: mediaId }, data: { status: "PROCESSING", version: "100" } })
    const ev = { eventId: "evt-1", publicId: media.providerPublicId!, providerAssetId: null, version: "100", outcome: "READY" as const }
    expect(await applyWebhookEvent(ev)).toBe("applied")
    expect(await applyWebhookEvent(ev)).toBe("duplicate")
    expect(await applyWebhookEvent({ ...ev, eventId: "evt-2", outcome: "FAILED" })).toBe("ignored") // READY cannot go back
    expect((await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("READY")
    expect(await applyWebhookEvent({ ...ev, eventId: "evt-3", publicId: "daynet/media/someone-else/forged" })).toBe("unknown")
  })

  it("legacy public images are served only through a short-lived token after the ACL check", async () => {
    const owner = await createUser({ isPrivate: true })
    const post = await makePost(owner.id, { visibility: "FOLLOWERS" })
    const legacy = await prisma.media.create({ data: { ownerId: owner.id, postId: post.id, kind: "IMAGE", provider: "legacy-url", deliveryType: "upload", status: "READY", legacyUrl: "https://res.cloudinary.com/demo/image/upload/v1/feeld/x.jpg" } })
    const stranger = await createUser()
    signInAs(stranger.id)
    expect((await call(deliveryRoute.GET, { params: { id: legacy.id } })).status).toBe(404)
    signInAs(owner.id)
    const d = (await call(deliveryRoute.GET, { params: { id: legacy.id } })).json.data as { deliveryUrl: string; legacyPublic: boolean }
    expect(d.legacyPublic).toBe(true)
    expect(d.deliveryUrl).not.toContain("res.cloudinary.com")
    const redirect = await legacyFileRoute.GET(new Request(new URL(d.deliveryUrl, "http://localhost:3000")), { params: Promise.resolve({ id: legacy.id }) })
    expect(redirect.status).toBe(302)
    const forged = await legacyFileRoute.GET(new Request(`http://localhost:3000/api/media/${legacy.id}/file?variant=display&exp=9999999999&sig=forged`), { params: Promise.resolve({ id: legacy.id }) })
    expect(forged.status).toBe(404)
  })

  it("deleting a post queues provider deletion; the cron job removes the asset (signed cron only)", async () => {
    const owner = await createUser()
    const { mediaId } = await uploadImage(owner.id)
    signInAs(owner.id)
    const post = await call(postsRoute.POST, { method: "POST", body: { mediaIds: [mediaId] } })
    await call(postRoute.DELETE, { method: "DELETE", params: { id: (post.json.data as { id: string }).id } })
    expect((await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })).status).toBe("DELETING")
    expect((await cronMediaRoute.GET(new Request("http://localhost/api/cron/media"))).status).toBe(404)
    const ok = await cronMediaRoute.GET(new Request("http://localhost/api/cron/media", { headers: { authorization: "Bearer integration-test-cron-secret" } }))
    expect(ok.status).toBe(200)
    expect(await prisma.media.count({ where: { id: mediaId } })).toBe(0)
    expect(await prisma.mediaDeletionJob.count({ where: { doneAt: { not: null } } })).toBe(1)
  })
})

describe("AC-S: reports and moderation", () => {
  it("users cannot reach the moderation queue (even about themselves); moderators hide/restore with an immutable audit log", async () => {
    const author = await createUser()
    const reporter = await createUser()
    const mod = await createUser({ role: "MODERATOR" })
    const post = await makePost(author.id, { caption: "問題の投稿" })
    signInAs(reporter.id)
    const report = await call(reportsRoute.POST, { method: "POST", body: { targetType: "POST", targetId: post.id, reasonCode: "spam", detail: "宣伝です" } })
    expect(report.status).toBe(201)
    signInAs(author.id)
    await call(reportsRoute.POST, { method: "POST", body: { targetType: "USER", targetId: reporter.id, reasonCode: "harassment" } })
    for (const who of [reporter.id, author.id]) {
      signInAs(who)
      expect((await call(modReportsRoute.GET, { path: "/api/moderation/reports" })).status).toBe(404)
      expect((await call(modActionsRoute.POST, { method: "POST", body: { targetType: "POST", targetId: post.id, action: "restore", reason: "x" } })).status).toBe(404)
    }
    signInAs(mod.id)
    const queue = await call(modReportsRoute.GET, { path: "/api/moderation/reports" })
    expect((queue.json.data as unknown[]).length).toBe(2)
    const reportId = (report.json.data as { id: string }).id
    expect((await call(modActionsRoute.POST, { method: "POST", body: { reportId, targetType: "POST", targetId: post.id, action: "hide", reason: "スパム" } })).status).toBe(201)
    signInAs(reporter.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(404)
    signInAs(author.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).json.data).toMatchObject({ hidden: true })
    signInAs(mod.id)
    await call(modActionsRoute.POST, { method: "POST", body: { targetType: "POST", targetId: post.id, action: "restore", reason: "誤判定" } })
    signInAs(reporter.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(200)
    expect(await prisma.moderationAction.count()).toBe(2)
    await expect(prisma.moderationAction.updateMany({ data: { reason: "改ざん" } })).rejects.toThrow()
    await expect(prisma.moderationAction.deleteMany({})).rejects.toThrow()
    expect((await prisma.report.findUniqueOrThrow({ where: { id: reportId } })).state).toBe("RESOLVED")
  })

  it("only participants may report a DM message", async () => {
    const a = await createUser()
    const b = await createUser()
    const c = await createUser()
    const conv = await prisma.conversation.create({ data: { pairKey: [a.id, b.id].sort().join(":"), participants: { create: [{ userId: a.id }, { userId: b.id }] } } })
    const msg = await prisma.directMessage.create({ data: { conversationId: conv.id, senderId: a.id, content: "やあ" } })
    signInAs(c.id)
    expect((await call(reportsRoute.POST, { method: "POST", body: { targetType: "MESSAGE", targetId: msg.id, reasonCode: "spam" } })).status).toBe(404)
    signInAs(b.id)
    expect((await call(reportsRoute.POST, { method: "POST", body: { targetType: "MESSAGE", targetId: msg.id, reasonCode: "spam" } })).status).toBe(201)
  })
})

describe("ACL cross-check: SQL filter == pure rule", () => {
  it("agrees for every viewer × post combination in a generated world", async () => {
    const users = await Promise.all([
      createUser(), createUser({ isPrivate: true }), createUser(), createUser({ isPrivate: true }), createUser(),
    ])
    const [u0, u1, u2, u3, u4] = users
    await follow(u2.id, u1.id, "ACCEPTED")
    await follow(u4.id, u1.id, "PENDING")
    await follow(u0.id, u3.id, "ACCEPTED")
    await prisma.block.create({ data: { blockerId: u3.id, blockedId: u2.id } })
    const pub = await prisma.community.create({ data: { slug: "pub", name: "pub", description: "d", category: "c", members: { create: [{ userId: u0.id, role: "OWNER" }] } } })
    const priv = await prisma.community.create({ data: { slug: "priv", name: "priv", description: "d", category: "c", isPrivate: true, members: { create: [{ userId: u1.id, role: "OWNER" }, { userId: u2.id, status: "ACTIVE" }, { userId: u4.id, status: "PENDING" }] } } })
    const posts = []
    for (const author of users) {
      for (const visibility of ["PUBLIC", "FOLLOWERS"] as const) posts.push(await makePost(author.id, { visibility }))
      posts.push(await makePost(author.id, { communityId: pub.id }))
      posts.push(await makePost(author.id, { communityId: priv.id }))
      posts.push(await makePost(author.id, { status: "DRAFT" }))
    }
    const hidden = await makePost(u0.id)
    await prisma.post.update({ where: { id: hidden.id }, data: { hiddenAt: new Date() } })
    posts.push({ ...hidden, hiddenAt: new Date() })
    await prisma.user.update({ where: { id: u4.id }, data: { status: "SUSPENDED" } })

    const allPosts = await prisma.post.findMany({ include: { user: true, community: { include: { members: true } } } })
    const follows = await prisma.follow.findMany()
    const blocks = await prisma.block.findMany()
    for (const viewer of [null, ...users.map(u => u.id)]) {
      const sql = new Set((await prisma.post.findMany({ where: visiblePostWhere(viewer), select: { id: true } })).map(p => p.id))
      for (const p of allPosts) {
        const expected = canViewPostPure({
          viewerId: viewer,
          post: p,
          author: { isPrivate: p.user.isPrivate, status: p.user.status },
          community: p.community ? { isPrivate: p.community.isPrivate } : null,
          viewer: {
            followsAuthorAccepted: !!viewer && follows.some(f => f.followerId === viewer && f.followingId === p.userId && f.status === "ACCEPTED"),
            activeCommunityMember: !!viewer && !!p.community?.members.some(m => m.userId === viewer && m.status === "ACTIVE"),
            blockedEitherWay: !!viewer && blocks.some(b => (b.blockerId === viewer && b.blockedId === p.userId) || (b.blockedId === viewer && b.blockerId === p.userId)),
          },
        })
        // The SQL list filter excludes the owner's own unpublished/hidden posts (they are fetched separately).
        const ownerOnlyCase = viewer === p.userId && (p.status !== "PUBLISHED" || !!p.hiddenAt)
        if (ownerOnlyCase) continue
        expect(sql.has(p.id), `viewer=${users.findIndex(u => u.id === viewer)} author=${users.findIndex(u => u.id === p.userId)} status=${p.status} vis=${p.visibility} community=${p.community?.slug} hidden=${!!p.hiddenAt}`).toBe(expected)
      }
    }
  })
})
