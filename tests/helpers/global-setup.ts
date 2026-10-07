import { execSync } from "node:child_process"
import type { TestProject } from "vitest/node"

// Integration tests run against a brand-new PostgreSQL database created for this run only
// (never an existing dev/prod database). Migrations are applied with the non-destructive
// `prisma migrate deploy`; the database created here is dropped again at teardown.
//
// TEST_PG_ADMIN_URL must point at a LOCAL server (127.0.0.1/localhost).

export default function setup(project: TestProject) {
  const admin = process.env.TEST_PG_ADMIN_URL || "postgresql://postgres@127.0.0.1:5433/postgres"
  const parsed = new URL(admin)
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("Integration tests only run against a local PostgreSQL server (TEST_PG_ADMIN_URL)")
  }
  const name = `daynet_it_${Date.now()}_${process.pid}`
  const psql = (sql: string) => execSync(`psql "${admin}" -v ON_ERROR_STOP=1 -q -c "${sql}"`, { stdio: "inherit" })
  psql(`CREATE DATABASE ${name}`)
  const url = new URL(admin)
  url.pathname = `/${name}`
  const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env })
  execSync("npx ts-node --project tsconfig.scripts.json scripts/seed-options.ts", { stdio: "inherit", env })
  project.provide("databaseUrl", url.toString())

  return () => {
    if (process.env.KEEP_TEST_DB) return
    psql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string
  }
}
