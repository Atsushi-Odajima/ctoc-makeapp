"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiClientError } from "@/lib/client/api"

interface State<T> {
  url: string | null
  items: T[]
  cursor: string | null
  done: boolean
  loading: boolean
  error: ApiClientError | null
}

const initial = <T,>(url: string | null): State<T> => ({ url, items: [], cursor: null, done: !url, loading: !!url, error: null })

function toError(e: unknown) {
  return e instanceof ApiClientError ? e : new ApiClientError(0, "UNKNOWN", "読み込めませんでした")
}

function appendUnique<T extends { id: string }>(base: T[], next: T[]) {
  const seen = new Set(base.map(i => i.id))
  return [...base, ...next.filter(i => !seen.has(i.id))]
}

/** Cursor pagination for {data, nextCursor} endpoints. Never drops or duplicates items. */
export function useInfinite<T extends { id: string }>(url: string | null) {
  const [state, setState] = useState<State<T>>(() => initial<T>(url))
  const [reloadToken, setReloadToken] = useState(0)
  // Reset during render when the URL changes (React's recommended pattern, no effect needed).
  if (state.url !== url) setState(initial<T>(url))
  const busy = useRef(false)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    api<T[]>(url)
      .then(res => { if (!cancelled) setState({ url, items: res.data, cursor: res.nextCursor ?? null, done: !res.nextCursor, loading: false, error: null }) })
      .catch(e => { if (!cancelled) setState(s => ({ ...s, loading: false, error: toError(e) })) })
    return () => { cancelled = true }
  }, [url, reloadToken])

  const loadMore = useCallback(async () => {
    if (!url || busy.current || state.done || !state.cursor) return
    busy.current = true
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const sep = url.includes("?") ? "&" : "?"
      const res = await api<T[]>(`${url}${sep}cursor=${encodeURIComponent(state.cursor)}`)
      setState(s => (s.url !== url ? s : { ...s, items: appendUnique(s.items, res.data), cursor: res.nextCursor ?? null, done: !res.nextCursor, loading: false }))
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: toError(e) }))
    } finally {
      busy.current = false
    }
  }, [url, state.cursor, state.done])

  const reload = useCallback(() => {
    setState(s => ({ ...initial<T>(s.url), items: s.items }))
    setReloadToken(n => n + 1)
  }, [])

  const setItems = useCallback((update: (prev: T[]) => T[]) => setState(s => ({ ...s, items: update(s.items) })), [])

  return { items: state.items, setItems, loading: state.loading, error: state.error, done: state.done, loadMore, reload }
}

export function useAutoLoad(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!enabled || !ref.current) return
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) onVisible() }, { rootMargin: "600px" })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [enabled, onVisible])
  return ref
}
