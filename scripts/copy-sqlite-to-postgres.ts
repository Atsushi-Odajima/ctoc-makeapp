// npm run db:copy-sqlite -- --sqlite ./prisma/dev.db
// Copies an existing SQLite database into the EMPTY PostgreSQL database in DATABASE_URL that
// has ONLY 0001_baseline applied. Afterwards run `npx prisma migrate deploy` (applies 0002 with
// conversions/backfills) and `npm run db:compare -- --sqlite <same file>`. See MIGRATION_RUNBOOK.txt.
import "./lib/load-env.cjs"
import { PrismaClient } from "@prisma/client"
import { arg, redact } from "./lib/args"
import { copySqliteToPostgres } from "./lib/sqlite-copy"

async function main() {
  const sqlite = arg("sqlite")
  if (!sqlite || sqlite === "true") throw new Error("--sqlite <path> is required")
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  console.log(`source: ${sqlite}\ntarget: ${redact(url)}`)
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const applied = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    ).catch(() => [])
    const names = applied.map(a => a.migration_name)
    if (!names.includes("0001_baseline") || names.some(n => n !== "0001_baseline")) {
      throw new Error(`target must have exactly 0001_baseline applied (found: ${names.join(", ") || "none"})`)
    }
    const report = await copySqliteToPostgres(sqlite, prisma)
    console.log(JSON.stringify(report, null, 2))
    console.log("Next: npx prisma migrate deploy && npm run db:compare -- --sqlite " + sqlite)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
