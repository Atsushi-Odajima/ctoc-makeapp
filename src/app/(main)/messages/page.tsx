"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, Search } from "lucide-react"
import { formatTimeAgo, parsePhotos } from "@/lib/utils"

interface Conversation {
  id: string
  createdAt: string
  otherUser: {
    id: string
    name: string
    photos: string[]
    lastActive: string
  }
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
  } | null
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/messages")
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter(c =>
    c.otherUser.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-3">メッセージ</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-blue-200" />
            </div>
            <p className="text-slate-500 font-medium">
              {search ? "該当するユーザーが見つかりません" : "まだメッセージがありません"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/matches")}
                className="text-blue-600 font-semibold text-sm"
              >
                マッチングを確認する →
              </button>
            )}
          </div>
        ) : (
          filtered.map(conv => {
            const photos = parsePhotos(conv.otherUser.photos)
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={photos[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.otherUser.name)}&background=2563EB&color=fff`}
                    alt={conv.otherUser.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-800">{conv.otherUser.name}</span>
                    {conv.lastMessage && (
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                        {formatTimeAgo(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">
                    {conv.lastMessage
                      ? conv.lastMessage.content
                      : <span className="text-blue-500">マッチング成立！メッセージを送ろう 👋</span>
                    }
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
