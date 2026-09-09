-- teacher_prefs：老師專用的 key/value 設定表（只有老師身分可讀寫）。
-- 用途：把「個人班表」(key='personal_schedule') 存到雲端，讓個人班表跨裝置保存，
-- 不放在 site_settings（那張表所有登入者含家長都能讀）以免外洩學生／家教資訊。
-- 可重複執行（if not exists / drop policy if exists）。

create table if not exists public.teacher_prefs (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.teacher_prefs enable row level security;

-- 單一老師系統：只有老師身分可讀寫（家長讀不到）。
drop policy if exists "teacher_prefs teacher all" on public.teacher_prefs;
create policy "teacher_prefs teacher all" on public.teacher_prefs
  for all
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());
