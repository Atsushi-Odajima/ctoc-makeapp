import { NextResponse, type NextRequest } from "next/server"
import { allowedOriginsFromEnv, isOriginAllowed } from "@/lib/origin"

// Next.js 16 "proxy" (formerly middleware). Only does the CSRF/Origin check for /api writes;
// authentication and authorization are enforced in each route handler (server-side policies).
export function proxy(request: NextRequest) {
  const allowed = isOriginAllowed({
    method: request.method,
    pathname: request.nextUrl.pathname,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    host: request.headers.get("x-forwarded-host") || request.headers.get("host"),
    allowedOrigins: allowedOriginsFromEnv(),
  })
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "ORIGIN_REJECTED", message: "このリクエストは受け付けられません" } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    )
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
