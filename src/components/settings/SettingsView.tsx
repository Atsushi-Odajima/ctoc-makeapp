"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import { Notice, Skeletons } from "@/components/ui/States"
import { api, ApiClientError } from "@/lib/client/api"
import { signOutAndPurge } from "@/lib/client/sign-out"
import { purgePersonalCache } from "@/lib/client/personal-cache"
import { CINEMIX_NOTE } from "@/config/brand"
import type { UserSummary } from "@/lib/dto/user"

interface Own {
  username: string
  email: string
  isPrivate: boolean
  dmPolicy: "MUTUAL_OR_REQUEST" | "CLOSED"
  footprintOptIn: boolean
  hasPassword: boolean
  role: "USER" | "MODERATOR" | "ADMIN"
}

export function SettingsView() {
  const router = useRouter()
  const [me, setMe] = useState<Own | null>(null)
  const [blocks, setBlocks] = useState<Array<{ user: UserSummary }>>([])
  const [mutes, setMutes] = useState<{ users: UserSummary[]; communities: Array<{ slug: string; name: string }> }>({ users: [], communities: [] })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = () => {
    api<Own>("/api/profile").then(r => setMe(r.data)).catch(() => undefined)
    api<Array<{ user: UserSummary }>>("/api/blocks").then(r => setBlocks(r.data)).catch(() => undefined)
    api<typeof mutes>("/api/mutes").then(r => setMutes(r.data)).catch(() => undefined)
  }
  useEffect(load, [])

  async function patch(body: Partial<Own>, message: string) {
    try {
      const res = await api<Own>("/api/profile", { method: "PATCH", body })
      setMe(res.data)
      toast.success(message)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "変更できませんでした")
    }
  }

  async function exportData(format: "json" | "csv", table?: string) {
    try {
      const res = await fetch("/api/account/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, table }) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "取得できませんでした")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "daynet-export"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得できませんでした")
    }
  }

  if (!me) return <div className="mx-auto max-w-[640px] gutter"><Skeletons count={1} /></div>
  return (
    <div className="mx-auto max-w-[640px] gutter space-y-6">
      <div className="flex items-center gap-2 py-2"><Link href="/profile" className="icon-btn" aria-label="戻る"><Icon name="back" /></Link><h1 className="t-h2">設定</h1></div>

      <Section title="公開範囲">
        <Toggle
          label="非公開アカウント"
          description="オンにすると、新しいフォローは承認制になり、個人の投稿は承認したフォロワーだけが読めます。表示名・自己紹介・3つの項目は公開のままです。すでに承認済みのフォロワーはそのままです。公開の集まりへの投稿は、集まりの設定どおり誰でも読めます。"
          checked={me.isPrivate}
          onChange={v => void patch({ isPrivate: v }, v ? "非公開アカウントにしました" : "公開アカウントにしました")}
        />
      </Section>

      <Section title="DM">
        <label className="flex min-h-[44px] items-center justify-between gap-3 t-body">
          <span>新しいDMの受け付け</span>
          <select className="select max-w-[60%]" value={me.dmPolicy} onChange={e => void patch({ dmPolicy: e.target.value as Own["dmPolicy"] }, "変更しました")}>
            <option value="MUTUAL_OR_REQUEST">相互フォローは会話・その他はリクエスト</option>
            <option value="CLOSED">受け付けない（今の会話は続けられます）</option>
          </select>
        </label>
        <p className="field-hint">DMはエンドツーエンド暗号化ではありません。通報があった場合、運営は通報されたメッセージだけを確認します。</p>
      </Section>

      <Section title="足あと">
        <Toggle label="足あとを使う" description="お互いにオンの人どうしだけ、プロフィールを訪れた記録が残ります（30日で消去）。" checked={me.footprintOptIn} onChange={v => void patch({ footprintOptIn: v }, v ? "足あとをオンにしました" : "足あとをオフにしました")} />
      </Section>

      <Section title="ブロック・ミュート">
        {blocks.length === 0 && mutes.users.length === 0 && mutes.communities.length === 0 ? <p className="text-muted t-small">ブロック・ミュートしている人はいません。</p> : (
          <ul>
            {blocks.map(({ user }) => <Row key={`b-${user.id}`} user={user} label="ブロック中" action="解除" onAction={async () => { await api(`/api/blocks/${user.id}`, { method: "DELETE" }); load() }} />)}
            {mutes.users.map(user => <Row key={`m-${user.id}`} user={user} label="ミュート中" action="解除" onAction={async () => { await api(`/api/mutes/${user.id}`, { method: "DELETE" }); load() }} />)}
            {mutes.communities.map(c => (
              <li key={`c-${c.slug}`} className="flex min-h-[56px] items-center justify-between border-b border-line">
                <span>{c.name}<span className="ml-2 text-muted t-tiny">集まりをミュート中</span></span>
                <button type="button" className="btn btn-secondary" onClick={async () => { await api(`/api/communities/${c.slug}/mute`, { method: "DELETE" }); load() }}>解除</button>
              </li>
            ))}
          </ul>
        )}
        <p className="field-hint">ブロックすると、お互いにフォロー・DM・反応・返信ができなくなります。公開の投稿はログアウトした状態では誰でも読めるため、インターネット全体から見えなくなるわけではありません。</p>
      </Section>

      <Section title="アカウント">
        <p className="t-small">ログイン中: @{me.username}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => void exportData("json")}><Icon name="download" size={18} />データをダウンロード（JSON）</button>
          <button type="button" className="btn btn-secondary" onClick={() => void exportData("csv", "posts")}>投稿（CSV）</button>
          <button type="button" className="btn btn-secondary" onClick={() => void exportData("csv", "comments")}>コメント（CSV）</button>
          <button type="button" className="btn btn-secondary" onClick={() => void exportData("csv", "memberships")}>参加（CSV）</button>
        </div>
        <p className="field-hint">プロフィール・自分の投稿・自分のコメント・参加情報が含まれます。他の人のDM本文は含まれません。写真・動画の原本は含まれません。</p>
        {(me.role === "MODERATOR" || me.role === "ADMIN") && <Link href="/admin/reports" className="btn btn-secondary">通報の確認（運営）</Link>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => void signOutAndPurge()}>ログアウト</button>
        <button type="button" className="btn btn-ghost btn-block text-error" onClick={() => setDeleteOpen(true)}>退会する</button>
      </Section>

      <Section title="DayNetについて">
        <div className="flex flex-wrap gap-x-4">
          <Link href="/about" className="link-btn">DayNetについて</Link>
          <Link href="/terms" className="link-btn">利用規約</Link>
          <Link href="/privacy" className="link-btn">プライバシーポリシー</Link>
        </div>
        <p className="text-muted text-[10px]">{CINEMIX_NOTE}</p>
      </Section>

      <DeleteAccount open={deleteOpen} onClose={() => setDeleteOpen(false)} hasPassword={me.hasPassword} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-[18px] bg-surface p-5" aria-label={title}><h2 className="t-section">{title}</h2>{children}</section>
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label className="flex min-h-[44px] items-center justify-between gap-3">
        <span className="t-body font-bold">{label}</span>
        <input type="checkbox" role="switch" aria-checked={checked} className="h-6 w-6" checked={checked} onChange={e => onChange(e.target.checked)} />
      </label>
      <p className="field-hint">{description}</p>
    </div>
  )
}

function Row({ user, label, action, onAction }: { user: UserSummary; label: string; action: string; onAction: () => Promise<void> }) {
  return (
    <li className="flex min-h-[56px] items-center gap-3 border-b border-line">
      <Avatar user={user} size={32} />
      <span className="min-w-0 flex-1 truncate">{user.name}<span className="ml-2 text-muted t-tiny">{label}</span></span>
      <button type="button" className="btn btn-secondary" onClick={() => void onAction().catch(() => toast.error("操作できませんでした"))}>{action}</button>
    </li>
  )
}

function DeleteAccount({ open, onClose, hasPassword }: { open: boolean; onClose: () => void; hasPassword: boolean }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api("/api/account", { method: "DELETE", body: { confirm, ...(hasPassword ? { password } : {}) } })
      await purgePersonalCache()
      window.location.href = "/login?deleted=1"
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "退会できませんでした")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="退会する" variant="center">
      <form onSubmit={submit} className="space-y-3">
        <p className="t-small">退会するとすぐにアカウントが停止され、プロフィールと投稿は表示されなくなります。7日以内に写真・動画と個人データを削除します。これまでの会話には「削除されたユーザー」と表示されます。通報などの記録の扱いはプライバシーポリシーをご確認ください。</p>
        {hasPassword ? (
          <label className="block"><span className="field-label">パスワード（本人確認）</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        ) : <Notice tone="info">本人確認のため、ログインから15分以内に操作してください。時間が経っている場合は一度ログアウトしてログインし直してください。</Notice>}
        <label className="block"><span className="field-label">確認のため「退会する」と入力</span><input className="input" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-danger btn-block" disabled={busy || confirm !== "退会する"}>{busy ? "処理中…" : "退会する"}</button>
      </form>
    </Dialog>
  )
}
