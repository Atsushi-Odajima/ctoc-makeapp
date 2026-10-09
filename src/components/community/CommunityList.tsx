"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import { ErrorState, Notice, Skeletons } from "@/components/ui/States"
import { useViewer } from "@/components/layout/ViewerContext"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
import type { CommunityDTO } from "@/lib/services/communities"
import { CommunitySymbol } from "./CommunitySymbol"

export function CommunityList() {
  const viewer = useViewer()
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [joined, setJoined] = useState<CommunityDTO[] | null>(null)
  const [discover, setDiscover] = useState<CommunityDTO[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const qs = query ? `&q=${encodeURIComponent(query)}` : ""
    Promise.all([
      viewer ? api<CommunityDTO[]>(`/api/communities?scope=joined${qs}`).then(r => r.data) : Promise.resolve([]),
      api<CommunityDTO[]>(`/api/communities?scope=discover${qs}`).then(r => r.data),
    ]).then(([j, d]) => { setJoined(j); setDiscover(d); setError(null) }).catch(e => setError(e instanceof ApiClientError ? e.message : "読み込めませんでした"))
  }, [query, viewer])

  return (
    <div className="feed-column gutter desktop:px-0 desktop:pt-6">
      <div className="flex items-center justify-between gap-3 pb-3 pt-2">
        <h1 className="t-h1">集まり</h1>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => (viewer ? setCreating(true) : loginRedirect())}><Icon name="plus" size={18} />つくる</button>
      </div>
      <label className="relative block">
        <span className="sr-only">集まりを探す</span>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={20} /></span>
        <input className="input pl-10" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="集まりを探す" />
      </label>

      {error && <ErrorState message={error} onRetry={() => setQuery(q => q + "")} />}

      {viewer && (
        <Section title="参加している集まり" count={joined?.length}>
          {joined === null ? <Skeletons count={1} /> : joined.length === 0 ? <p className="py-4 text-muted t-small">まだ参加していません。</p> : joined.map(c => <CommunityRow key={c.id} c={c} />)}
        </Section>
      )}
      <Section title="見つける" count={discover?.length}>
        {discover === null ? <Skeletons count={1} /> : discover.length === 0 ? <p className="py-4 text-muted t-small">見つかりませんでした。</p> : discover.map(c => <CommunityRow key={c.id} c={c} />)}
      </Section>

      <button type="button" className="btn btn-secondary btn-block mt-6" onClick={() => (viewer ? setCreating(true) : loginRedirect())}>新しい集まりをつくる</button>
      <CreateCommunity open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="mb-1 t-ui font-bold">{title}{count !== undefined && <span className="ml-1.5 t-label font-semibold text-muted">{count}</span>}</h2>
      {children}
    </section>
  )
}

function CommunityRow({ c }: { c: CommunityDTO }) {
  const status = c.membership?.status === "PENDING" ? "参加申請中" : c.membership?.role === "OWNER" ? "管理中" : c.membership ? "参加中" : null
  return (
    <article className="relative border-t border-line py-4">
      <div className="flex items-start gap-3">
        <CommunitySymbol seed={c.slug} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="t-author"><Link href={`/communities/${c.slug}`} className="after:absolute after:inset-0 hover:underline">{c.name}</Link></h3>
          <p className="flex flex-wrap items-center gap-x-1 t-meta">
            <span>{c.category}</span>
            {c.isPrivate && <span className="inline-flex items-center gap-0.5">· <Icon name="lock" size={13} />非公開</span>}
            <span>· {c.memberCount}人{c.postCount !== null ? ` · 投稿${c.postCount}件` : ""}</span>
            {status && <span className="font-bold text-ink">· {status}</span>}
          </p>
          <p className="mt-1 line-clamp-2 t-small">{c.description}</p>
        </div>
        <Icon name="chevronRight" size={18} className="mt-1 shrink-0 text-muted" />
      </div>
    </article>
  )
}

function CreateCommunity({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", description: "", category: "その他", isPrivate: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<CommunityDTO>("/api/communities", { method: "POST", body: form })
      onClose()
      router.push(`/communities/${res.data.slug}`)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "PROFILE_REQUIRED") router.push("/onboarding?next=/communities")
      setError(err instanceof ApiClientError ? Object.values(err.fieldErrors ?? {}).flat()[0] ?? err.message : "作成できませんでした")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="新しい集まり">
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="field-label">名前（2〜40文字）</span><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
        <label className="block"><span className="field-label">どんな話をする場所？（5〜240文字）</span><textarea className="textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
        <label className="block"><span className="field-label">カテゴリ</span>
          <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {["暮らし", "おでかけ", "写真", "喫茶", "エンタメ", "地域", "スポーツ", "学び", "その他"].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex min-h-[44px] items-start gap-2 t-small">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={form.isPrivate} onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))} />
          <span>非公開にする（参加は承認制。投稿・写真・メンバー一覧はメンバーだけが見られます）</span>
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? "作成中…" : "つくる"}</button>
      </form>
    </Dialog>
  )
}
