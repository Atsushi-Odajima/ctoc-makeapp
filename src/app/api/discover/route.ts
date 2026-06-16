import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Get IDs of users already swiped
  const swipedIds = await prisma.swipe.findMany({
    where: { swiperId: session.user.id },
    select: { swipedId: true },
  })
  const excludeIds = [session.user.id, ...swipedIds.map(s => s.swipedId)]

  const minAge = currentUser.minAge ?? 18
  const maxAge = currentUser.maxAge ?? 80
  const today = new Date()
  const minBirth = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate())
  const maxBirth = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())

  const genderFilter = (currentUser.lookingFor && currentUser.lookingFor !== "everyone")
    ? { gender: currentUser.lookingFor }
    : {}
  const ageFilter = currentUser.birthdate
    ? { birthdate: { gte: minBirth, lte: maxBirth } }
    : {}

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      showMe: true,
      onboardingDone: true,
      photos: { not: "[]" },
      ...genderFilter,
      ...ageFilter,
    },
    include: {
      interests: { include: { interest: true } },
    },
    take: 20,
    orderBy: { lastActive: "desc" },
  })

  const formatted = users.map(u => ({
    ...u,
    password: undefined,
    photos: (() => { try { return JSON.parse(u.photos) } catch { return [] } })(),
    interests: u.interests.map(ui => ui.interest),
  }))

  return NextResponse.json(formatted)
}
