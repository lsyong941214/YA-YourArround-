-- 주변(Jubyeon) Supabase 스키마
-- 지금까지 src/lib/store/*.ts 가 localStorage로 흉내내던 5개 엔티티(유저/연락처/매칭요청/
-- 주변인테스트/이장리뷰)를 실제 Postgres 테이블로 옮긴다. 마이그레이션 도구 없이(데모 규모)
-- 이 파일을 Supabase SQL Editor(또는 psql)에 그대로 실행하는 방식으로 관리한다 -- 스키마가
-- 바뀌면 이 파일에 변경분을 추가하고 다시 실행(또는 손으로 diff 적용)한다.
--
-- 설계 결정 (2026-08-05, 사용자 확인):
-- 1) 인증은 Supabase Auth로 전환. 자체 login_id/passwd 테이블은 두지 않는다 -- 로그인
--    화면에 이미 자리잡아둔 카카오/네이버/구글 소셜 로그인, 휴대폰 로그인이 실제로 이걸 쓰게 됨.
--    이에 따라 기존 AuthUser의 jang_id/memb_id(둘 다 "자기 자신의 user_id"를 가리키던 필드)는
--    제거 -- profiles.id(auth.users.id) 하나가 역할(user_role)과 무관하게 이장/주민 식별자를 겸한다.
-- 2) match_requests/blind_test_requests는 신청자·대상 주민 프로필을 스냅샷으로 복사하지 않고
--    FK(requester_id/chief_id/resident_id)로 profiles를 참조한다 -- 프로필이 바뀌면 과거 요청도
--    항상 최신 프로필을 보여준다 (기존 localStorage 버전과의 의도적인 차이점).

-- ============================================================
-- profiles: auth.users 1:1 확장 (역할/나이/직업/MBTI/지역/소개/사진첩 등)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  user_name     text not null,
  user_role     text not null check (user_role in ('res', 'chief')), -- res=주민, chief=이장
  user_age      int,
  user_job      text,
  user_mbti     text,
  user_reg      text,
  tag_list      text[] not null default '{}',
  user_bio      text not null default '',
  avatar_url    text,                          -- Supabase Storage 프로필 사진 URL
  photo_urls    text[] not null default '{}',  -- Supabase Storage 사진첩 앨범 URL (최대 6장, 앱에서 제한)
  ini_char      text not null,
  ton_hex       text not null,
  matc_done     int not null default 0,
  matc_max      int not null default 5,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is '주민/이장 공용 프로필. id는 auth.users(id)와 동일 -- 역할(user_role)이 이장/주민을 가른다.';

-- ============================================================
-- village_contacts: 주민이 이장을 연락처로 저장하는 다대다 관계
-- ============================================================
create table public.village_contacts (
  resident_id   uuid not null references public.profiles(id) on delete cascade,
  chief_id      uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (resident_id, chief_id)
);
create index idx_village_contacts_chief on public.village_contacts (chief_id);

-- ============================================================
-- match_requests: 연결 요청 (신청 -> 이장 검토 -> 대상 주민 수락/거절)
-- ============================================================
create table public.match_requests (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references public.profiles(id) on delete cascade,
  chief_id          uuid not null references public.profiles(id) on delete cascade,
  resident_id       uuid not null references public.profiles(id) on delete cascade,
  message           text not null default '',
  -- pend: 이장님 검토 대기 / c_acpt,c_rjct: 이장님 수락,거절 / r_acpt,r_rjct: 주민 수락,거절
  status            text not null default 'pend'
                      check (status in ('pend', 'c_acpt', 'c_rjct', 'r_acpt', 'r_rjct')),
  accept_comment    text,   -- 이장님 수락 의견
  reject_reason     text,   -- 거절 사유 코드/문구
  reject_message    text,   -- 거절 짧은 메시지
  seen              boolean not null default false,  -- 대상 주민이 제안을 확인했는지
  reviewed          boolean not null default false,  -- 연결 성사 후 이장님 리뷰를 남겼는지
  created_at        timestamptz not null default now()
);
create index idx_match_requests_chief on public.match_requests (chief_id, status);
create index idx_match_requests_resident on public.match_requests (resident_id, status);
create index idx_match_requests_requester on public.match_requests (requester_id);

-- ============================================================
-- blind_test_requests: 주변인 테스트(비공개 성향 테스트) 요청
-- ============================================================
create table public.blind_test_requests (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references public.profiles(id) on delete cascade,
  chief_id          uuid not null references public.profiles(id) on delete cascade,
  resident_id       uuid not null references public.profiles(id) on delete cascade,
  message           text not null default '',
  status            text not null default 'pend' check (status in ('pend', 'acpt', 'rjct')),
  seen              boolean not null default false,
  created_at        timestamptz not null default now()
);
create index idx_blind_test_requests_resident on public.blind_test_requests (resident_id, status);
create index idx_blind_test_requests_requester on public.blind_test_requests (requester_id);

-- blind_test_picks: 밸런스 게임 카드별 선택 (신청자/대상 각자 최대 5장, 카드 순서 보존)
create table public.blind_test_picks (
  blind_test_id     uuid not null references public.blind_test_requests(id) on delete cascade,
  side              text not null check (side in ('req', 'memb')), -- req=신청자, memb=대상 주민
  card_idx          smallint not null check (card_idx between 1 and 5),
  pick              text not null check (pick in ('a', 'b')),
  picked_at         timestamptz not null default now(),
  primary key (blind_test_id, side, card_idx)
);

-- ============================================================
-- chief_reviews: 연결 성사(r_acpt) 후 남기는 이장님 리뷰 -- 매칭 요청 1건당 리뷰 1건
-- ============================================================
create table public.chief_reviews (
  id                  uuid primary key default gen_random_uuid(),
  chief_id            uuid not null references public.profiles(id) on delete cascade,
  reviewer_id         uuid not null references public.profiles(id) on delete cascade,
  match_request_id    uuid not null unique references public.match_requests(id) on delete cascade,
  score               smallint not null check (score between 1 and 5),
  review_text         text not null default '',
  created_at          timestamptz not null default now()
);
create index idx_chief_reviews_chief on public.chief_reviews (chief_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.village_contacts enable row level security;
alter table public.match_requests enable row level security;
alter table public.blind_test_requests enable row level security;
alter table public.blind_test_picks enable row level security;
alter table public.chief_reviews enable row level security;

-- profiles: 로그인한 누구나 다른 프로필을 조회 가능(추천/탐색 화면에 필요), 본인만 등록/수정
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- village_contacts: 당사자(주민 또는 이장)만 조회, 주민만 새로 저장 가능
create policy "contacts_select_related" on public.village_contacts
  for select using (auth.uid() = resident_id or auth.uid() = chief_id);
create policy "contacts_insert_resident" on public.village_contacts
  for insert with check (auth.uid() = resident_id);

-- match_requests: 신청자/이장/대상 주민만 조회. 생성은 신청자만, 상태 변경은 이장·대상 주민만
create policy "match_select_related" on public.match_requests
  for select using (
    auth.uid() = requester_id or auth.uid() = chief_id or auth.uid() = resident_id
  );
create policy "match_insert_requester" on public.match_requests
  for insert with check (auth.uid() = requester_id);
create policy "match_update_related" on public.match_requests
  for update using (auth.uid() = chief_id or auth.uid() = resident_id);

-- blind_test_requests: match_requests와 동일한 패턴 (이장 검토 단계가 없어 update는 신청자/대상 주민만)
create policy "blind_select_related" on public.blind_test_requests
  for select using (
    auth.uid() = requester_id or auth.uid() = chief_id or auth.uid() = resident_id
  );
create policy "blind_insert_requester" on public.blind_test_requests
  for insert with check (auth.uid() = requester_id);
create policy "blind_update_related" on public.blind_test_requests
  for update using (auth.uid() = requester_id or auth.uid() = resident_id);

-- blind_test_picks: 해당 주변인 테스트의 당사자(신청자/대상 주민)만 조회·기록
create policy "picks_select_related" on public.blind_test_picks
  for select using (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );
create policy "picks_insert_related" on public.blind_test_picks
  for insert with check (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );

-- chief_reviews: 이장님 리뷰는 공개 정보라 누구나 조회 가능, 작성은 리뷰어 본인만
create policy "reviews_select_all" on public.chief_reviews
  for select using (true);
create policy "reviews_insert_own" on public.chief_reviews
  for insert with check (auth.uid() = reviewer_id);
