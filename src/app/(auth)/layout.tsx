import Link from "next/link"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[420px] gutter" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <header className="flex h-[var(--header-height)] items-center desktop:h-16" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/" aria-label="DayNetのホーム" className="flex min-h-[44px] items-center"><DayNetWordmark size={20} decorative /></Link>
      </header>
      {children}
    </main>
  )
}
