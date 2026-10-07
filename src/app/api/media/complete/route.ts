import { prisma } from "@/lib/db"
import { ok, parseBody, route } from "@/lib/api/http"
import { requireViewer } from "@/lib/api/viewer"
import { mediaCompleteSchema } from "@/lib/validation/schemas"
import { completeUpload } from "@/lib/services/media"
import { mediaDeliverySelect } from "@/lib/dto/user"
import { deliveryProvider, toMediaDTO } from "@/lib/media/delivery"

export const POST = route(async (request: Request) => {
  const viewer = await requireViewer()
  const { mediaId, result } = await parseBody(request, mediaCompleteSchema)
  await completeUpload(viewer, mediaId, result)
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId }, select: mediaDeliverySelect })
  return ok(toMediaDTO(media, await deliveryProvider(), { owner: true }))
})
