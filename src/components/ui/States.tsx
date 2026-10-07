"use client"

import Link from "next/link"
import { DayNetMark } from "@/components/brand/DayNetMark"

export function Skeletons({ count = 3, label = "読み込み中" }: { count?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      {Array.from({ length: Math.min(3, count) }, (_, i) => (
        <div key={i} className="space-y-3" aria-hidden>
          <div className="flex items-center gap-3"><div className="skeleton h-[39px] w-[39px]" /><div className="skeleton h-4 w-32" /></div>
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] bg-surface px-6 py-10 text-center">
      <DayNetMark size={36} />
      <p className="t-section">{title}</p>
      {body && <p className="text-muted t-body">{body}</p>}
      {action && <Link href={action.href} className="btn btn-primary">{action.label}</Link>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-[18px] border border-error bg-surface px-6 py-8 text-center">
      <p className="t-body">{message}</p>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>再試行</button>}
    </div>
  )
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "error" | "success"; children: React.ReactNode }) {
  const border = { info: "border-line", warning: "border-warning", error: "border-error", success: "border-success" }[tone]
  const label = { info: "お知らせ", warning: "注意", error: "エラー", success: "完了" }[tone]
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[11px] border ${border} bg-surface px-4 py-3 t-small`}>
      <span className="sr-only">{label}: </span>
      {children}
    </div>
  )
}
