// SQLite (Harenowa schema) -> PostgreSQL copy, used by scripts/copy-sqlite-to-postgres.ts and the
// migration rehearsal test. Reads with Node's built-in node:sqlite (Node 22+).
//
// The target database must be at the BASELINE (0001_baseline applied, 0002 NOT yet applied):
// rows are copied as-is, then `prisma migrate deploy` applies 0002_daynet_v4 which converts
// enums and performs all backfills. This way SQLite-era data goes through exactly the same
// conversion as an existing PostgreSQL database.
import type { PrismaClient } from "@prisma/client"

// Parents before children (FK order). Unknown/extra tables are reported, not guessed.
export const COPY_ORDER = [
  "User", "Account", "Session", "VerificationToken", "NewsArticle", "Community",
  "Post", "Like", "Comment", "Follow", "Story", "Footprint", "Notification",
  "Conversation", "ConversationParticipant", "DirectMessage", "NewsComment", "NewsActivity", "CommunityMember",
]

type Row = Record<string, unknown>

export interface CopyReport {
  tables: Array<{ table: string; source: number; copied: number }>
  skippedTables: string[]
}

interface SqliteDb {
  prepare(sql: string): { all(...params: unknown[]): Row[] }
  close(): void
}

export function openSqlite(path: string): SqliteDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (p: string, o?: { readOnly?: boolean }) => SqliteDb }
  return new DatabaseSync(path, { readOnly: true })
}

export function sqliteTables(db: SqliteDb): string[] {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'").all().map(r => String(r.name))
}

export function sqliteCounts(db: SqliteDb): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of sqliteTables(db)) out[t] = Number(db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).all()[0]!.n)
  return out
}

async function pgColumns(prisma: PrismaClient, table: string) {
  return prisma.$queryRaw<Array<{ column_name: string; data_type: string; udt_name: string }>>`
    SELECT column_name, data_type, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}`
}

function convert(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined) return null
  if (dataType === "boolean") return value === 1 || value === "1" || value === true || value === "true"
  if (dataType.startsWith("timestamp")) {
    // Prisma's SQLite connector stores DateTime as epoch milliseconds; older rows may be ISO text.
    const d = typeof value === "number" || typeof value === "bigint" ? new Date(Number(value)) : new Date(String(value).replace(" ", "T"))
    if (Number.isNaN(d.getTime())) throw new Error(`invalid datetime value: ${String(value)}`)
    return d
  }
  if (dataType === "integer" || dataType === "bigint") return value === "" ? null : Number(value)
  if (typeof value === "bigint") return value.toString()
  return String(value)
}

function orderComments(rows: Row[]): Row[] {
  const done = new Set<string>()
  const out: Row[] = []
  let pending = rows
  while (pending.length) {
    const next: Row[] = []
    for (const r of pending) {
      if (!r.parentId || done.has(String(r.parentId))) {
        out.push(r)
        done.add(String(r.id))
      } else next.push(r)
    }
    if (next.length === pending.length) {
      // parent missing in source: keep the row, drop the dangling parent link (reported by db:compare)
      for (const r of next) out.push({ ...r, parentId: null })
      break
    }
    pending = next
  }
  return out
}

export async function copySqliteToPostgres(sqlitePath: string, prisma: PrismaClient, log: (msg: string) => void = console.log): Promise<CopyReport> {
  const db = openSqlite(sqlitePath)
  const present = new Set(sqliteTables(db))
  const report: CopyReport = { tables: [], skippedTables: [...present].filter(t => !COPY_ORDER.includes(t)) }
  try {
    await prisma.$transaction(async tx => {
      for (const table of COPY_ORDER) {
        if (!present.has(table)) continue
        const target = await pgColumns(tx as unknown as PrismaClient, table)
        if (!target.length) throw new Error(`target table "${table}" does not exist — apply 0001_baseline first`)
        const existing = Number((await tx.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT COUNT(*)::bigint AS n FROM "${table}"`))[0]!.n)
        if (existing > 0) throw new Error(`target table "${table}" is not empty (${existing} rows) — refusing to merge`)
        let rows = db.prepare(`SELECT * FROM "${table}"`).all()
        if (table === "Comment") rows = orderComments(rows)
        const sourceCols = rows.length ? Object.keys(rows[0]!) : []
        const types = new Map(target.map(c => [c.column_name, c.data_type]))
        const cols = sourceCols.filter(c => types.has(c))
        const dropped = sourceCols.filter(c => !types.has(c))
        if (dropped.length) throw new Error(`columns ${dropped.join(", ")} of "${table}" have no target column — schema mismatch`)
        const batch = 200
        for (let i = 0; i < rows.length; i += batch) {
          const chunk = rows.slice(i, i + batch)
          const params: unknown[] = []
          const tuples = chunk.map(row => `(${cols.map(c => {
            params.push(convert(row[c], types.get(c)!))
            return `$${params.length}`
          }).join(",")})`)
          await tx.$executeRawUnsafe(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(",")}) VALUES ${tuples.join(",")}`, ...params)
        }
        report.tables.push({ table, source: rows.length, copied: rows.length })
        log(`copied ${table}: ${rows.length}`)
      }
    }, { timeout: 15 * 60_000, maxWait: 60_000 })
  } finally {
    db.close()
  }
  return report
}
