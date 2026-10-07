import { inject, vi } from "vitest"

// Must run before anything imports "@/lib/db".
process.env.DATABASE_URL = inject("databaseUrl")
process.env.DIRECT_URL = inject("databaseUrl")

// Route handlers call auth() from "@/lib/auth"; tests choose the signed-in user here.
const state: { userId: string | null; authTime?: number } = { userId: null }

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId }, authTime: state.authTime, expires: "2099-01-01" } : null)),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

;(globalThis as unknown as { __daynetSession: typeof state }).__daynetSession = state
