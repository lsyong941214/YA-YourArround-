-- 주변(Jubyeon) 스키마 변경분 — 2026-09-14 매칭 요청 데이터 정합성 강화
--
-- 배경: 홈 화면 "내 역할" 카드(HomeScreen.do_togl_role)는 같은 계정의
-- profiles.user_role을 res <-> chief로 아무 제약 없이 바로 바꿀 수 있게 해준다.
-- match_requests/blind_test_requests는 신청자/이장/대상 주민 프로필을 스냅샷으로
-- 저장하지 않고 매번 최신 profiles를 JOIN해서 보여주도록 설계돼 있어서(각 store 파일
-- 상단 주석 참고), 지금까지는 DB 차원에서
--   1) 신청자와 대상 주민이 같은 사람인 자기매칭(requester_id = resident_id)
--   2) chief_id 자리에 실제로는 res 역할인 사람, resident_id/requester_id 자리에
--      실제로는 chief 역할인 사람이 들어가는 역할 불일치
-- 를 막는 장치가 전혀 없었다. 이런 행이 하나라도 있으면 "매칭 현황"/"매칭 결과" 화면에서
-- 신청자==대상 주민으로 표시되거나, JOIN 결과가 화면 코드가 기대하지 않는 모양이 되어
-- 렌더링 중 처리되지 않은 예외로 화면이 통째로 죽는 원인이 될 수 있다(참고:
-- src/lib/store/matc_store.ts / blnd_store.ts의 row_to_matc/row_to_blnd는 이미
-- 이런 행을 만나도 죽지 않고 걸러내도록 방어 코드를 추가해뒀다 — 이 마이그레이션은 그
-- 원인이 되는 행이 "애초에 생기지 않도록" DB에서 막는 근본 조치다).
--
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.
--
-- ============================================================
-- 0) 먼저 위반 행이 있는지 점검한다 (실제로 발견됐다면 아래 alter table이
--    "기존 데이터가 새 CHECK 제약을 위반합니다" 에러로 실패한다 -- 그 경우 결과를 보고
--    문제의 행을 먼저 지우거나(사람이 판단해서) 고친 뒤 이 스크립트를 다시 실행할 것)
-- ============================================================
-- 자기매칭(신청자 = 대상 주민) 조회
select id, requester_id, chief_id, resident_id, status, created_at
from public.match_requests
where requester_id = resident_id;

select id, requester_id, chief_id, resident_id, status, created_at
from public.blind_test_requests
where requester_id = resident_id;

-- 역할 불일치(chief_id가 실제로는 chief가 아니거나, resident_id/requester_id가 실제로는
-- res가 아닌 경우) 조회 -- profiles.user_name까지 같이 보여줘서 어떤 계정인지 바로 알 수 있게 함
select
  m.id, m.status, m.created_at,
  req.user_name as requester_name, req.user_role as requester_role,
  chf.user_name as chief_name,     chf.user_role as chief_role,
  res.user_name as resident_name,  res.user_role as resident_role
from public.match_requests m
join public.profiles req on req.id = m.requester_id
join public.profiles chf on chf.id = m.chief_id
join public.profiles res on res.id = m.resident_id
where chf.user_role <> 'chief' or res.user_role <> 'res' or req.user_role <> 'res';

select
  b.id, b.status, b.created_at,
  req.user_name as requester_name, req.user_role as requester_role,
  chf.user_name as chief_name,     chf.user_role as chief_role,
  res.user_name as resident_name,  res.user_role as resident_role
from public.blind_test_requests b
join public.profiles req on req.id = b.requester_id
join public.profiles chf on chf.id = b.chief_id
join public.profiles res on res.id = b.resident_id
where chf.user_role <> 'chief' or res.user_role <> 'res' or req.user_role <> 'res';

-- ============================================================
-- 1) 자기매칭 차단 (위 0번 점검에서 나온 행이 있다면 이 alter가 실패한다 -- 먼저 정리할 것)
-- ============================================================
alter table public.match_requests
  add constraint match_requests_no_self_chk check (requester_id <> resident_id);
alter table public.blind_test_requests
  add constraint blind_test_requests_no_self_chk check (requester_id <> resident_id);

-- ============================================================
-- 2) 역할 검증 트리거 (신규 INSERT/UPDATE부터 적용 -- 기존 행은 자동으로 고치지 않는다)
-- ============================================================
create or replace function public.matc_role_chk()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  chief_role text;
  resd_role  text;
  reqr_role  text;
begin
  select user_role into chief_role from public.profiles where id = new.chief_id;
  select user_role into resd_role  from public.profiles where id = new.resident_id;
  select user_role into reqr_role  from public.profiles where id = new.requester_id;
  if chief_role is distinct from 'chief' then
    raise exception 'chief_id(%)는 이장(chief) 역할이 아닙니다', new.chief_id;
  end if;
  if resd_role is distinct from 'res' then
    raise exception 'resident_id(%)는 주민(res) 역할이 아닙니다', new.resident_id;
  end if;
  if reqr_role is distinct from 'res' then
    raise exception 'requester_id(%)는 주민(res) 역할이 아닙니다', new.requester_id;
  end if;
  return new;
end;
$$;

drop trigger if exists matc_role_chk on public.match_requests;
create trigger matc_role_chk
  before insert or update of chief_id, resident_id, requester_id on public.match_requests
  for each row execute function public.matc_role_chk();

drop trigger if exists blnd_role_chk on public.blind_test_requests;
create trigger blnd_role_chk
  before insert or update of chief_id, resident_id, requester_id on public.blind_test_requests
  for each row execute function public.matc_role_chk();

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
