"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
    <div className="feed-column">
      <h1 className="sr-only">ホーム</h1>
      {viewer && tab === "following" && <StoriesRow />}
      <Tabs
        label="フィードの切り替え"
        className="px-[var(--gutter)] sm:px-0"
        value={tab}
        items={[
          { value: "following", label: "フォロー中", href: "/feed" },
          { value: "communities", label: "参加中", href: "/feed?tab=communities" },
          { value: "discover", label: "みつける", href: "/feed?tab=discover" },
        ]}
      />

      {newCount > 0 && (
        <div className="sticky top-3 z-30 flex justify-center desktop:top-20">
          <button type="button" className="btn btn-ink btn-sm mt-3 rounded-full" onClick={() => { window.scrollTo({ top: 0 }); void reload() }}>
            <Icon name="up" size={18} />新しい投稿 {newCount}件
          </button>
        </div>
      )}

      <div>
        {error && items.length === 0 ? (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        ) : loading && items.length === 0 ? (
          <div className="pt-2"><Skeletons /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === "communities" ? "community" : "image"}
            title={tab === "following" ? "まだ投稿がありません" : tab === "communities" ? "参加中の集まりに投稿がありません" : "公開の投稿はまだありません"}
            body={tab === "following" ? "気になる人をフォローするか、好きな集まりを探してみましょう。" : tab === "communities" ? "集まりに参加すると、その投稿がここに並びます。" : undefined}
            action={tab === "discover" ? undefined : { href: tab === "following" ? "/explore" : "/communities", label: tab === "following" ? "人や投稿をさがす" : "集まりを探す" }}
          />
        ) : (
          grouped.map(group => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="px-[var(--gutter)] pb-1 pt-5 text-[13px] font-bold leading-[1.5] text-muted sm:px-0">{group.label}</h2>
              {group.posts.map((post, i) => (
                <div key={post.id} className="mb-2">
                  <PostCard post={post} eager={i === 0 && group === grouped[0]} onDeleted={id => setItems(prev => prev.filter(p => p.id !== id))} />
                </div>
              ))}
            </section>
          ))
        )}
        {items.length > 0 && !done && (
          <div ref={sentinel} className="py-6 text-center">
            {error ? <ErrorState message={error.message} onRetry={() => void loadMore()} /> : (
              <button type="button" className="btn btn-secondary" onClick={() => void loadMore()} disabled={loading} aria-busy={loading}>
                {loading ? "読み込み中…" : "もっと見る"}
              </button>
            )}
          </div>
        )}
        {items.length > 0 && done && <p className="py-8 text-center t-meta">ここまでの投稿をすべて表示しました</p>}
      </div>
    </div>
  )
}
