import { z } from "zod"
import { prisma } from "@/lib/db"
import { ok, parseBody, parseQuery, route } from "@/lib/api/http"
import { Errors } from "@/lib/api/errors"
import { getViewer, requireCompleteProfile } from "@/lib/api/viewer"
import { pageSize } from "@/lib/api/pagination"
import { createPostSchema } from "@/lib/validation/schemas"
import { authorPostsWhere, createPost, getPostDTO, listPosts } from "@/lib/services/posts"
import { visiblePostWhere } from "@/lib/policies/posts"

const query = z.object({
  author: z.string().max(64).optional(),
  mine: z.enum(["true", "false"]).optional(),
  status: z.enum(["DRAFT", "PROCESSING", "FAILED"]).optional(),
  kind: z.enum(["NOTE", "PHOTO", "VIDEO"]).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.string().optional(),
})

export const GET = route(async (request: Request) => {
  const q = parseQuery(request.url, query)
  const viewer = await getViewer()
  const limit = pageSize(q.limit)
  const kindFilter = q.kind ? [{ kind: q.kind }] : []

  if (q.status) {
    // Own drafts / processing / failed posts only.
    if (!viewer) throw Errors.unauthenticated()
    const page = await listOwnUnpublished(viewer.id, q.status, q.cursor, limit)
    return ok(page.items, { nextCursor: page.nextCursor })
  }
  if (q.mine === "true") {
    if (!viewer) throw Errors.unauthenticated()
    const page = await listPosts(viewer.id, { AND: [authorPostsWhere(viewer.id, viewer.id), ...kindFilter] }, { cursor: q.cursor, limit })
    return ok(page.items, { nextCursor: page.nextCursor })
  }
  if (q.author) {
    const author = await prisma.user.findFirst({ where: { username: { equals: q.author, mode: "insensitive" }, status: "ACTIVE" }, select: { id: true } })
    if (!author) throw Errors.notFound()
    const page = await listPosts(viewer?.id ?? null, { AND: [authorPostsWhere(viewer?.id ?? null, author.id), ...kindFilter] }, { cursor: q.cursor, limit })
    return ok(page.items, { nextCursor: page.nextCursor })
  }
  const page = await listPosts(viewer?.id ?? null, { AND: [visiblePostWhere(viewer?.id ?? null), ...kindFilter] }, { cursor: q.cursor, limit })
  return ok(page.items, { nextCursor: page.nextCursor })
})

async function listOwnUnpublished(userId: string, status: "DRAFT" | "PROCESSING" | "FAILED", cursor: string | undefined, limit: number) {
  const { decodeCursor, paginate } = await import("@/lib/api/pagination")
  const c = decodeCursor(cursor)
  const rows = await prisma.post.findMany({
    where: {
      userId, status, deletedAt: null,
      ...(c ? { OR: [{ updatedAt: { lt: c.t } }, { updatedAt: c.t, id: { lt: c.id } }] } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: { id: true, updatedAt: true },
  })
  const page = paginate(rows, limit, r => r.updatedAt)
  return { items: await Promise.all(page.items.map(r => getPostDTO(userId, r.id))), nextCursor: page.nextCursor }
}

export const POST = route(async (request: Request) => {
  const viewer = await requireCompleteProfile()
  const input = await parseBody(request, createPostSchema)
  const key = request.headers.get("idempotency-key")
  const { postId, replayed } = await createPost(viewer, input, key)
  return ok(await getPostDTO(viewer.id, postId), { status: replayed ? 200 : 201, headers: replayed ? { "Idempotent-Replayed": "true" } : {} })
})
