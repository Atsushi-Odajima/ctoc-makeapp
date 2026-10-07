import { NextResponse } from "next/server"

// Compatibility: old clients called /api/explore?q=. Search now lives at /api/search.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q")
  const target = q ? `/api/search?q=${encodeURIComponent(q)}` : "/api/feed?tab=discover"
  return NextResponse.redirect(new URL(target, url), 307)
}
