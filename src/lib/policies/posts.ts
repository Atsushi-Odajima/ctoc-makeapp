import type { Prisma, PostStatus, PostVisibility } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import { notBlockedUserWhere } from "./relationships"

// ---------------------------------------------------------------------------
// Pure decision function (the specification of who may read a post).
// visiblePostWhere() below is the SQL translation of the same rules and is
// cross-checked against this function in the integration tests.
// ---------------------------------------------------------------------------
export interface PostAccessInput {
  viewerId: string | null
  post: {
    userId: string
    visibility: PostVisibility
    status: PostStatus
    communityId: string | null
    deletedAt: Date | null
    hiddenAt: Date | null
  }
  author: { isPrivate: boolean; status: "ACTIVE" | "SUSPENDED" | "DELETED" }
  community: { isPrivate: boolean } | null
  viewer: {
    followsAuthorAccepted: boolean
    activeCommunityMember: boolean
    blockedEitherWay: boolean
  }
}

export function canViewPostPure(input: PostAccessInput): boolean {
  const { viewerId, post, author, community, viewer } = input
  const isOwner = viewerId !== null && viewerId === post.userId
  if (post.status === "DELETED" || post.deletedAt) return false
  if (author.status !== "ACTIVE") return false // suspended/deleted accounts' posts are hidden from everyone
  if (isOwner) return true // owner sees own drafts / processing / hidden posts
  if (post.status !== "PUBLISHED" || post.hiddenAt) return false
  if (viewerId && viewer.blockedEitherWay) return false

  if (post.communityId) {
    // The community is the source of truth for community posts, regardless of the author's
    // private-account setting.
    if (post.visibility !== "COMMUNITY" || !community) return false
    if (!community.isPrivate) return true
    return viewerId !== null && viewer.activeCommunityMember
  }
  if (post.visibility === "COMMUNITY") return false // orphaned/invalid personal COMMUNITY post: owner only
  if (post.visibility === "PUBLIC" && !author.isPrivate) return true
  // FOLLOWERS, or PUBLIC on a private account (capped to followers)
  return viewerId !== null && viewer.followsAuthorAccepted
}

export function canManagePost(viewerId: string | null, post: { userId: string; status: PostStatus }): boolean {
  return viewerId !== null && viewerId === post.userId && post.status !== "DELETED"
}

// ---------------------------------------------------------------------------
// SQL (Prisma) translation — applied inside every list query BEFORE pagination.
// ---------------------------------------------------------------------------
export function visiblePostWhere(viewerId: string | null): Prisma.PostWhereInput {
  const published: Prisma.PostWhereInput = { status: "PUBLISHED", deletedAt: null, hiddenAt: null }
  const publicBranches: Prisma.PostWhereInput[] = [
    { communityId: null, visibility: "PUBLIC", user: { isPrivate: false } },
    { communityId: { not: null }, visibility: "COMMUNITY", community: { isPrivate: false } },
  ]
  if (!viewerId) {
    return { AND: [published, { user: { status: "ACTIVE" } }, { OR: publicBranches }] }
  }
  return {
    AND: [
      published,
      { user: notBlockedUserWhere(viewerId) },
      {
        OR: [
          { userId: viewerId },
          ...publicBranches,
          {
            communityId: null,
            visibility: { in: ["PUBLIC", "FOLLOWERS"] },
            user: { followers: { some: { followerId: viewerId, status: "ACCEPTED" } } },
          },
          {
            communityId: { not: null },
            visibility: "COMMUNITY",
            community: { members: { some: { userId: viewerId, status: "ACTIVE" } } },
          },
        ],
      },
    ],
  }
}

/** Feed-only filter: hide muted users and muted communities (only for the viewer). */
export function notMutedWhere(viewerId: string | null): Prisma.PostWhereInput {
  if (!viewerId) return {}
  return {
    AND: [
      { user: { mutesReceived: { none: { userId: viewerId } } } },
      { OR: [{ communityId: null }, { community: { mutes: { none: { userId: viewerId } } } }] },
    ],
  }
}

export type FeedTab = "following" | "communities" | "discover"

export function feedWhere(viewerId: string | null, tab: FeedTab): Prisma.PostWhereInput {
  const base = [visiblePostWhere(viewerId), notMutedWhere(viewerId)]
  if (tab === "discover" || !viewerId) {
    return { AND: [...base, { OR: [
      { communityId: null, visibility: "PUBLIC", user: { isPrivate: false } },
      { communityId: { not: null }, community: { isPrivate: false } },
    ] }] }
  }
  if (tab === "communities") {
    return { AND: [...base, { community: { members: { some: { userId: viewerId, status: "ACTIVE" } } } }] }
  }
  // following: my own personal posts + personal posts of people I follow (accepted)
  return {
    AND: [
      ...base,
      { communityId: null },
      { OR: [{ userId: viewerId }, { user: { followers: { some: { followerId: viewerId, status: "ACCEPTED" } } } }] },
    ],
  }
}

/**
 * Load a post only if the viewer may see it. Missing and not-viewable are indistinguishable (404).
 * Owners also get their own non-published posts.
 */
export async function findViewablePostId(viewerId: string | null, postId: string): Promise<string> {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      OR: [
        visiblePostWhere(viewerId),
        ...(viewerId ? [{ userId: viewerId, status: { not: "DELETED" as const }, deletedAt: null }] : []),
      ],
    },
    select: { id: true },
  })
  if (!post) throw Errors.notFound()
  return post.id
}

/** Interaction (reaction/comment/bookmark) requires a published, viewable post. */
export async function findInteractablePost(viewerId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, AND: [visiblePostWhere(viewerId)] },
    select: { id: true, userId: true, communityId: true },
  })
  if (!post) throw Errors.notFound()
  return post
}
