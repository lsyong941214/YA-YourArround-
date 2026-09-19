-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 관리자(is_admin) 플래그와 신고 처리
-- 화면(/admin)에 필요한 RLS 정책을 추가한다 (2026-09-19, 서비스 출시 체크리스트 5·10번
-- "신고 24시간 대응"/"수사기관 협조" 대응). supabase/alter_rept_blck.sql이 먼저 적용되어
-- 있어야 한다. 재실행해도 안전하다.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- 첫 관리자는 UI가 없으니 SQL Editor에서 직접 지정한다. 이메일로 auth.users를 찾아서:
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = '{login_id}@jubyeon.local');
