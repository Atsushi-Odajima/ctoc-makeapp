import { ok, route } from "@/lib/api/http"
import { getViewer } from "@/lib/api/viewer"
import { listFeed } from "@/lib/services/posts"

// Compatibility endpoint for the old portal home. The previous version turned still images into
// "Reels" and ranked posts with a synthetic score; both were removed. Returns the chronological
// discover feed (ACL applied). `reels` is always empty: only real VIDEO media is played anywhere.
export const GET = route(async () => {
  const viewer = await getViewer()
  const page = await listFeed(viewer?.id ?? null, viewer ? "following" : "discover", { limit: 20 })
  return ok({ feed: page.items, reels: [], recommended: [], accounts: [], personalized: false })
})
