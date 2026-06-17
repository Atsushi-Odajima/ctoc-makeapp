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

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      followers: { where: { followerId: uid }, select: { followerId: true } },
    },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Record footprint if visiting someone else
  if (user.id !== uid) {
    const recent = await prisma.footprint.findFirst({
      where: { visitorId: uid, visitedId: user.id, visitedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    })
    if (!recent) {
      await prisma.footprint.create({ data: { visitorId: uid, visitedId: user.id } })
    }
  }

  const { password: _, followers: __,  _count, ...safe } = user
  return NextResponse.json({
    ...safe,
    postsCount: _count.posts,
    followersCount: _count.followers,
    followingCount: _count.following,
    isFollowing: user.followers.length > 0,
    isMe: user.id === uid,
  })
}
