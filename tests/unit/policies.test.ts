import { describe, expect, it } from "vitest"
import { canViewPostPure, type PostAccessInput } from "@/lib/policies/posts"
import { canSendPure, pairKeyFor } from "@/lib/policies/messaging"
import { canViewCommunityContentPure } from "@/lib/policies/communities"
import { isOriginAllowed } from "@/lib/origin"
import { decodeCursor, encodeCursor, pageSize } from "@/lib/api/pagination"
import { ApiError } from "@/lib/api/errors"
import { requestHash, stableStringify } from "@/lib/idempotency"

type Over = { viewerId?: string | null; author?: PostAccessInput["author"]; community?: PostAccessInput["community"]; post?: Partial<PostAccessInput["post"]>; viewer?: Partial<PostAccessInput["viewer"]> }
function input(over: Over = {}): PostAccessInput {
  return {
    viewerId: over.viewerId === undefined ? "viewer" : over.viewerId,
    post: { userId: "author", visibility: "PUBLIC", status: "PUBLISHED", communityId: null, deletedAt: null, hiddenAt: null, ...over.post },
    author: over.author ?? { isPrivate: false, status: "ACTIVE" },
    community: over.community ?? null,
    viewer: { followsAuthorAccepted: false, activeCommunityMember: false, blockedEitherWay: false, ...over.viewer },
  }
}

describe("canViewPost", () => {
  it("public personal post on a public account: everyone except blocked", () => {
    expect(canViewPostPure(input({ viewerId: null }))).toBe(true)
    expect(canViewPostPure(input())).toBe(true)
    expect(canViewPostPure(input({ viewer: { blockedEitherWay: true } }))).toBe(false)
  })
  it("FOLLOWERS and private accounts need an ACCEPTED follow", () => {
    expect(canViewPostPure(input({ post: { visibility: "FOLLOWERS" } }))).toBe(false)
    expect(canViewPostPure(input({ post: { visibility: "FOLLOWERS" }, viewer: { followsAuthorAccepted: true } }))).toBe(true)
    expect(canViewPostPure(input({ author: { isPrivate: true, status: "ACTIVE" } }))).toBe(false)
    expect(canViewPostPure(input({ viewerId: null, author: { isPrivate: true, status: "ACTIVE" } }))).toBe(false)
    expect(canViewPostPure(input({ author: { isPrivate: true, status: "ACTIVE" }, viewer: { followsAuthorAccepted: true } }))).toBe(true)
  })
  it("community posts follow the community, not the author's privacy", () => {
    const pub = { post: { communityId: "c", visibility: "COMMUNITY" as const }, community: { isPrivate: false } }
    expect(canViewPostPure(input({ ...pub, viewerId: null, author: { isPrivate: true, status: "ACTIVE" } }))).toBe(true)
    const priv = { post: { communityId: "c", visibility: "COMMUNITY" as const }, community: { isPrivate: true } }
    expect(canViewPostPure(input({ ...priv }))).toBe(false)
    expect(canViewPostPure(input({ ...priv, viewer: { activeCommunityMember: true } }))).toBe(true)
    expect(canViewPostPure(input({ ...priv, viewerId: null }))).toBe(false)
  })
  it("drafts, hidden, deleted and suspended authors", () => {
    expect(canViewPostPure(input({ post: { status: "DRAFT" } }))).toBe(false)
    expect(canViewPostPure(input({ viewerId: "author", post: { status: "DRAFT" } }))).toBe(true)
    expect(canViewPostPure(input({ post: { hiddenAt: new Date() } }))).toBe(false)
    expect(canViewPostPure(input({ viewerId: "author", post: { deletedAt: new Date() } }))).toBe(false)
    expect(canViewPostPure(input({ author: { isPrivate: false, status: "SUSPENDED" } }))).toBe(false)
  })
  it("personal COMMUNITY visibility is owner-only", () => {
    expect(canViewPostPure(input({ post: { visibility: "COMMUNITY" } }))).toBe(false)
  })
})

describe("canViewCommunity content", () => {
  it("private communities only for ACTIVE members", () => {
    expect(canViewCommunityContentPure(false, null)).toBe(true)
    expect(canViewCommunityContentPure(true, null)).toBe(false)
    expect(canViewCommunityContentPure(true, "PENDING")).toBe(false)
    expect(canViewCommunityContentPure(true, "ACTIVE")).toBe(true)
  })
})

describe("pairKey", () => {
  it("is order independent and rejects self-conversations", () => {
    expect(pairKeyFor("b", "a")).toBe("a:b")
    expect(pairKeyFor("a", "b")).toBe("a:b")
    expect(() => pairKeyFor("a", "a")).toThrow()
  })
})

describe("canMessage", () => {
  const base = { viewerId: "v", state: "ACCEPTED" as const, initiatorId: "v", otherUserActive: true, blocked: false, viewerMessagesInRequest: 0 }
  it("covers block, declined, request limits", () => {
    expect(canSendPure(base).ok).toBe(true)
    expect(canSendPure({ ...base, blocked: true })).toMatchObject({ ok: false, code: "BLOCKED" })
    expect(canSendPure({ ...base, otherUserActive: false }).ok).toBe(false)
    expect(canSendPure({ ...base, state: "DECLINED" }).ok).toBe(false)
    expect(canSendPure({ ...base, state: "REQUESTED" }).ok).toBe(true)
    expect(canSendPure({ ...base, state: "REQUESTED", viewerMessagesInRequest: 1 })).toMatchObject({ ok: false, code: "REQUEST_LIMIT" })
    expect(canSendPure({ ...base, state: "REQUESTED", initiatorId: "other" })).toMatchObject({ ok: false, code: "REQUEST_PENDING" })
  })
})

describe("Origin check (CSRF)", () => {
  const base = { method: "POST", pathname: "/api/posts", origin: "https://daynet.example", secFetchSite: null, host: "daynet.example", allowedOrigins: [] }
  it("allows same-origin writes and rejects cross-site writes", () => {
    expect(isOriginAllowed(base)).toBe(true)
    expect(isOriginAllowed({ ...base, origin: "https://evil.example" })).toBe(false)
    expect(isOriginAllowed({ ...base, origin: null })).toBe(false)
    expect(isOriginAllowed({ ...base, origin: null, secFetchSite: "same-origin" })).toBe(true)
    expect(isOriginAllowed({ ...base, method: "GET", origin: "https://evil.example" })).toBe(true)
    expect(isOriginAllowed({ ...base, pathname: "/api/media/webhook", origin: null })).toBe(true)
    expect(isOriginAllowed({ ...base, origin: "https://preview.example", allowedOrigins: ["https://preview.example"] })).toBe(true)
  })
})

describe("cursor", () => {
  it("round-trips and rejects garbage with 422", () => {
    const c = { t: new Date("2026-10-07T01:02:03.004Z"), id: "abc_123" }
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
    expect(decodeCursor(null)).toBeNull()
    for (const bad of ["xx", Buffer.from("2026|").toString("base64url"), Buffer.from("not-a-date|id").toString("base64url"), Buffer.from("2026-10-07T01:02:03.004Z|a b").toString("base64url")]) {
      try {
        decodeCursor(bad)
        throw new Error("should throw")
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        expect((e as ApiError).status).toBe(422)
      }
    }
  })
  it("page size defaults to 20 and caps at 50", () => {
    expect(pageSize(undefined)).toBe(20)
    expect(pageSize("200")).toBe(50)
    expect(() => pageSize("0")).toThrow()
  })
})

describe("idempotency hashing", () => {
  it("is independent of key order", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}')
    expect(requestHash({ a: 1, b: 2 })).toBe(requestHash({ b: 2, a: 1 }))
    expect(requestHash({ a: 1 })).not.toBe(requestHash({ a: 2 }))
  })
})
