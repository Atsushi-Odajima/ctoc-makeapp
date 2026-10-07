// npm run db:backup                       -> pg_dump (custom format) of DIRECT_URL/DATABASE_URL
// npm run db:backup -- --sqlite ./x.db    -> consistent SQLite copy via VACUUM INTO
// Writes into ./backups (git-ignored) with a manifest of row counts + sha256. Never include
// backups in the code ZIP or the repository.
import "./lib/load-env.cjs"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { arg, redact } from "./lib/args"
import { sqliteCounts } from "./lib/sqlite-copy"

const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const dir = path.resolve(arg("out") && arg("out") !== "true" ? arg("out")! : "backups")
mkdirSync(dir, { recursive: true })

function sha256(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex")
}

async function main() {
  const sqlite = arg("sqlite")
  if (sqlite && sqlite !== "true") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require("node:sqlite")
    const target = path.join(dir, `daynet-sqlite-${stamp}.db`)
    const db = new DatabaseSync(sqlite)
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
    db.close()
    const check = new DatabaseSync(target, { readOnly: true })
    const counts = sqliteCounts(check)
    check.close()
    const manifest = { kind: "sqlite", source: sqlite, file: target, sha256: sha256(target), counts, createdAt: new Date().toISOString() }
    writeFileSync(`${target}.manifest.json`, JSON.stringify(manifest, null, 2))
    console.log(JSON.stringify(manifest, null, 2))
    return
  }
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL / DIRECT_URL is not set")
  const file = path.join(dir, `daynet-pg-${stamp}.dump`)
  console.log(`pg_dump ${redact(url)} -> ${file}`)
  // pg_dump must be the same major version as (or newer than) the server.
  execFileSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", file, url], { stdio: "inherit" })
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  const counts: Record<string, number> = {}
  for (const t of tables) counts[t.tablename] = Number((await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT COUNT(*)::bigint AS n FROM "${t.tablename}"`))[0]!.n)
  await prisma.$disconnect()
  const manifest = { kind: "postgres", source: redact(url), file, sha256: sha256(file), counts, createdAt: new Date().toISOString(), restore: `pg_restore --no-owner --dbname <EMPTY_DB_URL> ${path.basename(file)}` }
  writeFileSync(`${file}.manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify(manifest, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
