-- 2026-10-20 段考成績登記（成績成長分頁 Phase 1+2）
-- 可重複執行。DDL 需由使用者在 Supabase SQL Editor 執行（或由有權限者套用）。

create table if not exists public.exam_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  term text,                       -- 學期，如「115上」
  exam_name text,                  -- 段考名稱，如「第一次段考」
  exam_date date,                  -- 成長曲線 X 軸
  subject text,                    -- 科目（預設帶 students.subjects 第一科）
  score numeric,
  full_marks numeric default 100,
  class_rank int,
  class_size int,
  school_rank int,
  target_score numeric,
  weak_points jsonb default '[]'::jsonb,  -- [{topic, lost, type}] 失分弱點
  note text,
  created_at timestamptz default now()
);

alter table public.exam_scores enable row level security;
drop policy if exists "teacher exam_scores" on public.exam_scores;
create policy "teacher exam_scores" on public.exam_scores
  for all using (is_teacher()) with check (is_teacher());

create index if not exists exam_scores_student_idx on public.exam_scores(student_id, exam_date);
