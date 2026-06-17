import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } }, replies: { include: { user: { select: { id: true, name: true, username: true, avatar: true } } } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: postId } = await params
  const { content, parentId } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })
  const comment = await prisma.comment.create({
    data: { postId, userId: session.user.id, content: content.trim(), parentId },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } })
  if (post && post.userId !== session.user.id) {
    try { await prisma.notification.create({ data: { userId: post.userId, type: "comment", fromUserId: session.user.id, postId, content } }) } catch { /* skip */ }
  }
  return NextResponse.json(comment)
}
