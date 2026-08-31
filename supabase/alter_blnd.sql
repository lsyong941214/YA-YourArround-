-- 주변(Jubyeon) 스키마 변경분 — 2026-08-31 "밸런스 게임 문항 뱅크" 도입
--
-- 이미 schema.sql 을 실행해둔 기존 Supabase 프로젝트에 적용하는 델타 스크립트다.
-- (새 프로젝트라면 이 파일 대신 갱신된 schema.sql 을 그대로 한 번 실행하면 된다.)
--
-- 배경: 지금까지 밸런스 게임 문항(1번 카드 텍스트/이미지, 2~5번 "추후 공개" placeholder)은
-- BlndGameScreen.tsx 에 하드코딩돼 있었다. 문항을 20개로 늘리고 이후에도 계속 늘릴 수 있게,
-- 문항을 blind_test_questions 테이블로 분리한다. 카드 이미지는 화면에서 별도로 보여주고
-- (선택지 텍스트는 카드 하단에 항상 노출), 주제별 이미지가 없는 문항은 텍스트만으로도
-- 정상 노출되도록 image_a/image_b 를 nullable 로 둔다.

-- ============================================================
-- blind_test_questions: 밸런스 게임 문항 뱅크
-- ============================================================
create table if not exists public.blind_test_questions (
  id            uuid primary key default gen_random_uuid(),
  seq_no        smallint not null unique,
  topic         text not null,
  prompt_a      text not null,
  prompt_b      text not null,
  image_a       text,
  image_b       text,
  created_at    timestamptz not null default now()
);

alter table public.blind_test_questions enable row level security;

drop policy if exists "blnd_qstn_select_authenticated" on public.blind_test_questions;
create policy "blnd_qstn_select_authenticated" on public.blind_test_questions
  for select using (auth.role() = 'authenticated');

insert into public.blind_test_questions (seq_no, topic, prompt_a, prompt_b, image_a, image_b) values
  (1,  '데이트 빈도',      '매일 만나지만 1시간만 데이트',              '한 달에 한 번 만나서 2박 3일 데이트',            '/assets/blnd/q1_a.png', '/assets/blnd/q1_b.png'),
  (2,  '데이트 스타일',    '계획 세워서 알차게 데이트',                 '그날 기분따라 즉흥적으로 데이트',                null, null),
  (3,  '데이트 스타일',    '집에서 뒹굴며 데이트',                      '밖에서 활동적으로 데이트',                       null, null),
  (4,  '데이트 스타일',    '웨이팅 필수인 맛집 탐방',                   '익숙하고 편한 단골집',                           null, null),
  (5,  '데이트 스타일',    '여행은 계획표대로 빡빡하게',                '발길 닿는 대로 여유롭게',                        null, null),
  (6,  '애정 표현·소통',   '말로 하는 애정표현 ("사랑해" 자주)',        '행동으로 하는 애정표현 (선물, 스킨십)',          null, null),
  (7,  '애정 표현·소통',   '하루 종일 실시간으로 연락',                 '각자 시간 보내다 저녁에 몰아서 연락',            null, null),
  (8,  '애정 표현·소통',   '스킨십은 자연스럽게 언제든',                '분위기 잡고 제대로',                             null, null),
  (9,  '애정 표현·소통',   '애정표현 다른 사람 앞에서도 티 내는 편',    '둘이 있을 때만',                                 null, null),
  (10, '애정 표현·소통',   '싸우면 바로 그 자리에서 풀기',              '시간 갖고 각자 생각 정리 후 풀기',               null, null),
  (11, '연애 가치관',      '연애할 때 상대가 리드해주는 게 좋음',       '내가 리드하는 게 좋음',                          null, null),
  (12, '연애 가치관',      '이성 볼 때 첫인상(외모·분위기)',            '대화하면서 드러나는 성격·가치관',                null, null),
  (13, '연애 가치관',      '서로 다른 점이 많아 자극되는 연애',         '취향이 비슷해 편안한 연애',                      null, null),
  (14, '연애 가치관',      '연인끼리는 어느 정도 안 싸우는 게 좋다',    '싸우더라도 할 말은 해야 건강한 관계',            null, null),
  (15, '연애 가치관',      '연애 초반엔 조금 튕기는 밀당',              '마음 있으면 바로 직진',                          null, null),
  (16, '라이프스타일·취향', '아침형 데이트 (브런치, 산책)',              '저녁형 데이트 (야경, 술 한잔)',                  null, null),
  (17, '라이프스타일·취향', '커플룩·시그니처 아이템 챙기는 편',          '각자 스타일 그대로',                             null, null),
  (18, '라이프스타일·취향', '기념일은 거창하게 이벤트 준비',             '소소하지만 매년 꾸준히',                         null, null),
  (19, '라이프스타일·취향', '여행 갈 때 사진 많이 남기는 편',            '그 순간을 눈으로 즐기는 편',                     null, null),
  (20, '라이프스타일·취향', '연애 얘기 친구들에게 시시콜콜 공유',        '둘만 아는 걸로 간직',                            null, null)
on conflict (seq_no) do nothing;

-- ============================================================
-- blind_test_picks: card_idx 상한(5) 제거 -- 문항 수가 blind_test_questions 에 달려 있어
-- 더 이상 코드/스키마에 카드 수를 고정하지 않는다
-- ============================================================
alter table public.blind_test_picks drop constraint if exists blind_test_picks_card_idx_check;
alter table public.blind_test_picks add constraint blind_test_picks_card_idx_check check (card_idx > 0);
