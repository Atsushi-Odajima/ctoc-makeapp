import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: session.user.id }, { user2Id: session.user.id }],
    },
    include: {
      user1: true,
      user2: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const parsePhotos = (p: string) => { try { return JSON.parse(p) } catch { return [] } }

  const formatted = matches.map(match => {
    const otherUser = match.user1Id === session.user!.id ? match.user2 : match.user1
    return {
      id: match.id,
      createdAt: match.createdAt,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        photos: parsePhotos(otherUser.photos),
        lastActive: otherUser.lastActive,
      },
      lastMessage: match.messages[0] || null,
    }
  })

  return NextResponse.json(formatted)
}
