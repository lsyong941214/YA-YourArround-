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
  birth_dt      date,                          -- 생년월일. 나이(user_age)는 이 값에서 앱이 파생 계산한다
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
-- invite_codes: 이장이 발급하는 1회용 초대코드 (2026-08-24)
-- ============================================================
-- 발급 방향은 "이장이 발급 -> 주민이 입력". 코드 자체가 "이장이 인정한 사람"이라는
-- 인증 수단이라, 코드 사용 후 별도 승인 단계는 두지 않는다. 1회용이고 만료는 없다.
create table public.invite_codes (
  code        text primary key,
  chief_id    uuid not null references public.profiles(id) on delete cascade,
  used_by     uuid references public.profiles(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_invite_codes_chief on public.invite_codes (chief_id);

comment on table public.invite_codes is '이장이 발급하는 1회용 초대코드. used_by/used_at 이 null 이면 미사용.';
comment on column public.invite_codes.code is '사람이 눈으로 읽고 옮겨 적는 코드. 혼동 문자(0/O/1/I/L) 제외 8자리.';

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.village_contacts enable row level security;
alter table public.match_requests enable row level security;
alter table public.blind_test_requests enable row level security;
alter table public.blind_test_picks enable row level security;
alter table public.chief_reviews enable row level security;
alter table public.invite_codes enable row level security;

-- profiles: 로그인한 누구나 다른 프로필을 조회 가능(추천/탐색 화면에 필요), 본인만 등록/수정
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- village_contacts: 당사자(주민 또는 이장) + "같은 이장의 다른 주민"까지 조회 가능.
-- INSERT 정책은 일부러 두지 않는다 -- 연결은 아래 use_invt_code() 함수(SECURITY DEFINER)로만
-- 만들어진다. 예전엔 주민이 직접 INSERT 할 수 있었는데(auth.uid() = resident_id), 그러면
-- 주민이 아무 이장에게나 동의 없이 자신을 붙일 수 있어 제거했다.
--
-- [2026-08-30] 당사자만 보이게 했더니, 주민이 "연락처 정보"에서 자기 이장님을 눌러 봐도
-- 그 이장님과 연결된 "다른" 주민들(연결 요청을 보낼 대상)이 전혀 보이지 않는 버그가 있었다
-- (village_contacts 각 행은 딱 그 행의 당사자 둘에게만 보이므로, 같은 이장 밑의 다른
-- 주민 행은 제3자 취급되어 걸러졌다). is_res_of_chief() 로 "나도 이 이장의 주민이다"를
-- 확인해 허용한다 - 같은 정책 안에서 village_contacts 를 직접 재참조하면 infinite
-- recursion 에러가 나서 SECURITY DEFINER 함수로 분리했다.
create or replace function public.is_res_of_chief(chief_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.village_contacts
    where chief_id = chief_uuid and resident_id = auth.uid()
  );
$$;

create policy "contacts_select_related" on public.village_contacts
  for select using (
    auth.uid() = resident_id
    or auth.uid() = chief_id
    or public.is_res_of_chief(chief_id)
  );

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

-- invite_codes: 발급/조회는 이장 본인만. 주민은 코드를 조회하지 못한다(코드 열거 방지) --
-- 주민의 코드 사용은 아래 use_invt_code() 함수가 대신 처리한다.
create policy "invt_insert_chief" on public.invite_codes
  for insert with check (
    auth.uid() = chief_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_role = 'chief'
    )
  );
create policy "invt_select_own" on public.invite_codes
  for select using (auth.uid() = chief_id);
create policy "invt_delete_own_unused" on public.invite_codes
  for delete using (auth.uid() = chief_id and used_by is null);

-- ============================================================
-- use_invt_code: 주민이 초대코드를 입력해 이장과 연결한다
-- ============================================================
-- SECURITY DEFINER 로 실행해서, 주민에게 invite_codes 조회 권한이나 village_contacts
-- INSERT 권한을 열어주지 않고도 연결을 만들 수 있게 한다.
-- 코드 확인 -> 연결 생성 -> 코드 소진을 한 트랜잭션에서 처리한다.
create or replace function public.use_invt_code(code_inp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_uid    uuid := auth.uid();
  me_role   text;
  invt_row  public.invite_codes%rowtype;
begin
  if me_uid is null then
    return jsonb_build_object('stat', 'no_auth');
  end if;

  select user_role into me_role from public.profiles where id = me_uid;
  if me_role is null then
    return jsonb_build_object('stat', 'no_prof');
  end if;
  if me_role <> 'res' then
    return jsonb_build_object('stat', 'not_res');
  end if;

  -- 같은 코드로 두 명이 동시에 들어오는 경우를 막기 위해 행을 잠근다
  select * into invt_row
  from public.invite_codes
  where code = upper(btrim(code_inp))
  for update;

  if not found then
    return jsonb_build_object('stat', 'bad_code');
  end if;
  if invt_row.chief_id = me_uid then
    return jsonb_build_object('stat', 'self');
  end if;
  if invt_row.used_by is not null then
    return jsonb_build_object('stat', 'used');
  end if;

  if exists (
    select 1 from public.village_contacts
    where resident_id = me_uid and chief_id = invt_row.chief_id
  ) then
    return jsonb_build_object('stat', 'already', 'chief_id', invt_row.chief_id);
  end if;

  insert into public.village_contacts (resident_id, chief_id)
  values (me_uid, invt_row.chief_id);

  update public.invite_codes
  set used_by = me_uid, used_at = now()
  where code = invt_row.code;

  return jsonb_build_object('stat', 'ok', 'chief_id', invt_row.chief_id);
end;
$$;

revoke all on function public.use_invt_code(text) from public;
grant execute on function public.use_invt_code(text) to authenticated;

-- ============================================================
-- Storage: 프로필 사진 / 사진첩 앨범 버킷 (2026-08-24, 온보딩 도입과 함께 추가)
-- ============================================================
-- 파일 경로 규칙: `{auth.uid()}/avat_{timestamp}.{ext}` (프로필 사진)
--                `{auth.uid()}/albm_{timestamp}.{ext}` (사진첩 앨범)
-- 첫 폴더명을 uid로 강제해서, 정책만으로 "남의 사진은 못 올리고 못 지운다"가 성립하게 한다.
insert into storage.buckets (id, name, public)
values ('prof-img', 'prof-img', true)
on conflict (id) do nothing;

-- 조회: 프로필은 다른 유저에게도 보여야 하므로 공개 버킷(누구나 URL로 조회)
create policy "prof_img_select_all" on storage.objects
  for select using (bucket_id = 'prof-img');

-- 업로드/수정/삭제: 본인 uid 폴더 안에서만 가능
create policy "prof_img_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'prof-img' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "prof_img_update_own" on storage.objects
  for update using (
    bucket_id = 'prof-img' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "prof_img_delete_own" on storage.objects
  for delete using (
    bucket_id = 'prof-img' and (storage.foldername(name))[1] = auth.uid()::text
  );
