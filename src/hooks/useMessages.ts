import { useState, useCallback, useEffect } from "react"
import { DirectMessage } from "@/types"

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversationId) return
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`/api/dm/${conversationId}`)
        .then(r => r.json())
        .then(data => setMessages(data.messages || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(t)
  }, [conversationId])

  const sendMessage = useCallback(async (content: string) => {
    const res = await fetch(`/api/dm/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error("Failed to send")
    const msg: DirectMessage = await res.json()
    setMessages(prev => [...prev, msg])
    return msg
  }, [conversationId])

  return { messages, loading, sendMessage }
}
