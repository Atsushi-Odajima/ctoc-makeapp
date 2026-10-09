"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import type { MediaDTO } from "@/lib/media/delivery"
import { MediaImage } from "./MediaImage"
import { VideoPlayer } from "./VideoPlayer"

// Feed frame: the first photo's own ratio, clamped to 4:5 (tall) … 1.91:1 (wide) so portrait,
// square and landscape posts all keep their shape without one post taking over the screen. The
// frame is reserved before the image loads (no layout jump). Anything outside the frame is never
// lost: tapping the photo opens the whole original (and the "全体" mark says it was trimmed).
export function frameRatio(w: number | null, h: number | null) {
  if (!w || !h) return 4 / 5
  return Math.min(1.91, Math.max(0.8, w / h))
}

function isCropped(m: MediaDTO, frame: number) {
  if (!m.width || !m.height) return false
  return Math.abs(m.width / m.height - frame) > 0.02
}

export function MediaGallery({ media, eager = false }: { media: MediaDTO[]; eager?: boolean }) {
  const [index, setIndex] = useState(0)
  const [full, setFull] = useState(false)
  const track = useRef<HTMLDivElement>(null)

  const onScroll = useCallback(() => {
    const el = track.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }, [])
  const go = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  if (!media.length) return null
  const video = media.find(m => m.kind === "VIDEO")
  if (video) {
    if (video.status !== "READY") return <ProcessingTile media={video} />
    return <VideoPlayer media={video} />
  }
  const first = media[0]!
  const frame = frameRatio(first.width, first.height)
  const current = media[Math.min(index, media.length - 1)]!
  const many = media.length > 1

  return (
    <div className="group/gallery relative">
      <div ref={track} className={`bg-subtle photo-radius ${many ? "carousel" : "overflow-hidden"}`} onScroll={many ? onScroll : undefined} aria-roledescription={many ? "カルーセル" : undefined} aria-label={many ? `写真 ${media.length}枚` : undefined}>
        {media.map((m, i) => (
          <div key={m.id} className="relative" style={{ aspectRatio: String(frame) }} aria-roledescription={many ? "スライド" : undefined} aria-label={many ? `${i + 1}枚目 / ${media.length}枚` : undefined}>
            {m.status !== "READY" ? (
              <ProcessingTile media={m} fill />
            ) : (
              <button type="button" className="block h-full w-full cursor-zoom-in" onClick={() => { setIndex(i); setFull(true) }} aria-label={`${m.altText || `${i + 1}枚目の写真`}の全体を見る`} tabIndex={many && i !== index ? -1 : 0}>
                <MediaImage
                  mediaId={m.id}
                  src={m.deliveryUrl}
                  alt={m.altText || `添付画像 ${i + 1}枚目`}
                  className="block h-full w-full object-cover"
                  width={m.width}
                  height={m.height}
                  loading={eager && i === 0 ? "eager" : "lazy"}
                />
                {isCropped(m, frame) && (
                  <span aria-hidden className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-[4px] bg-[#20211F]/65 px-1.5 py-0.5 text-[13px] font-medium leading-[1.4] text-white">
                    <Icon name="expand" size={14} />全体
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {many && (
        <>
          <span aria-hidden className="pointer-events-none absolute right-2 top-2 rounded-full bg-[#20211F]/65 px-2 py-0.5 t-label text-[13px] leading-[1.4] text-white">{index + 1}/{media.length}</span>
          <button type="button" className="icon-btn absolute left-1 top-[calc(50%-10px)] -translate-y-1/2 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/gallery:opacity-100 disabled:!opacity-0 [@media(hover:none)]:hidden" onClick={() => go(index - 1)} disabled={index === 0} aria-label="前の写真">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-ink"><Icon name="chevronLeft" size={18} /></span>
          </button>
          <button type="button" className="icon-btn absolute right-1 top-[calc(50%-10px)] -translate-y-1/2 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/gallery:opacity-100 disabled:!opacity-0 [@media(hover:none)]:hidden" onClick={() => go(index + 1)} disabled={index === media.length - 1} aria-label="次の写真">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-ink"><Icon name="chevronRight" size={18} /></span>
          </button>
          <p className="sr-only" aria-live="polite">{index + 1}枚目 / {media.length}枚</p>
        </>
      )}

      {many && (
        <div className="flex h-5 items-end justify-center gap-1" aria-hidden>
          {media.map((m, i) => <span key={m.id} className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${i === index ? "bg-accent" : "bg-line"}`} />)}
        </div>
      )}

      <Lightbox open={full} onClose={() => setFull(false)} media={media} index={index} onIndex={i => { setIndex(i); go(i) }} current={current} />
    </div>
  )
}

function Lightbox({ open, onClose, media, index, onIndex, current }: { open: boolean; onClose: () => void; media: MediaDTO[]; index: number; onIndex: (i: number) => void; current: MediaDTO }) {
  useEffect(() => {
    if (!open || media.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1)
      if (e.key === "ArrowRight" && index < media.length - 1) onIndex(index + 1)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, index, media.length, onIndex])
  return (
    <Dialog open={open} onClose={onClose} title={media.length > 1 ? `写真 ${index + 1} / ${media.length}` : "写真"} variant="full">
      <div className="relative flex h-full min-h-[70dvh] items-center justify-center">
        <MediaImage mediaId={current.id} src={current.deliveryUrl} alt={current.altText || "添付画像"} className="max-h-[78dvh] w-auto max-w-full object-contain" width={current.width} height={current.height} loading="eager" />
        {media.length > 1 && (
          <>
            <button type="button" className="icon-btn absolute left-0 top-1/2 -translate-y-1/2 hover:bg-white/10 disabled:opacity-30" onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="前の写真"><Icon name="chevronLeft" /></button>
            <button type="button" className="icon-btn absolute right-0 top-1/2 -translate-y-1/2 hover:bg-white/10 disabled:opacity-30" onClick={() => onIndex(index + 1)} disabled={index === media.length - 1} aria-label="次の写真"><Icon name="chevronRight" /></button>
          </>
        )}
      </div>
      {current.altText && <p className="mx-auto mt-3 max-w-[60ch] text-center text-white/80 t-small">{current.altText}</p>}
    </Dialog>
  )
}

function ProcessingTile({ media, fill = false }: { media: MediaDTO; fill?: boolean }) {
  const failed = media.status === "FAILED"
  return (
    <div role="status" className={`grid place-items-center gap-2 bg-subtle px-6 text-center text-muted t-small ${fill ? "h-full w-full" : "aspect-[4/3] photo-radius"}`}>
      <span className="flex flex-col items-center gap-2">
        <Icon name={failed ? "alert" : media.kind === "VIDEO" ? "video" : "image"} size={28} />
        {failed
          ? "メディアの処理に失敗しました。投稿を編集して再選択するか、削除してください。"
          : media.kind === "VIDEO" ? "動画を処理しています。完了すると公開されます。" : "処理中です"}
      </span>
    </div>
  )
}
