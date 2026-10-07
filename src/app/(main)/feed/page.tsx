"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Flame, MessageCircle, PenLine, Search, UsersRound } from "lucide-react"
import { PostCard } from "@/components/feed/PostCard"
import { StoriesRow } from "@/components/stories/StoriesRow"
import type { Community, Post } from "@/types"

interface StoryGroup {
  user: { id: string; name: string; username: string; avatar: string | null }
  stories: Array<{ id: string; imageUrl: string; caption?: string | null }>
}

const dailyPrompts = ["今日いちばん良かったこと", "最近見つけた好きな場所", "いま誰かに薦めたいもの", "今日、少し気になったこと"]
const topics = ["#朝カフェ", "#週末さんぽ", "#推し活", "#今日の日記"]

export default function FeedPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<StoryGroup[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/feed").then(response => response.json()),
      fetch("/api/stories").then(response => response.json()),
      fetch("/api/communities?limit=4").then(response => response.json()),
    ]).then(([postData, storyData, communityData]) => {
      setPosts(Array.isArray(postData) ? postData : [])
      setStories(Array.isArray(storyData) ? storyData : [])
      setCommunities(Array.isArray(communityData) ? communityData : [])
    }).finally(() => setLoading(false))
  }, [])

  const prompt = useMemo(() => dailyPrompts[new Date().getDate() % dailyPrompts.length], [])
  const currentUser = {
    name: session?.user?.name || "You",
    username: (session?.user as { username?: string })?.username || "me",
    avatar: null,
  }

  if (loading) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">読み込み中</div>

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-[#dfe3e8] bg-white px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="ハレノワ" className="h-8 w-8 object-contain" />
          <span className="text-xl font-black text-[#0b1f3a]">ハレノワ</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/explore" className="rounded-md p-2 text-[#0b1f3a] hover:bg-[#f2f4f7]" aria-label="検索"><Search className="h-5 w-5" /></Link>
          <Link href="/messages" className="rounded-md p-2 text-[#0b1f3a] hover:bg-[#f2f4f7]" aria-label="メッセージ"><MessageCircle className="h-5 w-5" /></Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="border-b border-[#dfe3e8] bg-white"><StoriesRow stories={stories} currentUser={currentUser} /></section>

        <section className="flex items-center gap-3 border-b border-[#dfe3e8] px-4 py-4">
          <PenLine className="h-5 w-5 flex-shrink-0 text-[#0b1f3a]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#667085]">今日のお題</p>
            <h2 className="truncate text-base font-black text-[#111827]">{prompt}</h2>
          </div>
          <Link href="/create" className="rounded-md bg-[#0b1f3a] px-4 py-2 text-xs font-bold text-white">投稿</Link>
        </section>

        <section className="border-b border-[#dfe3e8] bg-white px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0b1f3a]" /><h3 className="text-sm font-black text-[#0b1f3a]">コミュニティ</h3></div>
            <Link href="/communities" className="text-xs font-bold text-[#0b1f3a] hover:underline">すべて見る</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {communities.map(community => (
              <Link key={community.id} href={`/communities/${community.slug}`} className="min-w-[170px] rounded-md border border-[#dfe3e8] p-3 hover:bg-[#f8fafc]">
                <p className="text-xs font-bold text-[#e85d04]">{community.category}</p>
                <p className="mt-1 text-sm font-black text-[#0b1f3a]">{community.name}</p>
                <p className="mt-1 text-xs text-[#667085]">{community.memberCount}人</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto border-b border-[#dfe3e8] px-4 py-3 scrollbar-hide">
          {topics.map(topic => <span key={topic} className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-bold text-[#344054]"><Flame className="h-3.5 w-3.5 text-[#e85d04]" />{topic}</span>)}
        </section>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <p className="text-base font-black text-[#0b1f3a]">フィードはまだ静かです</p>
            <p className="mt-2 text-sm leading-relaxed text-[#667085]">気になる人やコミュニティをフォローすると投稿が流れてきます。</p>
            <Link href="/explore" className="mt-5 rounded-md bg-[#0b1f3a] px-5 py-2.5 text-sm font-bold text-white">見つける</Link>
          </div>
        ) : posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
