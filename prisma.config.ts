// Prisma CLI configuration. Env loading is shared with scripts/* via scripts/lib/load-env.cjs
// so that `npx prisma ...` reads .env.local (then .env) exactly like `next dev`.
import "./scripts/lib/load-env.cjs"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
})
