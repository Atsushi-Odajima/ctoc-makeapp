import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ok, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"

// Existing Stories are kept readable (expiry respected, accepted follows only, blocks applied).
// Creating new stories is out of scope for v4.
export const GET = route(async () => {
  const viewer = await requireViewer()
  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      user: {
        status: "ACTIVE",
        blocksMade: { none: { blockedId: viewer.id } },
        blocksReceived: { none: { blockerId: viewer.id } },
        OR: [{ id: viewer.id }, { followers: { some: { followerId: viewer.id, status: "ACCEPTED" } } }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, userId: true, imageUrl: true, caption: true, expiresAt: true, createdAt: true, user: { select: userSummarySelect } },
  })
  const provider = await deliveryProvider()
  const grouped = new Map<string, { user: ReturnType<typeof toUserSummary>; stories: Array<{ id: string; imageUrl: string; caption: string | null; expiresAt: string }> }>()
  for (const s of stories) {
    if (!/^https:\/\//.test(s.imageUrl)) continue
    if (!grouped.has(s.userId)) grouped.set(s.userId, { user: toUserSummary(s.user, provider), stories: [] })
    grouped.get(s.userId)!.stories.push({ id: s.id, imageUrl: s.imageUrl, caption: s.caption, expiresAt: s.expiresAt.toISOString() })
  }
  return ok([...grouped.values()])
})

export async function POST() {
  return NextResponse.json({ error: { code: "GONE", message: "ストーリーの新規作成は現在提供していません" } }, { status: 410 })
}
