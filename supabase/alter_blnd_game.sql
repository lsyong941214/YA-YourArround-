-- 주변(Jubyeon) 스키마 변경분 — 2026-08-31 "밸런스 게임 카테고리별 랜덤 출제 + 재출제 하이라이트"
--
-- 이미 schema.sql(+ alter_blnd.sql)을 실행해둔 기존 Supabase 프로젝트에 적용하는 델타
-- 스크립트다. (새 프로젝트라면 이 파일 대신 갱신된 schema.sql 을 그대로 한 번 실행하면 된다.)
--
-- 설계 결정 (사용자 확인):
-- 1) 한 게임에 카테고리(topic)별 2~3개씩, 총 10문항만 무작위로 뽑아 출제한다. 문항을 더
--    추가하면(같은 topic 에 행을 더하면) 다음 뽑기부터 자동으로 후보에 포함된다 - 카드 수를
--    코드에 고정하지 않는다.
-- 2) 신청자/대상 주민 두 사람이 같은 게임에서 서로 다른 문항을 보면 안 되므로, 뽑힌 10개를
--    blind_test_game_questions 에 "배정 결과"로 고정 저장하고 양쪽 모두 그 결과만 읽는다.
--    누가 먼저 들어와 배정하든 상관없게, 클라이언트가 무작위로 뽑아 그냥 INSERT하고 - 이미
--    배정된 게임이면 그 INSERT 는 (blind_test_id, card_idx) 기본키 충돌로 실패해서 자동으로
--    "먼저 쓴 쪽이 이긴다"(별도 잠금/RPC 없이도 두 클라이언트가 항상 같은 배정 결과에 수렴).
-- 3) "본인이 이미 답한 문항이 다른 게임에서 다시 나오면 카드에 하이라이트" 기능을 위해,
--    blind_test_picks 에 question_id/user_id 를 추가한다 - 카드 순서(card_idx)는 이제
--    blind_test_game_questions 가 갖고 있으므로 picks 에서는 제거한다. 기존 picks 는 어느
--    문항에 대한 선택인지 알 수 없어(문항이 카드 순서로만 하드코딩돼 있었다) 복구가 불가능해,
--    alter_onbd.sql 때와 마찬가지로 기존 값은 보존하지 않고 테이블을 다시 만든다.

-- ============================================================
-- blind_test_questions: 1번 문항 topic 을 카테고리 체계에 맞게 정리
-- ============================================================
update public.blind_test_questions
set topic = '데이트 스타일'
where seq_no = 1 and topic = '데이트 빈도';

create index if not exists idx_blind_test_questions_topic on public.blind_test_questions (topic);

-- ============================================================
-- blind_test_game_questions: 게임 하나에 배정된 문항 10개 + 카드 순서
-- ============================================================
create table if not exists public.blind_test_game_questions (
  blind_test_id   uuid not null references public.blind_test_requests(id) on delete cascade,
  card_idx        smallint not null check (card_idx > 0),
  question_id     uuid not null references public.blind_test_questions(id) on delete restrict,
  dealt_at        timestamptz not null default now(),
  primary key (blind_test_id, card_idx),
  unique (blind_test_id, question_id)
);

alter table public.blind_test_game_questions enable row level security;

drop policy if exists "game_qstn_select_related" on public.blind_test_game_questions;
create policy "game_qstn_select_related" on public.blind_test_game_questions
  for select using (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );

drop policy if exists "game_qstn_insert_related" on public.blind_test_game_questions;
create policy "game_qstn_insert_related" on public.blind_test_game_questions
  for insert with check (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );

-- ============================================================
-- blind_test_picks: card_idx -> question_id/user_id 로 교체 (재생성, 기존 데이터 보존 안 됨)
-- ============================================================
drop table if exists public.blind_test_picks;

create table public.blind_test_picks (
  blind_test_id     uuid not null references public.blind_test_requests(id) on delete cascade,
  side              text not null check (side in ('req', 'memb')),
  question_id       uuid not null references public.blind_test_questions(id) on delete restrict,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  pick              text not null check (pick in ('a', 'b')),
  picked_at         timestamptz not null default now(),
  primary key (blind_test_id, side, question_id)
);

alter table public.blind_test_picks enable row level security;

create policy "picks_select_related" on public.blind_test_picks
  for select using (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );
create policy "picks_insert_own" on public.blind_test_picks
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (
          (side = 'req' and b.requester_id = auth.uid())
          or (side = 'memb' and b.resident_id = auth.uid())
        )
    )
  );
