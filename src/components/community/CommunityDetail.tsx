"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { Tabs } from "@/components/ui/Tabs"
import { EmptyState, ErrorState, Notice, Skeletons } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { useViewer } from "@/components/layout/ViewerContext"
import { PostCard } from "@/components/post/PostCard"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
import type { CommunityDTO } from "@/lib/services/communities"
import type { PostDTO } from "@/lib/dto/post"
import type { UserSummary } from "@/lib/dto/user"
import { CommunitySymbol } from "./CommunitySymbol"

type Tab = "posts" | "members" | "requests"

export function CommunityDetail({ slug }: { slug: string }) {
  const viewer = useViewer()
  const router = useRouter()
  const [c, setC] = useState<CommunityDTO | null>(null)
  const [error, setError] = useState<ApiClientError | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>("posts")

  const load = useCallback(() => api<CommunityDTO>(`/api/communities/${slug}`)
    .then(res => { setC(res.data); setError(null) })
    .catch(e => setError(e instanceof ApiClientError ? e : new ApiClientError(0, "UNKNOWN", "読み込めませんでした"))), [slug])
  useEffect(() => { void load() }, [load])

  // Membership is never confirmed optimistically: the UI waits for the server's answer.
  async function act(method: "POST" | "DELETE") {
    if (!viewer) return loginRedirect()
    setBusy(true)
    try {
      const res = await api<CommunityDTO>(`/api/communities/${slug}/join`, { method })
      setC(res.data)
      if (method === "POST") toast.success(res.data.membership?.status === "PENDING" ? "参加を申請しました。承認されると投稿が読めます" : "参加しました")
      else toast.success("退出しました")
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "通信に失敗しました。参加状態は変わっていません")
    } finally {
      setBusy(false)
    }
  }

  async function setShowOnProfile(value: boolean) {
    try {
      setC((await api<CommunityDTO>(`/api/communities/${slug}/membership`, { method: "PATCH", body: { showOnProfile: value } })).data)
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "変更できませんでした")
    }
  }

  async function toggleMute() {
    if (!c) return
    try {
      await api(`/api/communities/${slug}/mute`, { method: c.muted ? "DELETE" : "PUT" })
      setC({ ...c, muted: !c.muted })
      toast.success(c.muted ? "ミュートを解除しました" : "ホームに表示しないようにしました")
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "変更できませんでした")
    }
  }

  if (error) return <div className="mx-auto max-w-[960px] gutter pt-4"><ErrorState message={error.status === 404 ? "この集まりは見つかりません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} /><div className="mt-4 text-center"><Link href="/communities" className="btn btn-secondary">集まり一覧へ</Link></div></div>
  if (!c) return <div className="mx-auto max-w-[960px] gutter pt-4"><Skeletons count={1} /></div>

  const m = c.membership
  return (
    <div className="mx-auto max-w-[960px] gutter">
      <div className="flex items-center gap-2 py-2">
        <button type="button" className="icon-btn" onClick={() => router.back()} aria-label="戻る"><Icon name="back" /></button>
      </div>
      <div className="flex items-center gap-3">
        <CommunitySymbol seed={c.slug} size={56} />
        <div className="min-w-0">
          <h1 className="t-h2">{c.name}</h1>
          <p className="flex items-center gap-1 text-muted t-small">{c.category}{c.isPrivate ? <> · <Icon name="lock" size={12} />非公開（承認制）</> : " · 公開"} · {c.memberCount}人</p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap t-body desktop:max-w-[720px]">{c.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!m && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void act("POST")}>{c.isPrivate ? "参加を申請する" : "参加する"}</button>}
        {m?.status === "PENDING" && <><span className="t-small">参加申請中です。管理者の承認を待っています。</span><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act("DELETE")}>申請を取り消す</button></>}
        {m?.status === "ACTIVE" && (
          <>
            <Link href={`/create?community=${c.slug}`} className="btn btn-accent"><Icon name="plus" size={18} />この集まりに投稿</Link>
            {m.role !== "OWNER" ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act("DELETE")}>退出する</button> : <span className="t-small">あなたが管理しています</span>}
          </>
        )}
        {viewer && <button type="button" className="btn btn-ghost" onClick={() => void toggleMute()} aria-pressed={c.muted}>{c.muted ? "ミュート中（解除）" : "ホームに表示しない"}</button>}
      </div>
      {m?.status === "ACTIVE" && !c.isPrivate && (
        <label className="mt-2 flex min-h-[44px] items-center gap-2 t-small">
          <input type="checkbox" className="h-5 w-5" checked={m.showOnProfile} onChange={e => void setShowOnProfile(e.target.checked)} />
          この集まりをプロフィールに表示する
        </label>
      )}

      <div className="mt-5">
        <Tabs<Tab>
          label="集まりの表示切り替え"
          value={tab}
          onChange={setTab}
          items={[{ value: "posts", label: "投稿" }, { value: "members", label: "メンバー" }, ...(c.canModerate && c.isPrivate ? [{ value: "requests" as const, label: "参加申請" }] : [])]}
        />
      </div>

      <div className="mx-auto mt-3 max-w-[640px]">
        {!c.canViewContent ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <Icon name="lock" size={28} />
            <p className="t-body">非公開の集まりです。参加が承認されると、投稿・写真・メンバーが見られます。</p>
          </div>
        ) : tab === "posts" ? (
          <CommunityPosts slug={c.slug} canPost={m?.status === "ACTIVE"} />
        ) : tab === "members" ? (
          <Members slug={c.slug} />
        ) : (
          <Requests slug={c.slug} onChanged={load} />
        )}
      </div>
    </div>
  )
}

function CommunityPosts({ slug, canPost }: { slug: string; canPost: boolean }) {
  const { items, setItems, loading, error, done, loadMore, reload } = useInfinite<PostDTO>(`/api/communities/${slug}/posts`)
  if (error && !items.length) return <ErrorState message={error.message} onRetry={() => void reload()} />
  if (loading && !items.length) return <Skeletons />
  if (!items.length) return <EmptyState title="最初のひとことを書いてみませんか" action={canPost ? { href: `/create?community=${slug}`, label: "書いてみる" } : undefined} />
  return (
    <div>
      {items.map(p => <div key={p.id} className="mb-[26px]"><PostCard post={p} onDeleted={id => setItems(prev => prev.filter(x => x.id !== id))} /></div>)}
      {!done && <div className="text-center"><button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void loadMore()}>{loading ? "読み込み中…" : "もっと見る"}</button></div>}
    </div>
  )
}

function Members({ slug }: { slug: string }) {
  const [members, setMembers] = useState<Array<{ role: string; user: UserSummary }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api<Array<{ role: string; user: UserSummary }>>(`/api/communities/${slug}/members`).then(r => setMembers(r.data)).catch(e => setError(e instanceof ApiClientError ? e.message : "読み込めませんでした"))
  }, [slug])
  if (error) return <Notice tone="error">{error}</Notice>
  if (!members) return <Skeletons count={1} />
  return (
    <ul>
      {members.map(({ role, user }) => (
        <li key={user.id} className="border-b border-line">
          <Link href={`/u/${user.username}`} className="flex min-h-[56px] items-center gap-3 py-2">
            <Avatar user={user} size={36} />
            <span className="flex-1 truncate">{user.name}</span>
            {role !== "MEMBER" && <span className="text-muted t-tiny">{role === "OWNER" ? "管理者" : "モデレーター"}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Requests({ slug, onChanged }: { slug: string; onChanged: () => Promise<void> }) {
  const [items, setItems] = useState<Array<{ requestedAt: string; user: UserSummary }> | null>(null)
  const load = useCallback(() => api<Array<{ requestedAt: string; user: UserSummary }>>(`/api/communities/${slug}/requests`).then(r => setItems(r.data)).catch(() => setItems([])), [slug])
  useEffect(() => { void load() }, [load])
  async function answer(userId: string, accept: boolean) {
    try {
      await api(`/api/communities/${slug}/requests/${userId}/${accept ? "accept" : "decline"}`, { method: "POST" })
      toast.success(accept ? "承認しました" : "見送りました")
      await load()
      await onChanged()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "操作できませんでした")
    }
  }
  if (!items) return <Skeletons count={1} />
  if (!items.length) return <p className="py-6 text-center text-muted t-small">参加申請はありません。</p>
  return (
    <ul>
      {items.map(({ user }) => (
        <li key={user.id} className="flex min-h-[56px] items-center gap-3 border-b border-line py-2">
          <Avatar user={user} size={36} />
          <Link href={`/u/${user.username}`} className="flex-1 truncate">{user.name}</Link>
          <button type="button" className="btn btn-primary" onClick={() => void answer(user.id, true)}>承認</button>
          <button type="button" className="btn btn-secondary" onClick={() => void answer(user.id, false)}>見送る</button>
        </li>
      ))}
    </ul>
  )
}
