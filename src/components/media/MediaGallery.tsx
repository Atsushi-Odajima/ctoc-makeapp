"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import type { MediaDTO } from "@/lib/media/delivery"
import { MediaImage } from "./MediaImage"
import { VideoPlayer } from "./VideoPlayer"

// Feed crop range 4:5 … 1.91:1; the stored original is never cropped and can always be viewed
// whole via 「全体を見る」. Only real VIDEO media get a player.
function clampRatio(w: number | null, h: number | null) {
  if (!w || !h) return 4 / 3
  return Math.min(1.91, Math.max(0.8, w / h))
}

export function MediaGallery({ media, eager = false }: { media: MediaDTO[]; eager?: boolean }) {
  const [index, setIndex] = useState(0)
  const [full, setFull] = useState(false)
  if (!media.length) return null
  const video = media.find(m => m.kind === "VIDEO")
  if (video) {
    if (video.status !== "READY") return <ProcessingTile media={video} />
    return <VideoPlayer media={video} />
  }
  const current = media[Math.min(index, media.length - 1)]!
  if (current.status !== "READY") return <ProcessingTile media={current} />
  const ratio = clampRatio(current.width, current.height)
  return (
    <div>
      <div className="relative">
        <MediaImage
          mediaId={current.id}
          src={current.deliveryUrl}
          alt={current.altText || `添付画像 ${index + 1}枚目`}
          className="block w-full bg-tabbg object-cover photo-radius"
          style={{ aspectRatio: String(ratio) }}
          width={current.width}
          height={current.height}
          loading={eager ? "eager" : "lazy"}
        />
        <button type="button" className="icon-btn absolute right-2 top-2 bg-surface/85" onClick={() => setFull(true)} aria-label="画像の全体を見る">
          <Icon name="expand" size={20} />
        </button>
        {media.length > 1 && (
          <>
            <button type="button" className="icon-btn absolute left-2 top-1/2 -translate-y-1/2 bg-surface/85 disabled:opacity-45" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} aria-label="前の画像">
              <Icon name="chevronLeft" size={20} />
            </button>
            <button type="button" className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 bg-surface/85 disabled:opacity-45" onClick={() => setIndex(i => Math.min(media.length - 1, i + 1))} disabled={index === media.length - 1} aria-label="次の画像">
              <Icon name="chevronRight" size={20} />
            </button>
          </>
        )}
      </div>
      {media.length > 1 && <p className="mt-1 text-center text-muted t-meta" aria-live="polite">{index + 1} / {media.length}</p>}
      <Dialog open={full} onClose={() => setFull(false)} title={`画像 ${index + 1} / ${media.length}`} variant="full">
        <div className="flex min-h-[70dvh] items-center justify-center">
          <MediaImage mediaId={current.id} src={current.deliveryUrl} alt={current.altText || "添付画像"} className="max-h-[80dvh] w-auto max-w-full object-contain" width={current.width} height={current.height} loading="eager" />
        </div>
        {current.altText && <p className="mt-2 t-small">{current.altText}</p>}
      </Dialog>
    </div>
  )
}

function ProcessingTile({ media }: { media: MediaDTO }) {
  const failed = media.status === "FAILED"
  return (
    <div role="status" className="grid aspect-[4/3] place-items-center bg-tabbg px-6 text-center photo-radius t-small">
      {failed
        ? "メディアの処理に失敗しました。投稿を編集して再選択するか、削除してください。"
        : media.kind === "VIDEO" ? "動画を処理しています。完了すると公開されます。" : "処理中です"}
    </div>
  )
}
