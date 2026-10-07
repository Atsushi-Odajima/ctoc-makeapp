"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bookmark, Grid, Newspaper, Settings, UsersRound } from "lucide-react"
import { cn, formatCount, getAvatarUrl } from "@/lib/utils"
import type { Community, Post, UserProfile } from "@/types"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"posts" | "saved">("posts")

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(response => response.json()),
      fetch("/api/posts?mine=true").then(response => response.json()),
      fetch("/api/communities").then(response => response.json()),
    ]).then(([profileData, postData, communityData]) => {
      setProfile(profileData)
      setPosts(Array.isArray(postData) ? postData : [])
      setCommunities(Array.isArray(communityData) ? communityData.filter((community: Community) => community.isMember) : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">読み込み中</div>
  if (!profile) return null

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <header className="flex items-center justify-between border-b border-[#dfe3e8] px-4 py-3">
        <h1 className="text-lg font-black text-[#0b1f3a]">{profile.username}</h1>
        <Link href="/settings" className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="設定"><Settings className="h-6 w-6 text-[#0b1f3a]" strokeWidth={1.8} /></Link>
      </header>

      <section className="border-b border-[#dfe3e8] px-4 pb-4 pt-5">
        <div className="mb-4 flex items-center gap-5">
          <img src={getAvatarUrl(profile)} alt={profile.name} className="h-[88px] w-[88px] rounded-full border border-[#dfe3e8] object-cover" />
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            {[
              { label: "投稿", value: profile.postsCount ?? posts.length },
              { label: "フォロワー", value: profile.followersCount ?? 0 },
              { label: "フォロー中", value: profile.followingCount ?? 0 },
            ].map(item => <div key={item.label}><p className="text-lg font-black text-[#111827]">{formatCount(item.value)}</p><p className="text-[10px] font-bold text-[#667085]">{item.label}</p></div>)}
          </div>
        </div>

        <p className="text-sm font-black text-[#111827]">{profile.name}</p>
        {profile.bio ? <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#344054]">{profile.bio}</p> : <p className="mt-1 text-sm text-[#667085]">自己紹介はまだありません</p>}
        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-bold text-[#0b1f3a] hover:underline">{profile.website.replace(/^https?:\/\//, "")}</a>}

        <Link href="/profile/edit" className="mt-4 block w-full rounded-md border border-[#0b1f3a] py-2 text-center text-sm font-bold text-[#0b1f3a] hover:bg-[#f8fafc]">プロフィールを編集</Link>

        {communities.length > 0 && (
          <div className="mt-4 border-t border-[#e6e9ed] pt-3">
            <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0b1f3a]" /><p className="text-xs font-black text-[#0b1f3a]">参加コミュニティ</p></div><Link href="/communities" className="text-xs font-bold text-[#667085]">すべて</Link></div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">{communities.slice(0, 5).map(community => <Link key={community.id} href={`/communities/${community.slug}`} className="flex-shrink-0 rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-bold text-[#344054]">{community.name}</Link>)}</div>
          </div>
        )}
      </section>

      <div className="flex border-b border-[#dfe3e8]">
        <button onClick={() => setTab("posts")} className={cn("flex-1 border-b-2 py-3", tab === "posts" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-[#98a2b3]")}><Grid className="mx-auto h-5 w-5" /></button>
        <button onClick={() => setTab("saved")} className={cn("flex-1 border-b-2 py-3", tab === "saved" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-[#98a2b3]")}><Bookmark className="mx-auto h-5 w-5" /></button>
      </div>

      {tab === "posts" && (posts.length === 0 ? (
        <div className="px-8 py-16 text-center"><p className="font-black text-[#0b1f3a]">まだ投稿はありません</p><Link href="/create" className="mt-3 inline-block text-sm font-bold text-[#0b1f3a] hover:underline">投稿する</Link></div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <button key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="relative aspect-square overflow-hidden bg-[#eef1f4]">
              {post.images?.[0] ? <img src={post.images[0]} alt="" className="h-full w-full object-cover" /> : post.newsArticle ? <div className="flex h-full flex-col items-center justify-center p-3 text-center"><Newspaper className="mb-2 h-6 w-6 text-[#e85d04]" /><p className="line-clamp-2 text-xs font-black text-[#0b1f3a]">{post.newsArticle.title}</p></div> : <div className="h-full w-full bg-[#eef1f4]" />}
              {(post.images?.length || 0) > 1 && <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1 text-[10px] font-bold text-white">+{post.images.length - 1}</span>}
            </button>
          ))}
        </div>
      ))}

      {tab === "saved" && <div className="px-8 py-16 text-center"><Bookmark className="mx-auto mb-3 h-8 w-8 text-[#98a2b3]" /><p className="text-sm font-bold text-[#667085]">保存した投稿はここに表示されます</p></div>}
    </div>
  )
}
