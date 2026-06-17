"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Edit, Loader2 } from "lucide-react"
import { getAvatarUrl, formatMessageTime } from "@/lib/utils"
import type { Conversation } from "@/types"

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dm").then(r => r.json()).then(data => {
      setConversations(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-base font-bold text-slate-900">ダイレクト</span>
        <button className="p-1">
          <Edit className="w-5 h-5 text-slate-800" strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-800 mb-1">メッセージ</p>
            <p className="text-slate-500 text-sm">フォローしている人に<br />プライベートメッセージを送れます</p>
            <button
              onClick={() => router.push("/explore")}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
              ユーザーを探す
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                <div className="relative flex-shrink-0">
                  {conv.otherUser && (
                    <img
                      src={getAvatarUrl(conv.otherUser)}
                      alt={conv.otherUser.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{conv.otherUser?.username}</p>
                  <p className="text-slate-500 text-sm truncate mt-0.5">
                    {conv.lastMessage
                      ? conv.lastMessage.content
                      : "メッセージを送ろう"}
                  </p>
                </div>
                {conv.lastMessage && (
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatMessageTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
