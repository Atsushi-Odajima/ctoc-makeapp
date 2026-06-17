"use client"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Grid, MoreHorizontal, Loader2 } from "lucide-react"
import { getAvatarUrl, formatCount } from "@/lib/utils"
import type { UserProfile, Post } from "@/types"
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
      fetch(`/api/users/${username}`).then(r => r.json()),
      fetch(`/api/users/${username}/posts`).then(r => r.json()),
    ]).then(([p, posts]) => {
      setProfile(p)
      setFollowing(p.isFollowing ?? false)
      setPosts(Array.isArray(posts) ? posts : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [username])

  const handleFollow = async () => {
    if (!profile) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/follow/${profile.id}`, { method: "POST" })
      const data = await res.json()
      setFollowing(data.following)
      toast.success(data.following ? `${profile.username}をフォローしました` : "フォローを解除しました")
    } catch {
      toast.error("エラーが発生しました")
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )
  if (!profile) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-400">ユーザーが見つかりません</p>
    </div>
  )

  if (profile.isMe) {
    router.replace("/profile")
    return null
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-base font-bold text-slate-900 flex-1">{profile.username}</span>
        <button className="p-2 rounded-full hover:bg-slate-100">
          <MoreHorizontal className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Profile info */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-6 mb-4">
          <img
            src={getAvatarUrl(profile)}
            alt={profile.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-100"
          />
          <div className="flex-1 flex justify-around">
            {[
              { label: "投稿", value: profile.postsCount ?? posts.length },
              { label: "フォロワー", value: profile.followersCount ?? 0 },
              { label: "フォロー中", value: profile.followingCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-slate-900">{formatCount(value)}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-slate-900 text-sm">{profile.name}</p>
          {profile.bio && <p className="text-sm text-slate-700 leading-snug mt-0.5 whitespace-pre-line">{profile.bio}</p>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 font-medium mt-0.5 block">
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              following
                ? "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {followLoading ? "..." : following ? "フォロー中" : "フォローする"}
          </button>
          <button
            onClick={async () => {
              const res = await fetch("/api/dm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId: profile.id }),
              })
              const data = await res.json()
              router.push(`/messages/${data.id}`)
            }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 transition-colors">
            メッセージ
          </button>
        </div>
      </div>

      {/* Posts tab */}
      <div className="flex border-t border-slate-100">
        <div className="flex-1 py-3 flex justify-center border-t-2 border-slate-900">
          <Grid className="w-5 h-5 text-slate-900" />
        </div>
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center mb-3">
            <Grid className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 text-sm">まだ投稿がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => {
            const imgs = post.images || []
            return (
              <button key={post.id} onClick={() => router.push(`/post/${post.id}`)}
                className="aspect-square bg-slate-100 overflow-hidden relative">
                {imgs[0]
                  ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100" />}
                {imgs.length > 1 && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className="w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">+</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
