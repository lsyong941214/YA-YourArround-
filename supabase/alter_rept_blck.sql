-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 신고(reports)/차단(user_blocks) 테이블을
-- 추가한다 (2026-09-18, 서비스 출시 체크리스트 대응 - 신뢰/안전 기능).
-- 재실행해도 안전하도록 대부분 if not exists / drop policy if exists 를 붙였다.

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  target_id     uuid not null references public.profiles(id) on delete cascade,
  reason        text not null check (reason in ('fake_prof', 'illegal_ad', 'abuse', 'spam', 'etc')),
  detail        text not null default '',
  status        text not null default 'open' check (status in ('open', 'in_prog', 'done')),
  created_at    timestamptz not null default now(),
  constraint reports_no_self_chk check (reporter_id <> target_id)
);
create index if not exists idx_reports_target on public.reports (target_id);
create index if not exists idx_reports_status on public.reports (status, created_at);

create table if not exists public.user_blocks (
  blocker_id    uuid not null references public.profiles(id) on delete cascade,
  blocked_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_chk check (blocker_id <> blocked_id)
);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id);

alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "blocks_insert_own" on public.user_blocks;
create policy "blocks_insert_own" on public.user_blocks
  for insert with check (auth.uid() = blocker_id);
drop policy if exists "blocks_select_own" on public.user_blocks;
create policy "blocks_select_own" on public.user_blocks
  for select using (auth.uid() = blocker_id);
drop policy if exists "blocks_delete_own" on public.user_blocks;
create policy "blocks_delete_own" on public.user_blocks
  for delete using (auth.uid() = blocker_id);
