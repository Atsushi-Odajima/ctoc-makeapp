"use client"

import Link from "next/link"
import { Icon } from "@/components/ui/Icon"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { PostGrid } from "@/components/profile/PostGrid"
import type { PostDTO } from "@/lib/dto/post"

export default function BookmarksPage() {
  const { items, loading, error, done, loadMore, reload } = useInfinite<PostDTO>("/api/bookmarks")
  return (
    <div className="wide-column desktop:px-6 desktop:pt-6">
      <div className="flex items-center gap-1 pl-1 pt-1 desktop:pl-0"><Link href="/profile" className="icon-btn desktop:-ml-3" aria-label="戻る"><Icon name="back" /></Link><h1 className="t-h1">保存した投稿</h1></div>
      <p className="px-[var(--gutter)] pb-3 t-meta desktop:px-0">保存した投稿はあなたにだけ表示されます。見られなくなった投稿は表示されません。</p>
      {error && !items.length ? <ErrorState message={error.message} onRetry={() => void reload()} /> : loading && !items.length ? <GridSkeleton /> : !items.length ? <EmptyState icon="bookmark" title="まだ保存した投稿はありません" body="投稿の右下の保存ボタンで、あとで見返したい投稿を残せます。" /> : (
        <>
          <PostGrid posts={items} />
          {!done && <div className="py-6 text-center"><button type="button" className="btn btn-secondary" disabled={loading} aria-busy={loading} onClick={() => void loadMore()}>{loading ? "読み込み中…" : "もっと見る"}</button></div>}
        </>
      )}
    </div>
  )
}
