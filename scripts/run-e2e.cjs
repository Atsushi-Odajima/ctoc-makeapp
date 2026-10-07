/* eslint-disable @typescript-eslint/no-require-imports */
// npm run test:e2e
// 1. creates a brand-new LOCAL database (E2E_PG_ADMIN_URL, default postgresql://postgres@127.0.0.1:5433/postgres)
// 2. prisma migrate deploy + seed:options
// 3. next build (skip with E2E_SKIP_BUILD=1) and next start on :3100 with MEDIA_PROVIDER=local
// 4. playwright test; 5. stops the server and drops only the database it created
const { execSync, spawn } = require("node:child_process")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const admin = process.env.E2E_PG_ADMIN_URL || "postgresql://postgres@127.0.0.1:5433/postgres"
const parsed = new URL(admin)
if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("E2E only runs against a local PostgreSQL server")
const name = `daynet_e2e_${Date.now()}`
const dbUrl = new URL(admin)
dbUrl.pathname = `/${name}`
const port = process.env.E2E_PORT || "3100"
const env = {
  ...process.env,
  DATABASE_URL: dbUrl.toString(),
  DIRECT_URL: dbUrl.toString(),
  AUTH_SECRET: "e2e-only-auth-secret-0123456789abcdefghijklmnop",
  AUTH_TRUST_HOST: "true",
  APP_ORIGIN: `http://localhost:${port}`,
  MEDIA_PROVIDER: "local",
  MEDIA_URL_SECRET: "e2e-only-media-secret-0123456789abcdef",
  CRON_SECRET: "e2e-only-cron-secret",
  NEXT_PUBLIC_ENABLE_SW: "1",
  RATE_LIMIT_SCALE: "20", // the suite registers many accounts from one IP
  E2E_BASE_URL: `http://localhost:${port}`,
  E2E_DATABASE_URL: dbUrl.toString(),
}
const run = (cmd, extra = {}) => execSync(cmd, { stdio: "inherit", cwd: root, env: { ...env, ...extra } })

let server
let code = 1
async function main() {
  run(`psql "${admin}" -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE ${name}"`)
  try {
    run("npx prisma migrate deploy")
    run("npx ts-node --project tsconfig.scripts.json scripts/seed-options.ts")
    if (!process.env.E2E_SKIP_BUILD) run("npx next build", { NODE_ENV: "production" })
    try {
      await fetch(`http://localhost:${port}/`)
      throw new Error(`port ${port} is already in use — stop the other server first`)
    } catch (error) {
      if (String(error).includes("already in use")) throw error
    }
    // Spawn next directly in its own process group so the whole server tree can be stopped.
    server = spawn(process.execPath, [require.resolve("next/dist/bin/next", { paths: [root] }), "start", "-p", port], {
      cwd: root, env, stdio: ["ignore", "inherit", "inherit"], detached: true,
    })
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://localhost:${port}/login`)
        if (res.ok) break
      } catch { /* starting */ }
      await new Promise(r => setTimeout(r, 1000))
    }
    try {
      run(`npx playwright test ${process.argv.slice(2).join(" ")}`)
      code = 0
    } catch {
      code = 1
    }
  } finally {
    if (server) {
      try { process.kill(-server.pid, "SIGTERM") } catch { server.kill("SIGTERM") }
    }
    await new Promise(r => setTimeout(r, 1500))
    if (!process.env.KEEP_E2E_DB) run(`psql "${admin}" -q -c "DROP DATABASE IF EXISTS ${name} WITH (FORCE)"`)
  }
  process.exit(code)
}
main().catch(error => { console.error(error); process.exit(1) })
