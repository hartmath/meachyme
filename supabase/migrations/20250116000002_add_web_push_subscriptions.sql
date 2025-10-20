-- Create table to store Web Push subscriptions
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.web_push_subscriptions enable row level security;

-- RLS: a user may insert/select their own subscriptions
drop policy if exists "subscriptions_select" on public.web_push_subscriptions;
create policy "subscriptions_select"
  on public.web_push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert" on public.web_push_subscriptions;
create policy "subscriptions_insert"
  on public.web_push_subscriptions
  for insert
  with check (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_web_push_subscriptions_user_id on public.web_push_subscriptions(user_id);
create index if not exists idx_web_push_subscriptions_created_at on public.web_push_subscriptions(created_at desc);









