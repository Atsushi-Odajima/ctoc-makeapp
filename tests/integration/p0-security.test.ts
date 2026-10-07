import { beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/db"
import { call, createUser, follow, ids, makePost, resetDb, signInAs } from "../helpers/api"
import * as dmRoute from "@/app/api/dm/route"
import * as dmIdRoute from "@/app/api/dm/[id]/route"
import * as dmAccept from "@/app/api/dm/[id]/accept/route"
import * as dmRead from "@/app/api/dm/[id]/read/route"
import * as userRoute from "@/app/api/users/[username]/route"
import * as userPostsRoute from "@/app/api/users/[username]/posts/route"
import * as profileRoute from "@/app/api/profile/route"
import * as introRoute from "@/app/api/profile/introduction/route"
import * as postsRoute from "@/app/api/posts/route"
import * as postRoute from "@/app/api/posts/[id]/route"
import * as feedRoute from "@/app/api/feed/route"
import * as searchRoute from "@/app/api/search/route"
import * as homeRoute from "@/app/api/home/route"
import * as notificationsRoute from "@/app/api/notifications/route"
import * as commentsRoute from "@/app/api/posts/[id]/comments/route"
import * as likeRoute from "@/app/api/posts/[id]/like/route"
import * as empathyRoute from "@/app/api/posts/[id]/empathy/route"
import * as followRoute from "@/app/api/follow/[id]/route"
import * as blockRoute from "@/app/api/blocks/[id]/route"
import * as bookmarksRoute from "@/app/api/bookmarks/route"
import * as bookmarkRoute from "@/app/api/posts/[id]/bookmark/route"

beforeEach(async () => {
  await resetDb()
  signInAs(null)
})

describe("AC-F: DM participant check", () => {
  it("a non-participant cannot post into, read, accept or mark-read another pair's conversation", async () => {
    const a = await createUser()
    const b = await createUser()
    const c = await createUser()
    await follow(b.id, c.id)
    await follow(c.id, b.id)
    signInAs(b.id)
    const start = await call(dmRoute.POST, { method: "POST", body: { targetUserId: c.id } })
    expect(start.status).toBe(201)
    const conversationId = (start.json.data as { id: string }).id
    await call(dmIdRoute.POST, { method: "POST", params: { id: conversationId }, body: { content: "こんにちは", clientMessageId: "msg-b-0001" } })
    const before = await prisma.directMessage.count()

    signInAs(a.id)
    const post = await call(dmIdRoute.POST, { method: "POST", params: { id: conversationId }, body: { content: "割り込み", clientMessageId: "msg-a-0001" } })
    expect([403, 404]).toContain(post.status)
    expect(await prisma.directMessage.count()).toBe(before)
    expect((await call(dmIdRoute.GET, { params: { id: conversationId } })).status).toBe(404)
    expect((await call(dmAccept.POST, { method: "POST", params: { id: conversationId } })).status).toBe(404)
    expect((await call(dmRead.POST, { method: "POST", params: { id: conversationId } })).status).toBe(404)
  })

  it("conversation lookup uses the unique pairKey (same conversation from both sides, also concurrently)", async () => {
    const a = await createUser()
    const b = await createUser()
    await follow(a.id, b.id)
    await follow(b.id, a.id)
    signInAs(a.id)
    const results = await Promise.all([1, 2, 3, 4].map(() => call(dmRoute.POST, { method: "POST", body: { targetUserId: b.id } })))
    const conversationIds = new Set(results.map(r => (r.json.data as { id: string }).id))
    expect(conversationIds.size).toBe(1)
    signInAs(b.id)
    const fromB = await call(dmRoute.POST, { method: "POST", body: { targetUserId: a.id } })
    expect((fromB.json.data as { id: string }).id).toBe([...conversationIds][0])
    expect(await prisma.conversation.count()).toBe(1)
  })
})

describe("AC-G: public user DTO", () => {
  it("never contains email, password, tokens or internal flags", async () => {
    const target = await createUser({ username: "public_target" })
    await prisma.account.create({ data: { userId: target.id, type: "oauth", provider: "google", providerAccountId: "g-1", access_token: "SECRET_ACCESS", refresh_token: "SECRET_REFRESH", id_token: "SECRET_ID" } })
    const viewer = await createUser()
    for (const who of [viewer.id, null]) {
      signInAs(who)
      const res = await call(userRoute.GET, { params: { username: "public_target" } })
      expect(res.status).toBe(200)
      const text = JSON.stringify(res.json)
      for (const forbidden of ["email", "password", "SECRET_", "access_token", "refresh_token", "onboardingDone", "role", "dmPolicy", "footprintOptIn", "@example.test"]) {
        expect(text).not.toContain(forbidden)
      }
      const data = res.json.data as Record<string, unknown>
      expect(Object.keys(data).sort()).toEqual(
        ["avatar", "avatarMedia", "bio", "communities", "counts", "hobbies", "id", "isPrivate", "name", "strength", "username", "viewerRelationship", "weakness", "website"].sort(),
      )
    }
  })

  it("GET has no footprint side effect", async () => {
    const target = await createUser({ username: "fp_target", footprintOptIn: true })
    const viewer = await createUser({ footprintOptIn: true })
    signInAs(viewer.id)
    await call(userRoute.GET, { params: { username: "fp_target" } })
    expect(await prisma.footprint.count({ where: { visitedId: target.id } })).toBe(0)
  })
})

describe("AC-C: required introduction cannot be bypassed", () => {
  it("PATCH /api/profile rejects onboardingDone and other internal flags", async () => {
    const user = await createUser({ complete: false })
    signInAs(user.id)
    for (const body of [{ onboardingDone: true }, { role: "ADMIN" }, { status: "ACTIVE" }, { email: "x@y.z" }, { profileVersion: 3 }]) {
      const res = await call(profileRoute.PATCH, { method: "PATCH", body })
      expect(res.status).toBe(422)
    }
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(fresh.onboardingDone).toBe(false)
    expect(fresh.role).toBe("USER")
    expect(fresh.profileVersion).toBe(0)
  })

  it("introduction validation: missing, 2 or 4 hobbies, duplicates, wrong kind and unknown ids are 422", async () => {
    const user = await createUser({ complete: false })
    signInAs(user.id)
    const good = { strengthOptionId: "str_cafe_drawer", weaknessOptionId: "weak_mornings", hobbyOptionIds: ["hobby_cafe", "hobby_walk", "hobby_photo"] }
    const bad = [
      {},
      { ...good, strengthOptionId: undefined },
      { ...good, hobbyOptionIds: ["hobby_cafe", "hobby_walk"] },
      { ...good, hobbyOptionIds: ["hobby_cafe", "hobby_walk", "hobby_photo", "hobby_movie"] },
      { ...good, hobbyOptionIds: ["hobby_cafe", "hobby_cafe", "hobby_photo"] },
      { ...good, strengthOptionId: "weak_mornings" },
      { ...good, hobbyOptionIds: ["hobby_cafe", "hobby_walk", "str_cafe_drawer"] },
      { ...good, weaknessOptionId: "does_not_exist" },
      { ...good, onboardingDone: true },
    ]
    for (const body of bad) {
      const res = await call(introRoute.PUT, { method: "PUT", body })
      expect(res.status, JSON.stringify(body)).toBe(422)
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).profileVersion).toBe(0)
    const ok = await call(introRoute.PUT, { method: "PUT", body: good })
    expect(ok.status).toBe(200)
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { hobbies: { orderBy: { position: "asc" } } } })
    expect(after.profileVersion).toBe(1)
    expect(after.hobbies.map(h => h.optionId)).toEqual(good.hobbyOptionIds)
  })

  it("an existing user without the three items can browse but not post/comment/start DMs (PROFILE_REQUIRED)", async () => {
    const legacy = await createUser({ complete: false })
    const other = await createUser()
    const post = await makePost(other.id)
    signInAs(legacy.id)
    expect((await call(feedRoute.GET, { path: "/api/feed?tab=discover" })).status).toBe(200)
    const created = await call(postsRoute.POST, { method: "POST", body: { caption: "こんにちは" } })
    expect(created.status).toBe(403)
    expect(created.json.error?.code).toBe("PROFILE_REQUIRED")
    expect((await call(commentsRoute.POST, { method: "POST", params: { id: post.id }, body: { content: "やあ" } })).json.error?.code).toBe("PROFILE_REQUIRED")
    expect((await call(dmRoute.POST, { method: "POST", body: { targetUserId: other.id } })).json.error?.code).toBe("PROFILE_REQUIRED")
  })
})

describe("AC-E: posts of private accounts do not leak", () => {
  it("is invisible to non-followers/anonymous across every listing, and visible to accepted followers", async () => {
    const priv = await createUser({ username: "private_person", isPrivate: true })
    const stranger = await createUser()
    const fan = await createUser()
    const pending = await createUser()
    await follow(fan.id, priv.id, "ACCEPTED")
    await follow(pending.id, priv.id, "PENDING")
    const secretPublic = await makePost(priv.id, { caption: "ひみつ公開指定", visibility: "PUBLIC" })
    const secretFollowers = await makePost(priv.id, { caption: "ひみつフォロワー", visibility: "FOLLOWERS" })
    // stranger is notified about priv's post (e.g. legacy data) — the preview must not leak
    await prisma.notification.create({ data: { userId: stranger.id, type: "comment", fromUserId: priv.id, postId: secretFollowers.id, content: "ひみつ" } })
    await prisma.bookmark.create({ data: { userId: stranger.id, postId: secretPublic.id } })

    const secretIds = [secretPublic.id, secretFollowers.id]
    for (const viewer of [stranger.id, pending.id, null]) {
      signInAs(viewer)
      const responses = [
        await call(feedRoute.GET, { path: "/api/feed?tab=following" }),
        await call(feedRoute.GET, { path: "/api/feed?tab=discover" }),
        await call(postsRoute.GET, { path: "/api/posts?author=private_person" }),
        await call(postsRoute.GET, { path: "/api/posts" }),
        await call(userPostsRoute.GET, { path: "/api/users/private_person/posts", params: { username: "private_person" } }),
        await call(searchRoute.GET, { path: "/api/search?q=ひみつ" }),
        await call(homeRoute.GET),
      ]
      for (const res of responses) expect(JSON.stringify(res.json)).not.toContain("ひみつ")
      for (const id of secretIds) expect((await call(postRoute.GET, { params: { id } })).status).toBe(404)
      if (viewer) {
        const notifications = await call(notificationsRoute.GET, { path: "/api/notifications" })
        expect(JSON.stringify(notifications.json)).not.toContain(secretFollowers.id)
        expect(JSON.stringify(notifications.json)).not.toContain("ひみつ")
        expect(JSON.stringify((await call(bookmarksRoute.GET, { path: "/api/bookmarks" })).json)).not.toContain("ひみつ")
        expect((await call(likeRoute.PUT, { method: "PUT", params: { id: secretPublic.id } })).status).toBe(404)
        expect((await call(commentsRoute.GET, { params: { id: secretPublic.id } })).status).toBe(404)
      }
      const profile = await call(userRoute.GET, { params: { username: "private_person" } })
      expect(profile.status).toBe(200) // name/bio/3 items are public by design
      expect((profile.json.data as { counts: { posts: number } }).counts.posts).toBe(0)
    }

    signInAs(fan.id)
    const fanFeed = await call(feedRoute.GET, { path: "/api/feed?tab=following" })
    expect(ids(fanFeed.json.data).sort()).toEqual(secretIds.sort())
    expect((await call(postRoute.GET, { params: { id: secretPublic.id } })).status).toBe(200)
  })

  it("a PUBLIC request from a private account is stored as FOLLOWERS", async () => {
    const priv = await createUser({ isPrivate: true })
    signInAs(priv.id)
    const res = await call(postsRoute.POST, { method: "POST", body: { caption: "日記", visibility: "PUBLIC" } })
    expect(res.status).toBe(201)
    expect((res.json.data as { visibility: string }).visibility).toBe("FOLLOWERS")
  })
})

describe("AC-G: block", () => {
  it("removes follows both ways and rejects new reactions, replies, follows and DMs in both directions", async () => {
    const a = await createUser()
    const b = await createUser()
    await follow(a.id, b.id)
    await follow(b.id, a.id)
    const postA = await makePost(a.id)
    const postB = await makePost(b.id)
    signInAs(a.id)
    expect((await call(blockRoute.PUT, { method: "PUT", params: { id: b.id } })).status).toBe(200)
    expect(await prisma.follow.count()).toBe(0)

    for (const [viewer, target, post] of [[a.id, b.id, postB.id], [b.id, a.id, postA.id]] as const) {
      signInAs(viewer)
      expect([403, 404]).toContain((await call(likeRoute.PUT, { method: "PUT", params: { id: post } })).status)
      expect([403, 404]).toContain((await call(empathyRoute.PUT, { method: "PUT", params: { id: post } })).status)
      expect([403, 404]).toContain((await call(bookmarkRoute.PUT, { method: "PUT", params: { id: post } })).status)
      expect([403, 404]).toContain((await call(commentsRoute.POST, { method: "POST", params: { id: post }, body: { content: "やあ" } })).status)
      expect([403, 404]).toContain((await call(followRoute.PUT, { method: "PUT", params: { id: target } })).status)
      expect([403, 404]).toContain((await call(dmRoute.POST, { method: "POST", body: { targetUserId: target } })).status)
      const feed = await call(feedRoute.GET, { path: "/api/feed?tab=discover" })
      expect(ids(feed.json.data)).not.toContain(post)
    }
    expect(await prisma.like.count()).toBe(0)
    expect(await prisma.comment.count()).toBe(0)
    expect(await prisma.conversation.count()).toBe(0)
  })

  it("blocks an existing conversation from continuing", async () => {
    const a = await createUser()
    const b = await createUser()
    await follow(a.id, b.id)
    await follow(b.id, a.id)
    signInAs(a.id)
    const conv = await call(dmRoute.POST, { method: "POST", body: { targetUserId: b.id } })
    const id = (conv.json.data as { id: string }).id
    signInAs(b.id)
    await call(blockRoute.PUT, { method: "PUT", params: { id: a.id } })
    signInAs(a.id)
    const send = await call(dmIdRoute.POST, { method: "POST", params: { id }, body: { content: "まだいる？", clientMessageId: "after-block-1" } })
    expect(send.status).toBe(403)
    expect(send.json.error?.code).toBe("BLOCKED")
  })
})
