import Link from "next/link"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] gutter" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <header className="flex h-[72px] items-center">
        <Link href="/" aria-label="DayNetのホーム"><DayNetWordmark width={165} decorative /></Link>
      </header>
      {children}
    </main>
  )
}
