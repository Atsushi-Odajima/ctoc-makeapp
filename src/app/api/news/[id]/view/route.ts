import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getNewsMetric } from "@/lib/news"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  const body = await request.json().catch(() => ({}))
  const anonymousKey = typeof body.visitorKey === "string" ? body.visitorKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : ""
  const visitorKey = session?.user?.id ? `user-${session.user.id}` : anonymousKey
  if (!visitorKey) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "visitorKey required" } }, { status: 422 })

  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) return NextResponse.json({ error: { code: "NOT_FOUND", message: "見つかりません" } }, { status: 404 })

  const bucket = new Date().toISOString().slice(0, 13)
  await prisma.newsActivity.upsert({
    where: { articleId_visitorKey_kind_bucket: { articleId: id, visitorKey, kind: "view", bucket } },
    create: { articleId: id, visitorKey, kind: "view", bucket },
    update: {},
  })

  return NextResponse.json({ data: await getNewsMetric(id) })
}
