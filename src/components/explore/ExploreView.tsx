"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/ui/States"
import { useAutoLoad, useInfinite } from "@/components/ui/useInfinite"
import { GridTile } from "@/components/profile/PostGrid"
import { CommunitySymbol } from "@/components/community/CommunitySymbol"
import { api, ApiClientError } from "@/lib/client/api"
import type { PostDTO } from "@/lib/dto/post"
import type { UserSummary } from "@/lib/dto/user"
import type { CommunityDTO } from "@/lib/services/communities"

interface Result { users: UserSummary[]; communities: CommunityDTO[]; posts: PostDTO[] }

// Search on top, photos below. With no query the page shows recent public photo posts (the same
// source as 「みつける」) in the one grid rule used everywhere: 3 columns, square centre crop.
export function ExploreView({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery)
  const [found, setFound] = useState<{ q: string; result: Result } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const term = q.trim()

  useEffect(() => {
    const url = new URL(window.location.href)
    if (term) url.searchParams.set("q", term)
    else url.searchParams.delete("q")
    window.history.replaceState(window.history.state, "", url)
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
  }, [term, retry])

  const result = found && found.q === term ? found.result : null
  return (
    <div className="wide-column desktop:px-6 desktop:pt-6">
      <h1 className="sr-only">さがす</h1>
      <form role="search" className="px-[var(--gutter)] pb-3 pt-1 desktop:px-0" onSubmit={e => { e.preventDefault(); input.current?.blur() }}>
        <label className="relative block desktop:max-w-[480px]">
          <span className="sr-only">人・集まり・投稿を検索</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={20} /></span>
          <input ref={input} className="input pl-10 pr-11" type="search" enterKeyHint="search" value={q} onChange={e => setQ(e.target.value)} placeholder="人・集まり・投稿を検索" autoComplete="off" />
          {q && (
            <button type="button" className="icon-btn absolute right-0 top-1/2 -translate-y-1/2 text-muted" aria-label="検索語を消す" onClick={() => { setQ(""); input.current?.focus() }}>
              <Icon name="close" size={18} />
            </button>
          )}
        </label>
      </form>

      {!term ? (
        <DiscoverGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRetry(n => n + 1)} />
      ) : !result ? (
        <GridSkeleton count={6} />
      ) : (
        <div aria-busy={loading} aria-live="polite">
          {result.users.length === 0 && result.communities.length === 0 && result.posts.length === 0 ? (
            <EmptyState icon="search" title={`「${term}」に一致するものは見つかりませんでした`} body="ことばを短くするか、別の言い方で探してみてください。" />
          ) : (
            <>
              {result.users.length > 0 && (
                <section aria-labelledby="r-users" className="px-[var(--gutter)] pb-4 desktop:px-0">
                  <h2 id="r-users" className="pb-1 pt-2 t-ui font-bold">人</h2>
                  <ul className="divide-y divide-line">
                    {result.users.map(u => (
                      <li key={u.id}>
                        <Link href={`/u/${u.username}`} className="flex min-h-[60px] items-center gap-3 py-2 hover:bg-ink/[0.03]">
                          <Avatar user={u} size={44} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate t-author">{u.name}</span>
                            <span className="block truncate t-label text-[15px] text-muted">@{u.username}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {result.communities.length > 0 && (
                <section aria-labelledby="r-comms" className="px-[var(--gutter)] pb-4 desktop:px-0">
                  <h2 id="r-comms" className="pb-1 pt-2 t-ui font-bold">集まり</h2>
                  <ul className="divide-y divide-line">
                    {result.communities.map(c => (
                      <li key={c.id}>
                        <Link href={`/communities/${c.slug}`} className="flex min-h-[60px] items-center gap-3 py-2 hover:bg-ink/[0.03]">
                          <CommunitySymbol seed={c.slug} size={44} />
                          <span className="min-w-0 flex-1 truncate t-author">{c.name}</span>
                          <Icon name="chevronRight" size={18} className="text-muted" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {result.posts.length > 0 && (
                <section aria-labelledby="r-posts">
                  <h2 id="r-posts" className="px-[var(--gutter)] pb-2 pt-2 t-ui font-bold desktop:px-0">投稿</h2>
                  <ul className="grid grid-cols-3 gap-0.5 desktop:gap-1">{result.posts.map(p => <li key={p.id}><GridTile post={p} /></li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function DiscoverGrid() {
  const { items, loading, error, done, loadMore, reload } = useInfinite<PostDTO>("/api/feed?tab=discover")
  const sentinel = useAutoLoad(useCallback(() => { if (!loading && !done) void loadMore() }, [loading, done, loadMore]), !done && !error)
  const photos = items.filter(p => p.media.length > 0)
  if (error && !items.length) return <ErrorState message={error.message} onRetry={() => void reload()} />
  if (loading && !items.length) return <GridSkeleton />
  if (!photos.length && done) return <EmptyState title="写真の投稿はまだありません" body="公開の写真が投稿されると、ここに並びます。" />
  return (
    <section aria-label="新しい公開の写真">
      <ul className="grid grid-cols-3 gap-0.5 desktop:gap-1">{photos.map(p => <li key={p.id}><GridTile post={p} /></li>)}</ul>
      {!done && (
        <div ref={sentinel} className="py-6 text-center">
          <button type="button" className="btn btn-secondary" onClick={() => void loadMore()} disabled={loading} aria-busy={loading}>{loading ? "読み込み中…" : "もっと見る"}</button>
        </div>
      )}
    </section>
  )
}
