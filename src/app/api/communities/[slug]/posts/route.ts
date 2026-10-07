import { z } from "zod"
import { ok, parseBody, parseQuery, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { getViewer, requireCompleteProfile } from "@/lib/api/viewer"
import { pageSize } from "@/lib/api/pagination"
import { getCommunityAccess } from "@/lib/policies/communities"
import { visiblePostWhere } from "@/lib/policies/posts"
import { createPostSchema } from "@/lib/validation/schemas"
import { createPost, getPostDTO, listPosts } from "@/lib/services/posts"

type Ctx = { params: Promise<{ slug: string }> }
const query = z.object({ cursor: z.string().max(200).optional(), limit: z.string().optional() })

export const GET = route(async (request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const q = parseQuery(request.url, query)
  const viewer = await getViewer()
  const access = await getCommunityAccess(viewer?.id ?? null, slug)
  if (!access.canViewContent) throw Errors.notFound("参加が承認されると読めます")
  const page = await listPosts(viewer?.id ?? null, { AND: [visiblePostWhere(viewer?.id ?? null), { communityId: access.community.id }] }, { cursor: q.cursor, limit: pageSize(q.limit) })
  return ok(page.items, { nextCursor: page.nextCursor })
})

// Delegates to the shared post service (same validation, media rules, idempotency, rate limits).
export const POST = route(async (request: Request, ctx: Ctx) => {
  const { slug } = await ctx.params
  const viewer = await requireCompleteProfile()
  const input = await parseBody(request, createPostSchema.omit({ communitySlug: true, visibility: true }))
  const { postId, replayed } = await createPost(viewer, { ...input, communitySlug: slug, visibility: "COMMUNITY" }, request.headers.get("idempotency-key"))
  return ok(await getPostDTO(viewer.id, postId), { status: replayed ? 200 : 201 })
})
