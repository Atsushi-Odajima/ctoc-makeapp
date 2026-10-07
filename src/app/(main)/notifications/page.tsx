"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Heart, Loader2, MessageCircle, Sparkles, UserPlus } from "lucide-react"
import { cn, formatTimeAgo, getAvatarUrl } from "@/lib/utils"
import type { Footprint, Notification } from "@/types"

const TYPE_ICON: Record<string, React.ReactNode> = {
  like: <Heart className="h-5 w-5 fill-[#e85d04] text-[#e85d04]" />,
  comment: <MessageCircle className="h-5 w-5 text-[#0b1f3a]" />,
  follow: <UserPlus className="h-5 w-5 text-[#0b1f3a]" />,
  footprint: <Eye className="h-5 w-5 text-[#0b1f3a]" />,
}

const TYPE_LABEL: Record<string, string> = {
  like: "がいいねしました",
  comment: "がコメントしました",
  follow: "がフォローしました",
  footprint: "がプロフィールを見ました",
}

export default function NotificationsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"notifications" | "footprints">("notifications")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications").then(r => r.json()),
      fetch("/api/footprints").then(r => r.json()),
    ]).then(([n, f]) => {
      setNotifications(Array.isArray(n) ? n : [])
      setFootprints(Array.isArray(f) ? f : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#0b1f3a]" /></div>

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#dfe3e8] px-4 py-3">
        <h1 className="mb-3 text-xl font-black text-slate-900">反応</h1>
        <div className="flex border-b border-[#dfe3e8]">
          <button onClick={() => setTab("notifications")} className={cn("flex-1 border-b-2 py-2 text-sm font-bold", tab === "notifications" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-slate-400")}>
            お知らせ
          </button>
          <button onClick={() => setTab("footprints")} className={cn("flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-sm font-bold", tab === "footprints" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-slate-400")}>
            <Eye className="h-4 w-4" />
            足あと
            {footprints.length > 0 && <span className="rounded bg-[#0b1f3a] px-1.5 text-xs text-white">{footprints.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 divide-y divide-[#e6e9ed] overflow-y-auto">
        {tab === "notifications" ? (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <Sparkles className="mb-3 h-10 w-10 text-[#98a2b3]" />
              <p className="font-bold text-slate-500">通知はまだありません</p>
              <p className="mt-1 text-sm text-slate-400">投稿やフォローが増えると、ここが少しずつ賑やかになります。</p>
            </div>
          ) : notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => notif.postId ? router.push(`/post/${notif.postId}`) : notif.fromUser ? router.push(`/u/${notif.fromUser.username}`) : undefined}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[#f8fafc]"
            >
              <div className="relative flex-shrink-0">
                {notif.fromUser && <img src={getAvatarUrl(notif.fromUser)} alt="" className="h-11 w-11 rounded-full object-cover" />}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                  {TYPE_ICON[notif.type] || <Heart className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800"><span className="font-bold">{notif.fromUser?.username}</span>{TYPE_LABEL[notif.type] || notif.content}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatTimeAgo(notif.createdAt)}</p>
              </div>
              {notif.post?.images?.[0] && <img src={notif.post.images[0]} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl object-cover" />}
              {!notif.read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#e85d04]" />}
            </button>
          ))
        ) : (
          <>
            <div className="border-b border-[#dfe3e8] bg-[#f8fafc] px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#0b1f3a]" />
                <div>
                  <p className="text-sm font-black text-[#0b1f3a]">あなたのページに来てくれた人</p>
                </div>
              </div>
            </div>
            {footprints.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                <Eye className="mb-3 h-10 w-10 text-[#98a2b3]" />
                <p className="font-bold text-slate-500">まだ足あとはありません</p>
                <p className="mt-1 text-sm text-slate-400">プロフィールを見てもらうと、ここに記録されます。</p>
              </div>
            ) : footprints.map(fp => (
              <button key={fp.id} onClick={() => router.push(`/u/${fp.visitor.username}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[#f8fafc]">
                <div className="relative flex-shrink-0">
                  <img src={getAvatarUrl(fp.visitor)} alt="" className="h-12 w-12 rounded-full object-cover" />
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-[#e9edf2] shadow-sm">
                    <Eye className="h-3.5 w-3.5 text-[#0b1f3a]" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{fp.visitor.name}</p>
                  <p className="text-xs text-slate-500">@{fp.visitor.username}</p>
                  <p className="mt-0.5 text-xs text-slate-400">プロフィールを見ました・{formatTimeAgo(fp.visitedAt)}</p>
                </div>
                <span className="text-xs font-bold text-[#0b1f3a]">見る</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
