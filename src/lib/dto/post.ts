import type { Prisma } from "@prisma/client"
import { toMediaDTO, type MediaDTO } from "@/lib/media/delivery"
import type { MediaProvider } from "@/lib/media/provider"
import { mediaDeliverySelect, toUserSummary, userSummarySelect, type UserSummary } from "./user"

export function postSelect(viewerId: string | null) {
  return {
    id: true,
    userId: true,
    caption: true,
    kind: true,
    visibility: true,
    status: true,
    location: true,
    revision: true,
    createdAt: true,
    updatedAt: true,
    publishedAt: true,
    hiddenAt: true,
    user: { select: userSummarySelect },
    community: { select: { id: true, slug: true, name: true, isPrivate: true } },
    newsArticle: { select: { id: true, title: true, link: true, source: true, category: true, publishedAt: true } },
    media: { select: { ...mediaDeliverySelect, sortOrder: true }, orderBy: { sortOrder: "asc" as const }, where: { status: { not: "DELETING" as const } } },
    _count: {
      select: {
        likes: true,
        empathies: true,
        comments: { where: { deletedAt: null, hiddenAt: null } },
      },
    },
    likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    empathies: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    bookmarks: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
  } satisfies Prisma.PostSelect
}

export type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>

export interface PostDTO {
  id: string
  kind: "NOTE" | "PHOTO" | "VIDEO"
  visibility: "PUBLIC" | "FOLLOWERS" | "COMMUNITY"
  status: "DRAFT" | "PROCESSING" | "PUBLISHED" | "FAILED" | "DELETED"
  caption: string | null
  location: string | null
  createdAt: string
  publishedAt: string | null
  edited: boolean
  revision: number
  author: UserSummary
  community: { id: string; slug: string; name: string; isPrivate: boolean } | null
  newsArticle: { id: string; title: string; link: string; source: string; category: string; publishedAt: string } | null
  media: MediaDTO[]
  counts: { likes: number; empathies: number; comments: number }
  viewer: { liked: boolean; empathized: boolean; bookmarked: boolean; isOwner: boolean }
  hidden?: boolean
}

export function toPostDTO(row: PostRow, viewerId: string | null, provider: MediaProvider | null): PostDTO {
  const isOwner = viewerId === row.userId
  const media = row.media
    .filter(m => isOwner || m.status === "READY")
    .map(m => toMediaDTO(m, provider, { owner: isOwner }))
  return {
    id: row.id,
    kind: row.kind,
    visibility: row.visibility,
    status: row.status,
    caption: row.caption,
    location: row.location,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    edited: row.revision > 0,
    revision: row.revision,
    author: toUserSummary(row.user, provider),
    community: row.community,
    newsArticle: row.newsArticle ? { ...row.newsArticle, publishedAt: row.newsArticle.publishedAt.toISOString() } : null,
    media,
    counts: { likes: row._count.likes, empathies: row._count.empathies, comments: row._count.comments },
    viewer: {
      liked: Array.isArray(row.likes) && row.likes.length > 0,
      empathized: Array.isArray(row.empathies) && row.empathies.length > 0,
      bookmarked: Array.isArray(row.bookmarks) && row.bookmarks.length > 0,
      isOwner,
    },
    ...(isOwner && row.hiddenAt ? { hidden: true } : {}),
  }
}
