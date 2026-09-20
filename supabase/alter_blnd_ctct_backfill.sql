-- 주변(Jubyeon) 스키마 변경분 — 2026-09-20 "연락하기" 결과서 버튼 소급 복구
--
-- 배경: alter_blnd_ctct_mtc.sql의 blnd_submit_actn() 재정의는 그 시점 이후에 새로 벌어지는
-- 행동(action)에만 적용된다. 이미 그 마이그레이션을 적용하기 전에 둘 다 "연락하기"(ctct)를
-- 골라 blind_test_requests.status가 'done'이 된 기존 행은 link_mtc_id가 비어있는 채로
-- 영원히 남는다 - 그 행은 이후 액션이 다시 호출되지 않으므로(결과서 화면은 status가 이미
-- 'done'이면 바로 DonePanel을 보여줄 뿐 submit_actn을 다시 부르지 않는다) 저절로 복구되지
-- 않는다. 이 파일은 그렇게 이미 멈춰 있는 행을 한 번 찾아 match_requests를 만들어 연결한다.
-- 몇 번을 실행해도 안전하다(이미 link_mtc_id가 있는 행은 조건에 안 걸려 건드리지 않는다).

do $$
declare
  b record;
  mtc_id uuid;
  fixed_cnt int := 0;
begin
  for b in
    select id, requester_id, chief_id, resident_id
    from public.blind_test_requests
    where status = 'done'
      and req_actn = 'ctct'
      and memb_actn = 'ctct'
      and link_mtc_id is null
  loop
    insert into public.match_requests (requester_id, chief_id, resident_id, message, status)
    values (b.requester_id, b.chief_id, b.resident_id, '주변인 테스트에서 서로 연락하기를 선택했어요.', 'r_acpt')
    returning id into mtc_id;

    update public.blind_test_requests set link_mtc_id = mtc_id where id = b.id;
    fixed_cnt := fixed_cnt + 1;
  end loop;

  raise notice '복구된 주변인 테스트 결과서 건수: %', fixed_cnt;
end
$$;
