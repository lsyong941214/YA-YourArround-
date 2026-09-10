-- 주변(Jubyeon) 스키마 변경분 — 2026-09-10 이장님 리뷰 작성 권한 강화
-- (chief_reviews.reviews_insert_own 정책이 auth.uid() = reviewer_id 만 확인하고, 그 사람이
--  실제 해당 match_request_id의 당사자(신청자/대상 주민)인지, chief_id가 그 매칭의 이장과
--  일치하는지는 전혀 검증하지 않았다. 그 결과 매칭과 완전히 무관한 사람도 다른 사람의
--  match_request_id(UUID)만 알면 임의의 이장에게 가짜 리뷰(별점+텍스트)를 남길 수 있었다 --
--  로컬 테스트 환경에서 실제로 재현 확인함)
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.

drop policy if exists "reviews_insert_own" on public.chief_reviews;
create policy "reviews_insert_own" on public.chief_reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.match_requests m
      where m.id = match_request_id
        and m.chief_id = chief_id
        and (auth.uid() = m.requester_id or auth.uid() = m.resident_id)
    )
  );

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
