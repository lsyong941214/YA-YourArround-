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

-- ============================================================
-- blind_test_questions: 밸런스 게임 문항 뱅크 (카테고리별로 무작위 출제)
-- ============================================================
-- 신청자/대상 주민 모두가 보는 공용 콘텐츠라 유저별 데이터가 아니다. topic(카테고리)별로
-- 행을 더하기만 하면 다음 게임부터 자동으로 뽑기 후보에 포함된다(코드 변경 불필요).
-- image_a/image_b 는 주제별 일러스트가 준비되기 전까지 null 일 수 있고, 화면에서는 이미지이
-- 없으면 기본 카드 배경 위에 텍스트만 표시한다.
create table public.blind_test_questions (
  id            uuid primary key default gen_random_uuid(),
  seq_no        smallint not null unique,
  topic         text not null,
  prompt_a      text not null,
  prompt_b      text not null,
  image_a       text,
  image_b       text,
  created_at    timestamptz not null default now()
);
create index idx_blind_test_questions_topic on public.blind_test_questions (topic);

-- blind_test_game_questions: 게임(blind_test_id) 하나에 실제로 배정된 문항 10개 + 카드 순서.
-- 신청자/대상 주민이 서로 다른 문항을 보면 안 되므로, 카테고리별 2~3개(총 10개) 무작위 추첨
-- 결과를 이 테이블에 한 번 고정 저장하고 양쪽 모두 같은 배정 결과만 읽는다. 누가 먼저
-- 들어와 배정하든 상관없도록, 클라이언트가 뽑은 결과를 그냥 INSERT하고 - 이미 배정된 게임이면
-- (blind_test_id, card_idx) 기본키 충돌로 실패해서 자동으로 "먼저 쓴 쪽이 이긴다".
create table public.blind_test_game_questions (
  blind_test_id   uuid not null references public.blind_test_requests(id) on delete cascade,
  card_idx        smallint not null check (card_idx > 0),
  question_id     uuid not null references public.blind_test_questions(id) on delete restrict,
  dealt_at        timestamptz not null default now(),
  primary key (blind_test_id, card_idx),
  unique (blind_test_id, question_id)
);

-- blind_test_picks: 밸런스 게임 문항별 선택 (신청자/대상 각자, 문항당 최대 1번).
-- 카드 순서는 blind_test_game_questions 가 갖고 있어 여기서는 어떤 문항(question_id)에
-- 어떤 선택을 했는지만 기록한다. user_id 는 "내가 예전에 이 문항에 뭘 골랐었는지"를 다른
-- 게임까지 가로질러 바로 조회하기 위한 비정규화 컬럼이다(신청자/대상 주민 어느 쪽이든
-- 자기 자신의 전체 이력을 곧장 조회할 수 있어야 재출제 하이라이트가 가능하다).
create table public.blind_test_picks (
  blind_test_id     uuid not null references public.blind_test_requests(id) on delete cascade,
  side              text not null check (side in ('req', 'memb')), -- req=신청자, memb=대상 주민
  question_id       uuid not null references public.blind_test_questions(id) on delete restrict,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  pick              text not null check (pick in ('a', 'b')),
  picked_at         timestamptz not null default now(),
  primary key (blind_test_id, side, question_id)
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
alter table public.blind_test_questions enable row level security;
alter table public.blind_test_game_questions enable row level security;
alter table public.chief_reviews enable row level security;
alter table public.invite_codes enable row level security;

-- profiles: 로그인한 누구나 다른 프로필을 조회 가능(추천/탐색 화면에 필요), 본인만 등록/수정
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- village_contacts: 당사자(주민 또는 이장)만 조회.
-- INSERT 정책은 일부러 두지 않는다 -- 연결은 아래 use_invt_code() 함수(SECURITY DEFINER)로만
-- 만들어진다. 예전엔 주민이 직접 INSERT 할 수 있었는데(auth.uid() = resident_id), 그러면
-- 주민이 아무 이장에게나 동의 없이 자신을 붙일 수 있어 제거했다.
create policy "contacts_select_related" on public.village_contacts
  for select using (auth.uid() = resident_id or auth.uid() = chief_id);

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

-- blind_test_picks: 조회는 해당 주변인 테스트의 당사자(신청자/대상 주민)만 - 이 조건 하나로
-- "이번 게임에서 상대방 진행 상황 보기"와 "내 전체 이력 조회하기"(user_id 로 필터링)를 모두
-- 커버한다(내가 남긴 pick 은 항상 내가 당사자인 게임에만 존재하므로). 기록은 본인 것만,
-- side 가 실제로 신청자/대상 주민 중 자신의 역할과 일치할 때만 허용해 side 위조를 막는다.
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

-- blind_test_questions: 문항 뱅크는 공용 콘텐츠라 로그인한 누구나 조회, 편집은 클라이언트로 열지 않는다
create policy "blnd_qstn_select_authenticated" on public.blind_test_questions
  for select using (auth.role() = 'authenticated');

-- blind_test_game_questions: 해당 게임 당사자만 조회·배정. 배정은 한 번 정해지면 고정이라
-- update/delete 정책은 두지 않는다(문항 재배정이 필요하면 게임을 새로 만든다).
create policy "game_qstn_select_related" on public.blind_test_game_questions
  for select using (
    exists (
      select 1 from public.blind_test_requests b
      where b.id = blind_test_id
        and (auth.uid() = b.requester_id or auth.uid() = b.resident_id)
    )
  );
create policy "game_qstn_insert_related" on public.blind_test_game_questions
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

-- ============================================================
-- blind_test_questions: 밸런스 게임 문항 20개 시드 (2026-08-31)
-- ============================================================
-- 1번은 기존에 이미 제작된 일러스트(public/assets/blnd/q1_a.png, q1_b.png)를 그대로 쓴다.
-- 2~20번은 주제별 일러스트가 준비되는 대로 image_a/image_b 를 채워 넣을 예정 -- 그 전까지는
-- 화면에서 텍스트만으로 노출된다.
insert into public.blind_test_questions (seq_no, topic, prompt_a, prompt_b, image_a, image_b) values
  (1,  '데이트 스타일',    '매일 만나지만 1시간만 데이트',              '한 달에 한 번 만나서 2박 3일 데이트',            '/assets/blnd/q1_a.png', '/assets/blnd/q1_b.png'),
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
