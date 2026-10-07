import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Errors } from "./errors"

export interface Viewer {
  id: string
  username: string
  name: string
  role: "USER" | "MODERATOR" | "ADMIN"
  isPrivate: boolean
  profileComplete: boolean
  authTime?: number
}

/**
 * Resolve the signed-in user from the session cookie AND the database. The database is the
 * source of truth: suspended/deleted accounts are treated as signed out, role and profile
 * completeness are never taken from the (client-held) JWT.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, name: true, role: true, isPrivate: true, status: true,
      profileVersion: true, strengthOptionId: true, weaknessOptionId: true,
      _count: { select: { hobbies: true } },
    },
  })
  if (!user || user.status !== "ACTIVE") return null
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isPrivate: user.isPrivate,
    profileComplete: isProfileComplete(user),
    authTime: (session as unknown as { authTime?: number }).authTime,
  }
}

export function isProfileComplete(user: {
  profileVersion: number
  strengthOptionId: string | null
  weaknessOptionId: string | null
  _count: { hobbies: number }
}): boolean {
  return user.profileVersion > 0 && !!user.strengthOptionId && !!user.weaknessOptionId && user._count.hobbies === 3
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw Errors.unauthenticated()
  return viewer
}

/** New posts, comments and new DM conversations need the three required profile items. */
export async function requireCompleteProfile(): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!viewer.profileComplete) throw Errors.profileRequired()
  return viewer
}

export async function requireRole(roles: Array<Viewer["role"]>): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!roles.includes(viewer.role)) throw Errors.notFound()
  return viewer
}
