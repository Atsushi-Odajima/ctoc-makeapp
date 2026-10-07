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
      <ul className="mx-[var(--gutter)] mb-3 flex gap-3 overflow-x-auto pb-1" aria-label="ストーリー（期限つき）">
        {groups.map(g => (
          <li key={g.user.id}>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 text-[10px]" onClick={() => setOpen({ group: g, index: 0 })} aria-label={`${g.user.name}のストーリーを見る`}>
              <span className="rounded-[14px] border-2 border-accent p-0.5"><Avatar user={g.user} size={44} /></span>
              <span className="max-w-[64px] truncate">{g.user.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `${open.group.user.name}のストーリー ${open.index + 1}/${open.group.stories.length}` : ""} variant="full">
        {story && (
          <div className="flex flex-col items-center gap-3">
            <img src={story.imageUrl} alt={story.caption ?? "ストーリーの画像"} referrerPolicy="no-referrer" className="max-h-[70dvh] w-auto max-w-full rounded-[12px] object-contain" />
            {story.caption && <p className="t-body">{story.caption}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" disabled={open!.index === 0} onClick={() => setOpen(o => o && { ...o, index: o.index - 1 })}>前へ</button>
              <button type="button" className="btn btn-secondary" disabled={open!.index >= open!.group.stories.length - 1} onClick={() => setOpen(o => o && { ...o, index: o.index + 1 })}>次へ</button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
