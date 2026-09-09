-- 주변(Jubyeon) 스키마 변경분 — 2026-09-09 주변인 테스트 진행 상태 실시간 업데이트 연결
-- (수락/거절, 카드 선택, 결과 화면 행동을 폴링 대신 Supabase Realtime으로 받도록
--  blind_test_requests/blind_test_picks 두 테이블을 supabase_realtime publication에 추가한다)
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.
-- (Realtime은 각 테이블의 select RLS 정책을 그대로 따르므로, blind_select_related /
--  picks_select_related 정책이 이미 있다면 별도 정책 변경 없이 당사자에게만 이벤트가 간다)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blind_test_requests'
  ) then
    alter publication supabase_realtime add table public.blind_test_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blind_test_picks'
  ) then
    alter publication supabase_realtime add table public.blind_test_picks;
  end if;
end $$;
