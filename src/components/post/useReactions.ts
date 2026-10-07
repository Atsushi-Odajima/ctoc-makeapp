"use client"

import { useCallback, useRef, useState } from "react"
import toast from "react-hot-toast"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
import type { PostDTO } from "@/lib/dto/post"

type Kind = "like" | "empathy" | "bookmark"

/** Optimistic toggle with rollback; the server is idempotent (PUT/DELETE) so double taps are safe. */
export function useReactions(post: PostDTO) {
  const [state, setState] = useState({
    liked: post.viewer.liked,
    empathized: post.viewer.empathized,
    bookmarked: post.viewer.bookmarked,
    likes: post.counts.likes,
    empathies: post.counts.empathies,
  })
  const inflight = useRef<Record<Kind, boolean>>({ like: false, empathy: false, bookmark: false })

  const toggle = useCallback(async (kind: Kind) => {
    if (inflight.current[kind]) return
    inflight.current[kind] = true
    const before = state
    const flag = kind === "like" ? "liked" : kind === "empathy" ? "empathized" : "bookmarked"
    const next = !before[flag]
    setState(s => ({
      ...s,
      [flag]: next,
      ...(kind === "like" ? { likes: Math.max(0, s.likes + (next ? 1 : -1)) } : {}),
      ...(kind === "empathy" ? { empathies: Math.max(0, s.empathies + (next ? 1 : -1)) } : {}),
    }))
    try {
      const res = await api<{ counts: { likes: number; empathies: number } }>(`/api/posts/${post.id}/${kind}`, { method: next ? "PUT" : "DELETE" })
      setState(s => ({ ...s, likes: res.data.counts.likes, empathies: res.data.counts.empathies }))
      if (kind === "bookmark") toast.success(next ? "保存しました" : "保存を外しました")
    } catch (error) {
      setState(before)
      if (error instanceof ApiClientError && error.status === 401) return loginRedirect()
      toast.error(error instanceof ApiClientError ? error.message : "反応できませんでした")
    } finally {
      inflight.current[kind] = false
    }
  }, [post.id, state])

  return { state, toggle }
}
