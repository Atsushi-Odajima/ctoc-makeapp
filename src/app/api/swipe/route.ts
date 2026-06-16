import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { targetId, direction } = await req.json()
  if (!targetId || !direction) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  // Record swipe
  await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId: session.user.id, swipedId: targetId } },
    create: { swiperId: session.user.id, swipedId: targetId, direction },
    update: { direction },
  })

  let matched = false
  let matchId: string | null = null

  if (direction === "like" || direction === "superlike") {
    // Check if other person liked us
    const theirSwipe = await prisma.swipe.findUnique({
      where: { swiperId_swipedId: { swiperId: targetId, swipedId: session.user.id } },
    })

    if (theirSwipe && (theirSwipe.direction === "like" || theirSwipe.direction === "superlike")) {
      // Create match
      const [a, b] = [session.user.id, targetId].sort()
      const existingMatch = await prisma.match.findUnique({
        where: { user1Id_user2Id: { user1Id: a, user2Id: b } },
      })

      if (!existingMatch) {
        const match = await prisma.match.create({
          data: { user1Id: a, user2Id: b },
        })
        matchId = match.id
      } else {
        matchId = existingMatch.id
      }
      matched = true
    }
  }

  return NextResponse.json({ matched, matchId })
}
