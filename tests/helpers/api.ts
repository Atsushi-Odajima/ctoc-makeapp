import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"

type SessionState = { userId: string | null; authTime?: number }
const session = () => (globalThis as unknown as { __daynetSession: SessionState }).__daynetSession

export function signInAs(userId: string | null, authTime?: number) {
  session().userId = userId
  session().authTime = authTime
}

type Handler = (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>

export async function call(
  handler: unknown,
  opts: { method?: string; path?: string; body?: unknown; headers?: Record<string, string>; params?: Record<string, string>; rawBody?: string } = {},
) {
  const url = `http://localhost:3000${opts.path ?? "/api/test"}`
  const init: RequestInit = { method: opts.method ?? "GET", headers: { "content-type": "application/json", ...opts.headers } }
  if (opts.rawBody !== undefined) init.body = opts.rawBody
  else if (opts.body !== undefined) init.body = JSON.stringify(opts.body)
  const response = await (handler as Handler)(new Request(url, init), { params: Promise.resolve(opts.params ?? {}) })
  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: response.status, json: json as { data?: unknown; nextCursor?: string | null; error?: { code: string; message: string; fieldErrors?: Record<string, string[]>; retryAfter?: number } } & Record<string, unknown>, headers: response.headers }
}

const TABLES_TO_KEEP = new Set(["ProfileOption", "_prisma_migrations"])

export async function resetDb() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  const names = rows.map(r => r.tablename).filter(n => !TABLES_TO_KEEP.has(n))
  // ModerationAction is append-only via trigger; TRUNCATE is not affected by row triggers.
  if (names.length) await prisma.$executeRawUnsafe(`TRUNCATE ${names.map(n => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`)
}

let counter = 0
const PASSWORD_HASH = hash("password-123", 4)

export async function createUser(opts: { username?: string; isPrivate?: boolean; complete?: boolean; role?: "USER" | "MODERATOR" | "ADMIN"; footprintOptIn?: boolean; dmPolicy?: "MUTUAL_OR_REQUEST" | "CLOSED" } = {}) {
  counter++
  const username = opts.username ?? `user_${counter}_${Math.random().toString(36).slice(2, 7)}`
  const user = await prisma.user.create({
    data: {
      email: `${username}@example.test`,
      password: await PASSWORD_HASH,
      name: `名前${counter}`,
      username,
      isPrivate: opts.isPrivate ?? false,
      role: opts.role ?? "USER",
      footprintOptIn: opts.footprintOptIn ?? false,
      dmPolicy: opts.dmPolicy ?? "MUTUAL_OR_REQUEST",
    },
  })
  if (opts.complete !== false) {
    await prisma.userHobby.createMany({ data: ["hobby_cafe", "hobby_walk", "hobby_photo"].map((optionId, position) => ({ userId: user.id, optionId, position })) })
    await prisma.user.update({ where: { id: user.id }, data: { strengthOptionId: "str_cafe_drawer", weaknessOptionId: "weak_mornings", profileVersion: 1, onboardingDone: true } })
  }
  return user
}

export async function follow(followerId: string, followingId: string, status: "ACCEPTED" | "PENDING" = "ACCEPTED") {
  return prisma.follow.create({ data: { followerId, followingId, status } })
}

export async function makePost(userId: string, opts: { caption?: string; visibility?: "PUBLIC" | "FOLLOWERS" | "COMMUNITY"; communityId?: string; status?: "PUBLISHED" | "DRAFT"; publishedAt?: Date } = {}) {
  const status = opts.status ?? "PUBLISHED"
  return prisma.post.create({
    data: {
      userId,
      caption: opts.caption ?? "テスト投稿",
      kind: "NOTE",
      visibility: opts.communityId ? "COMMUNITY" : opts.visibility ?? "PUBLIC",
      communityId: opts.communityId ?? null,
      status,
      publishedAt: status === "PUBLISHED" ? opts.publishedAt ?? new Date() : null,
    },
  })
}

export async function makeCommunity(ownerId: string, opts: { isPrivate?: boolean; slug?: string } = {}) {
  counter++
  return prisma.community.create({
    data: {
      slug: opts.slug ?? `c-${counter}-${Math.random().toString(36).slice(2, 7)}`,
      name: `集まり${counter}`,
      description: "テスト用の集まりです",
      category: "その他",
      isPrivate: opts.isPrivate ?? false,
      ownerId,
      members: { create: { userId: ownerId, role: "OWNER", status: "ACTIVE" } },
    },
  })
}

export function ids(items: unknown): string[] {
  return (Array.isArray(items) ? items : []).map(i => (i as { id: string }).id)
}
