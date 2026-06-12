# 🍶 大塚･巣鴨の酒アホ達

小規模クローズドコミュニティ(50〜100人想定)向けの掲示板型SNS Webアプリ。

- **フロントエンド**: React + Vite + TypeScript + Tailwind CSS
- **バックエンド**: Supabase(Auth / PostgreSQL / Realtime / Storage)
- **UI**: iPhone前提のモバイルファースト・日本語UI・薄いブルー基調・下部タブナビ

## 機能

| 機能 | 内容 |
|---|---|
| 認証 | メール+パスワードのサインアップ/ログイン |
| プロフィール | ニックネーム・自己紹介・アバター(絵文字 or 写真) |
| カテゴリ(板) | 飲み/メシ/情報(初期値)。管理者のみ追加可能 |
| スレッド | タイトル+本文+画像1枚。作成者は編集/削除可 |
| コメント | スレッドへのコメント+1階層の返信 |
| リアルタイム | 開いているスレッドの新着コメントを自動反映 |
| リアクション | 👍いいね！/🙅‍♂️アカン！/✅要検討(1人1対象1回)。した人の名前をInstagram風に表示 |
| 一覧 | 新着順/コメント順/いいね順の並び替え+カテゴリ絞り込み |
| 通報 | 投稿の通報→reportsテーブルに記録。管理者がマイページで確認 |
| 管理者 | `profiles.is_admin`。任意投稿の削除・カテゴリ追加・通報対応 |

---

## セットアップ手順

### 1. Supabaseプロジェクト作成とSQL実行

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. ダッシュボード左メニュー **SQL Editor** → **New query** を開く
3. [`supabase/schema.sql`](supabase/schema.sql) の中身を**全文コピーして貼り付け** → **Run**
   - テーブル6つ(profiles / categories / threads / comments / likes / reports)
   - RLSポリシー、Realtime設定、Storageバケット(`thread-images` / `avatars`)、初期カテゴリ(飲み/メシ/情報)まで一括作成されます
4. **Storage** メニューで `thread-images` と `avatars` バケットができていることを確認
   (もしSQLでの作成に失敗した場合は、Storage画面から手動で **Public bucket** として2つ作成してください)

### 2. 認証設定(推奨)

クローズドコミュニティで運用しやすくするため:

- **Authentication → Sign In / Up → Email** で **Confirm email を OFF**
  (ONのままだと登録時にメール確認が必要になります)

### 3. 管理者アカウントの登録

アプリの「新規登録」画面から以下でサインアップしてください:

- メール: `kuroatu0130@gmail.com`
- パスワード: `atusi0130`

このメールアドレスはDBトリガーで自動的に `is_admin = true` が付与されます。

### 4. 接続情報を .env に設定

ダッシュボード **Project Settings → API** から値をコピー:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...(anon public キー)
```

---

## ローカル起動

```bash
npm install
npm run dev -- --host
```

起動すると以下のように表示されます:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### iPhoneのSafariで確認する方法

1. **PCとiPhoneを同じWi-Fiに接続**する
2. 上記の `Network:` に表示されたURL(例: `http://192.168.1.10:5173`)をiPhoneのSafariで開く
3. PCのローカルIPがわからない場合:
   - Mac: `ipconfig getifaddr en0`
   - Windows: `ipconfig`(IPv4アドレスの欄)
4. つながらない場合はPCのファイアウォールで5173番ポートを許可してください

---

## DB設計概要

```
profiles   … auth.usersと1:1。nickname / bio / avatar / is_admin
categories … 板。追加は管理者のみ
threads    … スレッド。category_id / author_id / title / body / image_url
comments   … レス。parent_id で1階層の返信を表現
likes      … リアクション。(user_id, target_type, target_id) UNIQUE で二重防止
reports    … 通報。閲覧は管理者のみ
thread_list… 一覧用ビュー(comment_count / like_count 付き、security_invoker)
```

RLS方針: **読み取り=ログインユーザー全員 / 書き込み=本人のみ / 削除=本人+管理者**(全テーブルでRLS有効)
