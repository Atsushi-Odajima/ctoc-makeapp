import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id
  const q = new URL(req.url).searchParams.get("q") || ""

  if (q) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { name: { contains: q } },
        ],
        NOT: { id: uid },
      },
      select: { id: true, name: true, username: true, avatar: true, bio: true },
      take: 20,
    })
    return NextResponse.json({ users, posts: [] })
  }

  const posts = await prisma.post.findMany({
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
    orderBy: { likes: { _count: "desc" } },
    take: 30,
  })

  return NextResponse.json({
    users: [],
    posts: posts.map(p => ({
      ...p,
      images: (() => { try { return JSON.parse(p.images) } catch { return [] } })(),
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      isLiked: p.likes.length > 0,
      likes: undefined,
      _count: undefined,
    })),
  })
}
