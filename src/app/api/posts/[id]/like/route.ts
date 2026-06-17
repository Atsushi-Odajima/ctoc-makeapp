import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: postId } = await params
  const uid = session.user.id

  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId: uid, postId } } })
  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId: uid, postId } } })
    return NextResponse.json({ liked: false })
  } else {
    await prisma.like.create({ data: { userId: uid, postId } })
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } })
    if (post && post.userId !== uid) {
      try {
        await prisma.notification.create({ data: { userId: post.userId, type: "like", fromUserId: uid, postId, content: "あなたの投稿にいいねしました" } })
      } catch { /* skip */ }
    }
    return NextResponse.json({ liked: true })
  }
}
