"use client"
import { useState, useEffect } from "react"
import { Heart, MessageCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { PostCard } from "@/components/feed/PostCard"
import { StoriesRow } from "@/components/stories/StoriesRow"
import type { Post } from "@/types"

interface StoryGroup {
  user: { id: string; name: string; username: string; avatar: string | null }
  stories: Array<{ id: string; imageUrl: string; caption?: string | null }>
}

export default function FeedPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/feed").then(r => r.json()),
      fetch("/api/stories").then(r => r.json()),
    ]).then(([p, s]) => {
      setPosts(Array.isArray(p) ? p : [])
      setStories(Array.isArray(s) ? s : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const currentUser = { name: session?.user?.name || "You", username: (session?.user as { username?: string })?.username || "me", avatar: null }

  if (loading) return (
    <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>
  )

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent" style={{fontFamily:"'Georgia',serif"}}>Connectly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/messages">
            <MessageCircle className="w-6 h-6 text-slate-800" strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stories */}
        <div className="bg-white border-b border-slate-100">
          <StoriesRow stories={stories} currentUser={currentUser} />
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-blue-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">フィードが空です</h3>
            <p className="text-slate-400 mb-6">ユーザーをフォローして投稿を見よう！</p>
            <Link href="/explore" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-blue-200">
              探索する
            </Link>
          </div>
        ) : (
          <div>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
            <div className="py-8 text-center text-slate-300 text-sm">すべて見ました 💙</div>
          </div>
        )}
      </div>
    </div>
  )
}
