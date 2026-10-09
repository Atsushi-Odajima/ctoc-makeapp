"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import { ErrorState, Notice } from "@/components/ui/States"
import { useViewer } from "@/components/layout/ViewerContext"
import { ReportDialog } from "@/components/post/ReportDialog"
import { api, ApiClientError, newClientId } from "@/lib/client/api"
import { encodeCursorClient } from "@/lib/client/cursor"
import { formatDateTime } from "@/lib/client/format"
import { graphemeCount } from "@/lib/client/text"
import type { MessageDTO } from "@/lib/services/dm"
import type { UserSummary } from "@/lib/dto/user"

interface Detail {
  conversation: { id: string; state: "REQUESTED" | "ACCEPTED" | "DECLINED"; isInitiator: boolean; otherUser: UserSummary | null; canSend: boolean; cannotSendReason: string | null }
  messages: MessageDTO[]
  olderCursor: string | null
}

type Local = MessageDTO & { pending?: "sending" | "failed" }

const POLL_MS = 5000

export function Conversation({ id }: { id: string }) {
  const viewer = useViewer()
  const router = useRouter()
  const [detail, setDetail] = useState<Detail["conversation"] | null>(null)
  const [messages, setMessages] = useState<Local[]>([])
  const [error, setError] = useState<ApiClientError | null>(null)
  const [text, setText] = useState("")
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState<{ type: "USER" | "MESSAGE"; id: string } | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const lastServer = useRef<MessageDTO | null>(null)

  const merge = useCallback((incoming: MessageDTO[]) => {
    if (!incoming.length) return
    setMessages(prev => {
      const byId = new Map(prev.map(m => [m.id, m]))
      const byClient = new Map(prev.filter(m => m.clientMessageId).map(m => [m.clientMessageId!, m]))
      const next = [...prev]
      for (const m of incoming) {
        if (byId.has(m.id)) continue
        const local = m.clientMessageId ? byClient.get(m.clientMessageId) : undefined
        if (local) next[next.indexOf(local)] = m
        else next.push(m)
      }
      return next.sort((a, b) => (a.pending ? 1 : 0) - (b.pending ? 1 : 0) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    })
    const newest = incoming[incoming.length - 1]!
    if (!lastServer.current || newest.createdAt >= lastServer.current.createdAt) lastServer.current = newest
  }, [])

  const load = useCallback(() => api<Detail>(`/api/dm/${id}`)
    .then(res => {
      setError(null)
      setDetail(res.data.conversation)
      setMessages([])
      lastServer.current = null
      merge(res.data.messages)
      void api(`/api/dm/${id}/read`, { method: "POST" }).catch(() => undefined)
    })
    .catch(e => setError(e instanceof ApiClientError ? e : new ApiClientError(0, "UNKNOWN", "読み込めませんでした"))), [id, merge])
  useEffect(() => { void load() }, [load])

  // Incremental polling every 5 s while the page is visible; stopped in the background.
  useEffect(() => {
    if (!detail) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const after = lastServer.current ? `?after=${encodeURIComponent(encodeCursorClient(lastServer.current.createdAt, lastServer.current.id))}` : ""
          const res = await api<Detail>(`/api/dm/${id}${after}`)
          setDetail(res.data.conversation)
          if (res.data.messages.length) {
            merge(res.data.messages)
            void api(`/api/dm/${id}/read`, { method: "POST" }).catch(() => undefined)
          }
        } catch { /* keep showing what we have; next tick retries */ }
      }
      if (!stopped && document.visibilityState === "visible") timer = setTimeout(tick, POLL_MS)
    }
    timer = setTimeout(tick, POLL_MS)
    const onVisibility = () => {
      clearTimeout(timer)
      if (document.visibilityState === "visible" && !stopped) timer = setTimeout(tick, 200)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [detail, id, merge])

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }) }, [messages.length])

  async function send(content: string, clientMessageId: string) {
    const optimistic: Local = { id: clientMessageId, conversationId: id, senderId: viewer!.id, content, deleted: false, createdAt: new Date().toISOString(), readAt: null, clientMessageId, pending: "sending" }
    setMessages(prev => [...prev.filter(m => m.clientMessageId !== clientMessageId), optimistic])
    try {
      const res = await api<MessageDTO>(`/api/dm/${id}`, { method: "POST", body: { content, clientMessageId } })
      merge([res.data])
    } catch (e) {
      setMessages(prev => prev.map(m => (m.clientMessageId === clientMessageId ? { ...m, pending: "failed" } : m)))
      if (e instanceof ApiClientError && (e.status === 403 || e.status === 409)) {
        toast.error(e.message)
        void load()
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const content = text
    if (!content.trim() || graphemeCount(content) > 2000) return
    setText("")
    void send(content, newClientId("dm"))
  }

  async function answer(accept: boolean) {
    try {
      await api(`/api/dm/${id}/${accept ? "accept" : "decline"}`, { method: "POST" })
      if (accept) await load()
      else router.push("/messages?box=requests")
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "操作できませんでした")
    }
  }

  async function block() {
    if (!detail?.otherUser) return
    try {
      await api(`/api/blocks/${detail.otherUser.id}`, { method: "PUT" })
      toast.success("ブロックしました")
      setMenu(false)
      await load()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "ブロックできませんでした")
    }
  }

  if (error) return <div className="feed-column gutter pt-4"><ErrorState message={error.status === 404 ? "この会話は見つからないか、表示できません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} /><div className="text-center"><Link href="/messages" className="btn btn-secondary">DM一覧へ</Link></div></div>
  if (!detail) return <div className="feed-column gutter pt-4" aria-busy="true"><span className="sr-only">読み込み中</span><div className="skeleton h-10 w-1/2" /><div className="skeleton mt-6 ml-auto h-12 w-2/3 rounded-[16px]" /><div className="skeleton mt-3 h-12 w-1/2 rounded-[16px]" /></div>
  const other = detail.otherUser
  const incomingRequest = detail.state === "REQUESTED" && !detail.isInitiator

  return (
    <div className="feed-column flex min-h-[calc(100dvh-var(--header-height))] flex-col desktop:min-h-[calc(100dvh-64px)]">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas py-2 pl-1 pr-1 desktop:top-16">
        <Link href="/messages" className="icon-btn" aria-label="DM一覧へ戻る"><Icon name="back" /></Link>
        {other && <Avatar user={other} size={36} />}
        <div className="min-w-0 flex-1">
          {other && !other.deleted ? <Link href={`/u/${other.username}`} className="block truncate t-author hover:underline">{other.name}</Link> : <span className="t-author">削除されたユーザー</span>}
          {other && !other.deleted && <span className="block truncate t-label text-[14px] leading-tight text-muted">@{other.username}</span>}
        </div>
        <button type="button" className="icon-btn" aria-label="会話のメニュー" onClick={() => setMenu(true)}><Icon name="more" /></button>
      </div>

      {incomingRequest && (
        <div className="mx-[var(--gutter)] mt-3 border-b border-line pb-4 sm:mx-0">
          <p className="t-body">{other?.name}さんからのメッセージリクエストです。承認すると会話できます。</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary flex-1" onClick={() => void answer(true)}>承認する</button>
            <button type="button" className="btn btn-secondary flex-1" onClick={() => void answer(false)}>受け付けない</button>
          </div>
        </div>
      )}
      {detail.state === "REQUESTED" && detail.isInitiator && <p className="mx-[var(--gutter)] mt-3 text-muted t-small sm:mx-0">相手が承認するまで、送れるメッセージは1通だけです（リンクのプレビューは表示されません）。</p>}

      <ol className="flex-1 px-[var(--gutter)] pb-4 sm:px-0" aria-label="メッセージ" aria-live="polite">
        {messages.map(m => {
          const mine = m.senderId === viewer?.id
          return (
            <li key={m.clientMessageId ?? m.id} className={`mt-4 flex max-w-[82%] flex-col ${mine ? "ml-auto items-end" : "items-start"}`}>
              <div className={`whitespace-pre-wrap px-3.5 py-2 text-[15px] leading-[1.6] ${mine ? "rounded-[18px_18px_4px_18px] bg-ink text-white" : "rounded-[18px_18px_18px_4px] border border-line bg-surface"} ${m.pending === "failed" ? "opacity-60" : ""}`}>
                {m.deleted ? <span className={mine ? "text-white/70" : "text-muted"}>削除されたメッセージ</span> : m.content}
              </div>
              <div className={`mt-0.5 flex items-center gap-2 t-meta text-[13px] ${mine ? "justify-end" : ""}`}>
                <time dateTime={m.createdAt}>{formatDateTime(m.createdAt, { hour: "2-digit", minute: "2-digit", month: "numeric", day: "numeric" })}</time>
                {mine && (m.pending === "sending" ? <span>送信中…</span> : m.pending === "failed" ? (
                  <span className="inline-flex items-center gap-1 text-error"><Icon name="alert" size={14} />送信できませんでした <button type="button" className="link-btn !text-error underline" onClick={() => void send(m.content ?? "", m.clientMessageId!)}>再送</button></span>
                ) : <span>{m.readAt ? "既読" : "送信済み"}</span>)}
                {!mine && !m.deleted && <button type="button" className="link-btn" onClick={() => setReport({ type: "MESSAGE", id: m.id })}>通報</button>}
              </div>
            </li>
          )
        })}
        <div ref={bottom} />
      </ol>

      <div className="sticky bottom-0 border-t border-line bg-canvas px-[var(--gutter)] pt-2 sm:px-0" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {detail.canSend ? (
          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor="dm-input" className="sr-only">メッセージ本文</label>
            <textarea id="dm-input" className="textarea max-h-40 min-h-[44px] flex-1 resize-none rounded-[22px] px-4 py-2.5 [field-sizing:content]" rows={1} value={text} onChange={e => setText(e.target.value)} placeholder="メッセージを書く" aria-invalid={graphemeCount(text) > 2000}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e) }} />
            <button type="submit" className="btn btn-primary rounded-full" disabled={!text.trim() || graphemeCount(text) > 2000}>送信</button>
          </form>
        ) : (
          <Notice tone="info">{detail.cannotSendReason ?? "このメッセージには返信できません"}</Notice>
        )}
        {graphemeCount(text) > 1800 && <p className={`mt-1 text-right t-meta ${graphemeCount(text) > 2000 ? "!text-error" : ""}`}>{graphemeCount(text)} / 2000</p>}
      </div>

      <Dialog open={menu} onClose={() => setMenu(false)} title="会話のメニュー">
        <div className="space-y-1">
          {other && <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[8px] px-2 t-ui hover:bg-subtle" onClick={() => { setMenu(false); setReport({ type: "USER", id: other.id }) }}><Icon name="flag" />{other.name}さんを通報</button>}
          {other && <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[8px] px-3 text-error hover:bg-subtle" onClick={() => void block()}><Icon name="close" />ブロック</button>}
        </div>
      </Dialog>
      {report && <ReportDialog open onClose={() => setReport(null)} targetType={report.type} targetId={report.id} />}
    </div>
  )
}
