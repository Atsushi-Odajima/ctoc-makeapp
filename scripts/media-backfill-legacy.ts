// npm run media:backfill-legacy
// Re-runs the idempotent backfill section of 0002_daynet_v4 (publishedAt, COMMUNITY visibility,
// Media rows for legacy Post.images, pairKey, acceptedAt). Use it right after the final data copy
// / cutover so rows written by the old app version in between are converted too.
import "./lib/load-env.cjs"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

const migration = readFileSync(path.resolve("prisma/migrations/0002_daynet_v4/migration.sql"), "utf8")
const marker = "-- Backfills (idempotent; safe to re-run)"
const index = migration.indexOf(marker)
if (index === -1) throw new Error("backfill section not found in 0002_daynet_v4")
const end = migration.indexOf("-- Added after the backfill above")
const sql = migration.slice(index, end === -1 ? undefined : end)
const file = path.join(mkdtempSync(path.join(os.tmpdir(), "daynet-")), "backfill.sql")
writeFileSync(file, sql)
execFileSync("npx", ["prisma", "db", "execute", "--file", file, "--url", process.env.DIRECT_URL || process.env.DATABASE_URL || ""], { stdio: "inherit" })
console.log("backfill applied")
