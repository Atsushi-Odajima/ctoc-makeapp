# DayNet — 趣味でつながるSNS

写真・動画・日記の投稿と、趣味の集まり、フォロー・DMを備えたSNSの開発リポジトリです。

実装ブランチ：`feature/ui-revamp`。

## できること

- 投稿・コメント・保存・集まり・プロフィールの画面とAPI
- フォロー承認、DMリクエスト、ブロック・通報と公開範囲の制御
- PostgreSQLへの移行ツール、メディア配信の認可、運用・移行試験

## 現在の範囲・制限

- feature/ui-revampはDayNet v4を基にした画面改修版です。mainにある旧実装とはセットアップ・データ構造が異なります。
- Cloudinaryのtoken-based配信の有効化と実配信検証、本番データ移行、iPhone実機確認が残っています。コード公開と一般利用サービスとしての公開は別です。

## 実装の見どころ

**構成：** Next.js / React / TypeScript、Auth.js、Prisma / PostgreSQL、Cloudinary、Vitest / Playwright。

- [src/app](./src/app)
- [src/lib/policies](./src/lib/policies)
- [src/lib/media](./src/lib/media)
- [tests](./tests)

## ローカルで試す

Node.js 20.9以上。PostgreSQL、認証・メディア関連の環境変数が必要です。

実装ブランチを取得し、次のディレクトリで作業します。

```sh
git clone --branch feature/ui-revamp https://github.com/Atsushi-Odajima/ctoc-makeapp.git
cd ctoc-makeapp
npm ci
```

README.txtで環境変数と開発DBを設定し、移行を適用してから npm run dev を実行します。既存の本番データには、MIGRATION_RUNBOOK.txt のバックアップ・比較手順を先に実施してください。

環境設定・初期化の詳細：[セットアップ手順](./README.txt)。

## 検証方法

`リポジトリ直下` の `package.json` に定義された主な確認コマンドです。DB・ブラウザ・外部ツールを要するものは、開発手順の事前設定が必要です。

```sh
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

試験の実施環境・結果・未実施項目は、下記の記録を参照してください。画面エミュレーションと実機確認、モックと外部サービスでの確認を区別しています。

## 資料

- [README.txt](./README.txt)
- [HANDOFF.txt](./HANDOFF.txt)

## 制作・利用条件

制作・管理：**Atsushi Odajima**。実装・資料作成にはAI支援を利用しています。
ソース・同梱ライブラリ・フォント・モデル等の利用条件は、各ライセンスと第三者表記を参照してください。リポジトリの閲覧可能性と、再配布・商用利用の許諾は別です。
