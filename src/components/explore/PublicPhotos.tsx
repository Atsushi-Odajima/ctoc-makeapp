"use client"

import Link from "next/link"
import { useInfinite } from "@/components/ui/useInfinite"
import { GridTile } from "@/components/profile/PostGrid"
import type { PostDTO } from "@/lib/dto/post"

/** A small grid of the newest public photo posts (real data; renders nothing when there are none). */
export function PublicPhotos({ max = 9, headerClassName = "" }: { max?: number; headerClassName?: string }) {
  const { items, loading } = useInfinite<PostDTO>("/api/feed?tab=discover&limit=30")
  const photos = items.filter(p => p.media.length > 0).slice(0, max)
  if (loading) return <div aria-hidden className="grid grid-cols-3 gap-0.5">{Array.from({ length: max }, (_, i) => <div key={i} className="skeleton aspect-square rounded-none" />)}</div>
  if (!photos.length) return null
  return (
    <section aria-labelledby="public-photos">
      <div className={`mb-2 flex items-baseline justify-between ${headerClassName}`}>
        <h2 id="public-photos" className="t-ui font-bold">いま公開されている写真</h2>
        <Link href="/explore" className="t-small font-medium text-muted hover:text-ink">もっと見る</Link>
      </div>
      <ul className="grid grid-cols-3 gap-0.5">{photos.map(p => <li key={p.id}><GridTile post={p} /></li>)}</ul>
    </section>
  )
}
