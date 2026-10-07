import Link from "next/link"
import { redirect } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"
import { DayNetWordmark } from "@/components/brand/DayNetWordmark"
import { DayNetMark } from "@/components/brand/DayNetMark"
import { APP_DESCRIPTION, APP_TAGLINE, CINEMIX_NOTE } from "@/config/brand"

export default async function LandingPage() {
  if (await getViewer()) redirect("/feed")
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gutter" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <header className="flex h-[72px] items-center"><DayNetWordmark width={165} /></header>
      <section className="flex flex-1 flex-col justify-center gap-5 py-8">
        <DayNetMark size={72} />
        <h1 className="t-h1">{APP_TAGLINE}</h1>
        <p className="t-long">{APP_DESCRIPTION}</p>
        <p className="text-muted t-body">表示名は匿名でOK。プロフィールには「イキリポイント」「残念な弱点」「趣味3つ」を。</p>
        <div className="flex flex-col gap-2 min-[400px]:flex-row">
          <Link href="/register" className="btn btn-accent flex-1">はじめる</Link>
          <Link href="/login" className="btn btn-primary flex-1">ログイン</Link>
        </div>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/communities" className="link-btn">集まりをのぞく</Link>
          <Link href="/about" className="link-btn">DayNetについて</Link>
          <Link href="/news" className="link-btn">ニュース</Link>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-muted text-[10px]">
        <span>{CINEMIX_NOTE}</span>
        <span className="flex gap-3"><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシー</Link></span>
      </footer>
    </main>
  )
}
