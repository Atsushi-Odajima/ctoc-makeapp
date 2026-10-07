"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Icon } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { EmptyState, ErrorState, Skeletons } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { useViewer } from "@/components/layout/ViewerContext"
import { ReportDialog } from "@/components/post/ReportDialog"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
import { formatCount } from "@/lib/client/format"
import { CINEMIX_NOTE, CINEMIX_URL } from "@/config/brand"
import type { PostDTO } from "@/lib/dto/post"
import type { PublicUser } from "@/lib/dto/user"
import { ProfileHero } from "./ProfileHero"
import { PostGrid } from "./PostGrid"

type Tab = "posts" | "notes" | "communities" | "drafts"

export function ProfileView({ username, self, initialTab }: { username: string; self: boolean; initialTab?: Tab }) {
  const viewer = useViewer()
  const router = useRouter()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [error, setError] = useState<ApiClientError | null>(null)
  const [tab, setTab] = useState<Tab>(initialTab ?? "posts")

  const load = useCallback(() => api<PublicUser>(`/api/users/${encodeURIComponent(username)}`)
    .then(res => {
      setUser(res.data)
      setError(null)
      if (!self && res.data.viewerRelationship.isSelf) router.replace("/profile")
    })
    .catch(e => setError(e instanceof ApiClientError ? e : new ApiClientError(0, "UNKNOWN", "読み込めませんでした"))), [username, self, router])
  useEffect(() => { void load() }, [load])

  // Footprints are recorded only by an explicit POST, and only if both people opted in.
  useEffect(() => {
    if (!self && viewer && user && !user.viewerRelationship.isSelf) {
      void fetch("/api/footprints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username }) }).catch(() => undefined)
    }
  }, [self, viewer, user])

  if (error) {
    return (
      <div className="mx-auto max-w-[640px] gutter pt-4">
        <ErrorState message={error.status === 404 ? "このアカウントは表示できません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} />
        <div className="mt-4 text-center"><Link href={viewer ? "/feed" : "/"} className="btn btn-secondary">ホームへ戻る</Link></div>
      </div>
    )
  }
  if (!user) return <div className="mx-auto max-w-[640px] gutter pt-2"><Skeletons count={1} /></div>

  const rel = user.viewerRelationship
  const locked = !rel.isSelf && user.isPrivate && rel.following !== "ACCEPTED"
  const kindFilter = tab === "notes" ? "&kind=NOTE" : ""
  const postsUrl = tab === "drafts" ? "/api/posts?status=DRAFT" : tab === "communities" || locked || rel.blocking ? null : `/api/users/${encodeURIComponent(user.username)}/posts?limit=24${kindFilter}`

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mx-[var(--gutter)] mt-1.5">
        <ProfileHero user={user} />
      </div>
      <div className="gutter">
        <dl className="mx-1 mb-[15px] mt-[18px] flex justify-between text-[10px]">
          <div><dd className="t-stat">{formatCount(user.counts.posts)}</dd><dt>投稿</dt></div>
          <div><dd className="t-stat">{formatCount(user.counts.following)}</dd><dt>フォロー</dt></div>
          <div><dd className="t-stat">{formatCount(user.counts.followers)}</dd><dt>フォロワー</dt></div>
        </dl>
        {rel.isSelf ? <SelfActions user={user} /> : <OtherActions user={user} onChange={load} />}

        <div className="flex gap-[27px] border-b border-line" role="tablist" aria-label="プロフィールの表示切り替え">
          {([["posts", "投稿"], ["notes", "日記"], ["communities", "集まり"], ...(rel.isSelf ? [["drafts", "下書き"]] : [])] as Array<[Tab, string]>).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-[44px] text-[12px] ${tab === value ? "border-b-[3px] border-ink font-bold" : ""}`}>{label}</button>
          ))}
        </div>

        {rel.blocking ? (
          <p className="mt-6 text-center text-muted t-small">ブロック中のため投稿は表示されません。</p>
        ) : locked && tab !== "communities" ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <Icon name="lock" size={28} />
            <p className="t-body">非公開アカウントです。承認されたフォロワーだけが投稿を見られます。</p>
            <p className="text-muted t-small">表示名・自己紹介・3つの項目は公開されています。</p>
          </div>
        ) : tab === "communities" ? (
          user.communities.length ? (
            <ul className="mt-3">{user.communities.map(c => <li key={c.slug} className="border-b border-line"><Link href={`/communities/${c.slug}`} className="flex min-h-[48px] items-center justify-between">{c.name}<Icon name="chevronRight" size={18} /></Link></li>)}</ul>
          ) : <p className="mt-6 text-center text-muted t-small">{rel.isSelf ? "プロフィールに表示する公開の集まりは、各集まりのページで選べます。" : "表示している集まりはありません。"}</p>
        ) : (
          <ProfilePosts url={postsUrl} self={rel.isSelf} />
        )}

        <p className="mt-5 text-muted text-[10px] leading-4">
          {CINEMIX_URL ? <a href={CINEMIX_URL} target="_blank" rel="noopener noreferrer" className="underline">{CINEMIX_NOTE}</a> : CINEMIX_NOTE}
        </p>
      </div>
    </div>
  )
}

function ProfilePosts({ url, self }: { url: string | null; self: boolean }) {
  const { items, loading, error, done, loadMore, reload } = useInfinite<PostDTO>(url)
  if (!url) return null
  if (error && !items.length) return <div className="mt-4"><ErrorState message={error.message} onRetry={() => void reload()} /></div>
  if (loading && !items.length) return <div className="mt-4" aria-busy="true"><div className="grid grid-cols-2 gap-[9px]"><div className="skeleton aspect-square" /><div className="skeleton aspect-square" /></div></div>
  if (!items.length) return <div className="mt-4"><EmptyState title="まだ投稿がありません。" action={self ? { href: "/create", label: "投稿する" } : undefined} /></div>
  return (
    <>
      <PostGrid posts={items} />
      {!done && <div className="mt-4 text-center"><button type="button" className="btn btn-secondary" onClick={() => void loadMore()} disabled={loading}>{loading ? "読み込み中…" : "もっと見る"}</button></div>}
    </>
  )
}

function SelfActions({ user }: { user: PublicUser }) {
  const [menu, setMenu] = useState(false)
  async function share() {
    const url = `${window.location.origin}/u/${user.username}`
    try {
      if (navigator.share) await navigator.share({ title: `${user.name} | DayNet`, url })
      else { await navigator.clipboard.writeText(url); toast.success("プロフィールのリンクをコピーしました") }
    } catch { /* cancelled */ }
  }
  return (
    <div className="mb-[22px] flex gap-[9px]">
      <Link href="/profile/edit" className="btn btn-primary flex-1">プロフィールを編集</Link>
      <button type="button" className="btn btn-secondary w-[52px] px-0" onClick={() => void share()} aria-label="プロフィールを共有"><Icon name="share" /></button>
      <button type="button" className="btn btn-secondary w-[52px] px-0" onClick={() => setMenu(true)} aria-label="その他のメニュー"><Icon name="more" /></button>
      <Dialog open={menu} onClose={() => setMenu(false)} title="メニュー">
        <nav className="space-y-1">
          {[["/bookmarks", "保存した投稿", "bookmark"], ["/footprints", "足あと", "eye"], ["/notifications", "お知らせ", "bell"], ["/settings", "設定", "settings"], ["/about", "DayNetについて", "info"]].map(([href, label, icon]) => (
            <Link key={href} href={href} className="flex min-h-[48px] items-center gap-3 rounded-[11px] px-3 hover:bg-canvas"><Icon name={icon as "bookmark"} />{label}</Link>
          ))}
        </nav>
      </Dialog>
    </div>
  )
}

function OtherActions({ user, onChange }: { user: PublicUser; onChange: () => Promise<void> }) {
  const viewer = useViewer()
  const router = useRouter()
  const rel = user.viewerRelationship
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  async function run(fn: () => Promise<unknown>, success?: string) {
    if (!viewer) return loginRedirect()
    setBusy(true)
    try {
      await fn()
      if (success) toast.success(success)
      await onChange()
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "PROFILE_REQUIRED") router.push("/onboarding")
      else toast.error(e instanceof ApiClientError ? e.message : "操作できませんでした")
    } finally {
      setBusy(false)
    }
  }

  const followLabel = rel.following === "ACCEPTED" ? "フォロー中" : rel.following === "PENDING" ? "リクエスト済み" : user.isPrivate ? "フォローをリクエスト" : "フォロー"
  const mutual = rel.following === "ACCEPTED" && rel.followedBy === "ACCEPTED"
  if (rel.blocking) {
    return (
      <div className="mb-[22px]">
        <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => void run(() => api(`/api/blocks/${user.id}`, { method: "DELETE" }), "ブロックを解除しました")}>ブロックを解除</button>
      </div>
    )
  }
  return (
    <div className="mb-[22px] flex gap-[9px]">
      <button
        type="button"
        className={`btn flex-1 ${rel.following === "NONE" ? "btn-primary" : "btn-secondary"}`}
        disabled={busy}
        aria-pressed={rel.following !== "NONE"}
        onClick={() => void run(() => api(`/api/follow/${user.id}`, { method: rel.following === "NONE" ? "PUT" : "DELETE" }))}
      >
        {followLabel}
      </button>
      <button
        type="button"
        className="btn btn-secondary flex-1"
        disabled={busy}
        onClick={() => void run(async () => {
          const res = await api<{ id: string }>("/api/dm", { method: "POST", body: { targetUserId: user.id } })
          router.push(`/messages/${res.data.id}`)
        })}
      >
        <Icon name="message" size={18} />{mutual ? "メッセージ" : "DMリクエスト"}
      </button>
      <button type="button" className="btn btn-secondary w-[52px] px-0" onClick={() => setMenu(true)} aria-label="その他の操作"><Icon name="more" /></button>
      <Dialog open={menu} onClose={() => setMenu(false)} title={`${user.name}さん`}>
        <div className="space-y-1">
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[11px] px-3 hover:bg-canvas" onClick={() => { setMenu(false); void run(() => api(`/api/mutes/${user.id}`, { method: rel.muting ? "DELETE" : "PUT" }), rel.muting ? "ミュートを解除しました" : "ミュートしました（相手には通知されません）") }}>
            <Icon name="eye" />{rel.muting ? "ミュートを解除" : "ミュート"}
          </button>
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[11px] px-3 hover:bg-canvas" onClick={() => { setMenu(false); setReport(true) }}><Icon name="flag" />通報</button>
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[11px] px-3 text-error hover:bg-canvas" onClick={() => { setMenu(false); setConfirmBlock(true) }}><Icon name="close" />ブロック</button>
        </div>
      </Dialog>
      <Dialog open={confirmBlock} onClose={() => setConfirmBlock(false)} title="ブロックしますか？" variant="center">
        <p className="mb-2 t-body">お互いにフォロー・DM・反応・返信ができなくなり、フォロー関係とリクエストは解除されます。</p>
        <p className="mb-4 text-muted t-small">公開の投稿は、ログアウトした状態では誰でも読めます。ブロックはインターネット全体から見えなくする機能ではありません。</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmBlock(false)}>やめる</button>
          <button type="button" className="btn btn-danger flex-1" onClick={() => { setConfirmBlock(false); void run(() => api(`/api/blocks/${user.id}`, { method: "PUT" }), "ブロックしました") }}>ブロックする</button>
        </div>
      </Dialog>
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="USER" targetId={user.id} />
    </div>
  )
}
