import type { Prisma } from "@prisma/client"
import { toMediaDTO, type MediaDTO } from "@/lib/media/delivery"
import type { MediaProvider } from "@/lib/media/provider"
import type { Relationship } from "@/lib/policies/relationships"

// Explicit allow-list selects. email, password, OAuth tokens, role, status flags and internal
// options are never selected for other users.
export const mediaDeliverySelect = {
  id: true, kind: true, status: true, width: true, height: true, durationMs: true, altText: true,
  provider: true, providerPublicId: true, resourceType: true, version: true, errorCode: true,
} satisfies Prisma.MediaSelect

export const userSummarySelect = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  status: true,
  avatarMedia: { select: mediaDeliverySelect },
} satisfies Prisma.UserSelect

export const publicUserSelect = {
  ...userSummarySelect,
  bio: true,
  website: true,
  isPrivate: true,
  createdAt: true,
  strengthOption: { select: { id: true, label: true } },
  weaknessOption: { select: { id: true, label: true } },
  hobbies: { select: { position: true, option: { select: { id: true, label: true } } }, orderBy: { position: "asc" } },
} satisfies Prisma.UserSelect

export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>
export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>

export interface AvatarDTO {
  url: string | null
  mediaId?: string
  expiresAt?: string | null
}

export interface UserSummary {
  id: string
  username: string
  name: string
  avatar: AvatarDTO | null
  deleted?: true
}

export interface OptionDTO { id: string; label: string }

export interface PublicUser extends UserSummary {
  avatarMedia: MediaDTO | null
  bio: string | null
  website: string | null
  strength: OptionDTO | null
  weakness: OptionDTO | null
  hobbies: OptionDTO[]
  isPrivate: boolean
  viewerRelationship: Omit<Relationship, "isSelf"> & { isSelf: boolean }
  counts: { posts: number; followers: number; following: number }
  communities: Array<{ slug: string; name: string }>
}

function avatarOf(row: UserSummaryRow, provider: MediaProvider | null): AvatarDTO | null {
  if (row.avatarMedia && row.avatarMedia.status === "READY") {
    const dto = toMediaDTO(row.avatarMedia, provider)
    if (dto.deliveryUrl) return { url: dto.deliveryUrl, mediaId: dto.id, expiresAt: dto.expiresAt }
  }
  if (row.avatar && /^https:\/\//.test(row.avatar)) return { url: row.avatar }
  return null
}

export function toUserSummary(row: UserSummaryRow, provider: MediaProvider | null): UserSummary {
  if (row.status === "DELETED") return { id: row.id, username: "deleted", name: "削除されたユーザー", avatar: null, deleted: true }
  return { id: row.id, username: row.username, name: row.name, avatar: avatarOf(row, provider) }
}

export function toPublicUser(
  row: PublicUserRow,
  provider: MediaProvider | null,
  extra: { relationship: Relationship; counts: PublicUser["counts"]; communities: PublicUser["communities"] },
): PublicUser {
  const summary = toUserSummary(row, provider)
  return {
    ...summary,
    avatarMedia: row.avatarMedia && row.avatarMedia.status === "READY" ? toMediaDTO(row.avatarMedia, provider) : null,
    bio: row.bio,
    website: row.website,
    strength: row.strengthOption,
    weakness: row.weaknessOption,
    hobbies: row.hobbies.map(h => h.option),
    isPrivate: row.isPrivate,
    viewerRelationship: extra.relationship,
    counts: extra.counts,
    communities: extra.communities,
  }
}
