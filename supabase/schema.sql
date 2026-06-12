-- ============================================================
-- 大塚･巣鴨の酒アホ達 - 掲示板型SNS スキーマ定義
-- Supabase ダッシュボード > SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル定義
-- ------------------------------------------------------------

-- プロフィール(auth.users と 1:1)
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null default '名無しの酒アホ',
  bio        text not null default '',
  -- 絵文字1文字 または アップロード画像のURL
  avatar     text not null default '🍶',
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- カテゴリ(板)
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- スレッド
create table public.threads (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  body        text not null check (char_length(body) between 1 and 4000),
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- コメント(レス)。parent_id ありは「返信」(1階層のみ・アプリ側で制御)
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- リアクション(いいね！/アカン！/要検討)
-- (user_id, target_type, target_id) のユニーク制約で
-- 同一ユーザーの二重いいね・二重アカンを防止(1対象につき1リアクション)
create table public.likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  target_id   uuid not null,
  reaction    text not null check (reaction in ('like', 'akan', 'kento')),
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

-- 通報(管理者が後から確認する)
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  target_id   uuid not null,
  reason      text not null default '',
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- インデックス(小規模だが一覧ソート・絞り込みで効くもののみ)
create index threads_category_created_idx on public.threads (category_id, created_at desc);
create index threads_created_idx          on public.threads (created_at desc);
create index comments_thread_idx          on public.comments (thread_id, created_at);
create index likes_target_idx             on public.likes (target_type, target_id);
create index reports_resolved_idx         on public.reports (resolved, created_at desc);

-- ------------------------------------------------------------
-- 2. ヘルパー関数・トリガー
-- ------------------------------------------------------------

-- 管理者判定(RLS から profiles を再帰参照しないよう security definer)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- サインアップ時に profiles を自動作成。
-- 管理者メールアドレスなら is_admin = true を自動付与
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, is_admin)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)),
    new.email = 'kuroatu0130@gmail.com'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 自動更新
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger threads_touch  before update on public.threads  for each row execute function public.touch_updated_at();
create trigger comments_touch before update on public.comments for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. 一覧用ビュー(コメント数・いいね数つき。並び替えを1クエリで実現)
--    security_invoker = on なので RLS は閲覧者の権限で評価される
-- ------------------------------------------------------------
create or replace view public.thread_list
with (security_invoker = on) as
select
  t.*,
  (select count(*) from public.comments c where c.thread_id = t.id)::int as comment_count,
  (select count(*) from public.likes l
    where l.target_type = 'thread' and l.target_id = t.id and l.reaction = 'like')::int as like_count
from public.threads t;

-- ------------------------------------------------------------
-- 4. RLS(行レベルセキュリティ)
--    方針: 読み取り = ログインユーザー全員 / 書き込み = 本人のみ /
--          削除 = 本人 + 管理者
-- ------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.threads    enable row level security;
alter table public.comments   enable row level security;
alter table public.likes      enable row level security;
alter table public.reports    enable row level security;

-- profiles
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));
  -- ※ is_admin を本人が書き換えられないようガード

-- categories(追加は管理者のみ)
create policy "categories_select" on public.categories
  for select to authenticated using (true);
create policy "categories_insert_admin" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories_update_admin" on public.categories
  for update to authenticated using (public.is_admin());
create policy "categories_delete_admin" on public.categories
  for delete to authenticated using (public.is_admin());

-- threads
create policy "threads_select" on public.threads
  for select to authenticated using (true);
create policy "threads_insert_own" on public.threads
  for insert to authenticated with check (author_id = auth.uid());
create policy "threads_update_own" on public.threads
  for update to authenticated using (author_id = auth.uid());
create policy "threads_delete_own_or_admin" on public.threads
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- comments
create policy "comments_select" on public.comments
  for select to authenticated using (true);
create policy "comments_insert_own" on public.comments
  for insert to authenticated with check (author_id = auth.uid());
create policy "comments_update_own" on public.comments
  for update to authenticated using (author_id = auth.uid());
create policy "comments_delete_own_or_admin" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- likes(リアクションの付け替えは本人のみ)
create policy "likes_select" on public.likes
  for select to authenticated using (true);
create policy "likes_insert_own" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "likes_update_own" on public.likes
  for update to authenticated using (user_id = auth.uid());
create policy "likes_delete_own" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- reports(投稿は全員可・閲覧/更新は管理者のみ)
create policy "reports_select_admin" on public.reports
  for select to authenticated using (public.is_admin());
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_update_admin" on public.reports
  for update to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- 5. Realtime(開いているスレッドへの新着コメント/リアクションを購読)
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.likes;

-- ------------------------------------------------------------
-- 6. Storage バケット + ポリシー
--    thread-images: スレッド添付画像 / avatars: プロフィール写真
--    どちらも公開読み取り・書き込みは自分のフォルダ(uid/)のみ
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('thread-images', 'thread-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "storage_public_read" on storage.objects
  for select using (bucket_id in ('thread-images', 'avatars'));

create policy "storage_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('thread-images', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('thread-images', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 7. 初期データ(カテゴリ)
-- ------------------------------------------------------------
insert into public.categories (name, sort_order) values
  ('飲み', 1),
  ('メシ', 2),
  ('情報', 3)
on conflict (name) do nothing;
