"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/client/api"
import type { UserSummary } from "@/lib/dto/user"

interface Group { user: UserSummary; stories: Array<{ id: string; imageUrl: string; caption: string | null; expiresAt: string }> }

// Existing Stories (legacy feature) stay viewable until they expire. No new stories are created
// in v4, and this row renders nothing when there are none.
export function StoriesRow() {
  const [groups, setGroups] = useState<Group[]>([])
  const [open, setOpen] = useState<{ group: Group; index: number } | null>(null)
  useEffect(() => { api<Group[]>("/api/stories").then(r => setGroups(r.data)).catch(() => undefined) }, [])
  if (!groups.length) return null
  const story = open ? open.group.stories[open.index] : null
  return (
    <>
      <ul className="flex gap-4 overflow-x-auto px-[var(--gutter)] pb-3 pt-1 sm:px-0" aria-label="ストーリー（期限つき）">
        {groups.map(g => (
          <li key={g.user.id}>
            <button type="button" className="flex w-[68px] flex-col items-center gap-1 text-[13px] leading-[1.3]" onClick={() => setOpen({ group: g, index: 0 })} aria-label={`${g.user.name}のストーリーを見る`}>
              <span className="rounded-full border-2 border-accent p-[2px]"><Avatar user={g.user} size={56} /></span>
              <span className="max-w-[68px] truncate">{g.user.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `${open.group.user.name}のストーリー ${open.index + 1}/${open.group.stories.length}` : ""} variant="full">
        {story && (
          <div className="flex flex-col items-center gap-3">
            <img src={story.imageUrl} alt={story.caption ?? "ストーリーの画像"} referrerPolicy="no-referrer" className="max-h-[70dvh] w-auto max-w-full rounded-[4px] object-contain" />
            {story.caption && <p className="t-body text-white/90">{story.caption}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary text-ink" disabled={open!.index === 0} onClick={() => setOpen(o => o && { ...o, index: o.index - 1 })}>前へ</button>
              <button type="button" className="btn btn-secondary text-ink" disabled={open!.index >= open!.group.stories.length - 1} onClick={() => setOpen(o => o && { ...o, index: o.index + 1 })}>次へ</button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
