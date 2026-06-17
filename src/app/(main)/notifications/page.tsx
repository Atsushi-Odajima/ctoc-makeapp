"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Heart, MessageCircle, UserPlus, Eye } from "lucide-react"
import { formatTimeAgo, getAvatarUrl } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Notification, Footprint } from "@/types"

const TYPE_ICON: Record<string, React.ReactNode> = {
  like: <Heart className="w-5 h-5 text-red-400 fill-red-400" />,
  comment: <MessageCircle className="w-5 h-5 text-blue-500 fill-blue-100" />,
  follow: <UserPlus className="w-5 h-5 text-green-500" />,
  footprint: <Eye className="w-5 h-5 text-purple-500" />,
}

const TYPE_LABEL: Record<string, string> = {
  like: "いいねしました",
  comment: "コメントしました",
  follow: "フォローしました",
  footprint: "プロフィールを見ました",
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

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900 mb-3">通知</h1>
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTab("notifications")}
            className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
              tab === "notifications" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
            アクティビティ
          </button>
          <button onClick={() => setTab("footprints")}
            className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              tab === "footprints" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
            <Eye className="w-4 h-4" />
            足跡
            {footprints.length > 0 && <span className="bg-purple-500 text-white text-xs px-1.5 rounded-full">{footprints.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {tab === "notifications" ? (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-3">🔔</div>
              <p className="text-slate-500 font-medium">通知はまだありません</p>
            </div>
          ) : (
            notifications.map(notif => (
              <button key={notif.id} onClick={() => notif.postId ? router.push(`/post/${notif.postId}`) : notif.fromUser ? router.push(`/u/${notif.fromUser.username}`) : undefined}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                <div className="relative flex-shrink-0">
                  {notif.fromUser && (
                    <img src={getAvatarUrl(notif.fromUser)} alt="" className="w-11 h-11 rounded-full object-cover" />
                  )}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {TYPE_ICON[notif.type] || <Heart className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{notif.fromUser?.username}</span>
                    {" "}{TYPE_LABEL[notif.type] || notif.content}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatTimeAgo(notif.createdAt)}</p>
                </div>
                {notif.post?.images?.[0] && (
                  <img src={notif.post.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                )}
                {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              </button>
            ))
          )
        ) : (
          <>
            {/* Footprints header info */}
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">あなたのプロフィールを見た人</p>
                  <p className="text-xs text-purple-500">過去の訪問者 {footprints.length}人</p>
                </div>
              </div>
            </div>

            {footprints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-3">👣</div>
                <p className="text-slate-500 font-medium">まだ足跡がありません</p>
                <p className="text-slate-400 text-sm mt-1">誰かがあなたのプロフィールを見ると記録されます</p>
              </div>
            ) : (
              footprints.map(fp => (
                <button key={fp.id} onClick={() => router.push(`/u/${fp.visitor.username}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <img src={getAvatarUrl(fp.visitor)} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shadow-sm border border-white">
                      <Eye className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{fp.visitor.name}</p>
                    <p className="text-xs text-slate-500">@{fp.visitor.username}</p>
                    <p className="text-xs text-slate-400 mt-0.5">あなたのプロフィールを見ました · {formatTimeAgo(fp.visitedAt)}</p>
                  </div>
                </button>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
