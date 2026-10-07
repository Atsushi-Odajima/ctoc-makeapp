"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Grid, MessageCircle, MoreHorizontal, Newspaper } from "lucide-react"
import { formatCount, getAvatarUrl } from "@/lib/utils"
import type { Post, UserProfile } from "@/types"
import toast from "react-hot-toast"

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${username}`).then(response => response.json()),
      fetch(`/api/users/${username}/posts`).then(response => response.json()),
    ]).then(([profileData, postData]) => {
      setProfile(profileData)
      setFollowing(profileData.isFollowing ?? false)
      setPosts(Array.isArray(postData) ? postData : [])
    }).finally(() => setLoading(false))
  }, [username])

  async function handleFollow() {
    if (!profile) return
    setFollowLoading(true)
    try {
      const response = await fetch(`/api/follow/${profile.id}`, { method: "POST" })
      const data = await response.json()
      setFollowing(data.following)
      toast.success(data.following ? `${profile.username}さんをフォローしました` : "フォローを解除しました")
    } catch {
      toast.error("操作に失敗しました")
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">読み込み中</div>
  if (!profile?.id) return <div className="flex h-full items-center justify-center bg-white text-sm text-[#667085]">ユーザーが見つかりません</div>
  if (profile.isMe) { router.replace("/profile"); return null }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <header className="flex items-center gap-3 border-b border-[#dfe3e8] px-2 py-3">
        <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="戻る"><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="flex-1 font-black text-[#0b1f3a]">{profile.username}</h1>
        <button className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="メニュー"><MoreHorizontal className="h-5 w-5" /></button>
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
        {profile.bio && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#344054]">{profile.bio}</p>}
        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-bold text-[#0b1f3a] hover:underline">{profile.website.replace(/^https?:\/\//, "")}</a>}

        <div className="mt-4 flex gap-2">
          <button onClick={handleFollow} disabled={followLoading} className={`flex-1 rounded-md py-2 text-sm font-bold ${following ? "border border-[#d0d5dd] text-[#344054]" : "bg-[#0b1f3a] text-white"}`}>{followLoading ? "..." : following ? "フォロー中" : "フォロー"}</button>
          <button onClick={async () => {
            const response = await fetch("/api/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: profile.id }) })
            const data = await response.json()
            router.push(`/messages/${data.id}`)
          }} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[#0b1f3a] py-2 text-sm font-bold text-[#0b1f3a]"><MessageCircle className="h-4 w-4" />メッセージ</button>
        </div>
      </section>

      <div className="flex justify-center border-b border-[#dfe3e8] py-3"><Grid className="h-5 w-5 text-[#0b1f3a]" /></div>
      {posts.length === 0 ? <p className="px-8 py-16 text-center text-sm font-bold text-[#667085]">まだ投稿はありません</p> : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <button key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="relative aspect-square overflow-hidden bg-[#eef1f4]">
              {post.images?.[0] ? <img src={post.images[0]} alt="" className="h-full w-full object-cover" /> : post.newsArticle ? <div className="flex h-full flex-col items-center justify-center p-3 text-center"><Newspaper className="mb-2 h-6 w-6 text-[#e85d04]" /><p className="line-clamp-2 text-xs font-black text-[#0b1f3a]">{post.newsArticle.title}</p></div> : null}
              {(post.images?.length || 0) > 1 && <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1 text-[10px] font-bold text-white">+{post.images.length - 1}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
