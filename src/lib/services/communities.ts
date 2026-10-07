import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { getCommunityAccess, type CommunityAccess } from "@/lib/policies/communities"
import { visiblePostWhere } from "@/lib/policies/posts"
import { notify } from "./notifications"

export interface CommunityDTO {
  id: string
  slug: string
  name: string
  description: string
  category: string
  isPrivate: boolean
  memberCount: number
  postCount: number | null // null when the viewer may not see the content
  membership: { role: "OWNER" | "MODERATOR" | "MEMBER"; status: "PENDING" | "ACTIVE"; showOnProfile: boolean } | null
  canViewContent: boolean
  canModerate: boolean
  muted: boolean
}

const communitySelect = (viewerId: string | null) => ({
  id: true, slug: true, name: true, description: true, category: true, isPrivate: true, createdAt: true,
  _count: { select: { members: { where: { status: "ACTIVE" as const } } } },
  members: viewerId ? { where: { userId: viewerId }, select: { role: true, status: true, showOnProfile: true } } : false,
  mutes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
}) satisfies Prisma.CommunitySelect

type Row = Prisma.CommunityGetPayload<{ select: ReturnType<typeof communitySelect> }>

async function toDTO(row: Row, viewerId: string | null): Promise<CommunityDTO> {
  const membership = Array.isArray(row.members) && row.members[0] ? row.members[0] : null
  const canViewContent = !row.isPrivate || membership?.status === "ACTIVE"
  const postCount = canViewContent
    ? await prisma.post.count({ where: { AND: [visiblePostWhere(viewerId), { communityId: row.id }] } })
    : null
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description, category: row.category, isPrivate: row.isPrivate,
    memberCount: row._count.members,
    postCount,
    membership,
    canViewContent,
    canModerate: membership?.status === "ACTIVE" && (membership.role === "OWNER" || membership.role === "MODERATOR"),
    muted: Array.isArray(row.mutes) && row.mutes.length > 0,
  }
}

export async function listCommunities(viewerId: string | null, opts: { q?: string; scope?: "joined" | "discover"; limit: number }) {
  const where: Prisma.CommunityWhereInput = {}
  if (opts.q) where.OR = [{ name: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }, { category: { contains: opts.q, mode: "insensitive" } }]
  if (opts.scope === "joined") {
    if (!viewerId) return []
    where.members = { some: { userId: viewerId } }
  } else if (opts.scope === "discover" && viewerId) {
    where.members = { none: { userId: viewerId, status: "ACTIVE" } }
  }
  const rows = await prisma.community.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: opts.limit,
    select: communitySelect(viewerId),
  })
  return Promise.all(rows.map(row => toDTO(row, viewerId)))
}

export async function getCommunityDTO(viewerId: string | null, slug: string) {
  const row = await prisma.community.findUnique({ where: { slug }, select: communitySelect(viewerId) })
  if (!row) throw Errors.notFound()
  return toDTO(row, viewerId)
}

export function makeCommunitySlug(name: string) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
  return `${ascii || "community"}-${Date.now().toString(36)}`
}

export async function createCommunity(viewer: Viewer, input: { name: string; description: string; category: string; isPrivate: boolean }) {
  const community = await prisma.community.create({
    data: {
      slug: makeCommunitySlug(input.name),
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim().slice(0, 24) || "その他",
      isPrivate: input.isPrivate,
      ownerId: viewer.id,
      members: { create: { userId: viewer.id, role: "OWNER", status: "ACTIVE" } },
    },
    select: { slug: true },
  })
  return community.slug
}

export async function joinCommunity(viewer: Viewer, slug: string) {
  const access = await getCommunityAccess(viewer.id, slug)
  if (access.membership) return access.membership
  const status = access.community.isPrivate ? "PENDING" : "ACTIVE"
  await prisma.communityMember.create({ data: { communityId: access.community.id, userId: viewer.id, role: "MEMBER", status } })
  if (status === "PENDING") {
    const moderators = await prisma.communityMember.findMany({
      where: { communityId: access.community.id, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } },
      select: { userId: true },
    })
    for (const m of moderators) {
      await notify({ userId: m.userId, type: "community_request", fromUserId: viewer.id, content: access.community.name }).catch(() => undefined)
    }
  }
  return { role: "MEMBER" as const, status }
}

export async function leaveCommunity(viewer: Viewer, slug: string) {
  const access = await getCommunityAccess(viewer.id, slug)
  if (!access.membership) return { left: true }
  if (access.membership.role === "OWNER") throw Errors.conflict("管理者は退出できません", "OWNER_CANNOT_LEAVE")
  await prisma.communityMember.delete({ where: { communityId_userId: { communityId: access.community.id, userId: viewer.id } } })
  return { left: true }
}

export async function requireModerator(viewer: Viewer, slug: string): Promise<CommunityAccess> {
  const access = await getCommunityAccess(viewer.id, slug)
  if (!access.canModerate) {
    if (!access.canViewContent) throw Errors.notFound()
    throw Errors.forbidden("集まりの管理者だけが操作できます")
  }
  return access
}

export async function answerJoinRequest(viewer: Viewer, slug: string, userId: string, accept: boolean) {
  const access = await requireModerator(viewer, slug)
  const key = { communityId_userId: { communityId: access.community.id, userId } }
  const member = await prisma.communityMember.findUnique({ where: key })
  if (!member || member.status !== "PENDING") throw Errors.notFound()
  if (accept) {
    await prisma.communityMember.update({ where: key, data: { status: "ACTIVE" } })
    await notify({ userId, type: "community_accept", fromUserId: viewer.id, content: access.community.name }).catch(() => undefined)
  } else {
    await prisma.communityMember.delete({ where: key })
  }
  return { userId, status: accept ? "ACTIVE" : "NONE" }
}
