"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"
import { Icon, type IconName } from "@/components/ui/Icon"
import { useViewer } from "./ViewerContext"

interface NavItem { href: string; label: string; icon: IconName; match: (p: string) => boolean; create?: boolean }

// Phones/tablets: five destinations at the bottom (thumb reach). DM and お知らせ live in the
// header, where people expect them. Desktop: everything in one top bar, labels always visible.
const PRIMARY: NavItem[] = [
  { href: "/feed", label: "ホーム", icon: "home", match: p => p === "/feed" },
  { href: "/explore", label: "さがす", icon: "search", match: p => p.startsWith("/explore") },
  { href: "/create", label: "投稿", icon: "create", match: p => p.startsWith("/create"), create: true },
  { href: "/communities", label: "集まり", icon: "community", match: p => p.startsWith("/communities") },
  { href: "/profile", label: "自分", icon: "user", match: p => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/bookmarks") || p.startsWith("/footprints") },
]
const FILLABLE: IconName[] = ["home", "user"]
const DM_ITEM: NavItem = { href: "/messages", label: "DM", icon: "message", match: p => p.startsWith("/messages") }
// Desktop order: ホーム・さがす・集まり・DM・自分 (投稿 is the accent button on the right).
const desktopNav = (signedIn: boolean) => {
  const [home, search, , communities, me] = PRIMARY as [NavItem, NavItem, NavItem, NavItem, NavItem]
  return signedIn ? [home, search, communities, DM_ITEM, me] : [home, search, communities]
}

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

/** Hide the bottom nav while the on-screen keyboard is likely open, so it never covers input. */
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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span aria-hidden className="absolute right-[5px] top-[5px] min-w-[18px] rounded-full border-2 border-canvas bg-accent px-1 text-center font-[family-name:var(--font-label)] text-[13px] font-semibold leading-[14px] text-white">{count > 99 ? "99+" : count}</span>
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const viewer = useViewer()
  const unread = useUnreadCount(!!viewer)
  const keyboardOpen = useKeyboardOpen()
  const notificationsLabel = unread > 0 ? `お知らせ（未読${unread}件）` : "お知らせ"
  const onNotifications = pathname.startsWith("/notifications")
  const onMessages = pathname.startsWith("/messages")
  // Inside a conversation the composer owns the bottom edge, so the tab bar steps aside.
  const inThread = /^\/messages\/[^/]+/.test(pathname)

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[8px] focus:bg-surface focus:px-4 focus:py-2">本文へ移動</a>

      <header className="desktop:sticky desktop:top-0 desktop:z-40 desktop:border-b desktop:border-line desktop:bg-canvas" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="wide-column flex h-[var(--header-height)] items-center justify-between gap-2 pl-4 pr-1 desktop:h-16 desktop:px-6">
          <Link href={viewer ? "/feed" : "/"} aria-label="DayNetのホーム" className="flex min-h-[44px] shrink-0 items-center rounded-[4px]">
            <DayNetWordmark size={20} decorative />
          </Link>

          <nav aria-label="メインナビゲーション" className="hidden desktop:block">
            <ul className="flex items-center gap-1">
              {desktopNav(!!viewer).map(item => {
                const active = item.match(pathname)
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[44px] items-center gap-2 rounded-[8px] px-3 text-[15px] transition-colors duration-150 hover:bg-subtle ${active ? "font-bold text-ink" : "font-medium text-muted"}`}>
                      <Icon name={item.icon} size={22} filled={active && FILLABLE.includes(item.icon)} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center">
            {viewer ? (
              <>
                <Link href="/create" className="btn btn-primary btn-sm mr-2 hidden desktop:inline-flex"><Icon name="plus" size={18} />投稿</Link>
                <Link href="/notifications" className={`icon-btn relative ${onNotifications ? "text-accent" : ""}`} aria-label={notificationsLabel} title="お知らせ" aria-current={onNotifications ? "page" : undefined}>
                  <Icon name="bell" filled={onNotifications} />
                  <Badge count={unread} />
                </Link>
                <Link href="/messages" className={`icon-btn desktop:hidden ${onMessages ? "text-accent" : ""}`} aria-label="DM" title="DM" aria-current={onMessages ? "page" : undefined}>
                  <Icon name="message" filled={onMessages} />
                </Link>
              </>
            ) : (
              <>
                <Link href="/explore" className="icon-btn" aria-label="さがす" title="さがす"><Icon name="search" /></Link>
                <Link href="/login" className="btn btn-ink btn-sm ml-1 mr-3">ログイン</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {viewer && !viewer.profileComplete && !pathname.startsWith("/onboarding") && (
        <div className="feed-column gutter desktop:mt-4">
          <div role="note" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-line py-3 t-small">
            <span className="min-w-0 flex-1">イキリポイント・残念な弱点・趣味3つを設定すると、投稿・コメント・DMができます。</span>
            <Link href="/onboarding" className="btn btn-ink btn-sm">設定する</Link>
          </div>
        </div>
      )}

      <main id="main" className={inThread ? "" : "page-bottom-space"}>{children}</main>

      {viewer && !inThread && (
        <nav
          aria-label="メインナビゲーション"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas transition-transform duration-150 desktop:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)", transform: keyboardOpen ? "translateY(110%)" : undefined, visibility: keyboardOpen ? "hidden" : undefined }}
        >
          <ul className="mx-auto flex h-[var(--nav-height)] max-w-[560px] items-stretch">
            {PRIMARY.map(item => {
              const active = item.match(pathname)
              return (
                <li key={item.href} className="flex flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[13px] leading-[1.2] transition-colors duration-150 ${active ? "font-bold text-ink" : "font-medium text-muted"}`}
                  >
                    <span className={item.create ? "text-accent" : active ? "text-ink" : "text-ink/80"}>
                      <Icon name={item.icon} size={26} filled={active && FILLABLE.includes(item.icon)} strokeWidth={active && !item.create ? 2 : 1.75} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
