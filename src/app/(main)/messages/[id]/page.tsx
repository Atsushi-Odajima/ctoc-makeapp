"use client"
import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Send, Loader2 } from "lucide-react"
import { getAvatarUrl, formatMessageTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { DirectMessage, UserProfile } from "@/types"
import toast from "react-hot-toast"

interface ConvData {
  otherUser: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  messages: DirectMessage[]
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [convData, setConvData] = useState<ConvData | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/dm/${id}`).then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
    ]).then(([conv, me]) => {
      setConvData(conv)
      setMessages(conv.messages || [])
      setCurrentUserId(me.id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText("")
    try {
      const res = await fetch(`/api/dm/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
    } catch {
      toast.error("送信に失敗しました")
      setText(content)
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )
  if (!convData) return null

  const { otherUser } = convData

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-100 flex-shrink-0">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <button onClick={() => router.push(`/u/${otherUser.username}`)} className="flex items-center gap-2 flex-1">
          <img src={getAvatarUrl(otherUser)} alt="" className="w-9 h-9 rounded-full object-cover" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{otherUser.username}</p>
            <p className="text-xs text-slate-500">{otherUser.name}</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <img src={getAvatarUrl(otherUser)} alt="" className="w-20 h-20 rounded-full object-cover mb-3" />
            <p className="font-bold text-slate-800">{otherUser.name}</p>
            <p className="text-sm text-slate-500 mt-1">@{otherUser.username}</p>
            <p className="text-sm text-slate-400 mt-4">メッセージを送ってみよう！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => {
              const isOwn = msg.senderId === currentUserId
              const showTime = i === 0 || new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 5 * 60 * 1000
              return (
                <div key={msg.id}>
                  {showTime && (
                    <p className="text-xs text-slate-400 text-center py-2">{formatMessageTime(msg.createdAt)}</p>
                  )}
                  <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && (
                      <img src={getAvatarUrl(otherUser)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    )}
                    <div className={cn(
                      "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm",
                      isOwn
                        ? "bg-blue-500 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-2.5">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="メッセージを入力..."
            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
            autoFocus
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center disabled:opacity-40 transition-opacity">
          <Send className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
