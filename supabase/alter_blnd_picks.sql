-- 주변(Jubyeon) 스키마 변경분 — 2026-09-03 "주변인 테스트" 신청 시 발생한
-- "column blind_test_picks_1.card_idx does not exist" 오류 수정
--
-- schema.sql에는 처음부터 blind_test_picks.card_idx가 정의돼 있었지만, 실제
-- 배포된 Supabase 프로젝트의 blind_test_picks 테이블에는 이 컬럼이 없는 상태였다
-- (테이블이 아예 없거나, schema.sql이 완전히 적용되지 못했던 것으로 보인다).
-- add_req()가 insert 직후 blind_test_picks를 함께 select(JOIN)하는데, 이때 없는
-- 컬럼을 요청해서 select가 실패하고 — insert+select가 한 트랜잭션이라 — insert 자체가
-- 롤백되어 요청이 아예 생성되지 않았다. 이 스크립트는 테이블이 없는 경우와
-- 테이블은 있는데 card_idx만 없는 경우를 모두 안전하게(재실행해도 안전) 처리한다.

-- 1) 테이블 자체가 없는 경우를 대비해 정의 그대로 생성
create table if not exists public.blind_test_picks (
  blind_test_id     uuid not null references public.blind_test_requests(id) on delete cascade,
  side              text not null check (side in ('req', 'memb')),
  card_idx          smallint not null check (card_idx between 1 and 5),
  pick              text not null check (pick in ('a', 'b')),
  picked_at         timestamptz not null default now(),
  primary key (blind_test_id, side, card_idx)
);

-- 2) 테이블은 있는데 card_idx 컬럼만 빠져 있는 경우를 대비
--    (테이블이 방금 1)에서 새로 만들어졌다면 card_idx가 이미 있으니 전부 no-op)
alter table public.blind_test_picks add column if not exists card_idx smallint;
alter table public.blind_test_picks drop constraint if exists blind_test_picks_card_idx_check;
alter table public.blind_test_picks add constraint blind_test_picks_card_idx_check check (card_idx between 1 and 5);
-- ⚠️ 이미 card_idx 없이 쌓인 행이 있다면(있을 가능성은 낮지만) 아래 줄이 실패한다.
-- 그럴 땐 먼저 `delete from public.blind_test_picks where card_idx is null;` 로
-- 값 없는 행을 지운 뒤 다시 실행할 것 (밸런스 게임 픽 데이터만 사라지고 요청 자체는 그대로 남는다).
alter table public.blind_test_picks alter column card_idx set not null;

-- 3) RLS + 정책 (없을 수도 있으니 다시 보장)
alter table public.blind_test_picks enable row level security;

drop policy if exists "picks_select_related" on public.blind_test_picks;
create policy "picks_select_related" on public.blind_test_picks
  for select using (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );

drop policy if exists "picks_insert_related" on public.blind_test_picks;
create policy "picks_insert_related" on public.blind_test_picks
  for insert with check (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );

-- 4) PostgREST가 스키마 캐시를 즉시 반영하지 않을 때가 있다 — 위 변경 후에도
--    같은 에러가 계속되면 SQL Editor에서 이 한 줄만 추가로 실행할 것
notify pgrst, 'reload schema';
