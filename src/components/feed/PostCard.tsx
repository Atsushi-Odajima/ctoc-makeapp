"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Bookmark, Eye, Heart, MapPin, MessageCircle, MoreHorizontal, Send } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn, formatCount, formatTimeAgo, getAvatarUrl } from "@/lib/utils"
import type { Post } from "@/types"

interface PostCardProps {
  post: Post
  onLikeChange?: (postId: string, liked: boolean, count: number) => void
  framed?: boolean
}

const quickReactions = ["わかる", "いいね", "気になる"]

export function PostCard({ post, onLikeChange, framed = false }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [saved, setSaved] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [reaction, setReaction] = useState<string | null>(null)
  const images = post.images || []

  const toggleLike = useCallback(async () => {
    const next = !liked
    const nextCount = next ? likesCount + 1 : Math.max(0, likesCount - 1)
    setLiked(next)
    setLikesCount(nextCount)
    onLikeChange?.(post.id, next, nextCount)
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
      if (!response.ok) throw new Error("Like failed")
    } catch {
      setLiked(!next)
      setLikesCount(likesCount)
    }
  }, [liked, likesCount, onLikeChange, post.id])

  const handleDoubleTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    const now = Date.now()
    if (now - lastTap < 300) {
      if (!liked) {
        setLiked(true)
        setLikesCount(count => count + 1)
        fetch(`/api/posts/${post.id}/like`, { method: "POST" }).catch(() => {})
      }
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 900)
    }
    setLastTap(now)
  }, [lastTap, liked, post.id])

  return (
    <article className={framed ? "overflow-hidden border-y border-[#dfe3e8] bg-white sm:rounded-md sm:border" : "border-b border-[#dfe3e8] bg-white"}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/u/${post.user.username}`}><img src={getAvatarUrl(post.user)} alt={post.user.name} className="h-10 w-10 rounded-full border border-[#dfe3e8] object-cover" /></Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${post.user.username}`} className="text-sm font-black text-[#0b1f3a] hover:underline">{post.user.username}</Link>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[#667085]">
            {post.community ? <Link href={`/communities/${post.community.slug}`} className="font-bold text-[#0b1f3a] hover:underline">{post.community.name}</Link> : null}
            {post.location ? <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate">{post.location}</span></span> : null}
            {!post.community && !post.location ? <span>{formatTimeAgo(post.createdAt)}</span> : null}
          </div>
        </div>
        <button className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="投稿メニュー"><MoreHorizontal className="h-5 w-5 text-[#667085]" /></button>
      </div>

      {images.length > 0 && (
        <div className="relative aspect-square select-none bg-[#eef1f4]" onClick={handleDoubleTap} onDoubleClick={handleDoubleTap}>
          <img src={images[imageIndex]} alt="" className="h-full w-full object-cover" draggable={false} />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button key={index} onClick={event => { event.stopPropagation(); setImageIndex(index) }} aria-label={`${index + 1}枚目`} className={cn("h-1.5 rounded-full bg-white/70", index === imageIndex ? "w-4 bg-[#0b1f3a]" : "w-1.5")} />
              ))}
            </div>
          )}
          <AnimatePresence>
            {showHeart && <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.25, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="pointer-events-none absolute inset-0 flex items-center justify-center"><Heart className="h-24 w-24 fill-white text-white drop-shadow-xl" /></motion.div>}
          </AnimatePresence>
        </div>
      )}

      <div className="px-4 pb-4 pt-3">
        {post.caption && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#344054]"><Link href={`/u/${post.user.username}`} className="mr-1.5 font-black text-[#111827]">{post.user.username}</Link>{post.caption}</p>}

        {post.newsArticle && (
          <Link href={`/news/${post.newsArticle.id}`} className="mt-3 block rounded-md border border-[#cfd6de] bg-[#f8fafc] p-3 hover:border-[#0b1f3a]">
            <div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold text-[#e85d04]">{post.newsArticle.category}</span><span className="text-[#667085]">{post.newsArticle.source}</span></div>
            <p className="text-sm font-black leading-snug text-[#0b1f3a]">{post.newsArticle.title}</p>
          </Link>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.85 }} onClick={toggleLike} aria-label="いいね"><Heart className={cn("h-7 w-7", liked ? "fill-[#e85d04] text-[#e85d04]" : "text-[#111827]")} strokeWidth={1.8} /></motion.button>
            <Link href={`/post/${post.id}`} aria-label="コメント"><MessageCircle className="h-7 w-7 text-[#111827]" strokeWidth={1.8} /></Link>
            <button aria-label="シェア"><Send className="h-6 w-6 text-[#111827]" strokeWidth={1.8} /></button>
          </div>
          <button onClick={() => setSaved(value => !value)} aria-label="保存"><Bookmark className={cn("h-7 w-7", saved ? "fill-[#0b1f3a] text-[#0b1f3a]" : "text-[#111827]")} strokeWidth={1.8} /></button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {quickReactions.map(item => (
            <button key={item} onClick={() => setReaction(reaction === item ? null : item)} className={cn("rounded-md border px-3 py-1 text-xs font-bold", reaction === item ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#d0d5dd] text-[#475467]")}>{item}</button>
          ))}
        </div>

        {likesCount > 0 && <p className="mt-3 text-sm font-black text-[#111827]">{formatCount(likesCount)}件のいいね</p>}
        <div className="mt-2 flex items-center justify-between text-xs text-[#667085]">
          <Link href={`/post/${post.id}`} className="font-semibold hover:text-[#0b1f3a]">{post.commentsCount > 0 ? `${formatCount(post.commentsCount)}件のコメントを見る` : "コメントを書く"}</Link>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />足あと {Math.max(3, likesCount + post.commentsCount + 7)}</span>
        </div>
      </div>
    </article>
  )
}
