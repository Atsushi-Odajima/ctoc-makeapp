// CSRF defence for cookie-authenticated API calls: state-changing requests must come from our
// own origin. Pure function so it can be unit-tested; used by src/proxy.ts.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
// Server-to-server endpoints with their own authentication (signatures / bearer secret),
// and Auth.js which has its own CSRF token.
const EXEMPT_PREFIXES = ["/api/auth/", "/api/media/webhook", "/api/cron/"]

export function isOriginAllowed(input: {
  method: string
  pathname: string
  origin: string | null
  secFetchSite: string | null
  host: string | null
  allowedOrigins: string[]
}): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return true
  if (!input.pathname.startsWith("/api/")) return true
  if (EXEMPT_PREFIXES.some(prefix => input.pathname.startsWith(prefix))) return true
  if (input.origin) {
    if (input.allowedOrigins.includes(input.origin)) return true
    try {
      return !!input.host && new URL(input.origin).host === input.host
    } catch {
      return false
    }
  }
  // No Origin header: accept only an explicit same-origin fetch.
  return input.secFetchSite === "same-origin"
}

export function allowedOriginsFromEnv(): string[] {
  return [process.env.APP_ORIGIN, ...(process.env.EXTRA_ALLOWED_ORIGINS || "").split(",")]
    .map(v => (v || "").trim().replace(/\/$/, ""))
    .filter(Boolean)
}
