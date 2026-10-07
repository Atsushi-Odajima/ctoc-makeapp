"use client"

import Link from "next/link"
import { Icon } from "@/components/ui/Icon"
import { EmptyState, ErrorState, Skeletons } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { PostCard } from "@/components/post/PostCard"
import type { PostDTO } from "@/lib/dto/post"

export default function BookmarksPage() {
  const { items, loading, error, done, loadMore, reload } = useInfinite<PostDTO>("/api/bookmarks")
  return (
    <div className="mx-auto max-w-[640px] gutter">
      <div className="flex items-center gap-2 py-2"><Link href="/profile" className="icon-btn" aria-label="戻る"><Icon name="back" /></Link><h1 className="t-h2">保存した投稿</h1></div>
      <p className="mb-3 text-muted t-small">保存した投稿はあなたにだけ表示されます。見られなくなった投稿は表示されません。</p>
      {error && !items.length ? <ErrorState message={error.message} onRetry={() => void reload()} /> : loading && !items.length ? <Skeletons /> : !items.length ? <EmptyState title="まだ保存した投稿はありません。" /> : (
        <>
          {items.map(p => <div key={p.id} className="mb-[26px]"><PostCard post={p} /></div>)}
          {!done && <div className="text-center"><button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void loadMore()}>もっと見る</button></div>}
        </>
      )}
    </div>
  )
}
