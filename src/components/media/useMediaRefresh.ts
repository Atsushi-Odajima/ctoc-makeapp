"use client"

import { useCallback, useRef, useState } from "react"
import type { MediaDTO } from "@/lib/media/delivery"

/**
 * Delivery URLs live 120 s. When one fails (expired / revoked) we ask the server again — which
 * re-runs the ACL — and swap the URL. At most a few retries; a refusal stays a refusal.
 */
export function useMediaRefresh(initial: { id?: string; url: string | null; posterUrl?: string | null }) {
  const [url, setUrl] = useState(initial.url)
  const [posterUrl, setPosterUrl] = useState(initial.posterUrl ?? null)
  const [failed, setFailed] = useState(!initial.url)
  const attempts = useRef(0)

  const refresh = useCallback(async () => {
    if (!initial.id || attempts.current >= 2) {
      setFailed(true)
      return null
    }
    attempts.current++
    try {
      const res = await fetch(`/api/media/${initial.id}/delivery`, { cache: "no-store" })
      if (!res.ok) throw new Error(String(res.status))
      const dto = (await res.json()).data as MediaDTO
      if (!dto.deliveryUrl) throw new Error("no url")
      setUrl(dto.deliveryUrl)
      setPosterUrl(dto.posterUrl ?? null)
      setFailed(false)
      return dto.deliveryUrl
    } catch {
      setFailed(true)
      return null
    }
  }, [initial.id])

  return { url, posterUrl, failed, refresh }
}
