"use client"

import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { Icon } from "./Icon"

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  variant?: "sheet" | "center" | "full"
}

/** Accessible modal: role=dialog, focus moved in and restored, Esc closes, background inert. */
export function Dialog({ open, onClose, title, children, variant = "sheet" }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])") ?? []).filter(el => !el.hasAttribute("disabled"))
    focusable()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") {
        const items = focusable()
        if (!items.length) return
        const first = items[0]!
        const last = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null
  const panel =
    variant === "full"
      ? "inset-0 h-dvh w-full bg-ink text-white"
      : variant === "center"
        ? "left-1/2 top-1/2 w-[min(calc(100%-32px),480px)] -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-surface"
        : "inset-x-0 bottom-0 mx-auto w-full max-w-[640px] rounded-t-[18px] bg-surface tablet:bottom-auto tablet:top-1/2 tablet:-translate-y-1/2 tablet:rounded-[18px]"
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute max-h-[90dvh] overflow-y-auto shadow-[0_16px_48px_#302B3826] ${panel}`}
        style={{ paddingBottom: variant === "sheet" ? "max(16px, env(safe-area-inset-bottom))" : undefined }}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <h2 id={titleId} className="t-section">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
