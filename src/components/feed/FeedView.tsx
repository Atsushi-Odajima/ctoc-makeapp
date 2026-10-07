"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { Tabs } from "@/components/ui/Tabs"
import { EmptyState, ErrorState, Skeletons } from "@/components/ui/States"
import { useAutoLoad, useInfinite } from "@/components/ui/useInfinite"
import { useViewer } from "@/components/layout/ViewerContext"
import { PostCard } from "@/components/post/PostCard"
import { dateLine } from "@/lib/client/format"
import { api } from "@/lib/client/api"
import type { PostDTO } from "@/lib/dto/post"
import { encodeCursorClient } from "@/lib/client/cursor"
import { CommunityIndex } from "./CommunityIndex"
import { StoriesRow } from "@/components/stories/StoriesRow"

type Tab = "following" | "communities" | "discover"

export function FeedView({ tab }: { tab: Tab }) {
  const viewer = useViewer()
  const { items, setItems, loading, error, done, loadMore, reload } = useInfinite<PostDTO>(`/api/feed?tab=${tab}`)
  const [fresh, setFresh] = useState<{ topId: string; count: number }>({ topId: "", count: 0 })
  const sentinel = useAutoLoad(useCallback(() => { if (!loading && !done) void loadMore() }, [loading, done, loadMore]), !done && !error)

  // Poll for newer posts; never insert them automatically (the reading position must not jump).
  const top = items[0]
  useEffect(() => {
    if (!top) return
    const since = encodeCursorClient(top.publishedAt ?? top.createdAt, top.id)
    const check = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const res = await api<{ newCount: number }>(`/api/feed?tab=${tab}&since=${encodeURIComponent(since)}`)
        setFresh({ topId: top.id, count: res.data.newCount })
      } catch { /* ignore */ }
    }
    const timer = setInterval(check, 60_000)
    return () => clearInterval(timer)
  }, [top, tab])
  const newCount = top && fresh.topId === top.id ? fresh.count : 0

  const grouped = useMemo(() => {
    const out: Array<{ key: string; label: string; posts: PostDTO[] }> = []
    for (const p of items) {
      const { key, label } = dateLine(p.publishedAt ?? p.createdAt)
      const last = out[out.length - 1]
      if (last && last.key === key) last.posts.push(p)
      else out.push({ key, label, posts: [p] })
    }
    return out
  }, [items])

  return (
    <div className="mx-auto max-w-[1120px] desktop:grid desktop:grid-cols-[640px_264px] desktop:justify-center desktop:gap-12 desktop:px-8">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 className="sr-only">ホーム</h1>
        {viewer && (
          <div className="mx-[var(--gutter)] mb-4 mt-1 flex items-center gap-3 rounded-[13px] bg-lilac px-[14px] py-3">
            <Avatar user={viewer} size={35} />
            <Link href="/create" className="min-h-[44px] flex-1 content-center text-[13px]">今日は、どんな日？</Link>
            <Link href="/create" className="grid h-[44px] w-[44px] place-items-center rounded-[11px] bg-accent text-ink" aria-label="新しい投稿"><Icon name="plus" /></Link>
          </div>
        )}
        {viewer && tab === "following" && <StoriesRow />}
        <div className="mx-[var(--gutter)]">
          <Tabs
            label="フィードの切り替え"
            value={tab}
            items={[
              { value: "following", label: "フォロー中", href: "/feed" },
              { value: "communities", label: "参加中", href: "/feed?tab=communities" },
              { value: "discover", label: "みつける", href: "/feed?tab=discover" },
            ]}
          />
        </div>

        {newCount > 0 && (
          <div className="sticky top-2 z-30 mt-3 flex justify-center">
            <button type="button" className="btn btn-primary shadow-[0_6px_22px_#302B381A]" onClick={() => { window.scrollTo({ top: 0 }); void reload() }}>
              新しい投稿 {newCount}件
            </button>
          </div>
        )}

        <div className="gutter mt-2">
          {error && items.length === 0 ? (
            <div className="mt-6"><ErrorState message={error.message} onRetry={() => void reload()} /></div>
          ) : loading && items.length === 0 ? (
            <div className="mt-6"><Skeletons /></div>
          ) : items.length === 0 ? (
            <div className="mt-6"><EmptyState title="まだ投稿がありません。好きな集まりを探してみませんか。" action={{ href: "/communities", label: "集まりへ" }} /></div>
          ) : (
            grouped.map(group => (
              <section key={group.key} aria-label={group.label}>
                <div className="mb-[7px] mt-[19px] flex items-center gap-[10px] after:h-px after:flex-1 after:bg-line">
                  <span className="t-meta">{group.label}</span>
                </div>
                {group.posts.map((post, i) => (
                  <div key={post.id} className="mb-[26px]">
                    <PostCard post={post} eager={i === 0 && group === grouped[0]} onDeleted={id => setItems(prev => prev.filter(p => p.id !== id))} />
                  </div>
                ))}
              </section>
            ))
          )}
          {items.length > 0 && !done && (
            <div ref={sentinel} className="py-4 text-center">
              {error ? <ErrorState message={error.message} onRetry={() => void loadMore()} /> : (
                <button type="button" className="btn btn-secondary" onClick={() => void loadMore()} disabled={loading} aria-busy={loading}>
                  {loading ? "読み込み中…" : "もっと見る"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <aside className="hidden desktop:block" aria-label="参加している集まり">
        <CommunityIndex />
      </aside>
    </div>
  )
}
