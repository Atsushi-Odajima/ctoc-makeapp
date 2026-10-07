import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getNewsMetric } from "@/lib/news"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await prisma.newsArticle.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: { code: "NOT_FOUND", message: "見つかりません" } }, { status: 404 })

  const metrics = await getNewsMetric(id)
  return NextResponse.json({ data: { ...article, ...metrics } })
}
