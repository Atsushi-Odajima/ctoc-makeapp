"use client"
import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, ChevronLeft, Heart, MessageCircle, MoreHorizontal, Send, Sparkles, Loader2 } from "lucide-react"
import { cn, formatTimeAgo, getAvatarUrl } from "@/lib/utils"
import type { Comment, Post } from "@/types"
import toast from "react-hot-toast"

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${id}`).then(r => r.json()),
      fetch(`/api/posts/${id}/comments`).then(r => r.json()),
    ]).then(([p, c]) => {
      setPost(p)
      setComments(Array.isArray(c) ? c : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handleLike = async () => {
    if (!post) return
    const newLiked = !post.isLiked
    setPost(prev => prev ? { ...prev, isLiked: newLiked, likesCount: Math.max(0, prev.likesCount + (newLiked ? 1 : -1)) } : null)
    try {
      await fetch(`/api/posts/${id}/like`, { method: "POST" })
    } catch {
      setPost(prev => prev ? { ...prev, isLiked: !newLiked, likesCount: Math.max(0, prev.likesCount + (newLiked ? -1 : 1)) } : null)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      })
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null)
      setComment("")
    } catch {
      toast.error("コメントの投稿に失敗しました")
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#0b1f3a]" /></div>
  if (!post) return null

  const imgs = post.images || []

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#dfe3e8] px-2 py-3">
        <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="戻る">
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <span className="flex-1 text-base font-black text-slate-900">投稿</span>
        <button className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="投稿メニュー">
          <MoreHorizontal className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push(`/u/${post.user.username}`)}>
            <img src={getAvatarUrl(post.user)} alt="" className="h-10 w-10 rounded-full object-cover" />
          </button>
          <div className="flex-1">
            <button onClick={() => router.push(`/u/${post.user.username}`)}><p className="text-sm font-black text-slate-900">{post.user.username}</p></button>
            {post.location && <p className="text-xs text-slate-500">{post.location}</p>}
          </div>
          {post.community ? <button onClick={() => router.push(`/communities/${post.community?.slug}`)} className="text-xs font-bold text-[#0b1f3a]">{post.community.name}</button> : <span className="text-xs font-bold text-[#667085]">日記</span>}
        </div>

        {imgs.length > 0 && (
          <div className="aspect-square w-full overflow-hidden bg-[#eef1f4]">
            <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-4 px-4 pb-1 pt-3">
          <button onClick={handleLike} aria-label="いいね">
            <Heart className={cn("h-7 w-7 transition-all", post.isLiked ? "scale-110 fill-[#e85d04] text-[#e85d04]" : "text-slate-800")} strokeWidth={1.8} />
          </button>
          <button onClick={() => inputRef.current?.focus()} aria-label="コメント">
            <MessageCircle className="h-7 w-7 text-slate-800" strokeWidth={1.8} />
          </button>
          <button aria-label="シェア"><Send className="h-7 w-7 text-slate-800" strokeWidth={1.8} /></button>
          <div className="flex-1" />
          <button aria-label="保存"><Bookmark className="h-7 w-7 text-slate-800" strokeWidth={1.8} /></button>
        </div>

        <div className="px-4 pb-3">
          {post.likesCount > 0 && <p className="mb-1 text-sm font-black text-slate-900">{post.likesCount.toLocaleString()}件のいいね</p>}
          {post.caption && <p className="text-sm text-slate-800"><span className="font-black">{post.user.username}</span> {post.caption}</p>}
          {post.newsArticle && (
            <button onClick={() => router.push(`/news/${post.newsArticle?.id}`)} className="mt-3 w-full rounded-md border border-[#cfd6de] bg-[#f8fafc] p-3 text-left hover:border-[#0b1f3a]">
              <div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold text-[#e85d04]">{post.newsArticle.category}</span><span className="text-[#667085]">{post.newsArticle.source}</span></div>
              <p className="text-sm font-black leading-snug text-[#0b1f3a]">{post.newsArticle.title}</p>
            </button>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Sparkles className="h-3 w-3 text-[#e85d04]" /> {formatTimeAgo(post.createdAt)}</p>
        </div>

        <div className="divide-y divide-[#e6e9ed] border-t border-[#dfe3e8]">
          {comments.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-bold text-slate-400">最初のコメントを書いてみよう</p>
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-3 px-4 py-3">
              <button onClick={() => router.push(`/u/${c.user.username}`)}>
                <img src={getAvatarUrl(c.user)} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
              </button>
              <div className="flex-1">
                <p className="text-sm text-slate-800"><span className="font-black">{c.user.username}</span> {c.content}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatTimeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3 border-t border-[#dfe3e8] px-4 py-3">
        <input ref={inputRef} type="text" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} placeholder="コメントを追加..." className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        {comment.trim() && <button onClick={handleComment} disabled={sending} className="text-sm font-bold text-[#0b1f3a] disabled:opacity-50">投稿</button>}
      </div>
    </div>
  )
}
