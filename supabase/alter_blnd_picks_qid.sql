-- 주변(Jubyeon) 스키마 변경분 — 2026-09-06 주변인 테스트 카드 선택 저장 실패 수정
--
-- 콘솔 에러: null value in column "question_id" of relation "blind_test_picks"
-- violates not-null constraint
--
-- information_schema/pg_constraint로 실제 배포된 blind_test_picks 테이블을 확인해보니,
-- 이 저장소의 schema.sql에는 없는 다음 구조가 남아있었다 (문항을 blind_test_questions라는
-- 별도 테이블로 관리하는, 지금 앱 코드와는 다른 예전 설계의 흔적으로 보인다):
--   - question_id uuid not null references blind_test_questions(id)
--   - user_id     uuid not null references profiles(id)
--   - primary key (blind_test_id, side, question_id)  -- card_idx는 기본키가 아니었음
--
-- 이 앱은 문항을 코드에 정적으로 저장해두고(src/lib/data/blnd_questions.ts) 카드 순서를
-- card_idx(1~10)로만 구분하며, question_id / user_id / blind_test_questions 테이블은
-- 앱 어디에서도 참조하지 않는다(그래서 값을 채워서 넣어줄 수도 없다). 그래서 값을 채우는
-- 대신, 실제 코드가 기대하는 기본키 (blind_test_id, side, card_idx)에 맞게 테이블을 정리한다.
--
-- 주의: question_id NOT NULL 제약 때문에 이 앱에서의 pick insert는 지금까지 전부 실패했을
-- 가능성이 높아 실제로 사라질 데이터는 없어 보이지만, 혹시 다른 경로로 이미 쌓인 pick
-- 행이 있다면 그 문항 참조(question_id)/작성자(user_id) 정보만 사라지고 side/card_idx/pick
-- 값 자체는 그대로 남는다. blind_test_questions 테이블 자체는 지우지 않고 그대로 둔다.

-- 1) 기존 기본키 / 외래키 제거
alter table public.blind_test_picks drop constraint if exists blind_test_picks_pkey;
alter table public.blind_test_picks drop constraint if exists blind_test_picks_question_id_fkey;
alter table public.blind_test_picks drop constraint if exists blind_test_picks_user_id_fkey;

-- 2) 앱에서 채워줄 수 없는(쓰지 않는) 컬럼 제거
alter table public.blind_test_picks drop column if exists question_id;
alter table public.blind_test_picks drop column if exists user_id;

-- 3) 앱 코드가 기대하는 기본키로 재설정
alter table public.blind_test_picks add constraint blind_test_picks_pkey
  primary key (blind_test_id, side, card_idx);

-- 4) PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
