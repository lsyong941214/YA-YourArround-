-- 주변(Jubyeon) 스키마 변경분 — 2026-09-06 주변인 테스트 카드 선택 저장 실패 수정
--
-- 콘솔 에러: null value in column "question_id" of relation "blind_test_picks"
-- violates not-null constraint
--
-- 이 저장소의 schema.sql에는 blind_test_picks에 question_id 컬럼이 없다(카드 순서는
-- card_idx로만 구분하는 설계). 그런데 실제 배포된 Supabase 프로젝트의 테이블에는
-- (과거 다른 설계로 만들어졌던 흔적으로 보이는) question_id NOT NULL 컬럼이 남아있어서,
-- 앱이 { blind_test_id, side, card_idx, pick }만 넣고 question_id는 안 넣는 insert가
-- 매번 not-null 제약 위반으로 실패하고 있었다. question_id는 이 앱 어디에서도 쓰지
-- 않으므로, NOT NULL만 풀어서 더 이상 insert를 막지 않게 한다(컬럼 자체는 남겨둔다 -
-- 혹시 다른 데서 참조 중일 가능성을 생각해 안전하게 처리).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blind_test_picks'
      and column_name = 'question_id'
  ) then
    execute 'alter table public.blind_test_picks alter column question_id drop not null';
  end if;
end $$;

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
