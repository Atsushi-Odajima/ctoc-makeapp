import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id
  const convs = await prisma.conversation.findMany({
    where: { participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, avatar: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(convs.map(c => ({
    id: c.id,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    otherUser: c.participants.find(p => p.userId !== uid)?.user,
    lastMessage: c.messages[0] || null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { targetUserId } = await req.json()
  const uid = session.user.id
  const existing = await prisma.conversation.findFirst({
    where: { participants: { every: { userId: { in: [uid, targetUserId] } } } },
  })
  if (existing) return NextResponse.json({ id: existing.id })
  const conv = await prisma.conversation.create({
    data: { participants: { create: [{ userId: uid }, { userId: targetUserId }] } },
  })
  return NextResponse.json({ id: conv.id })
}
