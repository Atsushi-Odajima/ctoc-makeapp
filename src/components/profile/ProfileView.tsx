"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Icon, type IconName } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/ui/States"
import { useInfinite } from "@/components/ui/useInfinite"
import { useViewer } from "@/components/layout/ViewerContext"
import { ReportDialog } from "@/components/post/ReportDialog"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
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
      <div className="feed-column gutter pt-4">
        <ErrorState message={error.status === 404 ? "このアカウントは表示できません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} />
        <div className="text-center"><Link href={viewer ? "/feed" : "/"} className="btn btn-secondary">ホームへ戻る</Link></div>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="wide-column" aria-busy="true">
        <div className="flex items-center gap-4 px-[var(--gutter)] pt-3 desktop:px-6 desktop:pt-8"><div className="skeleton h-[84px] w-[84px] rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-2/5" /><div className="skeleton h-4 w-1/4" /></div></div>
        <div className="mt-6"><GridSkeleton count={6} /></div>
      </div>
    )
  }

  const rel = user.viewerRelationship
  const locked = !rel.isSelf && user.isPrivate && rel.following !== "ACCEPTED"
  const kindFilter = tab === "notes" ? "&kind=NOTE" : ""
  const postsUrl = tab === "drafts" ? "/api/posts?status=DRAFT" : tab === "communities" || locked || rel.blocking ? null : `/api/users/${encodeURIComponent(user.username)}/posts?limit=24${kindFilter}`
  const tabs: Array<[Tab, string, IconName]> = [["posts", "投稿", "grid"], ["notes", "日記", "note"], ["communities", "集まり", "community"], ...(rel.isSelf ? [["drafts", "下書き", "edit"] as [Tab, string, IconName]] : [])]

  return (
    <div className="wide-column desktop:px-6">
      <ProfileHero user={user} actions={rel.isSelf ? <SelfActions user={user} /> : <OtherActions user={user} onChange={load} />} />

      <div className="mt-6 flex border-t border-line" role="tablist" aria-label="プロフィールの表示切り替え">
        {tabs.map(([value, label, icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`relative -mt-px flex min-h-[48px] flex-1 items-center justify-center gap-1.5 border-t-2 text-[14px] transition-colors duration-150 desktop:flex-none desktop:px-6 ${tab === value ? "border-ink font-bold text-ink" : "border-transparent font-medium text-muted hover:text-ink"}`}
          >
            <Icon name={icon} size={18} />{label}
          </button>
        ))}
      </div>

      {rel.blocking ? (
        <p className="px-6 py-12 text-center text-muted t-small">ブロック中のため投稿は表示されません。</p>
      ) : locked && tab !== "communities" ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-ink/80"><Icon name="lock" size={28} /></span>
          <p className="t-section">非公開アカウントです</p>
          <p className="max-w-[34ch] text-muted t-small">承認されたフォロワーだけが投稿を見られます。表示名・自己紹介・3つの項目は公開されています。</p>
        </div>
      ) : tab === "communities" ? (
        user.communities.length ? (
          <ul className="divide-y divide-line px-[var(--gutter)] desktop:px-0">{user.communities.map(c => <li key={c.slug}><Link href={`/communities/${c.slug}`} className="flex min-h-[52px] items-center justify-between gap-3 t-ui hover:text-accent">{c.name}<Icon name="chevronRight" size={18} /></Link></li>)}</ul>
        ) : <EmptyState icon="community" title="表示している集まりはありません" body={rel.isSelf ? "プロフィールに表示する公開の集まりは、各集まりのページで選べます。" : undefined} />
      ) : (
        <ProfilePosts url={postsUrl} self={rel.isSelf} drafts={tab === "drafts"} notes={tab === "notes"} />
      )}

      <p className="mt-8 px-[var(--gutter)] text-center t-meta desktop:px-0">
        {CINEMIX_URL ? <a href={CINEMIX_URL} target="_blank" rel="noopener noreferrer" className="text-link">{CINEMIX_NOTE}</a> : CINEMIX_NOTE}
      </p>
    </div>
  )
}

function ProfilePosts({ url, self, drafts, notes }: { url: string | null; self: boolean; drafts: boolean; notes: boolean }) {
  const { items, loading, error, done, loadMore, reload } = useInfinite<PostDTO>(url)
  if (!url) return null
  if (error && !items.length) return <ErrorState message={error.message} onRetry={() => void reload()} />
  if (loading && !items.length) return <GridSkeleton count={6} />
  if (!items.length) {
    return drafts
      ? <EmptyState icon="edit" title="下書きはありません" body="投稿画面の「下書き保存」で残した投稿がここに並びます。" />
      : <EmptyState icon={notes ? "note" : "image"} title={notes ? "日記はまだありません" : "まだ投稿がありません"} action={self ? { href: "/create", label: notes ? "日記を書く" : "最初の投稿をする" } : undefined} />
  }
  return (
    <>
      <PostGrid posts={items} />
      {!done && <div className="mt-6 text-center"><button type="button" className="btn btn-secondary" onClick={() => void loadMore()} disabled={loading} aria-busy={loading}>{loading ? "読み込み中…" : "もっと見る"}</button></div>}
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
    <div className="flex gap-2">
      <Link href="/profile/edit" className="btn btn-secondary flex-1 desktop:flex-none">プロフィールを編集</Link>
      <button type="button" className="btn btn-secondary w-11 px-0" onClick={() => void share()} aria-label="プロフィールを共有" title="共有"><Icon name="share" size={20} /></button>
      <button type="button" className="btn btn-secondary w-11 px-0" onClick={() => setMenu(true)} aria-label="その他のメニュー" title="メニュー"><Icon name="more" size={20} /></button>
      <Dialog open={menu} onClose={() => setMenu(false)} title="メニュー">
        <nav className="space-y-1">
          {[["/bookmarks", "保存した投稿", "bookmark"], ["/footprints", "足あと", "eye"], ["/notifications", "お知らせ", "bell"], ["/settings", "設定", "settings"], ["/about", "DayNetについて", "info"]].map(([href, label, icon]) => (
            <Link key={href} href={href} className="flex min-h-[48px] items-center gap-3 rounded-[8px] px-2 t-ui hover:bg-subtle"><Icon name={icon as "bookmark"} />{label}</Link>
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
      <div>
        <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => void run(() => api(`/api/blocks/${user.id}`, { method: "DELETE" }), "ブロックを解除しました")}>ブロックを解除</button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={`btn flex-1 desktop:flex-none desktop:min-w-[132px] ${rel.following === "NONE" ? "btn-primary" : "btn-secondary"}`}
        disabled={busy}
        aria-pressed={rel.following !== "NONE"}
        onClick={() => void run(() => api(`/api/follow/${user.id}`, { method: rel.following === "NONE" ? "PUT" : "DELETE" }))}
      >
        {followLabel}
      </button>
      <button
        type="button"
        className="btn btn-secondary flex-1 desktop:flex-none"
        disabled={busy}
        onClick={() => void run(async () => {
          const res = await api<{ id: string }>("/api/dm", { method: "POST", body: { targetUserId: user.id } })
          router.push(`/messages/${res.data.id}`)
        })}
      >
        <Icon name="message" size={18} />{mutual ? "メッセージ" : "DMリクエスト"}
      </button>
      <button type="button" className="btn btn-secondary w-11 px-0" onClick={() => setMenu(true)} aria-label="その他の操作" title="その他"><Icon name="more" size={20} /></button>
      <Dialog open={menu} onClose={() => setMenu(false)} title={`${user.name}さん`}>
        <div className="space-y-1">
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[8px] px-2 t-ui hover:bg-subtle" onClick={() => { setMenu(false); void run(() => api(`/api/mutes/${user.id}`, { method: rel.muting ? "DELETE" : "PUT" }), rel.muting ? "ミュートを解除しました" : "ミュートしました（相手には通知されません）") }}>
            <Icon name="mute" />{rel.muting ? "ミュートを解除" : "ミュート"}
          </button>
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[8px] px-2 t-ui hover:bg-subtle" onClick={() => { setMenu(false); setReport(true) }}><Icon name="flag" />通報</button>
          <button type="button" className="flex min-h-[48px] w-full items-center gap-3 rounded-[8px] px-3 text-error hover:bg-subtle" onClick={() => { setMenu(false); setConfirmBlock(true) }}><Icon name="close" />ブロック</button>
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
