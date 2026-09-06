-- 주변(Jubyeon) 스키마 변경분 — 2026-09-06 주변인 테스트 결과서 화면 추가
-- (양쪽 다 게임을 마치면 MBTI 궁합 + 선택지 일치도로 결과 점수를 내고,
--  점수 구간별로 "연락하기 / 이장님에게 확인요청 / 종료하기"를 고르게 한다)
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.

-- 1) blind_test_requests에 결과 화면에서의 행동(req_actn/memb_actn)과, 이장님 확인요청/
--    직접 연락으로 실제 매칭이 만들어졌을 때 연결할 match_requests id를 저장할 컬럼 추가
alter table public.blind_test_requests add column if not exists req_actn text
  check (req_actn in ('ctct', 'rvw', 'end'));
alter table public.blind_test_requests add column if not exists memb_actn text
  check (memb_actn in ('ctct', 'rvw', 'end'));
alter table public.blind_test_requests add column if not exists link_mtc_id uuid
  references public.match_requests(id) on delete set null;

-- 2) status에 "done"(결과에서 서로 연락하기로 했거나, 이장님 확인 없이 바로 매칭이 시작된 상태) 추가
alter table public.blind_test_requests drop constraint if exists blind_test_requests_status_check;
alter table public.blind_test_requests add constraint blind_test_requests_status_check
  check (status in ('pend', 'acpt', 'rjct', 'done'));

-- ============================================================
-- blnd_submit_actn: 주변인 테스트 결과 화면에서 "연락하기/이장님에게 확인요청/종료하기"를
-- 선택했을 때의 상태 전이를 한 트랜잭션에서 처리한다
-- ============================================================
-- SECURITY DEFINER로 실행해서, 상대방 쪽 컬럼(req_actn/memb_actn)을 직접 수정할 권한이나
-- match_requests INSERT 권한("본인이 requester_id인 경우만" 정책)을 열어주지 않고도
-- - 신청자(requester)든 대상 주민(resident)이든 자신의 행동을 기록하고
-- - 필요하면 이장님에게 갈 match_requests를 신청자 명의로 생성
-- 할 수 있게 한다. auth.uid()가 이 주변인 테스트의 당사자인지는 함수 안에서 직접 확인한다.
create or replace function public.blnd_submit_actn(p_blnd_id uuid, p_actn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_uid    uuid := auth.uid();
  b         public.blind_test_requests%rowtype;
  is_req    boolean;
  opp_actn  text;
  mtc_id    uuid;
begin
  if me_uid is null then
    return jsonb_build_object('stat', 'no_auth');
  end if;
  if p_actn not in ('ctct', 'rvw', 'end') then
    return jsonb_build_object('stat', 'bad_actn');
  end if;

  select * into b from public.blind_test_requests where id = p_blnd_id for update;
  if not found then
    return jsonb_build_object('stat', 'not_found');
  end if;
  if me_uid <> b.requester_id and me_uid <> b.resident_id then
    return jsonb_build_object('stat', 'forbidden');
  end if;
  if b.status not in ('acpt', 'done') then
    return jsonb_build_object('stat', 'bad_stat');
  end if;

  is_req := (me_uid = b.requester_id);
  if is_req then
    update public.blind_test_requests set req_actn = p_actn where id = p_blnd_id;
    opp_actn := b.memb_actn;
  else
    update public.blind_test_requests set memb_actn = p_actn where id = p_blnd_id;
    opp_actn := b.req_actn;
  end if;

  if p_actn = 'end' then
    if b.link_mtc_id is not null then
      update public.match_requests set status = 'r_rjct' where id = b.link_mtc_id;
    end if;
    update public.blind_test_requests set status = 'rjct' where id = p_blnd_id;
    return jsonb_build_object('stat', 'ok');
  end if;

  -- 이미 결과가 확정된(done) 뒤라면 더 이상의 상태 전이는 없다 (행동 기록만 남긴다)
  if b.status = 'done' then
    return jsonb_build_object('stat', 'ok');
  end if;

  if p_actn = 'rvw' then
    if b.link_mtc_id is null then
      insert into public.match_requests (requester_id, chief_id, resident_id, message)
      values (b.requester_id, b.chief_id, b.resident_id, '주변인 테스트 결과를 보고 확인을 요청했어요.')
      returning id into mtc_id;
      update public.blind_test_requests set link_mtc_id = mtc_id where id = p_blnd_id;
    elsif opp_actn = 'rvw' then
      -- 이장님이 이미 검토(수락/거절)한 뒤라면 그 결정을 덮어쓰지 않는다
      update public.match_requests set status = 'r_acpt' where id = b.link_mtc_id and status = 'pend';
      update public.blind_test_requests set status = 'done' where id = p_blnd_id;
    end if;
    return jsonb_build_object('stat', 'ok');
  end if;

  if p_actn = 'ctct' and opp_actn = 'ctct' then
    update public.blind_test_requests set status = 'done' where id = p_blnd_id;
  end if;

  return jsonb_build_object('stat', 'ok');
end;
$$;

revoke all on function public.blnd_submit_actn(uuid, text) from public;
grant execute on function public.blnd_submit_actn(uuid, text) to authenticated;

-- 3) PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
