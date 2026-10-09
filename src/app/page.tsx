import Link from "next/link"
import { redirect } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"
import { PublicPhotos } from "@/components/explore/PublicPhotos"
import { APP_DESCRIPTION, APP_TAGLINE, CINEMIX_NOTE } from "@/config/brand"

export default async function LandingPage() {
  if (await getViewer()) redirect("/feed")
  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <header className="wide-column flex h-[var(--header-height)] items-center justify-between pl-4 pr-3 desktop:h-16 desktop:px-6" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <DayNetWordmark size={20} />
        <Link href="/login" className="btn btn-ink btn-sm">ログイン</Link>
      </header>
      <main className="wide-column flex-1 px-[var(--gutter)] desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] desktop:items-center desktop:gap-16 desktop:px-6">
        <section className="py-8 desktop:py-16">
          <h1 className="t-h1">{APP_TAGLINE}</h1>
          <p className="mt-3 t-long">{APP_DESCRIPTION}</p>
          <p className="mt-2 text-muted t-small">表示名は匿名でOK。プロフィールには「イキリポイント」「残念な弱点」「趣味3つ」を。</p>
          <div className="mt-6 flex flex-col gap-2 min-[400px]:flex-row">
            <Link href="/register" className="btn btn-primary min-[400px]:min-w-[160px]">はじめる</Link>
            <Link href="/explore" className="btn btn-secondary min-[400px]:min-w-[160px]">ログインせずに見る</Link>
          </div>
          <nav aria-label="DayNetについて" className="mt-4 flex flex-wrap gap-x-3">
            <Link href="/communities" className="link-btn">集まりをのぞく</Link>
            <Link href="/about" className="link-btn">DayNetについて</Link>
            <Link href="/news" className="link-btn">ニュース</Link>
          </nav>
        </section>
        <div className="-mx-[var(--gutter)] pb-8 desktop:mx-0 desktop:py-16">
          <PublicPhotos headerClassName="px-[var(--gutter)] desktop:px-0" />
        </div>
      </main>
      <footer className="wide-column flex flex-wrap items-center justify-between gap-2 border-t border-line px-[var(--gutter)] pt-3 t-meta desktop:px-6">
        <span>{CINEMIX_NOTE}</span>
        <span className="flex gap-1"><Link href="/terms" className="link-btn">利用規約</Link><Link href="/privacy" className="link-btn">プライバシー</Link></span>
      </footer>
    </div>
  )
}
