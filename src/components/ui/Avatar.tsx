"use client"

import { MediaImage } from "@/components/media/MediaImage"
import type { UserSummary } from "@/lib/dto/user"

// Neutral tints for the default avatar (no people, no third-party avatar services). The initial
// is drawn in ink so it stays readable on every tint.
const TINTS = ["#E4E2DA", "#E9DDD6", "#DCE2DA", "#E0DEE4"]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function DefaultAvatar({ seed, name, size }: { seed: string; name: string; size: number }) {
  const initial = Array.from((name || "?").trim())[0] ?? "?"
  return (
    <span
      aria-hidden
      className="grid h-full w-full place-items-center font-bold text-ink"
      style={{ background: TINTS[hash(seed) % TINTS.length], fontSize: Math.round(size * 0.42), lineHeight: 1 }}
    >
      {initial}
    </span>
  )
}

/** Circular avatar. A thin inner ring keeps light photos from melting into the background. */
export function Avatar({ user, size = 36, decorative = true, className = "" }: { user: Pick<UserSummary, "id" | "name" | "avatar">; size?: number; decorative?: boolean; className?: string }) {
  const alt = decorative ? "" : `${user.name}のアイコン`
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_0_1px_rgba(32,33,31,0.08)] ${className}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : "img"}
      aria-label={decorative || user.avatar?.url ? undefined : alt}
    >
      {user.avatar?.url ? (
        <MediaImage mediaId={user.avatar.mediaId} src={user.avatar.url} alt={alt} className="h-full w-full object-cover" width={size} height={size} />
      ) : (
        <DefaultAvatar seed={user.id} name={user.name} size={size} />
      )}
    </span>
  )
}
