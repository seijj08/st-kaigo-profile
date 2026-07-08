-- ============================================================
-- yst-kaigo-profile : Supabase スキーマ定義
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date not null,
  province text not null,
  created_at timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  answers jsonb not null,
  values_top3 jsonb not null,
  free_text text,
  duration_sec integer,
  flags jsonb,
  created_at timestamptz not null default now()
);

create index if not exists responses_candidate_id_idx on responses(candidate_id);

alter table candidates enable row level security;
alter table responses enable row level security;

-- 候補者側（未認証 anon）は挿入のみ許可。閲覧・更新・削除は不可。
create policy "anon insert candidates" on candidates
  for insert to anon
  with check (true);

create policy "anon insert responses" on responses
  for insert to anon
  with check (true);

-- スタッフ側（Supabase Authでログイン済み）は閲覧・削除が可能。
create policy "authenticated select candidates" on candidates
  for select to authenticated
  using (true);

create policy "authenticated select responses" on responses
  for select to authenticated
  using (true);

create policy "authenticated delete candidates" on candidates
  for delete to authenticated
  using (true);

create policy "authenticated delete responses" on responses
  for delete to authenticated
  using (true);
