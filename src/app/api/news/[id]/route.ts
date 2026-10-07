import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getNewsMetric } from "@/lib/news"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await prisma.newsArticle.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const metrics = await getNewsMetric(id)
  return NextResponse.json({ ...article, ...metrics })
}
