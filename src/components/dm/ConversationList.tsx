"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Tabs } from "@/components/ui/Tabs"
import { EmptyState, ErrorState, Skeletons } from "@/components/ui/States"
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
    <div className="mx-auto max-w-[720px] gutter">
      <div className="mb-5 mt-[17px]">
        <p className="t-overline mb-1.5">MESSAGES</p>
        <h1 className="t-h1">話のつづき。</h1>
      </div>
      <Tabs label="DMの切り替え" value={box} items={[{ value: "inbox", label: "メッセージ", href: "/messages" }, { value: "requests", label: "リクエスト", href: "/messages?box=requests" }]} />
      <p className="mt-3 text-muted t-tiny">相互フォローの人とは通常の会話、それ以外はリクエストになります。DMはエンドツーエンド暗号化ではありません。</p>
      {error ? <div className="mt-4"><ErrorState message={error} onRetry={load} /></div> : items === null ? <div className="mt-4"><Skeletons count={2} /></div> : items.length === 0 ? (
        <div className="mt-4"><EmptyState title={box === "requests" ? "届いているリクエストはありません。" : "まだ会話はありません。"} body={box === "inbox" ? "プロフィールからメッセージを送れます。" : undefined} /></div>
      ) : (
        <ul className="mt-2">
          {items.map(item => (
            <li key={item.id}>
              <Link href={`/messages/${item.id}`} className="flex items-center gap-[11px] border-b border-line py-[17px]">
                {item.otherUser ? <Avatar user={item.otherUser} /> : <span className="h-[39px] w-[39px] rounded-[12px] bg-tabbg" />}
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px]">{item.otherUser?.name ?? "削除されたユーザー"}</b>
                  <span className="block truncate text-[11px] text-muted">
                    {item.state === "REQUESTED" && item.isInitiator ? "承認待ち · " : item.state === "DECLINED" ? "受け付けられませんでした · " : ""}
                    {item.lastMessage ? (item.lastMessage.deleted ? "削除されたメッセージ" : item.lastMessage.content) : "まだメッセージはありません"}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {item.lastMessage && <span className="t-meta">{relativeTime(item.lastMessage.createdAt)}</span>}
                  {item.unreadCount > 0 && <span className="rounded-full bg-accent px-2 text-[10px] font-bold text-ink">未読 {item.unreadCount}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
