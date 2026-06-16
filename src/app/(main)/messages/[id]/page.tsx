"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Send, Loader2, MoreVertical } from "lucide-react"
import { formatMessageTime, parsePhotos } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  sender: { id: string; name: string; photos: string[] }
}

interface OtherUser {
  id: string
  name: string
  photos: string[]
  lastActive: string
}

export default function ChatPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${matchId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
      setOtherUser(data.otherUser)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || sending) return

    const content = input.trim()
    setInput("")
    setSending(true)

    try {
      const res = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Send failed")
      const newMsg = await res.json()
      setMessages(prev => [...prev, newMsg])
    } catch {
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  const photos = parsePhotos(otherUser?.photos || [])

  return (
    <div className="h-full flex flex-col bg-[#f0f4ff]">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        {otherUser && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <img
                src={photos[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=2563EB&color=fff`}
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 leading-none">{otherUser.name}</p>
              <p className="text-xs text-green-500 mt-0.5">オンライン</p>
            </div>
          </div>
        )}

        <button className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
          <MoreVertical className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <div className="text-5xl">👋</div>
            <p className="text-slate-600 font-semibold">マッチング成立！</p>
            <p className="text-slate-400 text-sm">
              {otherUser?.name}さんに最初のメッセージを送ってみよう
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.senderId === session?.user?.id
              const prevMsg = i > 0 ? messages[i - 1] : null
              const showTime = !prevMsg ||
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000

              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="text-center text-xs text-slate-400 py-2">
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  )}
                  <div className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                    {!isMe && (
                      <img
                        src={parsePhotos(msg.sender.photos)[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}&background=2563EB&color=fff`}
                        alt={msg.sender.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div
                      className={cn(
                        "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-sm"
                          : "bg-white text-slate-700 shadow-sm rounded-bl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-slate-100 px-3 py-3 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-200 disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </form>
    </div>
  )
}
