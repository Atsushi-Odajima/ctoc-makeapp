import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { username } = await params
  const uid = session.user.id

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      newsArticle: { select: { id: true, title: true, link: true, source: true, category: true, publishedAt: true } },
      community: { select: { id: true, slug: true, name: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
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
