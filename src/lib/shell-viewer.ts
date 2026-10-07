import { prisma } from "@/lib/db"
import { getViewer } from "@/lib/api/viewer"
import { toUserSummary, userSummarySelect } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import type { ClientViewer } from "@/components/layout/ViewerContext"

export async function getShellViewer(): Promise<ClientViewer | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  const row = await prisma.user.findUnique({ where: { id: viewer.id }, select: userSummarySelect })
  if (!row) return null
  return { ...toUserSummary(row, await deliveryProvider()), profileComplete: viewer.profileComplete, role: viewer.role, isPrivate: viewer.isPrivate }
}
