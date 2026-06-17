import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const footprints = await prisma.footprint.findMany({
    where: { visitedId: session.user.id },
    include: { visitor: { select: { id: true, name: true, username: true, avatar: true } } },
    orderBy: { visitedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(footprints)
}
