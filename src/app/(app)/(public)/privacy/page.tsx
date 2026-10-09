import type { Metadata } from "next"

export const metadata: Metadata = { title: "プライバシーポリシー" }

// DRAFT reflecting the implemented behaviour (see HANDOFF.txt). Requires operator/legal review.
export default function PrivacyPage() {
  return (
    <article className="feed-column gutter desktop:px-0 desktop:pt-6 space-y-4 pt-4 t-long">
      <h1 className="t-h1">プライバシーポリシー（草案）</h1>
      <p className="text-muted t-small">この文書は実装内容に合わせた草案です。公開前に運営者が確認して確定します。</p>
      <h2 className="t-h2">集める情報</h2>
      <p>メールアドレス（ログインに使用・公開しません）、パスワード（ハッシュ化して保存）、表示名・自己紹介・プロフィールの3項目（公開情報）、投稿・写真・動画・コメント・DM、フォローや反応などの操作記録。</p>
      <h2 className="t-h2">写真・動画</h2>
      <p>写真の位置情報などのメタデータは、表示用の画像から取り除きます。元の位置情報を表示や検索に使うことはありません。表示用のURLは約2分で失効し、表示する権限を毎回確認します。ただし、一度表示を許可された画面の保存やスクリーンショットは回収できません。</p>
      <h2 className="t-h2">足あと</h2>
      <p>お互いに足あとを有効にしている場合だけ、プロフィールの訪問を1日1回記録し、30日で削除します。</p>
      <h2 className="t-h2">DM</h2>
      <p>DMはエンドツーエンド暗号化ではありません。運営は、通報されたメッセージに限って内容を確認します。会話の一覧を無条件に閲覧する仕組みはありません。</p>
      <h2 className="t-h2">保存期間</h2>
      <p>退会後7日以内に写真・動画と個人データを削除します。会話の相手側の画面には「削除されたユーザー」と表示されます。通報と運営の対応記録は、安全な運営のため一定期間保管します（期間は運営者が確定します）。</p>
      <h2 className="t-h2">外部サービス</h2>
      <p>データベース（Neon）、画像・動画の保存と配信（Cloudinary）、ホスティング（Vercel）を利用します。ログにはパスワード・メール全文・DM本文・メディアのトークンを記録しません。</p>
      <h2 className="t-h2">データの取得</h2>
      <p>設定画面から、プロフィール・自分の投稿・コメント・参加情報をJSON/CSVでダウンロードできます。</p>
    </article>
  )
}
