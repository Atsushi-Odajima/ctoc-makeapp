import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { getViewer, requireCompleteProfile } from "@/lib/api/viewer"
import { getNewsMetric } from "@/lib/news"
import { notBlockedUserWhere } from "@/lib/policies/relationships"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import { enforce } from "@/lib/rate-limit"
import { LIMITS, plainText } from "@/lib/validation/text"
import { z } from "zod"

type Ctx = { params: Promise<{ id: string }> }
const schema = z.object({ content: plainText(LIMITS.comment, { min: 1 }) }).strict()

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const viewer = await getViewer()
  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) throw Errors.notFound()
  const [comments, metrics] = await Promise.all([
    prisma.newsComment.findMany({
      where: { articleId: id, user: notBlockedUserWhere(viewer?.id ?? null) },
      select: { id: true, content: true, createdAt: true, user: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    getNewsMetric(id),
  ])
  const provider = await deliveryProvider()
  return ok({ comments: comments.map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString(), user: toUserSummary(c.user, provider) })), metrics })
})

export const POST = route(async (request: Request, ctx: Ctx) => {
  const viewer = await requireCompleteProfile()
  const { id } = await ctx.params
  const { content } = await parseBody(request, schema)
  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) throw Errors.notFound()
  await enforce("comment", viewer.id)
  const comment = await prisma.newsComment.create({
    data: { articleId: id, userId: viewer.id, content },
    select: { id: true, content: true, createdAt: true, user: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  return ok({
    comment: { id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), user: toUserSummary(comment.user, provider) },
    metrics: await getNewsMetric(id),
  }, { status: 201 })
})
