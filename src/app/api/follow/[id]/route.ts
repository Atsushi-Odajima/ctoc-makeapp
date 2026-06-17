import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: targetId } = await params
  const uid = session.user.id
  if (uid === targetId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })

  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: uid, followingId: targetId } } })
  if (existing) {
    await prisma.follow.delete({ where: { followerId_followingId: { followerId: uid, followingId: targetId } } })
    return NextResponse.json({ following: false })
  } else {
    await prisma.follow.create({ data: { followerId: uid, followingId: targetId } })
    try { await prisma.notification.create({ data: { userId: targetId, type: "follow", fromUserId: uid, content: "あなたをフォローしました" } }) } catch { /* skip */ }
    return NextResponse.json({ following: true })
  }
}
