"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { ErrorState, Skeletons } from "@/components/ui/States"
import { PostCard } from "@/components/post/PostCard"
import { CommunitySymbol } from "@/components/community/CommunitySymbol"
import { api, ApiClientError } from "@/lib/client/api"
import type { PostDTO } from "@/lib/dto/post"
import type { UserSummary } from "@/lib/dto/user"
import type { CommunityDTO } from "@/lib/services/communities"

interface Result { users: UserSummary[]; communities: CommunityDTO[]; posts: PostDTO[] }

export default function ExplorePage() {
  const [q, setQ] = useState("")
  const [found, setFound] = useState<{ q: string; result: Result } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = q.trim()
    if (!term) return
    const controller = new AbortController()
    const t = setTimeout(() => {
      setLoading(true)
      setError(null)
      api<Result>(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(r => setFound({ q: term, result: r.data }))
        .catch(e => { if ((e as Error).name !== "AbortError") setError(e instanceof ApiClientError ? e.message : "検索できませんでした") })
        .finally(() => setLoading(false))
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [q])

  const result = found && found.q === q.trim() ? found.result : null
  return (
    <div className="mx-auto max-w-[640px] gutter">
      <h1 className="t-h1 mt-4">さがす</h1>
      <label className="mt-3 block">
        <span className="sr-only">人・集まり・投稿を検索</span>
        <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="人・集まり・投稿を検索" autoFocus />
      </label>
      {!q.trim() && <p className="mt-4 text-muted t-small">表示名・ユーザー名・集まり・投稿の本文から探せます。<Link href="/feed?tab=discover" className="underline">みつける</Link>で新しい投稿も見られます。</p>}
      {error && <div className="mt-4"><ErrorState message={error} /></div>}
      {loading && !result && <div className="mt-4"><Skeletons count={1} /></div>}
      {result && (
        <div className="mt-4 space-y-6" aria-busy={loading}>
          <section aria-label="人">
            <h2 className="t-section">人</h2>
            {result.users.length === 0 ? <p className="text-muted t-small">見つかりませんでした。</p> : (
              <ul>{result.users.map(u => <li key={u.id}><Link href={`/u/${u.username}`} className="flex min-h-[56px] items-center gap-3 border-b border-line"><Avatar user={u} size={36} /><span className="min-w-0 flex-1 truncate">{u.name}<span className="ml-2 font-latin text-muted t-tiny">@{u.username}</span></span></Link></li>)}</ul>
            )}
          </section>
          <section aria-label="集まり">
            <h2 className="t-section">集まり</h2>
            {result.communities.length === 0 ? <p className="text-muted t-small">見つかりませんでした。</p> : (
              <ul>{result.communities.map(c => <li key={c.id}><Link href={`/communities/${c.slug}`} className="flex min-h-[56px] items-center gap-3 border-b border-line"><CommunitySymbol seed={c.slug} size={36} /><span className="flex-1 truncate">{c.name}</span></Link></li>)}</ul>
            )}
          </section>
          <section aria-label="投稿">
            <h2 className="t-section">投稿</h2>
            {result.posts.length === 0 ? <p className="text-muted t-small">見つかりませんでした。</p> : result.posts.map(p => <div key={p.id} className="mb-6"><PostCard post={p} /></div>)}
          </section>
        </div>
      )}
    </div>
  )
}
