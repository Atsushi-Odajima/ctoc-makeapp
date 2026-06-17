import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const uid = session.user.id
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, avatar: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, username: true, avatar: true } } } },
    },
  })
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const isParticipant = conv.participants.some(p => p.userId === uid)
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json({ ...conv, otherUser: conv.participants.find(p => p.userId !== uid)?.user })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: conversationId } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })
  const msg = await prisma.directMessage.create({
    data: { conversationId, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
  return NextResponse.json(msg)
}
