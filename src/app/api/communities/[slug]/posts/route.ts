import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const caption = typeof body.caption === "string" ? body.caption.trim() : ""
  if (!caption || caption.length > 500) return NextResponse.json({ error: "投稿は1〜500文字で入力してください" }, { status: 400 })

  const community = await prisma.community.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } })
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: session.user.id } } })
  if (!member) return NextResponse.json({ error: "参加後に投稿できます" }, { status: 403 })

  const post = await prisma.post.create({
    data: { userId: session.user.id, caption, images: "[]", communityId: community.id },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  return NextResponse.json({ ...post, images: [], community, likesCount: 0, commentsCount: 0, isLiked: false }, { status: 201 })
}
