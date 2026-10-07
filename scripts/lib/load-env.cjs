/* eslint-disable @typescript-eslint/no-require-imports */
// Single place that decides which env files are read by Prisma CLI, seed and tool scripts.
// Order (first wins, never overrides variables already set in the shell/CI):
//   .env.local  ->  .env
// Next.js itself reads the same files (.env.local before .env), so `npm run dev`
// and `npx prisma ...` see identical DATABASE_URL / DIRECT_URL values.
const path = require("node:path")
const dotenv = require("dotenv")

const root = path.resolve(__dirname, "..", "..")
dotenv.config({ path: [path.join(root, ".env.local"), path.join(root, ".env")], quiet: true })
