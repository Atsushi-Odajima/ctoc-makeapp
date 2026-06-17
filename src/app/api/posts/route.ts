import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id
  const mine = req.nextUrl.searchParams.get("mine") === "true"

  const posts = await prisma.post.findMany({
    where: mine ? { userId: uid } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { caption, images, location } = await req.json()
  if (!images || images.length === 0) return NextResponse.json({ error: "Images required" }, { status: 400 })
  const post = await prisma.post.create({
    data: { userId: session.user.id, caption, images: JSON.stringify(images), location },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  return NextResponse.json({ ...post, images: JSON.parse(post.images), likesCount: 0, commentsCount: 0, isLiked: false })
}
