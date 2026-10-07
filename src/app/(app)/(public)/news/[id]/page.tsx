"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { ErrorState, Notice, Skeletons } from "@/components/ui/States"
import { useViewer } from "@/components/layout/ViewerContext"
import { api, ApiClientError } from "@/lib/client/api"
import { relativeTime } from "@/lib/client/format"
import type { UserSummary } from "@/lib/dto/user"

interface Article { id: string; title: string; link: string; summary: string | null; category: string; source: string; publishedAt: string; comments: number; quotes: number }
interface Comment { id: string; content: string; createdAt: string; user: UserSummary }

export default function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const viewer = useViewer()
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [mode, setMode] = useState<"comment" | "quote">("comment")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api<Article>(`/api/news/${id}`), api<{ comments: Comment[] }>(`/api/news/${id}/comments`)])
      .then(([a, c]) => { setArticle(a.data); setComments(c.data.comments) })
      .catch(e => setError(e instanceof ApiClientError ? e.message : "読み込めませんでした"))
    let key = ""
    try {
      key = localStorage.getItem("daynet:news-visitor") || crypto.randomUUID().replace(/-/g, "")
      localStorage.setItem("daynet:news-visitor", key)
    } catch { /* ignore */ }
    void fetch(`/api/news/${id}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorKey: key }) }).catch(() => undefined)
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      if (mode === "comment") {
        const res = await api<{ comment: Comment }>(`/api/news/${id}/comments`, { method: "POST", body: { content: text } })
        setComments(c => [res.data.comment, ...c])
      } else {
        const res = await api<{ postId: string }>(`/api/news/${id}/quote`, { method: "POST", body: { caption: text } })
        router.push(`/post/${res.data.postId}?posted=1`)
      }
      setText("")
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "PROFILE_REQUIRED") router.push(`/onboarding?next=/news/${id}`)
      else toast.error(err instanceof ApiClientError ? err.message : "送信できませんでした")
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="mx-auto max-w-[640px] gutter pt-4"><ErrorState message={error} /></div>
  if (!article) return <div className="mx-auto max-w-[640px] gutter pt-4"><Skeletons count={1} /></div>
  return (
    <article className="mx-auto max-w-[640px] gutter space-y-4 pt-4">
      <p className="text-muted t-small">{article.category} · {article.source} · {relativeTime(article.publishedAt)}</p>
      <h1 className="t-h2">{article.title}</h1>
      {article.summary && <p className="t-long">{article.summary}</p>}
      <a href={article.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">元の記事を読む（外部サイト）</a>
      {viewer ? (
        <form onSubmit={submit} className="space-y-2 rounded-[12px] bg-surface p-4">
          <div className="tabs">
            <button type="button" aria-pressed={mode === "comment"} onClick={() => setMode("comment")}>コメント</button>
            <button type="button" aria-pressed={mode === "quote"} onClick={() => setMode("quote")}>引用して投稿</button>
          </div>
          <textarea className="textarea" value={text} onChange={e => setText(e.target.value)} placeholder={mode === "comment" ? "この記事について" : "自分のページに投稿する文章"} />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !text.trim()}>{busy ? "送信中…" : "送信"}</button>
        </form>
      ) : <Notice tone="info"><Link href="/login" className="underline">ログイン</Link>するとコメントできます。</Notice>}
      <section aria-label="コメント">
        <h2 className="t-section">コメント</h2>
        {comments.length === 0 ? <p className="text-muted t-small">まだコメントはありません。</p> : (
          <ul>{comments.map(c => <li key={c.id} className="flex gap-3 border-b border-line py-3"><Avatar user={c.user} size={32} /><div className="min-w-0"><p className="t-small"><b>{c.user.name}</b> <span className="text-muted">{relativeTime(c.createdAt)}</span></p><p className="whitespace-pre-wrap t-body">{c.content}</p></div></li>)}</ul>
        )}
      </section>
    </article>
  )
}
