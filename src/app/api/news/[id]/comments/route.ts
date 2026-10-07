import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getNewsMetric } from "@/lib/news"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [comments, metrics] = await Promise.all([
    prisma.newsComment.findMany({
      where: { articleId: id },
      include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    getNewsMetric(id),
  ])

  return NextResponse.json({ comments, metrics })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content || content.length > 500) return NextResponse.json({ error: "コメントは1〜500文字で入力してください" }, { status: 400 })

  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const comment = await prisma.newsComment.create({
    data: { articleId: id, userId: session.user.id, content },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  const metrics = await getNewsMetric(id)
  return NextResponse.json({ comment, metrics }, { status: 201 })
}
