import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id

  const following = await prisma.follow.findMany({ where: { followerId: uid }, select: { followingId: true } })
  const followingIds = following.map(f => f.followingId)
  const memberships = await prisma.communityMember.findMany({ where: { userId: uid }, select: { communityId: true } })
  const communityIds = memberships.map(membership => membership.communityId)

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { userId: { in: [...followingIds, uid] } },
        { communityId: { in: communityIds } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      newsArticle: { select: { id: true, title: true, link: true, source: true, category: true, publishedAt: true } },
      community: { select: { id: true, slug: true, name: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return NextResponse.json(posts.map(p => ({
    ...p,
    images: (() => { try { return JSON.parse(p.images) } catch { return [] } })(),
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    isLiked: p.likes.length > 0,
    likes: undefined,
    _count: undefined,
  })))
}
