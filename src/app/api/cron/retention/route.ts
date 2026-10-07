import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isAuthorizedCron } from "@/lib/cron"
import { purgeDeletedAccount } from "@/lib/services/account"

export const maxDuration = 60

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return new NextResponse(null, { status: 404 })
  const now = Date.now()
  const [footprints, buckets, keys, events] = await Promise.all([
    prisma.footprint.deleteMany({ where: { visitedAt: { lt: new Date(now - 30 * 86400_000) } } }),
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    prisma.webhookEvent.deleteMany({ where: { receivedAt: { lt: new Date(now - 30 * 86400_000) } } }),
  ])
  const pending = await prisma.user.findMany({
    where: { status: "DELETED", NOT: { email: { endsWith: "@deleted.invalid" } } },
    select: { id: true },
    take: 20,
  })
  let purged = 0
  for (const u of pending) if (await purgeDeletedAccount(u.id)) purged++
  const result = { footprints: footprints.count, buckets: buckets.count, idempotencyKeys: keys.count, webhookEvents: events.count, purgedAccounts: purged }
  console.info("[cron/retention]", JSON.stringify(result))
  return NextResponse.json({ data: result })
}
