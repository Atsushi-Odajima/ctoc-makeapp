import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { requireCompleteProfile } from "@/lib/api/viewer"
import { getNewsMetric } from "@/lib/news"
import { enforce } from "@/lib/rate-limit"
import { LIMITS, plainText } from "@/lib/validation/text"

type Ctx = { params: Promise<{ id: string }> }
const schema = z.object({ caption: plainText(LIMITS.caption, { min: 1 }) }).strict()

// A quote post is a normal personal NOTE post linked to the article (same visibility rules).
export const POST = route(async (request: Request, ctx: Ctx) => {
  const viewer = await requireCompleteProfile()
  const { id } = await ctx.params
  const { caption } = await parseBody(request, schema)
  const article = await prisma.newsArticle.findUnique({ where: { id }, select: { id: true } })
  if (!article) throw Errors.notFound()
  await enforce("postCreate", viewer.id)
  const post = await prisma.post.create({
    data: {
      userId: viewer.id, caption, newsArticleId: id, kind: "NOTE",
      visibility: viewer.isPrivate ? "FOLLOWERS" : "PUBLIC", status: "PUBLISHED", publishedAt: new Date(),
    },
    select: { id: true },
  })
  return ok({ postId: post.id, metrics: await getNewsMetric(id) }, { status: 201 })
})
