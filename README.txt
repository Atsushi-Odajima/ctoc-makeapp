DayNet（デイネット）
写真・動画・日記を投稿し、趣味の集まりで話せるSNS。旧 ctoc-makeapp（表示名ハレノワ）を改修したもの。
最終更新: 2026-10-07 / ブランチ feature/daynet-v4

────────────────────────────────────────
0. 構成（実装結果）
────────────────────────────────────────
Next.js 16.2.9（App Router, Turbopack）/ React 19.2.4 / Prisma 6.19.3 / PostgreSQL（本番はNeon想定）
Auth.js（next-auth 5.0.0-beta.31, JWT, bcrypt）/ Cloudinary（authenticated + token配信）/ Tailwind 4
テスト: Vitest 3.2.4（unit / integration=実PostgreSQL）、Playwright 1.56.1（E2E）
Nodeのエンジン制約: Next 16 は Node.js 20.9 以上。Node.js 22 LTS の最新パッチを推奨。
デザイン資料の正本: design/DayNet/（ブランド・UI仕様、ロゴSVG、フォント、OFL）

────────────────────────────────────────
1. Windows 11 での開発手順
────────────────────────────────────────
前提: Git、Node.js 22 LTS（最新パッチ）、npm、VS Code など。
      PostgreSQL は Neon の開発用ブランチ（推奨）か、ローカルの PostgreSQL 16 以上。

 1) ZIPを展開（または git clone）し、PowerShell でプロジェクトへ移動して状態を確認
      cd C:\path\to\ctoc-makeapp
      git status

 2) 依存関係をロックファイルどおりに入れる
      npm ci
    （postinstall で prisma generate も実行されます）

 3) 環境変数ファイルを作る
      Copy-Item .env.example .env.local
    ・Next.js、Prisma CLI、scripts/* はすべて .env.local → .env の順で同じ値を読みます
      （scripts/lib/load-env.cjs に統一）。.env.local は git に入りません。秘密を commit しないこと。

 4) .env.local を編集
    ・DATABASE_URL … Neon 開発ブランチの「pooled」接続文字列（-pooler ホスト, sslmode=require, pgbouncer=true）
    ・DIRECT_URL   … 同じブランチの「direct」接続文字列（migrate 用）
    ・AUTH_SECRET  … 32文字以上のランダム値（PowerShell 例:
         [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))）
    ・AUTH_TRUST_HOST="true"、APP_ORIGIN="http://localhost:3000"
    ・写真/動画:
        - Cloudinary 開発用環境がある場合: MEDIA_PROVIDER="cloudinary" と CLOUDINARY_* 4項目
          （CLOUDINARY_AUTH_TOKEN_KEY は token-based access のキー。API_SECRET とは別）
        - ない場合: MEDIA_PROVIDER="local"（開発専用。.data/media に保存し、Vercelでは起動しません）
      どちらでも MEDIA_URL_SECRET（32文字以上）を設定。
    ・OAuth（Google/Facebook/LINE）は既存の変数名のまま。ID と SECRET の両方がある Provider だけ有効になります。

 5) Prisma Client を生成
      npx prisma generate

 6) 空の開発DBにマイグレーションを適用
      npx prisma migrate deploy
    新しい migration を作るとき（ローカル/開発DB限定。本番では実行しない）:
      npx prisma migrate dev --name <変更名>

 7) プロフィール選択肢だけを投入（実ユーザーや架空投稿は作りません。何度実行しても同じ結果）
      npm run seed:options

 8) 開発サーバー
      npm run dev -- --hostname 0.0.0.0
    ・PC: http://localhost:3000
    ・iPhone: 同じLANで http://<PCのIPv4>:3000（ipconfig で確認。Windows Defender ファイアウォールで
      Node.js の「プライベート ネットワーク」受信だけ許可）。
      ※ HTTP の LAN 接続は PWA・カメラ権限・Service Worker の本番確認になりません。実機確認は HTTPS の
        Vercel Preview を使ってください。APP_ORIGIN は実際に開くURLに合わせる（Origin チェックのため）。

────────────────────────────────────────
2. スクリプト
────────────────────────────────────────
  npm run dev / build / start          開発 / 本番ビルド / 本番起動
  npm run lint                         ESLint
  npm run typecheck                    tsc --noEmit
  npm test                             Vitest（unit + integration）
  npm run test:unit                    単体テストのみ（DB不要）
  npm run test:integration             実PostgreSQLの結合テスト（下記）
  npm run test:e2e                     Playwright（下記）
  npm run db:migrate                   prisma migrate deploy
  npm run db:backup                    pg_dump（custom形式）+ 件数マニフェスト（--sqlite <file> でSQLite）
  npm run db:copy-sqlite -- --sqlite <file>   SQLite → PostgreSQL コピー（MIGRATION_RUNBOOK 参照）
  npm run db:compare -- --sqlite <file> | --source-url <url>   件数・ID・外部キー比較
  npm run db:report-duplicates         pairKey を持たない旧会話の一覧（読み取りのみ）
  npm run seed:options                 プロフィール選択肢の upsert
  npm run media:backfill-legacy        旧 Post.images → Media の再バックフィル（冪等）
  npm run media:migrate-legacy         旧公開画像 → authenticated への移行（既定は dry-run）

結合テスト / E2E はローカルの PostgreSQL サーバーを使います（Neonは使いません）。
  ・TEST_PG_ADMIN_URL（結合）/ E2E_PG_ADMIN_URL（E2E）に「管理用」接続先を指定
    既定: postgresql://postgres@127.0.0.1:5433/postgres
  ・実行ごとに新しいDB（daynet_it_* / daynet_e2e_*）を作成 → migrate deploy → 終了時にそのDBだけ削除。
    既存のDBには触れません（localhost 以外は拒否）。
  ・E2E は next build → next start :3100 を自動で行い、MEDIA_PROVIDER=local で写真投稿まで通します。
    Chromium は Playwright 1.56.1（chromium-1194）。別の場所にある場合は PW_CHROMIUM_PATH を指定。

────────────────────────────────────────
3. Vercel
────────────────────────────────────────
・Build Command: npm run vercel-build（= prisma generate && next build）。ビルドで DB を変更しません
  （旧設定の prisma db push は削除）。DB変更は MIGRATION_RUNBOOK.txt の承認済み手順で prisma migrate deploy。
・Preview と Production で DB（Neonブランチ）/ Cloudinary 環境 / AUTH_SECRET / OAuth リダイレクトURL を分ける。
  Preview に本番の秘密を渡さない。APP_ORIGIN は各環境のURL。
・vercel.json の Cron（毎日）: /api/cron/media（未添付24h・失敗7日の媒体掃除、削除キュー）、
  /api/cron/retention（足あと30日、期限切れキー、退会者データの削除）。CRON_SECRET 必須。
・PWA: manifest（name/short_name DayNet、start_url /feed、standalone、#F7F4F5）、
  public/sw.js は静的ファイルと offline.html のみキャッシュ。/api・DM・投稿・トークン付媒体は保存しません。

────────────────────────────────────────
4. 主なディレクトリ
────────────────────────────────────────
  src/config/brand.ts            名称・説明・テーマ色・CinemiX表記
  src/config/profile-options.ts  イキリポイント/残念な弱点/趣味 の選択肢（安定ID）
  src/components/brand/          DayNetWordmark / DayNetMark
  src/components/layout/AppShell.tsx  ヘッダー・5項目ナビ
  src/lib/policies/              canViewPost / canManagePost / canMessage / canViewCommunity（認可の正本）
  src/lib/dto/                   公開DTO（明示select）
  src/lib/validation/            Zod・書記素数カウント
  src/lib/media/provider.ts      MediaProvider 境界（cloudinary.ts / local.ts）
  src/lib/integrations/cinemix.ts  将来用の型のみ（FEATURE_CINEMIX_IMPORT=false）
  prisma/migrations/             0001_baseline（冪等・追加のみ）、0002_daynet_v4
  scripts/                       移行・バックアップ・媒体移行ツール
  tests/                         unit / integration / e2e / fixtures
  public/brand, public/fonts     ロゴ・アイコン・WOFF2フォントとOFL

詳しくは CHANGELOG.txt / MIGRATION_RUNBOOK.txt / TEST_RESULTS.txt / HANDOFF.txt。
