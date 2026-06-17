"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Settings, Grid, Bookmark, Loader2 } from "lucide-react"
import { getAvatarUrl, formatCount, parseImages } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { UserProfile, Post } from "@/types"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"posts" | "saved">("posts")

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/posts?mine=true").then(r => r.json()),
    ]).then(([p, posts]) => {
      setProfile(p)
      setPosts(Array.isArray(posts) ? posts : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )
  if (!profile) return null

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-lg font-bold text-slate-900">{profile.username}</span>
        <Link href="/settings">
          <Settings className="w-6 h-6 text-slate-800" strokeWidth={1.8} />
        </Link>
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

        <Link href="/profile/edit"
          className="block w-full border border-slate-300 text-slate-800 text-sm font-semibold py-2 rounded-lg text-center hover:bg-slate-50 transition-colors">
          プロフィールを編集
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-slate-100">
        <button onClick={() => setTab("posts")}
          className={cn("flex-1 py-3 flex justify-center border-t-2 transition-colors",
            tab === "posts" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400")}>
          <Grid className="w-5 h-5" />
        </button>
        <button onClick={() => setTab("saved")}
          className={cn("flex-1 py-3 flex justify-center border-t-2 transition-colors",
            tab === "saved" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400")}>
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Posts grid */}
      {tab === "posts" && (
        posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center mb-3">
              <Grid className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-800 mb-1">投稿をシェアする</p>
            <p className="text-sm text-slate-500">写真や動画を投稿すると<br />ここに表示されます</p>
            <Link href="/create" className="mt-4 text-blue-500 font-semibold text-sm">最初の投稿をする</Link>
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
        )
      )}

      {tab === "saved" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">保存した投稿はここに表示されます</p>
        </div>
      )}
    </div>
  )
}
