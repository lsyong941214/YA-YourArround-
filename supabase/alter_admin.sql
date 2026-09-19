-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 관리자(is_admin) 플래그와 신고 처리
-- 화면(/admin)에 필요한 RLS 정책을 추가한다 (2026-09-19, 서비스 출시 체크리스트 5·10번
-- "신고 24시간 대응"/"수사기관 협조" 대응). supabase/alter_rept_blck.sql →
-- supabase/alter_acct_stat.sql이 먼저 적용되어 있어야 한다. 재실행해도 안전하다.
-- 이 파일은 profiles_update_admin 정책이 열어주는 구멍(정지/차단된 유저가 자기 acct_stat/
-- is_admin을 직접 되돌리는 것)을 막는 트리거와, 그 트리거와 충돌하지 않도록 손본
-- reports_auto_susp() 재정의도 함께 담고 있다 -- 반드시 끝까지 실행할 것.

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

-- profiles_update_admin이 생기면서 "profiles_update_own"(auth.uid() = id, 컬럼 제한 없음)과
-- OR로 합쳐져, 정지/차단된 유저가 자기 프로필을 고치는 평범한 API 호출로 acct_stat을
-- 'actv'로, is_admin을 true로까지 직접 바꿔치기할 수 있는 구멍이 생긴다. 트리거로 막는다.
-- auth.role() = 'authenticated'(PostgREST 경유, 즉 앱을 거친 요청)일 때만 강제한다 -
-- 트리거는 RLS와 달리 BYPASSRLS로 건너뛸 수 없어서, 이 조건이 없으면 바로 아래 최초 관리자
-- 지정용 SQL(SQL Editor, auth.role()이 'authenticated'가 아님)까지 막혀버린다.
create or replace function public.profiles_guard_priv_cols()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actr_admn boolean;
begin
  if (new.acct_stat is distinct from old.acct_stat or new.is_admin is distinct from old.is_admin)
     and auth.role() = 'authenticated' then
    if coalesce(current_setting('app.trust_sys_updt', true), '') = 'true' then
      return new;
    end if;
    select is_admin into actr_admn from public.profiles where id = auth.uid();
    if not coalesce(actr_admn, false) then
      raise exception 'acct_stat/is_admin은 관리자만 변경할 수 있습니다';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_priv_cols on public.profiles;
create trigger profiles_guard_priv_cols
  before update on public.profiles
  for each row execute function public.profiles_guard_priv_cols();

-- alter_acct_stat.sql에서 만든 reports_auto_susp()는 위 트리거가 없던 시절에 짠 것이라,
-- 자기가 하는 update가 이제 profiles_guard_priv_cols에 막힌다(SECURITY DEFINER라도
-- auth.uid()는 여전히 "신고자"를 가리켜 관리자가 아님). 여기서 다시 정의해 트랜잭션 범위
-- 플래그(app.trust_sys_updt)로 "신뢰할 수 있는 시스템 갱신"임을 미리 알려주도록 고친다.
create or replace function public.reports_auto_susp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rptr_cnt int;
begin
  select count(distinct reporter_id) into rptr_cnt
  from public.reports
  where target_id = new.target_id and status = 'open';

  if rptr_cnt >= 3 then
    perform set_config('app.trust_sys_updt', 'true', true);
    update public.profiles
    set acct_stat = 'susp'
    where id = new.target_id and acct_stat = 'actv';
  end if;

  return new;
end;
$$;

-- 첫 관리자는 UI가 없으니 SQL Editor에서 직접 지정한다. 이메일로 auth.users를 찾아서:
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = '{login_id}@jubyeon.local');
