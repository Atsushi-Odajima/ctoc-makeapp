import { Errors } from "./errors"

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

export interface Cursor {
  t: Date
  id: string
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.t.toISOString()}|${cursor.id}`, "utf8").toString("base64url")
}

export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null
  let raw: string
  try {
    raw = Buffer.from(value, "base64url").toString("utf8")
  } catch {
    throw Errors.invalid("nextCursorが正しくありません", undefined, "INVALID_CURSOR")
  }
  const [iso, id, ...rest] = raw.split("|")
  const t = new Date(iso ?? "")
  if (rest.length || !id || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || Number.isNaN(t.getTime()) || t.toISOString() !== iso) {
    throw Errors.invalid("nextCursorが正しくありません", undefined, "INVALID_CURSOR")
  }
  return { t, id }
}

export function pageSize(value: string | null | undefined): number {
  if (value === null || value === undefined || value === "") return DEFAULT_PAGE_SIZE
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) throw Errors.invalid("limitが正しくありません")
  return Math.min(MAX_PAGE_SIZE, n)
}

/** Keyset condition for ORDER BY <field> DESC, id DESC. */
export function beforeCursor<F extends string>(field: F, cursor: Cursor | null) {
  if (!cursor) return {}
  return {
    OR: [
      { [field]: { lt: cursor.t } },
      { [field]: cursor.t, id: { lt: cursor.id } },
    ],
  } as Record<string, unknown>
}

/** Given take = limit + 1 rows, return the page and the cursor for the next page. */
export function paginate<T extends { id: string }>(rows: T[], limit: number, timeOf: (row: T) => Date) {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  return { items, nextCursor: hasMore && last ? encodeCursor({ t: timeOf(last), id: last.id }) : null }
}
