import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { slug } = await params
  const uid = session.user.id

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true, avatar: true } },
      _count: { select: { members: true, posts: true } },
      members: { where: { userId: uid }, select: { role: true } },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true } },
          newsArticle: { select: { id: true, title: true, link: true, source: true, category: true, publishedAt: true } },
          community: { select: { id: true, slug: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: uid }, select: { userId: true } },
        },
      },
    },
  })
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const memberPreview = await prisma.communityMember.findMany({
    where: { communityId: community.id },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
    take: 8,
  })

  return NextResponse.json({
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    category: community.category,
    coverImage: community.coverImage,
    isPrivate: community.isPrivate,
    owner: community.owner,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: community.members.length > 0,
    role: community.members[0]?.role || null,
    members: memberPreview.map(member => member.user),
    posts: community.posts.map(post => ({
      ...post,
      images: (() => { try { return JSON.parse(post.images) } catch { return [] } })(),
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    })),
  })
}
