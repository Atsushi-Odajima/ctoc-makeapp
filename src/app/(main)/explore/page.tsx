"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, Flame, Search, UsersRound, X } from "lucide-react"
import { getAvatarUrl } from "@/lib/utils"
import type { Community, Post, UserProfile } from "@/types"

const topics = [
  { tag: "#カフェ部", count: "24.1万" },
  { tag: "#平成っぽ日記", count: "9.8万" },
  { tag: "#推しのいる生活", count: "38.2万" },
  { tag: "#地元の好き", count: "6.5万" },
]

export default function ExplorePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExplore = useCallback(async (value = "") => {
    const response = await fetch(`/api/explore${value ? `?q=${encodeURIComponent(value)}` : ""}`)
    const data = await response.json()
    setPosts(data.posts || [])
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/communities?limit=4").then(response => response.json()).then(data => setCommunities(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchExplore(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchExplore])

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="border-b border-[#dfe3e8] bg-white p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ユーザー、投稿、好きなものを検索" className="w-full rounded-md border border-[#d0d5dd] bg-[#f8fafc] py-2.5 pl-9 pr-9 text-sm outline-none focus:border-[#0b1f3a] focus:bg-white" />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="クリア"><X className="h-4 w-4 text-[#667085]" /></button>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-20 text-center text-sm text-[#667085]">読み込み中</p>
        ) : query ? (
          <div className="divide-y divide-[#e6e9ed]">
            {users.length === 0 ? <p className="px-6 py-12 text-center text-sm text-[#667085]">まだ見つかりません</p> : users.map(user => (
              <button key={user.id} onClick={() => router.push(`/u/${user.username}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[#f8fafc]">
                <img src={getAvatarUrl(user)} alt={user.name} className="h-12 w-12 rounded-full border border-[#dfe3e8] object-cover" />
                <div className="min-w-0 flex-1"><p className="text-sm font-black text-[#0b1f3a]">{user.username}</p><p className="text-xs text-[#667085]">{user.name}</p>{user.bio && <p className="mt-0.5 truncate text-xs text-[#98a2b3]">{user.bio}</p>}</div>
                <span className="text-xs font-bold text-[#0b1f3a]">見る</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <section className="border-b border-[#dfe3e8] p-4">
              <div className="mb-3 flex items-center gap-2"><Flame className="h-5 w-5 text-[#e85d04]" /><h2 className="font-black text-[#0b1f3a]">いま伸びている話題</h2></div>
              <div className="grid grid-cols-2 gap-2">
                {topics.map(topic => (
                  <button key={topic.tag} className="rounded-md border border-[#dfe3e8] p-3 text-left hover:bg-[#f8fafc]">
                    <p className="text-sm font-black text-[#0b1f3a]">{topic.tag}</p>
                    <p className="mt-1 text-xs text-[#667085]">{topic.count}件</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="border-b border-[#dfe3e8] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#0b1f3a]" /><h2 className="font-black text-[#0b1f3a]">コミュニティ</h2></div>
                <Link href="/communities" className="text-xs font-bold text-[#0b1f3a] hover:underline">すべて見る</Link>
              </div>
              <div className="space-y-2">
                {communities.map(community => (
                  <Link key={community.id} href={`/communities/${community.slug}`} className="flex items-center justify-between rounded-md border border-[#dfe3e8] px-3 py-3 hover:bg-[#f8fafc]">
                    <div><p className="text-sm font-black text-[#0b1f3a]">{community.name}</p><p className="text-xs text-[#667085]">{community.memberCount}人 ・ {community.postCount}件</p></div>
                    <span className="text-xs font-bold text-[#0b1f3a]">見る</span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 px-4 py-3"><Camera className="h-5 w-5 text-[#0b1f3a]" /><h2 className="font-black text-[#0b1f3a]">写真から見つける</h2></div>
              <div className="grid grid-cols-3 gap-0.5">
                {posts.filter(post => post.images?.[0]).map(post => (
                  <button key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="relative aspect-square overflow-hidden bg-[#eef1f4]">
                    <img src={post.images[0]} alt="" className="h-full w-full object-cover" />
                    {post.images.length > 1 && <span className="absolute right-1 top-1 rounded bg-black/55 px-1.5 text-[10px] font-bold text-white">+{post.images.length - 1}</span>}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
