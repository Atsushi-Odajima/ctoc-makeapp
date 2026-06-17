"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { parseImages, getAvatarUrl } from "@/lib/utils"
import type { Post, UserProfile } from "@/types"

export default function ExplorePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  const fetchExplore = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      const data = await res.json()
      setPosts(data.posts || [])
      setUsers(data.users || [])
    } catch { /* ignore */ }
    finally { setLoading(false); setSearching(false) }
  }, [])

  useEffect(() => { fetchExplore() }, [fetchExplore])

  useEffect(() => {
    const t = setTimeout(() => { setSearching(true); fetchExplore(query) }, 400)
    return () => clearTimeout(t)
  }, [query, fetchExplore])

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Search bar */}
      <div className="bg-white px-3 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="ユーザーや投稿を検索..."
            className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all" />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && !searching ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>
        ) : query && users.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {users.map(u => (
              <button key={u.id} onClick={() => router.push(`/u/${u.username}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <img src={getAvatarUrl(u)} alt={u.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-800 text-sm">{u.username}</p>
                  <p className="text-slate-500 text-xs">{u.name}</p>
                  {u.bio && <p className="text-slate-400 text-xs truncate mt-0.5">{u.bio}</p>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(post => {
              const imgs = post.images || []
              return (
                <button key={post.id} onClick={() => router.push(`/post/${post.id}`)}
                  className="aspect-square bg-slate-200 overflow-hidden relative">
                  {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100" />}
                  {imgs.length > 1 && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px]">+</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
