import type { Metadata } from "next"
import Link from "next/link"
import { DayNetMark } from "@/components/brand/DayNetMark"
import { APP_DESCRIPTION, APP_TAGLINE, CINEMIX_NOTE, CINEMIX_URL } from "@/config/brand"

export const metadata: Metadata = { title: "DayNetについて" }

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[640px] gutter space-y-5 pt-4">
      <DayNetMark size={48} />
      <h1 className="t-h1">{APP_TAGLINE}</h1>
      <p className="t-long">{APP_DESCRIPTION}</p>
      <ul className="list-disc space-y-1 pl-5 t-body">
        <li>写真（5枚まで）・短い動画（60秒まで）・文章だけの日記を投稿できます。</li>
        <li>ホームは新しい順に並びます。人気順の並べ替えはしていません。</li>
        <li>表示名は匿名でかまいません。投稿やDMはログインしたアカウントから行われます。</li>
        <li>プロフィールには「イキリポイント」「残念な弱点」「趣味3つ」を必ず表示します。会話のきっかけになるように。</li>
      </ul>
      <section className="rounded-[18px] bg-surface p-5">
        <h2 className="t-section">CinemiXとの関係</h2>
        <p className="mt-2 t-body">{CINEMIX_URL ? <a href={CINEMIX_URL} target="_blank" rel="noopener noreferrer" className="underline">{CINEMIX_NOTE}</a> : CINEMIX_NOTE}</p>
        <p className="mt-2 text-muted t-small">現在、DayNetとCinemiXの間でアカウントの共有・照合や、データの送受信は行っていません。将来連携する場合も、ご本人の同意を前提にします。</p>
      </section>
      <div className="flex gap-4"><Link href="/terms" className="link-btn">利用規約</Link><Link href="/privacy" className="link-btn">プライバシーポリシー</Link></div>
    </div>
  )
}
