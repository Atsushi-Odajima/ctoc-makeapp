import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"

export interface CommunityAccess {
  community: { id: string; slug: string; name: string; isPrivate: boolean; ownerId: string | null }
  membership: { role: "OWNER" | "MODERATOR" | "MEMBER"; status: "PENDING" | "ACTIVE" } | null
  isActiveMember: boolean
  canViewContent: boolean // posts, media, member list
  canModerate: boolean // accept/decline join requests, edit
}

export function canViewCommunityContentPure(isPrivate: boolean, membershipStatus: "PENDING" | "ACTIVE" | null): boolean {
  return !isPrivate || membershipStatus === "ACTIVE"
}

/** canViewCommunity: community metadata (name/description/member count) is always visible;
 * content (posts, media, member list) of private communities is limited to ACTIVE members. */
export async function getCommunityAccess(viewerId: string | null, slug: string): Promise<CommunityAccess> {
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, isPrivate: true, ownerId: true },
  })
  if (!community) throw Errors.notFound()
  const membership = viewerId
    ? await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: viewerId } },
      select: { role: true, status: true },
    })
    : null
  const isActiveMember = membership?.status === "ACTIVE"
  return {
    community,
    membership,
    isActiveMember,
    canViewContent: canViewCommunityContentPure(community.isPrivate, membership?.status ?? null),
    canModerate: isActiveMember && (membership!.role === "OWNER" || membership!.role === "MODERATOR"),
  }
}
