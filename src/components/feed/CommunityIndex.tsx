"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import type { CommunityDTO } from "@/lib/services/communities"
import { CommunitySymbol } from "@/components/community/CommunitySymbol"

export function CommunityIndex() {
  const [items, setItems] = useState<CommunityDTO[] | null>(null)
  useEffect(() => {
    api<CommunityDTO[]>("/api/communities?scope=joined&limit=8").then(r => setItems(r.data.filter(c => c.membership?.status === "ACTIVE"))).catch(() => setItems([]))
  }, [])
  return (
    <div className="sticky top-4 mt-4">
      <h2 className="t-section">参加している集まり</h2>
      {items === null ? (
        <p className="mt-2 text-muted t-small" aria-busy="true">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-muted t-small">まだ参加していません。<Link href="/communities" className="underline">集まりを探す</Link></p>
      ) : (
        <ul className="mt-2">
          {items.map(c => (
            <li key={c.id} className="border-t border-line">
              <Link href={`/communities/${c.slug}`} className="flex min-h-[48px] items-center gap-3 py-2 hover:underline">
                <CommunitySymbol seed={c.slug} size={32} />
                <span className="min-w-0 flex-1 truncate t-body">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
