import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ensureStarterCommunities, makeCommunitySlug } from "@/lib/communities"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const session = await auth()
  await ensureStarterCommunities()
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 20)
  const take = Math.min(40, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20))

  const communities = await prisma.community.findMany({
    include: {
      _count: { select: { members: true, posts: true } },
      members: session?.user?.id ? { where: { userId: session.user.id }, select: { role: true } } : false,
    },
    orderBy: [{ members: { _count: "desc" } }, { createdAt: "asc" }],
    take,
  })

  return NextResponse.json(communities.map(community => ({
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    category: community.category,
    coverImage: community.coverImage,
    isPrivate: community.isPrivate,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: Array.isArray(community.members) && community.members.length > 0,
    role: Array.isArray(community.members) ? community.members[0]?.role || null : null,
  })))
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : "その他"
  if (name.length < 2 || name.length > 40) return NextResponse.json({ error: "名前は2〜40文字で入力してください" }, { status: 400 })
  if (description.length < 5 || description.length > 240) return NextResponse.json({ error: "説明は5〜240文字で入力してください" }, { status: 400 })

  const community = await prisma.community.create({
    data: {
      slug: makeCommunitySlug(name),
      name,
      description,
      category: category.slice(0, 24),
      ownerId: session.user.id,
      members: { create: { userId: session.user.id, role: "owner" } },
    },
  })
  return NextResponse.json({ ...community, memberCount: 1, postCount: 0, isMember: true, role: "owner" }, { status: 201 })
}
