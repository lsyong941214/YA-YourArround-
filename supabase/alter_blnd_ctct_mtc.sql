-- 주변(Jubyeon) 스키마 변경분 — 2026-09-14 주변인 테스트 "연락하기" 결과에도 채팅 연결
--
-- 배경: 결과서 화면(BlndRsltScreen)에서 둘 다 "이장님에게 확인요청"(rvw)을 고르면
-- match_requests를 r_acpt 상태로 바로 만들어 매칭 화면/채팅으로 이어지는데, 둘 다
-- "연락하기"(ctct)를 고른 경우는 blind_test_requests.status만 done으로 바뀔 뿐
-- match_requests가 전혀 만들어지지 않아 채팅으로 연결할 대상이 없었다. 결과서 화면의
-- "두 분 다 연락하기를 선택했어요!" 패널에 채팅으로 바로 이어지는 "연락하기" 버튼을
-- 추가하면서, ctct 쪽도 rvw와 동일하게 match_requests를 r_acpt로 직접 생성하도록
-- blnd_submit_actn()을 수정한다.
--
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다 (함수 재정의라 몇 번을
-- 실행해도 안전하다). 이 마이그레이션 적용 전에 이미 done 상태가 된(둘 다 ctct를 고른)
-- 기존 행에는 소급 적용되지 않는다 - link_mtc_id가 없는 채로 남아, 결과서 화면의
-- "연락하기" 버튼이 노출되지 않는다.

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

  -- 둘 다 "연락하기"를 고르면 이장님 확인요청(rvw)과 마찬가지로 바로 연결된 것으로 보고
  -- match_requests를 r_acpt 상태로 직접 만든다 - 결과서 화면의 "연락하기" 버튼이 채팅
  -- (/chat/[req_id])으로 이어지려면 그 대상이 될 match_requests 행이 있어야 하기 때문
  if p_actn = 'ctct' and opp_actn = 'ctct' then
    if b.link_mtc_id is null then
      insert into public.match_requests (requester_id, chief_id, resident_id, message, status)
      values (b.requester_id, b.chief_id, b.resident_id, '주변인 테스트에서 서로 연락하기를 선택했어요.', 'r_acpt')
      returning id into mtc_id;
      update public.blind_test_requests set link_mtc_id = mtc_id, status = 'done' where id = p_blnd_id;
    else
      update public.blind_test_requests set status = 'done' where id = p_blnd_id;
    end if;
  end if;

  return jsonb_build_object('stat', 'ok');
end;
$$;

revoke all on function public.blnd_submit_actn(uuid, text) from public;
grant execute on function public.blnd_submit_actn(uuid, text) to authenticated;

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
