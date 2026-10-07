"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"
import { Icon, type IconName } from "@/components/ui/Icon"
import { useViewer } from "./ViewerContext"

const NAV: Array<{ href: string; label: string; icon: IconName; match: (p: string) => boolean; create?: boolean }> = [
  { href: "/feed", label: "ホーム", icon: "home", match: p => p === "/feed" },
  { href: "/communities", label: "集まり", icon: "community", match: p => p.startsWith("/communities") },
  { href: "/create", label: "投稿", icon: "plus", match: p => p.startsWith("/create"), create: true },
  { href: "/messages", label: "DM", icon: "message", match: p => p.startsWith("/messages") },
  { href: "/profile", label: "自分", icon: "user", match: p => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/bookmarks") || p.startsWith("/footprints") },
]

function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/notifications?countOnly=true", { cache: "no-store" })
          if (res.ok) setCount(((await res.json()).data?.unread as number) ?? 0)
        } catch { /* offline */ }
      }
      if (!stopped) timer = setTimeout(tick, 60_000)
    }
    tick()
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); tick() } }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("daynet:notifications-read", onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("daynet:notifications-read", onVisible)
    }
  }, [enabled])
  return count
}

/** Hide the floating nav while the on-screen keyboard is likely open, so it never covers input. */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "file"].includes((el as HTMLInputElement).type)) || el.isContentEditable)
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setOpen(true) }
    const onOut = () => setTimeout(() => setOpen(isField(document.activeElement)), 50)
    document.addEventListener("focusin", onIn)
    document.addEventListener("focusout", onOut)
    return () => {
      document.removeEventListener("focusin", onIn)
      document.removeEventListener("focusout", onOut)
    }
  }, [])
  return open
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const viewer = useViewer()
  const unread = useUnreadCount(!!viewer)
  const keyboardOpen = useKeyboardOpen()

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">本文へ移動</a>
      <header className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between gap-3 px-[15px] min-[360px]:px-5 desktop:px-8" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Link href={viewer ? "/feed" : "/"} aria-label="DayNetのホーム" className="shrink-0 rounded-md">
          <DayNetWordmark width={165} decorative className="h-auto w-[150px] min-[360px]:w-[165px]" />
        </Link>
        <nav aria-label="メインナビゲーション" className="hidden desktop:block">
          <ul className="flex items-center gap-1">
            {NAV.map(item => {
              const active = item.match(pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={item.create
                      ? "btn btn-accent ml-2"
                      : `interactive flex min-h-[44px] items-center gap-2 rounded-[11px] px-3 text-[13px] ${active ? "font-bold text-accent" : "text-ink"}`}
                  >
                    <Icon name={item.icon} size={item.create ? 20 : 22} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex items-center">
          <Link href="/explore" className="icon-btn" aria-label="検索"><Icon name="search" /></Link>
          {viewer ? (
            <Link href="/notifications" className="icon-btn relative" aria-label={unread > 0 ? `お知らせ（未読${unread}件）` : "お知らせ"}>
              <Icon name="bell" />
              {unread > 0 && <span aria-hidden className="absolute right-2 top-2 min-w-[16px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-ink">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary ml-1">ログイン</Link>
          )}
        </div>
      </header>

      {viewer && !viewer.profileComplete && !pathname.startsWith("/onboarding") && (
        <div className="mx-auto max-w-[640px] gutter">
          <div role="note" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-warning bg-surface px-4 py-3 t-small">
            <span>イキリポイント・残念な弱点・趣味3つを設定すると、投稿・コメント・DMができます。</span>
            <Link href="/onboarding" className="btn btn-primary">設定する</Link>
          </div>
        </div>
      )}

      <main id="main" className="page-bottom-space">{children}</main>

      {viewer && (
        <nav
          aria-label="メインナビゲーション"
          className="fixed left-1/2 z-40 flex h-[72px] w-[min(calc(100%-24px),610px)] -translate-x-1/2 items-center rounded-[22px] bg-ink px-1.5 text-white shadow-[0_6px_22px_#302B381A] transition-transform desktop:hidden"
          style={{ bottom: "max(12px, env(safe-area-inset-bottom))", transform: keyboardOpen ? "translate(-50%, 140%)" : undefined, visibility: keyboardOpen ? "hidden" : undefined }}
        >
          {NAV.map(item => {
            const active = item.match(pathname)
            if (item.create) {
              return (
                <Link key={item.href} href={item.href} aria-label="投稿" aria-current={active ? "page" : undefined} className="flex min-h-[56px] flex-[0.92] items-center justify-center rounded-[13px]">
                  <span className="grid h-[44px] w-[44px] place-items-center rounded-[13px] bg-accent text-ink"><Icon name="plus" /></span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[13px] text-[10px] leading-[15px] ${active ? "font-bold text-accent" : "text-white"}`}
              >
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
