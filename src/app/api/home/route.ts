import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const homePostArgs = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    user: { select: { id: true, name: true, username: true, avatar: true } },
    newsArticle: { select: { id: true, title: true, link: true, source: true, category: true, publishedAt: true } },
    community: { select: { id: true, slug: true, name: true } },
    _count: { select: { likes: true, comments: true } },
    likes: { select: { userId: true } },
  },
})

type HomePostRow = Prisma.PostGetPayload<typeof homePostArgs>

function parseImages(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : []
  } catch {
    return []
  }
}

function serializePost(post: HomePostRow, viewerId?: string) {
  return {
    ...post,
    images: parseImages(post.images),
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLiked: viewerId ? post.likes.some(like => like.userId === viewerId) : false,
    likes: undefined,
    _count: undefined,
  }
}

function contentSignals(post: Pick<HomePostRow, "caption" | "location">) {
  const text = `${post.caption || ""} ${post.location || ""}`.toLowerCase()
  const hashtags = [...text.matchAll(/#[^\s#]+/gu)].map(match => match[0])
  const words = text.split(/[\s、。,.!！?？/]+/u).filter(word => word.length >= 2 && word.length <= 24)
  return new Set([...hashtags, ...words].slice(0, 20))
}

export async function GET(request: NextRequest) {
  const session = await auth()
  const viewerId = session?.user?.id
  const seenIds = (new URL(request.url).searchParams.get("seen") || "")
    .split(",")
    .filter(Boolean)
    .slice(0, 30)

  const [following, memberships, likedHistory, seenHistory, recentPosts] = await Promise.all([
    viewerId
      ? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })
      : Promise.resolve([]),
    viewerId
      ? prisma.communityMember.findMany({ where: { userId: viewerId }, select: { communityId: true } })
      : Promise.resolve([]),
    viewerId
      ? prisma.like.findMany({
        where: { userId: viewerId },
        include: { post: { select: { userId: true, caption: true, location: true } } },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
      : Promise.resolve([]),
    seenIds.length > 0
      ? prisma.post.findMany({
        where: { id: { in: seenIds } },
        select: { userId: true, caption: true, location: true },
      })
      : Promise.resolve([]),
    prisma.post.findMany({
      ...homePostArgs,
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ])

  const followingIds = following.map(item => item.followingId)
  const communityIds = memberships.map(item => item.communityId)
  const affinityPosts = [...seenHistory, ...likedHistory.map(item => item.post)]
  const affinityAuthors = new Set(affinityPosts.map(post => post.userId))
  const affinitySignals = new Set(affinityPosts.flatMap(post => [...contentSignals(post)]))

  const scorePost = (post: HomePostRow) => {
    const signals = contentSignals(post)
    const overlap = [...signals].filter(signal => affinitySignals.has(signal)).length
    const ageHours = Math.max(0, (Date.now() - post.createdAt.getTime()) / 3_600_000)
    return (affinityAuthors.has(post.userId) ? 14 : 0)
      + overlap * 5
      + Math.log1p(post._count.likes) * 3
      + Math.log1p(post._count.comments) * 4
      + 8 / (1 + ageHours / 24)
  }

  const followedSet = new Set(followingIds)
  const primaryPool = recentPosts.filter(post => {
    if (!viewerId) return true
    return post.userId === viewerId
      || followedSet.has(post.userId)
      || (post.communityId ? communityIds.includes(post.communityId) : false)
  })
  const primaryPoolIds = new Set(primaryPool.map(post => post.id))
  const feed = [...primaryPool, ...recentPosts.filter(post => !primaryPoolIds.has(post.id))].slice(0, 6)
  const feedIds = new Set(feed.map(post => post.id))
  const seenSet = new Set(seenIds)
  const recommended = recentPosts
    .filter(post => !feedIds.has(post.id) && !seenSet.has(post.id))
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, 10)

  const reels = recentPosts
    .filter(post => parseImages(post.images).length > 0)
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, 10)

  const excludedUsers = [...new Set([...(viewerId ? [viewerId] : []), ...followingIds])]
  const accountCandidates = await prisma.user.findMany({
    where: excludedUsers.length > 0 ? { id: { notIn: excludedUsers } } : undefined,
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      _count: { select: { posts: true, followers: true } },
    },
    take: 30,
  })
  const recommendedAuthors = new Set(recommended.map(post => post.userId))
  const accounts = accountCandidates
    .sort((a, b) => {
      const aScore = (recommendedAuthors.has(a.id) ? 20 : 0) + a._count.followers * 2 + a._count.posts
      const bScore = (recommendedAuthors.has(b.id) ? 20 : 0) + b._count.followers * 2 + b._count.posts
      return bScore - aScore
    })
    .slice(0, 8)
    .map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount: user._count.followers,
      postsCount: user._count.posts,
      reason: recommendedAuthors.has(user.id) ? "おすすめ投稿で気になる人" : user._count.followers > 0 ? "いま注目のアカウント" : "新しい投稿があります",
    }))

  return NextResponse.json({
    feed: feed.map(post => serializePost(post, viewerId)),
    reels: reels.map(post => serializePost(post, viewerId)),
    recommended: recommended.map(post => serializePost(post, viewerId)),
    accounts,
    personalized: affinityPosts.length > 0,
  })
}
