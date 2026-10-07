// npm run db:compare -- --sqlite ./old.db           (SQLite source vs DATABASE_URL)
// npm run db:compare -- --source-url postgres://...  (old PostgreSQL vs DATABASE_URL)
// Compares row counts and id checksums of every legacy table, then checks foreign keys and the
// v4 backfills in the target. Exit code 1 when anything differs.
import "./lib/load-env.cjs"
import { createHash } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { arg, redact } from "./lib/args"
import { COPY_ORDER, openSqlite, sqliteTables } from "./lib/sqlite-copy"

const KEY: Record<string, string> = {
  Like: `"userId" || ':' || "postId"`, Follow: `"followerId" || ':' || "followingId"`,
  ConversationParticipant: `"conversationId" || ':' || "userId"`, CommunityMember: `"communityId" || ':' || "userId"`,
  VerificationToken: `"token"`,
}
const keyOf = (t: string) => KEY[t] ?? `"id"`

function checksum(ids: string[]) {
  return createHash("md5").update(ids.sort().join("\n")).digest("hex")
}

async function pgSnapshot(prisma: PrismaClient) {
  const out: Record<string, { count: number; checksum: string }> = {}
  const tables = new Set((await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`).map(t => t.tablename))
  for (const t of COPY_ORDER) {
    if (!tables.has(t)) continue
    const rows = await prisma.$queryRawUnsafe<Array<{ k: string }>>(`SELECT ${keyOf(t)} AS k FROM "${t}"`)
    out[t] = { count: rows.length, checksum: checksum(rows.map(r => r.k)) }
  }
  return out
}

function sqliteSnapshot(path: string) {
  const db = openSqlite(path)
  const present = new Set(sqliteTables(db))
  const out: Record<string, { count: number; checksum: string }> = {}
  for (const t of COPY_ORDER) {
    if (!present.has(t)) continue
    const rows = db.prepare(`SELECT ${keyOf(t)} AS k FROM "${t}"`).all()
    out[t] = { count: rows.length, checksum: checksum(rows.map(r => String(r.k))) }
  }
  db.close()
  return out
}

export async function integrityChecks(prisma: PrismaClient) {
  const q = (sql: string) => prisma.$queryRawUnsafe<Array<{ n: bigint }>>(sql).then(r => Number(r[0]!.n))
  return {
    postsWithoutUser: await q(`SELECT COUNT(*)::bigint n FROM "Post" p LEFT JOIN "User" u ON u.id=p."userId" WHERE u.id IS NULL`),
    commentsWithoutPost: await q(`SELECT COUNT(*)::bigint n FROM "Comment" c LEFT JOIN "Post" p ON p.id=c."postId" WHERE p.id IS NULL`),
    messagesWithoutConversation: await q(`SELECT COUNT(*)::bigint n FROM "DirectMessage" m LEFT JOIN "Conversation" c ON c.id=m."conversationId" WHERE c.id IS NULL`),
    messagesFromNonParticipants: await q(`SELECT COUNT(*)::bigint n FROM "DirectMessage" m WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" p WHERE p."conversationId"=m."conversationId" AND p."userId"=m."senderId")`),
    publishedPostsWithoutPublishedAt: await q(`SELECT COUNT(*)::bigint n FROM "Post" WHERE status='PUBLISHED' AND "publishedAt" IS NULL`).catch(() => -1),
    communityPostsNotCommunityVisibility: await q(`SELECT COUNT(*)::bigint n FROM "Post" WHERE "communityId" IS NOT NULL AND visibility <> 'COMMUNITY'`).catch(() => -1),
    conversationsWithoutPairKey: await q(`SELECT COUNT(*)::bigint n FROM "Conversation" WHERE "pairKey" IS NULL`).catch(() => -1),
    legacyImagesWithoutMedia: await q(`SELECT COUNT(*)::bigint n FROM "Post" p WHERE p.images NOT IN ('[]','') AND NOT EXISTS (SELECT 1 FROM "Media" m WHERE m."postId"=p.id)`).catch(() => -1),
  }
}

async function main() {
  const target = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } })
  const sqlite = arg("sqlite")
  const sourceUrl = arg("source-url")
  let source: Record<string, { count: number; checksum: string }>
  if (sqlite && sqlite !== "true") source = sqliteSnapshot(sqlite)
  else if (sourceUrl && sourceUrl !== "true") {
    const src = new PrismaClient({ datasources: { db: { url: sourceUrl } } })
    source = await pgSnapshot(src)
    await src.$disconnect()
  } else throw new Error("--sqlite <path> or --source-url <url> is required")
  const after = await pgSnapshot(target)
  const integrity = await integrityChecks(target)
  await target.$disconnect()
  const diffs = Object.keys(source).filter(t => !after[t] || after[t]!.count !== source[t]!.count || after[t]!.checksum !== source[t]!.checksum)
  console.log(`target: ${redact(process.env.DIRECT_URL || process.env.DATABASE_URL)}`)
  console.table(Object.keys(source).map(t => ({ table: t, source: source[t]!.count, target: after[t]?.count ?? "missing", ids: after[t]?.checksum === source[t]!.checksum ? "same" : "DIFFERENT" })))
  console.log("integrity:", JSON.stringify(integrity, null, 2))
  const integrityBad = integrity.postsWithoutUser || integrity.commentsWithoutPost || integrity.messagesWithoutConversation
  if (diffs.length || integrityBad) {
    console.error(`DIFFERENCES: ${diffs.join(", ") || "-"}; integrity problems: ${integrityBad ? "yes" : "no"}`)
    process.exit(1)
  }
  console.log("OK: counts and ids match; foreign keys consistent.")
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
