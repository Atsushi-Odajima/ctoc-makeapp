"use client"

import Link from "next/link"

export interface TabItem<T extends string> { value: T; label: string; href?: string }

/** Text tabs (≥44px). Selection = ink + bold + underline + aria-selected/current (never colour alone). */
export function Tabs<T extends string>({ items, value, onChange, label, fill = false, className = "" }: { items: Array<TabItem<T>>; value: T; onChange?: (v: T) => void; label: string; fill?: boolean; className?: string }) {
  return (
    <div className={`tabs ${fill ? "tabs-fill" : ""} ${className}`} role={onChange ? "tablist" : undefined} aria-label={label}>
      {items.map(item => item.href ? (
        <Link key={item.value} href={item.href} aria-current={item.value === value ? "page" : undefined} scroll={false}>{item.label}</Link>
      ) : (
        <button key={item.value} type="button" role="tab" aria-selected={item.value === value} onClick={() => onChange?.(item.value)}>{item.label}</button>
      ))}
    </div>
  )
}
