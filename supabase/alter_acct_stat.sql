-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 계정 상태(acct_stat)와 신고 누적 자동
-- 정지 트리거를 추가한다 (2026-09-19, 서비스 출시 체크리스트 6번 "반복 위반자 영구 차단" 대응).
-- supabase/alter_rept_blck.sql(reports/user_blocks 테이블)이 먼저 적용되어 있어야 한다.
-- 재실행해도 안전하다.

alter table public.profiles
  add column if not exists acct_stat text not null default 'actv'
    check (acct_stat in ('actv', 'susp', 'ban'));

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
    update public.profiles
    set acct_stat = 'susp'
    where id = new.target_id and acct_stat = 'actv';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_auto_susp on public.reports;
create trigger reports_auto_susp
  after insert on public.reports
  for each row execute function public.reports_auto_susp();
