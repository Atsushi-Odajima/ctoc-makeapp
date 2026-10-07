"use client"

import Link from "next/link"

export interface TabItem<T extends string> { value: T; label: string; href?: string }

/** Segmented tabs (≥44px). Selection is shown by colour AND weight AND aria-selected/current. */
export function Tabs<T extends string>({ items, value, onChange, label }: { items: Array<TabItem<T>>; value: T; onChange?: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role={onChange ? "tablist" : undefined} aria-label={label}>
      {items.map(item => item.href ? (
        <Link key={item.value} href={item.href} aria-current={item.value === value ? "page" : undefined} className="interactive" scroll={false}>{item.label}</Link>
      ) : (
        <button key={item.value} type="button" role="tab" aria-selected={item.value === value} className="interactive" onClick={() => onChange?.(item.value)}>{item.label}</button>
      ))}
    </div>
  )
}
