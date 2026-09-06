-- 주변(Jubyeon) 스키마 변경분 — 2026-09-06 주변인 테스트 문항을 10개(카테고리별
-- 3/3/4개 랜덤 선정)로 확장. 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.
--
-- 1) blind_test_requests에 이번 테스트에 쓸 문항 id 10개를 저장할 컬럼 추가
--    (신청 시점에 앱이 카테고리별로 랜덤 선정해서 넣어준다 -> 양쪽 참여자가 항상
--    같은 문항/순서로 진행)
alter table public.blind_test_requests add column if not exists card_ids text[] not null default '{}';

-- 2) blind_test_picks.card_idx 상한을 5 -> 10으로 확장 (문항 수가 5개에서 10개로 늘어남)
alter table public.blind_test_picks drop constraint if exists blind_test_picks_card_idx_check;
alter table public.blind_test_picks add constraint blind_test_picks_card_idx_check check (card_idx between 1 and 10);

-- 3) PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
