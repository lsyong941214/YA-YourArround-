-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에(위 alter_rept_blck.sql로 user_blocks가
-- 먼저 있어야 한다) 매칭 추천/주변인 테스트 요청 대상에도 차단 필터를 반영한다
-- (2026-09-20, 서비스 출시 체크리스트 4번 "사용자 신고/차단" 잔여 항목 대응).
--
-- 배경: user_blocks의 RLS(blocks_select_own)는 "내가 차단한 목록"만 조회를 허용해서,
-- 클라이언트가 "상대가 나를 차단했는지"는 직접 조회할 수 없다. 지금까지 연락처 목록
-- (cntc_store)은 내가 차단한 상대를 걸러냈지만, 매칭 추천/주변인 테스트 요청 대상 조회
-- (req_target.ts)는 이 차단 여부를 전혀 반영하지 않아서 - 링크(URL)만 있으면 서로 차단한
-- 사이에도 연결 요청/주변인 테스트를 새로 보낼 수 있었다.
--
-- is_blkd_pair는 SECURITY DEFINER로 양방향(내가 차단했거나, 상대가 나를 차단했거나) 차단
-- 여부를 확인해주는 함수로, 클라이언트가 요청 대상을 보여주기 전에 미리 걸러내는 데 쓰고
-- (req_target.find_req_target), matc_blck_chk 트리거는 그 확인을 우회해 API를 직접
-- 호출하는 경우까지 서버에서 다시 막는다. 재실행해도 안전하다(함수/트리거 재정의).
create or replace function public.is_blkd_pair(a_id uuid, b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a_id and blocked_id = b_id)
       or (blocker_id = b_id and blocked_id = a_id)
  );
$$;

revoke all on function public.is_blkd_pair(uuid, uuid) from public;
grant execute on function public.is_blkd_pair(uuid, uuid) to authenticated;

create or replace function public.matc_blck_chk()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_blkd_pair(new.requester_id, new.resident_id) then
    raise exception '차단된 상대에게는 요청을 보낼 수 없습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists matc_blck_chk on public.match_requests;
create trigger matc_blck_chk
  before insert on public.match_requests
  for each row execute function public.matc_blck_chk();

drop trigger if exists blnd_blck_chk on public.blind_test_requests;
create trigger blnd_blck_chk
  before insert on public.blind_test_requests
  for each row execute function public.matc_blck_chk();

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
