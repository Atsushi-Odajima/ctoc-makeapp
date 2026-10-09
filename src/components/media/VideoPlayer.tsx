"use client"

import { useEffect, useRef } from "react"
import { useMediaRefresh } from "./useMediaRefresh"
import type { MediaDTO } from "@/lib/media/delivery"

// Real VIDEO media only. Manual start, starts muted, native controls, plays inline on iOS,
// metadata-only preload, pauses when scrolled away or when the tab is hidden.
export function VideoPlayer({ media }: { media: MediaDTO }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { url, posterUrl, failed, refresh } = useMediaRefresh({ id: media.id, url: media.deliveryUrl, posterUrl: media.posterUrl })

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (!entry.isIntersecting && !video.paused) video.pause()
    }, { threshold: 0.25 })
    observer.observe(video)
    const onHidden = () => { if (document.visibilityState !== "visible") video.pause() }
    document.addEventListener("visibilitychange", onHidden)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onHidden)
    }
  }, [url])

  async function onError() {
    const video = ref.current
    const position = video?.currentTime ?? 0
    const fresh = await refresh()
    if (fresh && video) {
      video.addEventListener("loadedmetadata", () => { video.currentTime = position }, { once: true })
    }
  }

  const seconds = media.durationMs ? Math.round(media.durationMs / 1000) : null
  if (failed || !url) {
    return <div className="grid aspect-video place-items-center bg-subtle text-muted t-small photo-radius">動画を表示できません</div>
  }
  return (
    <figure className="m-0">
      <video
        ref={ref}
        src={url}
        poster={posterUrl ?? undefined}
        controls
        playsInline
        muted
        preload="metadata"
        controlsList="nodownload"
        className="block max-h-[80vh] w-full bg-ink photo-radius"
        style={{ aspectRatio: media.width && media.height ? `${media.width} / ${media.height}` : "16 / 9" }}
        aria-label={media.altText || "投稿された動画"}
        onError={() => void onError()}
      />
      <figcaption className="mt-1 flex gap-2 text-muted t-tiny">
        <span>動画{seconds !== null ? `・${seconds}秒` : ""}</span>
        <span>最初は消音です（音声は再生ボタン横で切り替え）</span>
        <span>字幕なし</span>
      </figcaption>
    </figure>
  )
}
