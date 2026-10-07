"use client"

import { useEffect, useState } from "react"

// Registers /sw.js (static shell only) and offers updates; it never reloads by itself, so a
// post being written is never lost to a forced refresh. Does not request notification permission.
export function ServiceWorkerManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_ENABLE_SW) return
    let cancelled = false
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(registration => {
      if (cancelled) return
      if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker)
        })
      })
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (!waiting) return null

  function update() {
    const editing = Array.from(document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>("textarea, input[type=text]"))
      .some(el => el.value.trim().length > 0)
    if (editing && !window.confirm("入力中の内容があります。更新すると画面が再読み込みされます。続けますか？（投稿の下書きはこの端末に保存されています）")) return
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true })
    waiting?.postMessage("SKIP_WAITING")
  }

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-ink px-4 py-2 text-white t-small" style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}>
      <span>新しいバージョンがあります。</span>
      <button type="button" className="btn btn-accent" style={{ minHeight: 36 }} onClick={update}>更新する</button>
      <button type="button" className="btn btn-ghost text-white" style={{ minHeight: 36 }} onClick={() => setWaiting(null)}>あとで</button>
    </div>
  )
}
