"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Tabs } from "@/components/ui/Tabs"
import { EmptyState, ErrorState } from "@/components/ui/States"
import { api, ApiClientError } from "@/lib/client/api"
import { relativeTime } from "@/lib/client/format"
import type { UserSummary } from "@/lib/dto/user"
import type { MessageDTO } from "@/lib/services/dm"

interface Item {
  id: string
  state: "REQUESTED" | "ACCEPTED" | "DECLINED"
  isInitiator: boolean
  otherUser: UserSummary | null
  lastMessage: MessageDTO | null
  unreadCount: number
  blocked: boolean
  updatedAt: string
}

export function ConversationList({ box }: { box: "inbox" | "requests" }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    api<Item[]>(`/api/dm?box=${box}`).then(r => { setItems(r.data); setError(null) }).catch(e => setError(e instanceof ApiClientError ? e.message : "読み込めませんでした"))
  }, [box])
  useEffect(load, [load])

  return (
    <div className="feed-column desktop:pt-6">
      <h1 className="px-[var(--gutter)] pb-2 pt-2 t-h1 sm:px-0">DM</h1>
      <Tabs className="px-[var(--gutter)] sm:px-0" label="DMの切り替え" value={box} items={[{ value: "inbox", label: "メッセージ", href: "/messages" }, { value: "requests", label: "リクエスト", href: "/messages?box=requests" }]} />
      {error ? <ErrorState message={error} onRetry={load} /> : items === null ? <ListSkeleton /> : items.length === 0 ? (
        <EmptyState icon="message" title={box === "requests" ? "届いているリクエストはありません" : "まだ会話はありません"} body={box === "inbox" ? "相手のプロフィールの「メッセージ」から始められます。" : undefined} />
      ) : (
        <ul className="divide-y divide-line px-[var(--gutter)] sm:px-0">
          {items.map(item => (
            <li key={item.id}>
              <Link href={`/messages/${item.id}`} className="flex items-center gap-3 py-3 hover:bg-ink/[0.03]">
                {item.otherUser ? <Avatar user={item.otherUser} size={52} /> : <span className="h-[52px] w-[52px] rounded-full bg-subtle" />}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate t-author ${item.unreadCount > 0 ? "" : "font-medium"}`}>{item.otherUser?.name ?? "削除されたユーザー"}</span>
                  <span className={`block truncate t-small ${item.unreadCount > 0 ? "font-bold text-ink" : "text-muted"}`}>
                    {item.state === "REQUESTED" && item.isInitiator ? "承認待ち · " : item.state === "DECLINED" ? "受け付けられませんでした · " : ""}
                    {item.lastMessage ? (item.lastMessage.deleted ? "削除されたメッセージ" : item.lastMessage.content) : "まだメッセージはありません"}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {item.lastMessage && <span className="t-meta">{relativeTime(item.lastMessage.createdAt)}</span>}
                  {item.unreadCount > 0 && <span className="min-w-[22px] rounded-full bg-accent px-1.5 text-center t-label text-[13px] font-semibold leading-[20px] text-white">{item.unreadCount}<span className="sr-only">件の未読</span></span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 px-[var(--gutter)] t-meta sm:px-0">相互フォローの人とは通常の会話、それ以外はリクエストになります。DMはエンドツーエンド暗号化ではありません。</p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="px-[var(--gutter)] sm:px-0">
      <span className="sr-only">読み込み中</span>
      {[0, 1, 2].map(i => <div key={i} aria-hidden className="flex items-center gap-3 py-3"><div className="skeleton h-[52px] w-[52px] rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-4 w-2/3" /></div></div>)}
    </div>
  )
}
