"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ErrorState, Skeletons } from "@/components/ui/States"
import { Icon } from "@/components/ui/Icon"
import { api, ApiClientError } from "@/lib/client/api"
import { relativeTime } from "@/lib/client/format"

interface Item { id: string; title: string; publishedAt: string; category: string; source: string; comments: number }

// Secondary feature kept from the previous portal. Not part of the main navigation.
export default function NewsPage() {
  const [data, setData] = useState<{ provider: string; providerUrl: string; items: Item[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState("すべて")
  useEffect(() => { api<NonNullable<typeof data>>("/api/news").then(r => setData(r.data)).catch(e => setError(e instanceof ApiClientError ? e.message : "読み込めませんでした")) }, [])
  const categories = ["すべて", ...new Set((data?.items ?? []).map(i => i.category))]
  const items = (data?.items ?? []).filter(i => category === "すべて" || i.category === category)
  return (
    <div className="feed-column gutter desktop:px-0 desktop:pt-6">
      <h1 className="t-h1 mt-4">ニュース</h1>
      {data && <p className="text-muted t-small">提供: <a href={data.providerUrl} target="_blank" rel="noopener noreferrer" className="underline">{data.provider}</a></p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map(c => <button key={c} type="button" aria-pressed={category === c} className="chip" onClick={() => setCategory(c)}>{category === c && <Icon name="check" size={16} />}{c}</button>)}
      </div>
      {error ? <div className="mt-4"><ErrorState message={error} /></div> : !data ? <div className="mt-4"><Skeletons count={1} /></div> : (
        <ul className="mt-3">
          {items.map(i => (
            <li key={i.id} className="border-b border-line">
              <Link href={`/news/${i.id}`} className="block py-3">
                <span className="block text-muted t-tiny">{i.category} · {i.source} · {relativeTime(i.publishedAt)}</span>
                <span className="block font-bold t-body">{i.title}</span>
                {i.comments > 0 && <span className="text-muted t-tiny">コメント {i.comments}件</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
