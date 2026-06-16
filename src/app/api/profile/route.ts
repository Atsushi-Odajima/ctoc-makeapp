import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { interests: { include: { interest: true } } },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const photos = (() => {
    try { return JSON.parse(user.photos) } catch { return [] }
  })()

  return NextResponse.json({
    ...user,
    password: undefined,
    photos,
    interests: user.interests.map(ui => ui.interest),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { interests, photos, ...rest } = body

  const updateData: Record<string, unknown> = { ...rest }
  if (photos !== undefined) updateData.photos = JSON.stringify(photos)
  if (body.birthdate) updateData.birthdate = new Date(body.birthdate)

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  if (interests !== undefined) {
    await prisma.userInterest.deleteMany({ where: { userId: session.user.id } })
    if (interests.length > 0) {
      const interestRecords = await Promise.all(
        interests.map((name: string) =>
          prisma.interest.upsert({
            where: { name },
            create: { name },
            update: {},
          })
        )
      )
      for (const interest of interestRecords) {
        try {
          await prisma.userInterest.create({
            data: { userId: session.user!.id!, interestId: interest.id }
          })
        } catch { /* skip duplicates */ }
      }
    }
  }

  return NextResponse.json({ success: true, onboardingDone: user.onboardingDone })
}
