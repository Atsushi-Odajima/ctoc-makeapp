"use client"
import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2 } from "lucide-react"
import { getAvatarUrl, formatTimeAgo } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Post, Comment } from "@/types"
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
    setPost(prev => prev ? { ...prev, isLiked: newLiked, likesCount: prev.likesCount + (newLiked ? 1 : -1) } : null)
    try {
      await fetch(`/api/posts/${id}/like`, { method: "POST" })
    } catch {
      setPost(prev => prev ? { ...prev, isLiked: !newLiked, likesCount: prev.likesCount + (newLiked ? -1 : 1) } : null)
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

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )
  if (!post) return null

  const imgs = post.images || []

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-base font-bold text-slate-900 flex-1">投稿</span>
        <button className="p-2 rounded-full hover:bg-slate-100">
          <MoreHorizontal className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push(`/u/${post.user.username}`)}>
            <img src={getAvatarUrl(post.user)} alt="" className="w-9 h-9 rounded-full object-cover" />
          </button>
          <div className="flex-1">
            <button onClick={() => router.push(`/u/${post.user.username}`)}>
              <p className="text-sm font-semibold text-slate-900">{post.user.username}</p>
            </button>
            {post.location && <p className="text-xs text-slate-500">{post.location}</p>}
          </div>
          <button><MoreHorizontal className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Image */}
        {imgs.length > 0 && (
          <div className="w-full aspect-square bg-slate-100 overflow-hidden">
            <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-4">
          <button onClick={handleLike}>
            <Heart className={cn("w-7 h-7 transition-all", post.isLiked ? "fill-red-500 text-red-500 scale-110" : "text-slate-800")} strokeWidth={1.8} />
          </button>
          <button onClick={() => inputRef.current?.focus()}>
            <MessageCircle className="w-7 h-7 text-slate-800" strokeWidth={1.8} />
          </button>
          <button>
            <Send className="w-7 h-7 text-slate-800" strokeWidth={1.8} />
          </button>
          <div className="flex-1" />
          <button>
            <Bookmark className="w-7 h-7 text-slate-800" strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-4 pb-2">
          {post.likesCount > 0 && (
            <p className="text-sm font-bold text-slate-900 mb-1">{post.likesCount.toLocaleString()}件のいいね</p>
          )}
          {post.caption && (
            <p className="text-sm text-slate-800">
              <span className="font-semibold">{post.user.username}</span>{" "}{post.caption}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(post.createdAt)}</p>
        </div>

        {/* Comments */}
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {comments.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-400 text-sm">最初のコメントを投稿しよう</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="px-4 py-3 flex gap-3">
                <button onClick={() => router.push(`/u/${c.user.username}`)}>
                  <img src={getAvatarUrl(c.user)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                </button>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{c.user.username}</span>{" "}{c.content}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatTimeAgo(c.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment input */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleComment()}
          placeholder="コメントを追加..."
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
        />
        {comment.trim() && (
          <button onClick={handleComment} disabled={sending}
            className="text-blue-500 font-semibold text-sm disabled:opacity-50">
            投稿
          </button>
        )}
      </div>
    </div>
  )
}
