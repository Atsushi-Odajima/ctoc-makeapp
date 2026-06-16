import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: true,
      user2: true,
    },
  })

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (match.user1Id !== session.user.id && match.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, photos: true } },
    },
  })

  const parsePhotos = (p: string) => { try { return JSON.parse(p) } catch { return [] } }
  const otherUser = match.user1Id === session.user.id ? match.user2 : match.user1

  return NextResponse.json({
    match,
    otherUser: {
      ...otherUser,
      password: undefined,
      photos: parsePhotos(otherUser.photos),
    },
    messages: messages.map(m => ({
      ...m,
      sender: { ...m.sender, photos: parsePhotos(m.sender.photos) },
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: matchId } = await params
  const { content } = await req.json()

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (match.user1Id !== session.user.id && match.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const message = await prisma.message.create({
    data: { matchId, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { id: true, name: true, photos: true } } },
  })

  const parsePhotos = (p: string) => { try { return JSON.parse(p) } catch { return [] } }

  return NextResponse.json({
    ...message,
    sender: { ...message.sender, photos: parsePhotos(message.sender.photos) },
  })
}
