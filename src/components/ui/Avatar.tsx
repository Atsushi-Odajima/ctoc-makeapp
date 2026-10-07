"use client"

import { MediaImage } from "@/components/media/MediaImage"
import type { UserSummary } from "@/lib/dto/user"

const SHAPES = [
  { bg: "#E2DDF0", a: "#EF7C68", b: "#302B38" },
  { bg: "#F8D5CC", a: "#302B38", b: "#EF7C68" },
  { bg: "#ECE7F3", a: "#EF7C68", b: "#665F6E" },
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Geometric default avatar (no people, no third-party avatar services). */
function DefaultAvatar({ seed, size }: { seed: string; size: number }) {
  const s = SHAPES[hash(seed) % SHAPES.length]!
  const variant = hash(seed + "v") % 2
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden focusable="false" className="block">
      <rect width="40" height="40" rx="12" fill={s.bg} />
      {variant === 0 ? (
        <><path d="M8 31 20 10l12 21Z" fill={s.a} /><circle cx="17" cy="25" r="6" fill={s.b} /></>
      ) : (
        <><rect x="9" y="9" width="15" height="15" fill={s.b} /><circle cx="25" cy="25" r="8" fill={s.a} /></>
      )}
    </svg>
  )
}

export function Avatar({ user, size = 39, decorative = true, className = "" }: { user: Pick<UserSummary, "id" | "name" | "avatar">; size?: number; decorative?: boolean; className?: string }) {
  const radius = Math.round(size * 0.3)
  const alt = decorative ? "" : `${user.name}のアイコン`
  return (
    <span className={`inline-block shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size, borderRadius: radius }}>
      {user.avatar?.url ? (
        <MediaImage mediaId={user.avatar.mediaId} src={user.avatar.url} alt={alt} className="h-full w-full object-cover" width={size} height={size} />
      ) : (
        <DefaultAvatar seed={user.id} size={size} />
      )}
    </span>
  )
}
