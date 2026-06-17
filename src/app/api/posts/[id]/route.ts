import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const uid = session.user.id
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
  })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    ...post,
    images: (() => { try { return JSON.parse(post.images) } catch { return [] } })(),
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLiked: post.likes.length > 0,
    likes: undefined,
    _count: undefined,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id } })
  if (!post || post.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await prisma.post.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
