import type { Metadata } from "next"

export const metadata: Metadata = { title: "利用規約" }

// DRAFT for legal review. Describes how the service actually works today; must be reviewed by the
// operator (and counsel) before public launch.
export default function TermsPage() {
  return (
    <article className="feed-column gutter desktop:px-0 desktop:pt-6 space-y-4 pt-4 t-long">
      <h1 className="t-h1">利用規約（草案）</h1>
      <p className="text-muted t-small">この文書は公開前の草案です。運営者による確認を経て確定します。</p>
      <h2 className="t-h2">投稿について</h2>
      <p>投稿・コメント・メッセージの内容はご本人の責任で行ってください。表示名は匿名でかまいませんが、投稿はログインしたアカウントに結びつきます。他の人の権利を侵害する内容、差別・嫌がらせ・性的な内容、個人情報の公開などは禁止します。</p>
      <h2 className="t-h2">公開範囲</h2>
      <p>「公開」の投稿と公開の集まりへの投稿は、ログインしていない人も含め誰でも読めます。ブロックはログイン中の相手との交流を止める機能で、インターネット全体から見えなくする機能ではありません。表示を許可した相手が保存したコピーやスクリーンショットを回収することはできません。</p>
      <h2 className="t-h2">運営の対応</h2>
      <p>通報を受けた内容は、運営が必要な範囲で確認し、非表示・復元・アカウントの停止などを行うことがあります。運営の判断は記録として残します。</p>
      <h2 className="t-h2">退会</h2>
      <p>退会はいつでもできます。手続き後すぐに公開表示を止め、7日以内に写真・動画と個人データを削除します。</p>
    </article>
  )
}
