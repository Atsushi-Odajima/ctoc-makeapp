"use client"

import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { Icon } from "./Icon"

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** sheet = bottom sheet on phones / centred panel from 768px; center = small confirm; full = media viewer */
  variant?: "sheet" | "center" | "full"
  /** visually hide the title (it stays the accessible name) */
  hideTitle?: boolean
}

/**
 * Accessible modal: role=dialog + aria-modal, focus moves to the first control and returns to the
 * opener, Tab is trapped, Esc / backdrop / close button all close it, the page behind is inert and
 * does not scroll, and the panel itself scrolls when its content is taller than the screen.
 */
export function Dialog({ open, onClose, title, children, variant = "sheet", hideTitle = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])") ?? []).filter(el => !el.hasAttribute("disabled"))
    const first = focusable().find(el => !el.dataset.dialogClose) ?? focusable()[0]
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current() }
      if (e.key === "Tab") {
        const items = focusable()
        if (!items.length) return
        const head = items[0]!
        const tail = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus() }
        else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    const app = document.getElementById("app-root")
    app?.setAttribute("inert", "")
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      app?.removeAttribute("inert")
      document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open || typeof document === "undefined") return null
  const panel =
    variant === "full"
      ? "on-dark inset-0 h-dvh w-full bg-[#121311] text-white"
      : variant === "center"
        ? "left-1/2 top-1/2 w-[min(calc(100%-32px),420px)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-surface"
        : "inset-x-0 bottom-0 mx-auto w-full max-w-[560px] rounded-t-[12px] bg-surface tablet:bottom-auto tablet:top-1/2 tablet:-translate-y-1/2 tablet:rounded-[12px]"
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="anim-fade absolute inset-0 bg-[#20211F]/45" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${variant === "full" ? "anim-fade" : "anim-sheet"} absolute flex max-h-[92dvh] flex-col ${panel}`}
        style={{ paddingBottom: variant === "sheet" ? "env(safe-area-inset-bottom)" : undefined }}
      >
        {variant === "sheet" && <span aria-hidden className="mx-auto mt-2 block h-1 w-9 rounded-full bg-line tablet:hidden" />}
        <div className={`flex shrink-0 items-center justify-between gap-2 pl-4 pr-1 ${variant === "full" ? "pt-[max(4px,env(safe-area-inset-top))]" : "pt-1"} ${hideTitle ? "" : "border-b border-line"} ${variant === "full" ? "border-white/15" : ""}`}>
          <h2 id={titleId} className={hideTitle ? "sr-only" : "t-ui font-bold"}>{title}</h2>
          <button type="button" className={`icon-btn ${variant === "full" ? "hover:bg-white/10" : ""}`} onClick={onClose} aria-label="閉じる" data-dialog-close="1"><Icon name="close" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
