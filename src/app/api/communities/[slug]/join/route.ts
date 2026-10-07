import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { slug } = await params
  const community = await prisma.community.findUnique({ where: { slug } })
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (community.isPrivate) return NextResponse.json({ error: "承認制コミュニティです" }, { status: 403 })

  const key = { communityId_userId: { communityId: community.id, userId: session.user.id } }
  const membership = await prisma.communityMember.findUnique({ where: key })
  if (membership?.role === "owner") return NextResponse.json({ joined: true, role: "owner" })

  if (membership) {
    await prisma.communityMember.delete({ where: key })
    return NextResponse.json({ joined: false, role: null })
  }

  await prisma.communityMember.create({ data: { communityId: community.id, userId: session.user.id } })
  return NextResponse.json({ joined: true, role: "member" })
}
