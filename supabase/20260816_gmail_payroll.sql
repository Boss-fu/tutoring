create table if not exists public.gmail_payroll_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  gmail_address text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gmail_payroll_imports (
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  attachment_id text not null,
  attachment_name text,
  imported_at timestamptz not null default now(),
  primary key (user_id, gmail_message_id, attachment_id)
);

create table if not exists public.gmail_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.gmail_payroll_connections enable row level security;
alter table public.gmail_payroll_imports enable row level security;
alter table public.gmail_oauth_states enable row level security;

-- OAuth refresh tokens are backend-only. No browser policies are intentionally created.
revoke all on public.gmail_payroll_connections from anon, authenticated;
revoke all on public.gmail_oauth_states from anon, authenticated;
grant select on public.gmail_payroll_imports to authenticated;
create policy "teacher reads own gmail import history" on public.gmail_payroll_imports
  for select to authenticated using (auth.uid() = user_id);
