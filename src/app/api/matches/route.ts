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
      user1: { include: { interests: { include: { interest: true } } } },
      user2: { include: { interests: { include: { interest: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const formatted = matches.map(match => {
    const otherUser = match.user1Id === session.user!.id ? match.user2 : match.user1
    const parsePhotos = (p: string) => { try { return JSON.parse(p) } catch { return [] } }
    return {
      id: match.id,
      createdAt: match.createdAt,
      otherUser: {
        ...otherUser,
        password: undefined,
        photos: parsePhotos(otherUser.photos),
        interests: otherUser.interests.map(ui => ui.interest),
      },
      lastMessage: match.messages[0] || null,
      unreadCount: 0,
    }
  })

  return NextResponse.json(formatted)
}
