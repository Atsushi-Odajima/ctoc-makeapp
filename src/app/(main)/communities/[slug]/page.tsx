"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send, UsersRound } from "lucide-react"
import toast from "react-hot-toast"
import { PostCard } from "@/components/feed/PostCard"
import { getAvatarUrl } from "@/lib/utils"
import type { Community, Post } from "@/types"

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetch(`/api/communities/${slug}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setCommunity)
      .catch(() => toast.error("コミュニティを取得できませんでした"))
      .finally(() => setLoading(false))
  }, [slug])

  async function toggleJoin() {
    if (!community) return
    try {
      const response = await fetch(`/api/communities/${slug}/join`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCommunity(current => current ? {
        ...current,
        isMember: result.joined,
        role: result.role,
        memberCount: Math.max(0, current.memberCount + (result.joined && !current.isMember ? 1 : !result.joined && current.isMember ? -1 : 0)),
      } : current)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作できませんでした")
    }
  }

  async function createPost() {
    if (!community || !draft.trim() || posting) return
    setPosting(true)
    try {
      const response = await fetch(`/api/communities/${slug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: draft.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCommunity(current => current ? { ...current, posts: [result, ...(current.posts || [])], postCount: current.postCount + 1 } : current)
      setDraft("")
      toast.success("コミュニティに投稿しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "投稿できませんでした")
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">読み込み中</div>
  if (!community) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">コミュニティが見つかりません</div>

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-[#dfe3e8] px-2 py-3">
        <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="戻る"><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="min-w-0 flex-1 truncate font-black text-[#0b1f3a]">{community.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="border-b border-[#dfe3e8] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-[#e9edf2] text-[#0b1f3a]"><UsersRound className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#e85d04]">{community.category}</p>
              <h2 className="text-xl font-black text-[#0b1f3a]">{community.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#475467]">{community.description}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-y border-[#e6e9ed] py-3">
            <div className="text-sm"><span className="font-black text-[#0b1f3a]">{community.memberCount}</span><span className="ml-1 text-[#667085]">人</span></div>
            <div className="flex -space-x-2">
              {(community.members || []).slice(0, 6).map(member => (
                <Link key={member.id} href={`/u/${member.username}`}><img src={getAvatarUrl(member)} alt={member.name} className="h-8 w-8 rounded-full border-2 border-white object-cover" /></Link>
              ))}
            </div>
            <button onClick={toggleJoin} className={`rounded-md px-4 py-2 text-sm font-bold ${community.isMember ? "border border-[#d0d5dd] text-[#344054]" : "bg-[#0b1f3a] text-white"}`}>
              {community.role === "owner" ? "管理中" : community.isMember ? "参加中" : "参加"}
            </button>
          </div>
        </section>

        {community.isMember && (
          <section className="border-b border-[#dfe3e8] p-4">
            <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="コミュニティに投稿" maxLength={500} className="min-h-24 w-full resize-none rounded-md border border-[#d0d5dd] p-3 text-sm outline-none focus:border-[#0b1f3a]" />
            <div className="mt-2 flex justify-end">
              <button onClick={createPost} disabled={!draft.trim() || posting} className="inline-flex items-center gap-1.5 rounded-md bg-[#0b1f3a] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />投稿</button>
            </div>
          </section>
        )}

        <section>
          {(community.posts || []).length === 0 ? (
            <div className="px-6 py-16 text-center"><p className="text-sm font-bold text-[#667085]">まだ投稿はありません</p></div>
          ) : (community.posts || []).map((post: Post) => <PostCard key={post.id} post={post} />)}
        </section>
      </div>
    </div>
  )
}
