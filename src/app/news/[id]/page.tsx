"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, ArrowUpRight, Eye, Flame, MessageCircle, Quote, Send } from "lucide-react"
import toast from "react-hot-toast"
import { PortalHeader } from "@/components/layout/PortalHeader"
import { formatTimeAgo, getAvatarUrl } from "@/lib/utils"

type NewsMetrics = {
  comments: number
  quotes: number
  views: number
  heat: number
  velocity: number
}

type NewsArticle = NewsMetrics & {
  id: string
  title: string
  link: string
  summary?: string | null
  category: string
  feedKey: string
  source: string
  publishedAt: string
}

type NewsComment = {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; username: string; avatar: string | null }
}

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const articleId = params.id
  const router = useRouter()
  const { status } = useSession()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [comments, setComments] = useState<NewsComment[]>([])
  const [related, setRelated] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [commentDraft, setCommentDraft] = useState("")
  const [quoteDraft, setQuoteDraft] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const [postingQuote, setPostingQuote] = useState(false)

  const updateMetrics = useCallback((metrics: NewsMetrics) => {
    setArticle(current => current ? { ...current, ...metrics } : current)
  }, [])

  useEffect(() => {
    if (!articleId) return
    let active = true
    Promise.all([
      fetch(`/api/news/${articleId}`, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("article")
        return response.json()
      }),
      fetch(`/api/news/${articleId}/comments`, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("comments")
        return response.json()
      }),
      fetch("/api/news", { cache: "no-store" }).then(response => response.ok ? response.json() : { items: [] }),
    ]).then(([articleData, commentData, newsData]) => {
      if (!active) return
      setArticle({ ...articleData, ...commentData.metrics })
      setComments(commentData.comments || [])
      setRelated((newsData.items || []).filter((item: NewsArticle) => item.id !== articleId).slice(0, 6))
    }).catch(() => toast.error("ニュースを読み込めませんでした"))
      .finally(() => active && setLoading(false))

    const storageKey = "harenowa-news-visitor"
    let visitorKey = localStorage.getItem(storageKey)
    if (!visitorKey) {
      visitorKey = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `visitor-${Date.now()}`
      localStorage.setItem(storageKey, visitorKey)
    }
    fetch(`/api/news/${articleId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }).then(response => response.ok ? response.json() : null)
      .then(metrics => metrics && active && updateMetrics(metrics))
      .catch(() => {})

    return () => { active = false }
  }, [articleId, updateMetrics])

  const sameCategory = useMemo(() => {
    if (!article) return related
    return [...related].sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
  }, [article, related])

  async function postComment() {
    if (!article || !commentDraft.trim() || postingComment) return
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/news/${article.id}`)}`)
      return
    }
    setPostingComment(true)
    try {
      const response = await fetch(`/api/news/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentDraft.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setComments(current => [result.comment, ...current])
      updateMetrics(result.metrics)
      setCommentDraft("")
      toast.success("コメントを投稿しました")
    } catch {
      toast.error("コメントを投稿できませんでした")
    } finally {
      setPostingComment(false)
    }
  }

  async function quoteNews() {
    if (!article || !quoteDraft.trim() || postingQuote) return
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/news/${article.id}`)}`)
      return
    }
    setPostingQuote(true)
    try {
      const response = await fetch(`/api/news/${article.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: quoteDraft.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      updateMetrics(result.metrics)
      toast.success("ニュースを引用して投稿しました")
      router.push(`/post/${result.postId}`)
    } catch {
      toast.error("引用投稿を作成できませんでした")
    } finally {
      setPostingQuote(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      <PortalHeader />
      <main className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-5 lg:grid-cols-[minmax(0,720px)_320px]">
        <div className="min-w-0 space-y-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#475467] hover:text-[#0b1f3a]"><ArrowLeft className="h-4 w-4" />TOPへ戻る</Link>

          {loading ? (
            <div className="h-80 animate-pulse rounded-md border border-[#dfe3e8] bg-white" />
          ) : article ? (
            <>
              <article className="overflow-hidden rounded-md border border-[#dfe3e8] bg-white">
                <div className="p-5 sm:p-7">
                  <div className="flex items-center gap-2 text-xs text-[#667085]">
                    <span className="font-bold text-[#0b1f3a]">{article.category}</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                    <span className="ml-auto">{article.source}</span>
                  </div>
                  <h1 className="mt-3 text-2xl font-black leading-snug text-[#111827] sm:text-3xl">{article.title}</h1>
                  {article.summary && <p className="mt-4 text-sm leading-7 text-[#475467]">{article.summary}</p>}
                  <div className="mt-6 grid grid-cols-4 divide-x divide-[#e6e9ed] border-y border-[#e6e9ed] py-3 text-center">
                    <div><p className="text-[11px] text-[#667085]">熱量</p><p className="mt-1 inline-flex items-center gap-1 font-black text-[#e85d04]"><Flame className="h-4 w-4" />{article.heat}</p></div>
                    <div><p className="text-[11px] text-[#667085]">閲覧</p><p className="mt-1 font-black text-[#0b1f3a]">{article.views}</p></div>
                    <div><p className="text-[11px] text-[#667085]">コメント</p><p className="mt-1 font-black text-[#0b1f3a]">{article.comments}</p></div>
                    <div><p className="text-[11px] text-[#667085]">引用</p><p className="mt-1 font-black text-[#0b1f3a]">{article.quotes}</p></div>
                  </div>
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0b1f3a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102a4d]">元記事を読む<ArrowUpRight className="h-4 w-4" /></a>
                </div>
              </article>

              <section className="rounded-md border border-[#dfe3e8] bg-white p-5" aria-labelledby="quote-heading">
                <div className="mb-3 flex items-center gap-2">
                  <Quote className="h-4 w-4 text-[#0b1f3a]" />
                  <h2 id="quote-heading" className="text-sm font-black text-[#0b1f3a]">ニュースを引用して投稿</h2>
                </div>
                <textarea value={quoteDraft} onChange={event => setQuoteDraft(event.target.value)} maxLength={500} placeholder={status === "authenticated" ? "このニュースについて、ひとこと" : "ログインすると引用投稿できます"} className="min-h-24 w-full resize-none rounded-md border border-[#d0d5dd] p-3 text-sm outline-none focus:border-[#0b1f3a]" />
                <div className="mt-2 flex justify-end"><button onClick={quoteNews} disabled={!quoteDraft.trim() || postingQuote} className="inline-flex items-center gap-1.5 rounded-md bg-[#0b1f3a] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Quote className="h-4 w-4" />引用投稿</button></div>
              </section>

              <section className="overflow-hidden rounded-md border border-[#dfe3e8] bg-white" aria-labelledby="comments-heading">
                <div className="flex items-center justify-between border-b border-[#e6e9ed] px-5 py-4">
                  <h2 id="comments-heading" className="font-black text-[#0b1f3a]">コメント</h2>
                  <span className="text-xs text-[#667085]">{comments.length}件</span>
                </div>
                <div className="border-b border-[#e6e9ed] p-5">
                  <textarea value={commentDraft} onChange={event => setCommentDraft(event.target.value)} maxLength={500} placeholder={status === "authenticated" ? "このニュースについてコメント" : "ログインするとコメントできます"} className="min-h-24 w-full resize-none rounded-md border border-[#d0d5dd] p-3 text-sm outline-none focus:border-[#0b1f3a]" />
                  <div className="mt-2 flex justify-end"><button onClick={postComment} disabled={!commentDraft.trim() || postingComment} className="inline-flex items-center gap-1.5 rounded-md bg-[#0b1f3a] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />コメント</button></div>
                </div>
                <div className="divide-y divide-[#e6e9ed]">
                  {comments.length === 0 ? <p className="p-8 text-center text-sm text-[#667085]">まだコメントはありません</p> : comments.map(comment => (
                    <article key={comment.id} className="flex gap-3 px-5 py-4">
                      <Link href={`/u/${comment.user.username}`}><img src={getAvatarUrl(comment.user)} alt={comment.user.name} className="h-10 w-10 rounded-full border border-[#dfe3e8] object-cover" /></Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><Link href={`/u/${comment.user.username}`} className="text-sm font-black text-[#0b1f3a] hover:underline">{comment.user.username}</Link><span className="text-xs text-[#98a2b3]">{formatTimeAgo(comment.createdAt)}</span></div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#344054]">{comment.content}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : <div className="rounded-md border border-[#dfe3e8] bg-white p-12 text-center"><p className="font-bold text-[#0b1f3a]">ニュースが見つかりませんでした</p></div>}
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <section className="overflow-hidden rounded-md border border-[#dfe3e8] bg-white">
            <div className="border-b border-[#e6e9ed] px-4 py-3"><h2 className="text-sm font-black text-[#0b1f3a]">あわせて読みたい</h2></div>
            <div className="divide-y divide-[#e6e9ed]">
              {sameCategory.map(item => (
                <Link key={item.id} href={`/news/${item.id}`} className="block px-4 py-4 hover:bg-[#f8fafc]">
                  <div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-bold text-[#0b1f3a]">{item.category}</span><span className="text-[#667085]">{formatTimeAgo(item.publishedAt)}</span></div>
                  <p className="line-clamp-3 text-sm font-bold leading-snug">{item.title}</p>
                  <div className="mt-2 flex gap-3 text-[11px] text-[#667085]"><span className="inline-flex items-center gap-1 text-[#e85d04]"><Flame className="h-3 w-3" />{item.heat}</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{item.comments}</span><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{item.views}</span></div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
