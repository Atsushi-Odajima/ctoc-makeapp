"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { Notice, Skeletons } from "@/components/ui/States"
import { api } from "@/lib/client/api"
import { relativeTime } from "@/lib/client/format"
import type { UserSummary } from "@/lib/dto/user"

export default function FootprintsPage() {
  const [data, setData] = useState<{ optedIn: boolean; items: Array<{ id: string; visitedAt: string; visitor: UserSummary }> } | null>(null)
  useEffect(() => { api<typeof data>("/api/footprints").then(r => setData(r.data)).catch(() => setData({ optedIn: false, items: [] })) }, [])
  return (
    <div className="mx-auto max-w-[640px] gutter">
      <div className="flex items-center gap-2 py-2"><Link href="/profile" className="icon-btn" aria-label="戻る"><Icon name="back" /></Link><h1 className="t-h2">足あと</h1></div>
      <p className="mb-3 text-muted t-small">お互いに「足あと」を有効にしている人どうしだけ、プロフィールを訪れた記録が残ります（1日1回・30日で消去）。投稿の閲覧数ではありません。</p>
      {!data ? <Skeletons count={1} /> : !data.optedIn ? (
        <Notice tone="info">足あとはオフです。<Link href="/settings" className="underline">設定</Link>でオンにすると、同じくオンにしている人の訪問が記録されます。</Notice>
      ) : data.items.length === 0 ? <p className="text-muted t-small">まだ記録はありません。</p> : (
        <ul>
          {data.items.map(f => (
            <li key={f.id}>
              <Link href={`/u/${f.visitor.username}`} className="flex min-h-[56px] items-center gap-3 border-b border-line py-2">
                <Avatar user={f.visitor} size={36} />
                <span className="flex-1 truncate">{f.visitor.name}</span>
                <span className="text-muted t-tiny">{relativeTime(f.visitedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
