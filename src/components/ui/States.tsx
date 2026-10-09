"use client"

import Link from "next/link"
import { Icon, type IconName } from "./Icon"

/** Post-shaped placeholders: reserve the same space as the real content so nothing jumps. */
export function Skeletons({ count = 3, label = "読み込み中" }: { count?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: Math.min(3, count) }, (_, i) => (
        <div key={i} className="pb-6" aria-hidden>
          <div className="flex items-center gap-3 px-[var(--gutter)] py-3 sm:px-0"><div className="skeleton h-9 w-9 rounded-full" /><div className="skeleton h-4 w-32" /></div>
          <div className="skeleton aspect-[4/5] w-full rounded-none sm:rounded-[4px]" />
          <div className="space-y-2 px-[var(--gutter)] pt-3 sm:px-0"><div className="skeleton h-4 w-2/5" /><div className="skeleton h-4 w-4/5" /></div>
        </div>
      ))}
    </div>
  )
}

/** Grid placeholder (profile / search). */
export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid grid-cols-3 gap-0.5 desktop:gap-1">
      <span className="sr-only">読み込み中</span>
      {Array.from({ length: count }, (_, i) => <div key={i} aria-hidden className="skeleton aspect-square rounded-none" />)}
    </div>
  )
}

export function EmptyState({ title, body, action, icon = "image" }: { title: string; body?: string; action?: { href: string; label: string }; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-2 grid h-16 w-16 place-items-center rounded-full border border-ink/80 text-ink"><Icon name={icon} size={30} /></span>
      <p className="t-section">{title}</p>
      {body && <p className="max-w-[34ch] text-muted t-small">{body}</p>}
      {action && <Link href={action.href} className="btn btn-primary mt-3">{action.label}</Link>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-subtle text-error"><Icon name="alert" /></span>
      <p className="max-w-[36ch] t-body">{message}</p>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}><Icon name="refresh" size={18} />再試行</button>}
    </div>
  )
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "error" | "success"; children: React.ReactNode }) {
  const color = { info: "text-ink", warning: "text-warning", error: "text-error", success: "text-success" }[tone]
  const icon: IconName = { info: "info", warning: "alert", error: "alert", success: "check" }[tone] as IconName
  const label = { info: "お知らせ", warning: "注意", error: "エラー", success: "完了" }[tone]
  return (
    <div role={tone === "error" ? "alert" : "status"} className="flex items-start gap-2 rounded-[8px] border border-line bg-surface px-3 py-2.5 t-small">
      <span className={`mt-px shrink-0 ${color}`}><Icon name={icon} size={20} /></span>
      <span className="min-w-0"><span className="sr-only">{label}: </span>{children}</span>
    </div>
  )
}
