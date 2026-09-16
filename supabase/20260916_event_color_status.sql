-- 2026-09-16 月曆行程：每筆可自訂顏色 + 所有類型皆可標出席狀態
-- 可重複執行（if not exists）。DDL 需由使用者在 Supabase SQL Editor 執行。

-- 家教課次：新增自訂顏色（覆蓋分類色；空＝用分類預設色）
alter table public.lessons          add column if not exists color  text;

-- 兼職班次：新增自訂顏色與出席狀態（attended/leave/absent/late；空＝實到）
alter table public.work_shifts      add column if not exists color  text;
alter table public.work_shifts      add column if not exists status text;

-- 行事曆事件（正職／個人）：新增自訂顏色與出席狀態
alter table public.calendar_events  add column if not exists color  text;
alter table public.calendar_events  add column if not exists status text;

-- 明確分類（priv 私人家教／comp 公司家教／parttime 兼職／fulltime 正職上班）
-- 空＝依姓名／關鍵字自動判定（向後相容）
alter table public.lessons          add column if not exists category text;
alter table public.calendar_events  add column if not exists category text;
