import { beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/db"
import { call, createUser, follow, ids, makeCommunity, makePost, resetDb, signInAs } from "../helpers/api"
import * as likeRoute from "@/app/api/posts/[id]/like/route"
import * as empathyRoute from "@/app/api/posts/[id]/empathy/route"
import * as bookmarkRoute from "@/app/api/posts/[id]/bookmark/route"
import * as postRoute from "@/app/api/posts/[id]/route"
import * as postsRoute from "@/app/api/posts/route"
import * as feedRoute from "@/app/api/feed/route"
import * as followRoute from "@/app/api/follow/[id]/route"
import * as acceptRoute from "@/app/api/follow-requests/[id]/accept/route"
import * as dmRoute from "@/app/api/dm/route"
import * as dmIdRoute from "@/app/api/dm/[id]/route"
import * as dmAcceptRoute from "@/app/api/dm/[id]/accept/route"
import * as communityPostsRoute from "@/app/api/communities/[slug]/posts/route"
import * as communityMembersRoute from "@/app/api/communities/[slug]/members/route"
import * as joinRoute from "@/app/api/communities/[slug]/join/route"
import * as communityAcceptRoute from "@/app/api/communities/[slug]/requests/[userId]/accept/route"
import * as notificationsReadRoute from "@/app/api/notifications/read/route"
import * as notificationsRoute from "@/app/api/notifications/route"
import * as commentsRoute from "@/app/api/posts/[id]/comments/route"

beforeEach(async () => {
  await resetDb()
  signInAs(null)
})

describe("AC-H: reactions and bookmarks are persisted and idempotent", () => {
  it("parallel double-taps create one row; like and empathy are independent", async () => {
    const author = await createUser()
    const viewer = await createUser()
    const post = await makePost(author.id)
    signInAs(viewer.id)
    const results = await Promise.all(Array.from({ length: 10 }, () => call(likeRoute.PUT, { method: "PUT", params: { id: post.id } })))
    expect(results.every(r => r.status === 200)).toBe(true)
    expect(await prisma.like.count({ where: { postId: post.id } })).toBe(1)
    await call(empathyRoute.PUT, { method: "PUT", params: { id: post.id } })
    await call(empathyRoute.PUT, { method: "PUT", params: { id: post.id } })
    await call(bookmarkRoute.PUT, { method: "PUT", params: { id: post.id } })
    expect(await prisma.empathy.count()).toBe(1)
    expect(await prisma.bookmark.count()).toBe(1)
    await call(likeRoute.DELETE, { method: "DELETE", params: { id: post.id } })
    await call(likeRoute.DELETE, { method: "DELETE", params: { id: post.id } })
    expect(await prisma.like.count()).toBe(0)
    expect(await prisma.empathy.count()).toBe(1) // unaffected
    const dto = (await call(postRoute.GET, { params: { id: post.id } })).json.data as { viewer: Record<string, boolean>; counts: Record<string, number> }
    expect(dto.viewer).toMatchObject({ liked: false, empathized: true, bookmarked: true })
    expect(dto.counts).toMatchObject({ likes: 0, empathies: 1 })
    // only one notification per reaction kind despite 10 parallel PUTs
    expect(await prisma.notification.count({ where: { userId: author.id, type: "like" } })).toBe(1)
  })
})

describe("AC-I: cursor pagination", () => {
  it("pages 20 + 20 + 5 without duplicates or gaps, even with identical timestamps", async () => {
    const author = await createUser()
    const same = new Date("2026-10-01T00:00:00.000Z")
    const created: string[] = []
    for (let i = 0; i < 45; i++) created.push((await makePost(author.id, { publishedAt: i % 3 === 0 ? same : new Date(same.getTime() + i * 1000) })).id)
    signInAs(author.id)
    const seen: string[] = []
    let cursor: string | null | undefined = undefined
    const sizes: number[] = []
    do {
      const res = await call(feedRoute.GET, { path: `/api/feed?tab=following${cursor ? `&cursor=${cursor}` : ""}` })
      expect(res.status).toBe(200)
      sizes.push(ids(res.json.data).length)
      seen.push(...ids(res.json.data))
      cursor = res.json.nextCursor
    } while (cursor)
    expect(sizes).toEqual([20, 20, 5])
    expect(new Set(seen).size).toBe(45)
    expect(seen.sort()).toEqual(created.sort())
  })

  it("rejects a malformed cursor with 422 and caps limit at 50", async () => {
    const res = await call(feedRoute.GET, { path: "/api/feed?tab=discover&cursor=bm90LWEtY3Vyc29y" })
    expect(res.status).toBe(422)
    expect(res.json.error?.code).toBe("INVALID_CURSOR")
    const author = await createUser()
    for (let i = 0; i < 55; i++) await makePost(author.id)
    const big = await call(feedRoute.GET, { path: "/api/feed?tab=discover&limit=500" })
    expect(ids(big.json.data)).toHaveLength(50)
  })

  it("reports newer posts for the 「新しい投稿」 button without moving the list", async () => {
    const author = await createUser()
    await makePost(author.id)
    signInAs(author.id)
    const first = await call(feedRoute.GET, { path: "/api/feed?tab=following" })
    const top = first.json.data as Array<{ id: string; publishedAt: string }>
    const { encodeCursor } = await import("@/lib/api/pagination")
    const since = encodeCursor({ t: new Date(top[0]!.publishedAt), id: top[0]!.id })
    await makePost(author.id)
    await makePost(author.id)
    const check = await call(feedRoute.GET, { path: `/api/feed?tab=following&since=${since}` })
    expect((check.json.data as { newCount: number }).newCount).toBe(2)
  })
})

describe("AC-O: retries do not duplicate", () => {
  it("same Idempotency-Key returns the same post; a different body with the same key is 409", async () => {
    const user = await createUser()
    signInAs(user.id)
    const headers = { "idempotency-key": "post-key-123456" }
    const first = await call(postsRoute.POST, { method: "POST", headers, body: { caption: "今日は晴れ" } })
    const second = await call(postsRoute.POST, { method: "POST", headers, body: { caption: "今日は晴れ" } })
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect((second.json.data as { id: string }).id).toBe((first.json.data as { id: string }).id)
    expect(await prisma.post.count()).toBe(1)
    const conflict = await call(postsRoute.POST, { method: "POST", headers, body: { caption: "別の内容" } })
    expect(conflict.status).toBe(409)
    expect(await prisma.post.count()).toBe(1)
  })

  it("same clientMessageId returns the same message; reuse with other content is 409", async () => {
    const a = await createUser()
    const b = await createUser()
    await follow(a.id, b.id)
    await follow(b.id, a.id)
    signInAs(a.id)
    const conv = (await call(dmRoute.POST, { method: "POST", body: { targetUserId: b.id } })).json.data as { id: string }
    const body = { content: "おはよう 🌸", clientMessageId: "client-msg-0001" }
    const results = await Promise.all([1, 2, 3].map(() => call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body })))
    expect(new Set(results.map(r => (r.json.data as { id: string }).id)).size).toBe(1)
    expect(await prisma.directMessage.count()).toBe(1)
    const reused = await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { ...body, content: "ちがう" } })
    expect(reused.status).toBe(409)
  })
})

describe("DM requests", () => {
  it("non-mutual start creates a request: one text only until accepted", async () => {
    const a = await createUser()
    const b = await createUser()
    signInAs(a.id)
    const conv = (await call(dmRoute.POST, { method: "POST", body: { targetUserId: b.id } })).json.data as { id: string }
    expect((await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } })).state).toBe("REQUESTED")
    expect((await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "はじめまして", clientMessageId: "req-000001" } })).status).toBe(201)
    const second = await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "もう一通", clientMessageId: "req-000002" } })
    expect(second.status).toBe(409)
    expect(second.json.error?.code).toBe("REQUEST_LIMIT")
    signInAs(b.id)
    expect((await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "返信", clientMessageId: "req-000003" } })).status).toBe(409)
    expect((await call(dmAcceptRoute.POST, { method: "POST", params: { id: conv.id } })).status).toBe(200)
    expect((await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "どうぞよろしく", clientMessageId: "req-000004" } })).status).toBe(201)
  })

  it("incremental polling returns only messages after the cursor", async () => {
    const a = await createUser()
    const b = await createUser()
    await follow(a.id, b.id)
    await follow(b.id, a.id)
    signInAs(a.id)
    const conv = (await call(dmRoute.POST, { method: "POST", body: { targetUserId: b.id } })).json.data as { id: string }
    await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "1", clientMessageId: "poll-000001" } })
    const first = (await call(dmIdRoute.GET, { params: { id: conv.id }, path: `/api/dm/${conv.id}` })).json.data as { messages: Array<{ id: string; createdAt: string }> }
    const last = first.messages[first.messages.length - 1]!
    const { encodeCursor } = await import("@/lib/api/pagination")
    signInAs(b.id)
    await call(dmIdRoute.POST, { method: "POST", params: { id: conv.id }, body: { content: "2", clientMessageId: "poll-000002" } })
    signInAs(a.id)
    const after = encodeCursor({ t: new Date(last.createdAt), id: last.id })
    const delta = (await call(dmIdRoute.GET, { params: { id: conv.id }, path: `/api/dm/${conv.id}?after=${after}` })).json.data as { messages: Array<{ content: string }> }
    expect(delta.messages.map(m => m.content)).toEqual(["2"])
  })
})

describe("Follow requests for private accounts", () => {
  it("PENDING until accepted; concurrent follow requests create one row", async () => {
    const priv = await createUser({ isPrivate: true })
    const fan = await createUser()
    const post = await makePost(priv.id, { visibility: "FOLLOWERS", caption: "限定" })
    signInAs(fan.id)
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => call(followRoute.PUT, { method: "PUT", params: { id: priv.id } })))
    expect(results.every(r => (r.json.data as { status: string }).status === "PENDING")).toBe(true)
    expect(await prisma.follow.count()).toBe(1)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(404)
    signInAs(priv.id)
    expect((await call(acceptRoute.POST, { method: "POST", params: { id: fan.id } })).status).toBe(200)
    signInAs(fan.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(200)
  })

  it("switching an account to private keeps existing accepted followers", async () => {
    const user = await createUser()
    const fan = await createUser()
    await follow(fan.id, user.id)
    await prisma.user.update({ where: { id: user.id }, data: { isPrivate: true } })
    const post = await makePost(user.id, { visibility: "FOLLOWERS" })
    signInAs(fan.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(200)
  })
})

describe("AC-N: private communities", () => {
  it("non-members and anonymous cannot read posts, media or the member list; approved members can", async () => {
    const owner = await createUser()
    const outsider = await createUser()
    const community = await makeCommunity(owner.id, { isPrivate: true })
    const post = await makePost(owner.id, { communityId: community.id, caption: "内輪の話" })
    for (const viewer of [outsider.id, null]) {
      signInAs(viewer)
      expect((await call(communityPostsRoute.GET, { params: { slug: community.slug } })).status).toBe(404)
      expect((await call(communityMembersRoute.GET, { params: { slug: community.slug } })).status).toBe(404)
      expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(404)
      expect(JSON.stringify((await call(feedRoute.GET, { path: "/api/feed?tab=discover" })).json)).not.toContain("内輪")
    }
    signInAs(outsider.id)
    const join = await call(joinRoute.POST, { method: "POST", params: { slug: community.slug } })
    expect((join.json.data as { membership: { status: string } }).membership.status).toBe("PENDING")
    expect((await call(communityPostsRoute.GET, { params: { slug: community.slug } })).status).toBe(404)
    const tryPost = await call(communityPostsRoute.POST, { method: "POST", params: { slug: community.slug }, body: { caption: "入れて" } })
    expect(tryPost.status).toBe(403)
    signInAs(owner.id)
    expect((await call(communityAcceptRoute.POST, { method: "POST", params: { slug: community.slug, userId: outsider.id } })).status).toBe(200)
    signInAs(outsider.id)
    expect(ids((await call(communityPostsRoute.GET, { params: { slug: community.slug } })).json.data)).toEqual([post.id])
  })

  it("a private account posting into a public community must confirm the public range", async () => {
    const owner = await createUser()
    const priv = await createUser({ isPrivate: true })
    const community = await makeCommunity(owner.id)
    await prisma.communityMember.create({ data: { communityId: community.id, userId: priv.id } })
    signInAs(priv.id)
    const res = await call(communityPostsRoute.POST, { method: "POST", params: { slug: community.slug }, body: { caption: "こんにちは" } })
    expect(res.status).toBe(422)
    expect(res.json.error?.code).toBe("CONFIRMATION_REQUIRED")
    const ok = await call(communityPostsRoute.POST, { method: "POST", params: { slug: community.slug }, body: { caption: "こんにちは", confirmPublicCommunity: true } })
    expect(ok.status).toBe(201)
    signInAs(null)
    expect((await call(postRoute.GET, { params: { id: (ok.json.data as { id: string }).id } })).status).toBe(200)
  })

  it("personal posts cannot use COMMUNITY visibility", async () => {
    const user = await createUser()
    signInAs(user.id)
    expect((await call(postsRoute.POST, { method: "POST", body: { caption: "x", visibility: "COMMUNITY" } })).status).toBe(422)
  })
})

describe("Notifications", () => {
  it("only the owner's ids are marked read; muted actors are silent", async () => {
    const a = await createUser()
    const b = await createUser()
    const muted = await createUser()
    const n = await prisma.notification.create({ data: { userId: a.id, type: "follow", fromUserId: b.id } })
    const other = await prisma.notification.create({ data: { userId: b.id, type: "follow", fromUserId: a.id } })
    signInAs(a.id)
    await call(notificationsReadRoute.POST, { method: "POST", body: { ids: [n.id, other.id] } })
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).read).toBe(true)
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: other.id } })).read).toBe(false)
    await prisma.mute.create({ data: { userId: a.id, targetUserId: muted.id } })
    const post = await makePost(a.id)
    signInAs(muted.id)
    await call(commentsRoute.POST, { method: "POST", params: { id: post.id }, body: { content: "やあ" } })
    signInAs(a.id)
    const list = await call(notificationsRoute.GET, { path: "/api/notifications" })
    expect(JSON.stringify(list.json)).not.toContain(muted.id)
  })
})

describe("Posts: edit/delete/drafts", () => {
  it("edit requires owner and matching revision; delete is soft and hides the post", async () => {
    const owner = await createUser()
    const other = await createUser()
    const post = await makePost(owner.id, { caption: "前" })
    signInAs(other.id)
    expect((await call(postRoute.PATCH, { method: "PATCH", params: { id: post.id }, body: { revision: 0, caption: "乗っ取り" } })).status).toBe(403)
    expect((await call(postRoute.DELETE, { method: "DELETE", params: { id: post.id } })).status).toBe(403)
    signInAs(owner.id)
    expect((await call(postRoute.PATCH, { method: "PATCH", params: { id: post.id }, body: { revision: 0, caption: "後" } })).status).toBe(200)
    expect((await call(postRoute.PATCH, { method: "PATCH", params: { id: post.id }, body: { revision: 0, caption: "古い" } })).status).toBe(409)
    const fresh = await prisma.post.findUniqueOrThrow({ where: { id: post.id } })
    expect(fresh.caption).toBe("後")
    expect(fresh.publishedAt?.getTime()).toBe(post.publishedAt?.getTime()) // edits never move the post in the timeline
    expect((await call(postRoute.PATCH, { method: "PATCH", params: { id: post.id }, body: { revision: 1, visibility: "FOLLOWERS" } })).status).toBe(200)
    const expand = await call(postRoute.PATCH, { method: "PATCH", params: { id: post.id }, body: { revision: 2, visibility: "PUBLIC" } })
    expect(expand.json.error?.code).toBe("CONFIRMATION_REQUIRED")
    expect((await call(postRoute.DELETE, { method: "DELETE", params: { id: post.id } })).status).toBe(200)
    signInAs(other.id)
    expect((await call(postRoute.GET, { params: { id: post.id } })).status).toBe(404)
  })

  it("drafts are visible only to their owner", async () => {
    const owner = await createUser()
    const other = await createUser()
    signInAs(owner.id)
    const draft = await call(postsRoute.POST, { method: "POST", body: { caption: "下書き", publish: false } })
    const id = (draft.json.data as { id: string; status: string }).id
    expect((draft.json.data as { status: string }).status).toBe("DRAFT")
    expect(ids((await call(postsRoute.GET, { path: "/api/posts?status=DRAFT" })).json.data)).toEqual([id])
    signInAs(other.id)
    expect((await call(postRoute.GET, { params: { id } })).status).toBe(404)
  })
})
