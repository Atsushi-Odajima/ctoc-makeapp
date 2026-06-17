import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const notifs = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  const withUsers = await Promise.all(notifs.map(async n => {
    const fromUser = n.fromUserId ? await prisma.user.findUnique({ where: { id: n.fromUserId }, select: { id: true, name: true, username: true, avatar: true } }) : null
    const post = n.postId ? await prisma.post.findUnique({ where: { id: n.postId }, select: { id: true, images: true } }) : null
    return { ...n, fromUser, post: post ? { id: post.id, images: (() => { try { return JSON.parse(post.images) } catch { return [] } })() } : null }
  }))
  // Mark all as read
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } })
  return NextResponse.json(withUsers)
}
