import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
    },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { password: _, ...safe } = user
  return NextResponse.json({ ...safe, postsCount: user._count.posts, followersCount: user._count.followers, followingCount: user._count.following })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const allowed = ["name", "bio", "avatar", "website", "isPrivate", "onboardingDone"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k]
  const user = await prisma.user.update({ where: { id: session.user.id }, data })
  const { password: _, ...safe } = user
  return NextResponse.json(safe)
}
