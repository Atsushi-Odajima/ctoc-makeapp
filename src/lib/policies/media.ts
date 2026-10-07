import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import { visiblePostWhere } from "./posts"
import { notBlockedUserWhere } from "./relationships"
import { mediaDeliverySelect } from "@/lib/dto/user"

/**
 * Media is readable only through the same ACL as its container:
 *   owner -> always; post media -> the post must be viewable and the media READY;
 *   avatar -> the account must be active and not blocked either way.
 * Everything else is 404.
 */
export async function loadViewableMedia(viewerId: string | null, mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { ...mediaDeliverySelect, ownerId: true, postId: true, purpose: true, legacyUrl: true },
  })
  if (!media || media.status === "DELETING") throw Errors.notFound()
  if (viewerId && media.ownerId === viewerId) return { media, owner: true }
  if (media.status !== "READY") throw Errors.notFound()
  if (media.purpose === "AVATAR") {
    const user = await prisma.user.findFirst({ where: { avatarMediaId: media.id, ...notBlockedUserWhere(viewerId) }, select: { id: true } })
    if (!user) throw Errors.notFound()
    return { media, owner: false }
  }
  if (!media.postId) throw Errors.notFound()
  const post = await prisma.post.findFirst({ where: { AND: [visiblePostWhere(viewerId), { id: media.postId }] }, select: { id: true } })
  if (!post) throw Errors.notFound()
  return { media, owner: false }
}
