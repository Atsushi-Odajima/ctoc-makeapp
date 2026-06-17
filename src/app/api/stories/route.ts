import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id
  const following = await prisma.follow.findMany({ where: { followerId: uid }, select: { followingId: true } })
  const ids = [...following.map(f => f.followingId), uid]
  const stories = await prisma.story.findMany({
    where: { userId: { in: ids }, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  })
  // Group by user
  const grouped: Record<string, { user: { id: string; name: string; username: string; avatar: string | null }; stories: typeof stories }> = {}
  for (const s of stories) {
    if (!grouped[s.userId]) grouped[s.userId] = { user: s.user, stories: [] }
    grouped[s.userId].stories.push(s)
  }
  return NextResponse.json(Object.values(grouped))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { imageUrl, caption } = await req.json()
  if (!imageUrl) return NextResponse.json({ error: "Image required" }, { status: 400 })
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const story = await prisma.story.create({ data: { userId: session.user.id, imageUrl, caption, expiresAt } })
  return NextResponse.json(story)
}
