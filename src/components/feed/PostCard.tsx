"use client"
import { useState, useCallback } from "react"
import Link from "next/link"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin } from "lucide-react"
import { formatTimeAgo, getAvatarUrl, formatCount } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { Post } from "@/types"

interface PostCardProps {
  post: Post
  onLikeChange?: (postId: string, liked: boolean, count: number) => void
}

export function PostCard({ post, onLikeChange }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [showHeart, setShowHeart] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showCaption, setShowCaption] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)

  const images = post.images

  const toggleLike = useCallback(async () => {
    const newLiked = !liked
    setLiked(newLiked)
    const newCount = newLiked ? likesCount + 1 : likesCount - 1
    setLikesCount(newCount)
    onLikeChange?.(post.id, newLiked, newCount)
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
    } catch {
      setLiked(!newLiked)
      setLikesCount(likesCount)
    }
  }, [liked, likesCount, post.id, onLikeChange])

  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const now = Date.now()
    if (now - lastTap < 300) {
      if (!liked) {
        setLiked(true)
        setLikesCount(c => c + 1)
        fetch(`/api/posts/${post.id}/like`, { method: "POST" }).catch(() => {})
      }
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
    setLastTap(now)
  }, [lastTap, liked, post.id])

  return (
    <article className="bg-white border-b border-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3">
        <Link href={`/u/${post.user.username}`}>
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-500 ring-offset-1">
            <img src={getAvatarUrl(post.user)} alt={post.user.name} className="w-full h-full object-cover" />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/u/${post.user.username}`}>
            <p className="font-semibold text-slate-900 text-sm leading-none">{post.user.username}</p>
          </Link>
          {post.location && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-slate-400" />
              <p className="text-xs text-slate-400">{post.location}</p>
            </div>
          )}
        </div>
        <button className="p-1"><MoreHorizontal className="w-5 h-5 text-slate-600" /></button>
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-slate-100 select-none"
        onClick={handleDoubleTap}
        onDoubleClick={handleDoubleTap}>
        {images.length > 0 ? (
          <img src={images[imageIndex]} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">No image</div>
        )}
        {/* Multi-image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setImageIndex(i) }}
                className={cn("w-1.5 h-1.5 rounded-full transition-all", i === imageIndex ? "bg-blue-500 w-3" : "bg-white/70")} />
            ))}
          </div>
        )}
        {/* Double tap heart */}
        <AnimatePresence>
          {showHeart && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.3, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} className="outline-none">
              <Heart className={cn("w-7 h-7 transition-colors", liked ? "text-red-500 fill-red-500" : "text-slate-800")} strokeWidth={1.8} />
            </motion.button>
            <Link href={`/post/${post.id}`}>
              <motion.div whileTap={{ scale: 0.9 }}>
                <MessageCircle className="w-7 h-7 text-slate-800" strokeWidth={1.8} />
              </motion.div>
            </Link>
            <motion.button whileTap={{ scale: 0.9 }}>
              <Send className="w-6 h-6 text-slate-800" strokeWidth={1.8} />
            </motion.button>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSaved(!saved)}>
            <Bookmark className={cn("w-7 h-7 transition-colors", saved ? "text-slate-900 fill-slate-900" : "text-slate-800")} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* Likes */}
        {likesCount > 0 && (
          <p className="font-semibold text-sm text-slate-900 mb-1">{formatCount(likesCount)}件のいいね</p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-slate-800 leading-relaxed">
            <Link href={`/u/${post.user.username}`} className="font-semibold mr-1.5">{post.user.username}</Link>
            {showCaption || post.caption.length <= 80
              ? post.caption
              : <>{post.caption.slice(0, 80)}<button onClick={() => setShowCaption(true)} className="text-slate-400 ml-1">...もっと見る</button></>}
          </p>
        )}

        {/* Comments count */}
        {post.commentsCount > 0 && (
          <Link href={`/post/${post.id}`}>
            <p className="text-sm text-slate-400 mt-1">{formatCount(post.commentsCount)}件のコメントをすべて見る</p>
          </Link>
        )}

        {/* Timestamp */}
        <p className="text-xs text-slate-400 mt-1 uppercase">{formatTimeAgo(post.createdAt)}</p>
      </div>
    </article>
  )
}
