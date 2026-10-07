import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"

const TTL_MS = 24 * 60 * 60 * 1000
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/

export function requestHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

export type IdempotentOutcome = { replayed: boolean; resultId: string }

/**
 * Run `create` at most once per (user, scope, key) within 24h.
 * - same key + same request  -> returns the first result id (replayed: true)
 * - same key + different body -> 409 IDEMPOTENCY_KEY_REUSED
 * - same key while first call is still running -> 409 IDEMPOTENCY_IN_PROGRESS (client retries)
 */
export async function withIdempotency(
  userId: string,
  scope: string,
  key: string | null,
  hash: string,
  create: () => Promise<string>,
): Promise<IdempotentOutcome> {
  if (!key) return { replayed: false, resultId: await create() }
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) throw Errors.invalid("Idempotency-Keyの形式が正しくありません")

  const where = { userId_scope_key: { userId, scope, key } }
  const existing = await prisma.idempotencyKey.findUnique({ where })
  if (existing && existing.expiresAt.getTime() <= Date.now()) {
    await prisma.idempotencyKey.deleteMany({ where: { userId, scope, key, expiresAt: { lte: new Date() } } })
  } else if (existing) {
    return replay(existing)
  }

  try {
    await prisma.idempotencyKey.create({
      data: { userId, scope, key, requestHash: hash, expiresAt: new Date(Date.now() + TTL_MS) },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.idempotencyKey.findUnique({ where })
      if (row) return replay(row)
    }
    throw error
  }

  let resultId: string
  try {
    resultId = await create()
  } catch (error) {
    await prisma.idempotencyKey.delete({ where }).catch(() => undefined)
    throw error
  }
  await prisma.idempotencyKey.update({ where, data: { resultId } })
  return { replayed: false, resultId }

  function replay(row: { requestHash: string; resultId: string | null }): IdempotentOutcome {
    if (row.requestHash !== hash) throw Errors.conflict("同じIdempotency-Keyが別の内容で使われています", "IDEMPOTENCY_KEY_REUSED")
    if (!row.resultId) throw Errors.conflict("前回の送信を処理中です。少し待ってから再試行してください", "IDEMPOTENCY_IN_PROGRESS")
    return { replayed: true, resultId: row.resultId }
  }
}
