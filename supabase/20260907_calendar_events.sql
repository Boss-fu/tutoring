-- calendar_events：老師專用的一站式行事曆事件。
--   kind='fulltime' → 正職上班時段（只是行事曆標記，薪資仍以薪資單為準，不另計金額）
--   kind='personal' → 個人行程（會議、雜事、休假等）
-- 家教課仍存在 lessons、兼職班次仍存在 work_shifts；此表只放上述兩類「時段標記」。
-- 可重複執行（if not exists / drop policy if exists）。

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'personal',
  title text not null default '',
  event_date date not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_date_idx on public.calendar_events(event_date);

alter table public.calendar_events enable row level security;

-- 單一老師系統：只有老師身分可讀寫。
drop policy if exists "calendar_events teacher all" on public.calendar_events;
create policy "calendar_events teacher all" on public.calendar_events
  for all
  using (public.is_teacher())
  with check (public.is_teacher());
