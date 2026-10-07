import { NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron"
import { cleanupStaleMedia, runDeletionJobs } from "@/lib/services/media"

export const maxDuration = 60

// Idempotent, bounded batch: unattached media (24h), FAILED media (7d), provider deletions with
// retry/backoff. Failures are recorded on MediaDeletionJob.lastError.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return new NextResponse(null, { status: 404 })
  const cleanup = await cleanupStaleMedia()
  const deletions = await runDeletionJobs()
  console.info("[cron/media]", JSON.stringify({ cleanup, deletions }))
  return NextResponse.json({ data: { cleanup, deletions } })
}
