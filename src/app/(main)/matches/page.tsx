"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle, Loader2 } from "lucide-react"
import { calculateAge, parsePhotos, formatTimeAgo } from "@/lib/utils"
import type { Match } from "@/types"

export default function MatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/matches")
      .then(res => res.json())
      .then(data => setMatches(Array.isArray(data) ? data : []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800">マッチング</h1>
        <p className="text-slate-400 text-sm mt-0.5">{matches.length}人とマッチング中</p>
      </div>

      {/* Matches Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {matches.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
              <Heart className="w-10 h-10 text-blue-200" />
            </div>
            <h2 className="text-xl font-bold text-slate-700">まだマッチングがありません</h2>
            <p className="text-slate-400 max-w-xs">
              Discoverページでスワイプしてマッチングを見つけましょう！
            </p>
            <button
              onClick={() => router.push("/discover")}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity"
            >
              探してみる
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {matches.map(match => {
              const user = match.otherUser
              if (!user) return null
              const photos = parsePhotos(user.photos)
              const age = user.birthdate ? calculateAge(user.birthdate) : null

              return (
                <button
                  key={match.id}
                  onClick={() => router.push(`/messages/${match.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
                >
                  <div className="relative aspect-[3/4]">
                    <img
                      src={photos[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* New match badge */}
                    {!match.lastMessage && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        NEW
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm">
                        {user.name}{age ? `, ${age}` : ""}
                      </p>
                      {match.lastMessage ? (
                        <p className="text-white/70 text-xs truncate mt-0.5">
                          {match.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-cyan-300 text-xs mt-0.5">タップしてメッセージ</p>
                      )}
                    </div>
                  </div>

                  {match.lastMessage && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(match.lastMessage.createdAt)}
                      </span>
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
