import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getNewsMetric } from "@/lib/news"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const caption = typeof body.caption === "string" ? body.caption.trim() : ""
  if (!caption || caption.length > 500) return NextResponse.json({ error: "投稿文は1〜500文字で入力してください" }, { status: 400 })

  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const post = await prisma.post.create({
    data: { userId: session.user.id, caption, images: "[]", newsArticleId: id },
    select: { id: true },
  })
  const metrics = await getNewsMetric(id)
  return NextResponse.json({ postId: post.id, metrics }, { status: 201 })
}
