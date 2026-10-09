"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { Tabs } from "@/components/ui/Tabs"
import { EmptyState, ErrorState, Skeletons } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { MediaImage } from "@/components/media/MediaImage"
import { api, ApiClientError } from "@/lib/client/api"
import { relativeTime } from "@/lib/client/format"
import type { MediaDTO } from "@/lib/media/delivery"
import type { UserSummary } from "@/lib/dto/user"

interface Item {
  id: string
  type: string
  read: boolean
  createdAt: string
  actor: UserSummary | null
  post: { id: string; thumbnail: MediaDTO | null } | null
  content: string | null
}

const TEXT: Record<string, string> = {
  like: "さんがいいねしました",
  empathy: "さんが「気持ちわかる」を押しました",
  comment: "さんが返信しました",
  reply: "さんがあなたのコメントに返信しました",
  follow: "さんがフォローしました",
  follow_request: "さんからフォローのリクエストが届きました",
  follow_accept: "さんがフォローを承認しました",
  community_request: "さんが集まりへの参加を申請しました",
  community_accept: "さんが集まりへの参加を承認しました",
  dm_request: "さんからメッセージリクエストが届きました",
}

function hrefFor(n: Item): string {
  if (n.post) return `/post/${n.post.id}`
  if (n.type === "dm_request") return "/messages?box=requests"
  if (n.type === "follow_request") return "#requests"
  if (n.actor && !n.actor.deleted) return `/u/${n.actor.username}`
  return "/notifications"
}

export function NotificationsView() {
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const { items, setItems, loading, error, done, loadMore, reload } = useInfinite<Item>(`/api/notifications?filter=${filter}`)

  async function markAll() {
    try {
      await api("/api/notifications/read", { method: "POST", body: { all: true } })
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      window.dispatchEvent(new Event("daynet:notifications-read"))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "更新できませんでした")
    }
  }

  async function markOne(id: string) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    await api("/api/notifications/read", { method: "POST", body: { ids: [id] } }).catch(() => undefined)
    window.dispatchEvent(new Event("daynet:notifications-read"))
  }

  return (
    <div className="feed-column desktop:pt-6">
      <div className="flex items-center justify-between px-[var(--gutter)] pb-2 pt-2 sm:px-0">
        <h1 className="t-h1">お知らせ</h1>
        <button type="button" className="link-btn" onClick={() => void markAll()}>すべて既読にする</button>
      </div>
      <FollowRequests />
      <Tabs<"all" | "unread"> className="px-[var(--gutter)] sm:px-0" label="お知らせの切り替え" value={filter} onChange={setFilter} items={[{ value: "all", label: "すべて" }, { value: "unread", label: "未読" }]} />
      {error && !items.length ? <ErrorState message={error.message} onRetry={() => void reload()} />
        : loading && !items.length ? <Skeletons count={1} />
          : !items.length ? <EmptyState icon="bell" title={filter === "unread" ? "未読のお知らせはありません" : "まだお知らせはありません"} body={filter === "unread" ? undefined : "いいねやコメント、フォローがあるとここに届きます。"} /> : (
            <ul className="divide-y divide-line px-[var(--gutter)] sm:px-0">
              {items.map(n => (
                <li key={n.id}>
                  <Link href={hrefFor(n)} onClick={() => { if (!n.read) void markOne(n.id) }} className="flex items-center gap-3 py-3 hover:bg-ink/[0.03]">
                    {n.actor ? <Avatar user={n.actor} size={44} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-subtle"><Icon name="bell" size={20} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block t-small"><b>{n.actor?.name ?? "だれか"}</b>{TEXT[n.type] ?? "さんからのお知らせ"}</span>
                      {n.content && <span className="block truncate text-muted t-small">{n.content}</span>}
                      <span className="flex items-center gap-2 t-meta">{relativeTime(n.createdAt)}{!n.read && <span className="inline-flex items-center gap-1 font-bold text-accent"><span aria-hidden className="h-2 w-2 rounded-full bg-accent" />未読</span>}</span>
                    </span>
                    {n.post?.thumbnail?.deliveryUrl && <MediaImage mediaId={n.post.thumbnail.id} src={n.post.thumbnail.deliveryUrl} alt="" className="h-11 w-11 shrink-0 rounded-[2px] object-cover" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      {items.length > 0 && !done && <div className="mt-6 text-center"><button type="button" className="btn btn-secondary" disabled={loading} aria-busy={loading} onClick={() => void loadMore()}>{loading ? "読み込み中…" : "もっと見る"}</button></div>}
    </div>
  )
}

function FollowRequests() {
  const [items, setItems] = useState<Array<{ requestedAt: string; user: UserSummary }>>([])
  const load = useCallback(() => { api<Array<{ requestedAt: string; user: UserSummary }>>("/api/follow-requests").then(r => setItems(r.data)).catch(() => undefined) }, [])
  useEffect(load, [load])
  async function answer(userId: string, accept: boolean) {
    try {
      await api(`/api/follow-requests/${userId}/${accept ? "accept" : "decline"}`, { method: "POST" })
      toast.success(accept ? "承認しました" : "見送りました")
      load()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "操作できませんでした")
    }
  }
  if (!items.length) return null
  return (
    <section id="requests" className="mb-3 border-y border-line px-[var(--gutter)] py-2 sm:px-0" aria-labelledby="requests-heading">
      <h2 id="requests-heading" className="t-ui font-bold">フォローリクエスト <span className="t-label font-semibold text-muted">{items.length}</span></h2>
      <ul className="divide-y divide-line">
        {items.map(({ user }) => (
          <li key={user.id} className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <Avatar user={user} size={44} />
            <Link href={`/u/${user.username}`} className="min-w-0 flex-1 truncate t-author hover:underline">{user.name}</Link>
            <span className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void answer(user.id, true)}>承認</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void answer(user.id, false)}>見送る</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
