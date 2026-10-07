"use client"
/* eslint-disable @next/next/no-img-element */
import { useMediaRefresh } from "./useMediaRefresh"

interface Props {
  mediaId?: string
  src: string | null
  alt: string
  className?: string
  style?: React.CSSProperties
  width?: number | null
  height?: number | null
  loading?: "lazy" | "eager"
}

export function MediaImage({ mediaId, src, alt, className, style, width, height, loading = "lazy" }: Props) {
  const { url, failed, refresh } = useMediaRefresh({ id: mediaId, url: src })
  if (failed || !url) {
    return (
      <div role="img" aria-label={alt ? `${alt}（表示できません）` : "画像を表示できません"} className={`grid place-items-center bg-tabbg text-muted t-small ${className ?? ""}`} style={style}>
        表示できません
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => void refresh()}
    />
  )
}
