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
  -- 민감정보 최소 수집(체크리스트 8번) - 동/번지 등 상세 주소가 들어오지 못하도록 시/구
  -- 단위 길이로 제한한다 (클라이언트 입력 가이드는 OnbdScreen/ProfEditModal의 REG_MAX)
  user_reg      text check (char_length(user_reg) <= 12),
  tag_list      text[] not null default '{}',
  user_bio      text not null default '',
  avatar_url    text,                          -- Supabase Storage 프로필 사진 URL
  photo_urls    text[] not null default '{}',  -- Supabase Storage 사진첩 앨범 URL (최대 6장, 앱에서 제한)
  ini_char      text not null,
  ton_hex       text not null,
  matc_done     int not null default 0,
  matc_max      int not null default 5,
  -- actv=정상 / susp=정지(신고 누적 등으로 자동/수동 정지, 본인은 계속 로그인 시도 가능하나
  -- 로그인 직후 안내 화면(/suspended)으로 보내진다) / ban=영구 차단(관리자가 susp를 보고 확정)
  acct_stat     text not null default 'actv' check (acct_stat in ('actv', 'susp', 'ban')),
  -- 신고 처리 화면(/admin)에 들어갈 수 있는 운영자. 앱 안에는 이 값을 켜는 UI가 없다 -
  -- 첫 관리자는 Supabase SQL Editor에서 직접 `update profiles set is_admin = true where id = ...`
  is_admin      boolean not null default false,
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
  created_at        timestamptz not null default now(),
  -- 신청자가 자기 자신을 대상 주민으로 지정하는 자기매칭 차단 (홈 화면 "내 역할" 토글로
  -- 같은 계정이 주민/이장 역할을 오갈 수 있어, 막아두지 않으면 자기 자신에게 연결 요청을
  -- 보낼 수 있었다)
  constraint match_requests_no_self_chk check (requester_id <> resident_id)
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
  -- pend=응답 대기, acpt=수락(게임~결과 대기), rjct=거절/결과에서 종료, done=결과에서 매칭 확정
  status            text not null default 'pend' check (status in ('pend', 'acpt', 'rjct', 'done')),
  seen              boolean not null default false,
  card_ids          text[] not null default '{}', -- 이번 테스트에 쓸 문항 id 10개 (신청 시 카테고리별 랜덤 선정, 순서 고정)
  req_actn          text check (req_actn in ('ctct', 'rvw', 'end')),   -- 결과 화면에서 신청자가 고른 행동
  memb_actn         text check (memb_actn in ('ctct', 'rvw', 'end')),  -- 결과 화면에서 대상 주민이 고른 행동
  link_mtc_id       uuid references public.match_requests(id) on delete set null, -- 확인요청/연락하기로 만들어진 매칭 요청
  created_at        timestamptz not null default now(),
  -- match_requests와 동일한 이유로 자기매칭 차단
  constraint blind_test_requests_no_self_chk check (requester_id <> resident_id)
);
create index idx_blind_test_requests_resident on public.blind_test_requests (resident_id, status);
create index idx_blind_test_requests_requester on public.blind_test_requests (requester_id);

-- blind_test_picks: 밸런스 게임 카드별 선택 (신청자/대상 각자 최대 10장, 카드 순서 보존)
create table public.blind_test_picks (
  blind_test_id     uuid not null references public.blind_test_requests(id) on delete cascade,
  side              text not null check (side in ('req', 'memb')), -- req=신청자, memb=대상 주민
  card_idx          smallint not null check (card_idx between 1 and 10),
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
-- chat_messages: 연결 성사(r_acpt)된 두 사람의 채팅 메시지 (2026-09-11)
-- ============================================================
-- 이장은 매칭을 중개할 뿐 채팅 당사자가 아니므로 대화 내용을 볼 수 없다 -- RLS는
-- match_requests.status = 'r_acpt' 이고 auth.uid()가 requester_id/resident_id 중
-- 하나일 때만 조회/작성을 허용한다 (아래 두 정책이 매 요청마다 이 조건을 직접 검사).
create table public.chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  match_request_id    uuid not null references public.match_requests(id) on delete cascade,
  sender_id           uuid not null references public.profiles(id) on delete cascade,
  body                text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at          timestamptz not null default now()
);
create index idx_chat_messages_match on public.chat_messages (match_request_id, created_at);

-- ============================================================
-- reports / user_blocks: 사용자 신고·차단 (2026-09-18, 서비스 출시 체크리스트 대응)
-- ============================================================
-- 원클릭 신고: 신고자는 자신이 접수한 신고만 조회 가능(신고당한 사람은 누가 신고했는지 알 수
-- 없다). 24시간 이내 대응 등 운영 처리는 이 앱 범위 밖이라 관리자 화면은 아직 없고,
-- Supabase 서비스 롤(RLS 우회)로 직접 조회/처리하는 것을 전제로 한다.
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  target_id     uuid not null references public.profiles(id) on delete cascade,
  reason        text not null check (reason in ('fake_prof', 'illegal_ad', 'abuse', 'spam', 'etc')),
  detail        text not null default '',
  status        text not null default 'open' check (status in ('open', 'in_prog', 'done')),
  created_at    timestamptz not null default now(),
  constraint reports_no_self_chk check (reporter_id <> target_id)
);
create index idx_reports_target on public.reports (target_id);
create index idx_reports_status on public.reports (status, created_at);

comment on table public.reports is '사용자 신고. status는 관리자가 서비스 롤로 직접 갱신(24시간 대응 SLA는 운영 절차, 앱 밖).';

-- 차단: 차단한 쪽(blocker)만 자신의 차단 목록을 보고 관리할 수 있다. 한쪽만 차단해도
-- 상대가 눈치채지 못하도록, 차단당한 쪽(blocked_id)은 이 테이블을 아예 조회할 수 없다.
create table public.user_blocks (
  blocker_id    uuid not null references public.profiles(id) on delete cascade,
  blocked_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_chk check (blocker_id <> blocked_id)
);
create index idx_user_blocks_blocked on public.user_blocks (blocked_id);

comment on table public.user_blocks is '차단 목록(blocker_id -> blocked_id). 연락처/추천 목록 조회 시 클라이언트가 이 목록으로 걸러낸다.';

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
alter table public.chat_messages enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;

-- profiles: 로그인한 누구나 다른 프로필을 조회 가능(추천/탐색 화면에 필요), 본인만 등록/수정
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
-- 관리자(is_admin)는 신고 처리 결과로 다른 유저의 acct_stat(정지/영구차단/복구)을 바꿀 수 있다.
-- 같은 명령(update)에 대한 permissive 정책은 OR로 합쳐지므로, 본인 수정 정책은 그대로 유지된다.
-- 컬럼 단위 제한은 아니라 이론상 이 정책으로 다른 유저의 프로필 전체(또는 is_admin)까지
-- 바꿀 수 있다 -- /admin 화면은 acct_stat만 바꾸도록 만들지만, 신뢰 경계는 "관리자는 신뢰된
-- 운영자"라는 전제다. 최초 관리자 지정 자체는 이 정책이 존재하기 전이라 SQL로만 가능하다.
create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

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
-- (reviewer_id = 본인 확인만으로는 부족하다 -- match_request_id/chief_id를 검증하지 않으면
-- 그 매칭과 무관한 사람도 id만 알면 임의의 이장에게 가짜 리뷰를 남길 수 있다. 그래서
-- 이 리뷰가 가리키는 match_requests 행의 실제 당사자(requester/resident)인지, chief_id가
-- 그 매칭의 이장과 일치하는지까지 함께 확인한다)
create policy "reviews_select_all" on public.chief_reviews
  for select using (true);
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

-- chat_messages: 연결 성사(r_acpt)된 매칭의 신청자/대상 주민만 조회·작성 (이장 제외)
create policy "chat_select_related" on public.chat_messages
  for select using (
    exists (
      select 1 from public.match_requests m
      where m.id = match_request_id
        and m.status = 'r_acpt'
        and (auth.uid() = m.requester_id or auth.uid() = m.resident_id)
    )
  );
create policy "chat_insert_related" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.match_requests m
      where m.id = match_request_id
        and m.status = 'r_acpt'
        and (auth.uid() = m.requester_id or auth.uid() = m.resident_id)
    )
  );

-- reports: 신고는 본인 명의로만 접수, 조회도 본인이 접수한 신고만 (target_id는 조회 불가).
-- 관리자(is_admin)는 신고 처리(/admin)를 위해 전체 신고를 조회·상태 변경할 수 있다.
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);
create policy "reports_select_admin" on public.reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "reports_update_admin" on public.reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- user_blocks: 차단한 본인만 자신의 차단 목록을 만들고, 보고, 해제할 수 있다
create policy "blocks_insert_own" on public.user_blocks
  for insert with check (auth.uid() = blocker_id);
create policy "blocks_select_own" on public.user_blocks
  for select using (auth.uid() = blocker_id);
create policy "blocks_delete_own" on public.user_blocks
  for delete using (auth.uid() = blocker_id);

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
-- blnd_submit_actn: 주변인 테스트 결과 화면에서 "연락하기/이장님에게 확인요청/종료하기"를
-- 선택했을 때의 상태 전이를 한 트랜잭션에서 처리한다
-- ============================================================
-- SECURITY DEFINER로 실행해서, 상대방 쪽 컬럼(req_actn/memb_actn)을 직접 수정할 권한이나
-- match_requests INSERT 권한("본인이 requester_id인 경우만" 정책)을 열어주지 않고도
-- - 신청자(requester)든 대상 주민(resident)이든 자신의 행동을 기록하고
-- - 필요하면 이장님에게 갈 match_requests를 신청자 명의로 생성
-- 할 수 있게 한다. auth.uid()가 이 주변인 테스트의 당사자인지는 함수 안에서 직접 확인한다.
create or replace function public.blnd_submit_actn(p_blnd_id uuid, p_actn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_uid    uuid := auth.uid();
  b         public.blind_test_requests%rowtype;
  is_req    boolean;
  opp_actn  text;
  mtc_id    uuid;
begin
  if me_uid is null then
    return jsonb_build_object('stat', 'no_auth');
  end if;
  if p_actn not in ('ctct', 'rvw', 'end') then
    return jsonb_build_object('stat', 'bad_actn');
  end if;

  select * into b from public.blind_test_requests where id = p_blnd_id for update;
  if not found then
    return jsonb_build_object('stat', 'not_found');
  end if;
  if me_uid <> b.requester_id and me_uid <> b.resident_id then
    return jsonb_build_object('stat', 'forbidden');
  end if;
  if b.status not in ('acpt', 'done') then
    return jsonb_build_object('stat', 'bad_stat');
  end if;

  is_req := (me_uid = b.requester_id);
  if is_req then
    update public.blind_test_requests set req_actn = p_actn where id = p_blnd_id;
    opp_actn := b.memb_actn;
  else
    update public.blind_test_requests set memb_actn = p_actn where id = p_blnd_id;
    opp_actn := b.req_actn;
  end if;

  if p_actn = 'end' then
    if b.link_mtc_id is not null then
      update public.match_requests set status = 'r_rjct' where id = b.link_mtc_id;
    end if;
    update public.blind_test_requests set status = 'rjct' where id = p_blnd_id;
    return jsonb_build_object('stat', 'ok');
  end if;

  -- 이미 결과가 확정된(done) 뒤라면 더 이상의 상태 전이는 없다 (행동 기록만 남긴다)
  if b.status = 'done' then
    return jsonb_build_object('stat', 'ok');
  end if;

  if p_actn = 'rvw' then
    if b.link_mtc_id is null then
      insert into public.match_requests (requester_id, chief_id, resident_id, message)
      values (b.requester_id, b.chief_id, b.resident_id, '주변인 테스트 결과를 보고 확인을 요청했어요.')
      returning id into mtc_id;
      update public.blind_test_requests set link_mtc_id = mtc_id where id = p_blnd_id;
    elsif opp_actn = 'rvw' then
      -- 이장님이 이미 검토(수락/거절)한 뒤라면 그 결정을 덮어쓰지 않는다
      update public.match_requests set status = 'r_acpt' where id = b.link_mtc_id and status = 'pend';
      update public.blind_test_requests set status = 'done' where id = p_blnd_id;
    end if;
    return jsonb_build_object('stat', 'ok');
  end if;

  -- 둘 다 "연락하기"를 고르면 이장님 확인요청(rvw)과 마찬가지로 바로 연결된 것으로 보고
  -- match_requests를 r_acpt 상태로 직접 만든다 - 결과서 화면의 "연락하기" 버튼이 채팅
  -- (/chat/[req_id])으로 이어지려면 그 대상이 될 match_requests 행이 있어야 하기 때문
  if p_actn = 'ctct' and opp_actn = 'ctct' then
    if b.link_mtc_id is null then
      insert into public.match_requests (requester_id, chief_id, resident_id, message, status)
      values (b.requester_id, b.chief_id, b.resident_id, '주변인 테스트에서 서로 연락하기를 선택했어요.', 'r_acpt')
      returning id into mtc_id;
      update public.blind_test_requests set link_mtc_id = mtc_id, status = 'done' where id = p_blnd_id;
    else
      update public.blind_test_requests set status = 'done' where id = p_blnd_id;
    end if;
  end if;

  return jsonb_build_object('stat', 'ok');
end;
$$;

revoke all on function public.blnd_submit_actn(uuid, text) from public;
grant execute on function public.blnd_submit_actn(uuid, text) to authenticated;

-- ============================================================
-- matc_role_chk: match_requests/blind_test_requests의 chief_id/resident_id/
-- requester_id가 가리키는 profiles의 실제 user_role이 기대하는 역할과 맞는지 검증
-- (2026-09-14, "내 역할" 토글로 인한 데이터 정합성 문제 대응)
-- ============================================================
-- 홈 화면 "내 역할" 카드는 같은 계정의 profiles.user_role을 res <-> chief로 자유롭게
-- 바꿀 수 있게 해주는데, match_requests/blind_test_requests는 신청자/이장/대상 주민
-- 프로필을 스냅샷으로 저장하지 않고 매번 최신 profiles를 JOIN해서 보여준다(파일 상단 주석
-- 참고). 그래서 지금까지는 chief_id 자리에 실제로는 res 역할인 사람이, resident_id/
-- requester_id 자리에 실제로는 chief 역할인 사람이 들어가도 막는 장치가 전혀 없었고,
-- 그런 행이 생기면 "이장님"으로 표시돼야 할 사람이 주민으로 표시되는 등 화면이 앞뒤가 안
-- 맞는 상태로 깨질 수 있었다. 이 트리거는 INSERT/UPDATE 시점에 역할을 검증해 그런 행이
-- 애초에 생기지 않게 막는다(이미 들어간 행은 고치지 않는다 - 데이터를 보고 사람이 판단할 것).
create or replace function public.matc_role_chk()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  chief_role text;
  resd_role  text;
  reqr_role  text;
begin
  select user_role into chief_role from public.profiles where id = new.chief_id;
  select user_role into resd_role  from public.profiles where id = new.resident_id;
  select user_role into reqr_role  from public.profiles where id = new.requester_id;
  if chief_role is distinct from 'chief' then
    raise exception 'chief_id(%)는 이장(chief) 역할이 아닙니다', new.chief_id;
  end if;
  if resd_role is distinct from 'res' then
    raise exception 'resident_id(%)는 주민(res) 역할이 아닙니다', new.resident_id;
  end if;
  if reqr_role is distinct from 'res' then
    raise exception 'requester_id(%)는 주민(res) 역할이 아닙니다', new.requester_id;
  end if;
  return new;
end;
$$;

drop trigger if exists matc_role_chk on public.match_requests;
create trigger matc_role_chk
  before insert or update of chief_id, resident_id, requester_id on public.match_requests
  for each row execute function public.matc_role_chk();

drop trigger if exists blnd_role_chk on public.blind_test_requests;
create trigger blnd_role_chk
  before insert or update of chief_id, resident_id, requester_id on public.blind_test_requests
  for each row execute function public.matc_role_chk();

-- ============================================================
-- reports_auto_susp: 신고가 일정 건수 이상 쌓이면 대상 계정을 자동으로 정지(susp)한다
-- (2026-09-19, 서비스 출시 체크리스트 6번 "반복 위반자 영구 차단" 대응)
-- ============================================================
-- 서로 다른 신고자 3명 이상이 같은 대상을 신고하면 자동 정지 -- 한 사람이 같은 대상을
-- 여러 번 신고해서 정지시키는 어뷰징을 막기 위해 reporter_id 기준으로 distinct 카운트한다.
-- SECURITY DEFINER로 실행해서, 일반 유저에게 남의 profiles.acct_stat을 바꿀 권한을 열어주지
-- 않고도(RLS는 본인 프로필만 수정 가능) 신고 누적만으로 자동 정지가 가능하게 한다.
-- susp(정지)에서 ban(영구 차단)으로의 전환, 정지 해제(actv로 복구)는 관리자가 /admin
-- 화면(profiles_update_admin RLS 정책)에서 처리한다.
--
-- set_config('app.trust_sys_updt', ...)는 바로 아래 profiles_guard_priv_cols 트리거에게
-- "이 UPDATE는 신뢰할 수 있는 시스템 로직이 만든 것"이라고 알려주는 트랜잭션 범위(is_local
-- = true) 플래그다. SECURITY DEFINER라도 auth.uid()는 여전히 "신고를 접수한 사람"을
-- 가리켜 관리자가 아니므로, 이 플래그가 없으면 아래 update가 profiles_guard_priv_cols에
-- 막힌다. is_local=true라 이 UPDATE가 속한 트랜잭션이 끝나면 자동으로 꺼진다.
create or replace function public.reports_auto_susp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rptr_cnt int;
begin
  select count(distinct reporter_id) into rptr_cnt
  from public.reports
  where target_id = new.target_id and status = 'open';

  if rptr_cnt >= 3 then
    perform set_config('app.trust_sys_updt', 'true', true);
    update public.profiles
    set acct_stat = 'susp'
    where id = new.target_id and acct_stat = 'actv';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_auto_susp on public.reports;
create trigger reports_auto_susp
  after insert on public.reports
  for each row execute function public.reports_auto_susp();

-- ============================================================
-- profiles_guard_priv_cols: acct_stat/is_admin은 관리자만 바꿀 수 있게 강제한다
-- ============================================================
-- "profiles_update_own" RLS 정책(auth.uid() = id)은 컬럼 단위 제한이 없어서, 그대로 두면
-- 정지(susp)/영구 차단(ban)된 유저가 자기 프로필을 수정하는 평범한 API 호출(예: 마이페이지
-- 프로필 저장) 경로로 acct_stat을 'actv'로, 심지어 is_admin을 true로까지 직접 바꿔치기할 수
-- 있다("profiles_update_admin" 정책과 OR로 합쳐지므로 USING 자체는 본인 행에서 항상 통과함).
-- RLS의 WITH CHECK만으로는 "바뀌기 전 값"과 비교가 어려워(같은 문에서 self-select가 신뢰할
-- 수 없음) 대신 트리거로 막는다 - 두 컬럼 중 하나라도 바뀌려는 시도가 있으면, 이 UPDATE를
-- 실행하는 세션(auth.uid())이 관리자가 아닌 한 예외를 던져 전체 UPDATE를 되돌린다.
-- reports_auto_susp()처럼 신뢰할 수 있는 시스템 로직이 트랜잭션 범위 플래그
-- (app.trust_sys_updt)를 미리 세팅해뒀다면 관리자가 아니어도 통과시킨다.
-- auth.role() = 'authenticated'(PostgREST를 통해 들어온, 즉 이 앱을 거친 요청)일 때만 강제한다
-- - 트리거는 RLS와 달리 BYPASSRLS/테이블 소유자 권한으로도 건너뛸 수 없어서, 이 조건이
-- 없으면 최초 관리자를 지정하는 SQL Editor의 `update profiles set is_admin = true ...`
-- (README/각 alter 파일 하단에 적어둔 절차) 자체가 막혀버린다. SQL Editor/서비스 롤 접속은
-- auth.role()이 'authenticated'가 아니므로(보통 요청 JWT가 없음) 이 트리거를 그대로 통과한다.
create or replace function public.profiles_guard_priv_cols()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actr_admn boolean;
begin
  if (new.acct_stat is distinct from old.acct_stat or new.is_admin is distinct from old.is_admin)
     and auth.role() = 'authenticated' then
    if coalesce(current_setting('app.trust_sys_updt', true), '') = 'true' then
      return new;
    end if;
    select is_admin into actr_admn from public.profiles where id = auth.uid();
    if not coalesce(actr_admn, false) then
      raise exception 'acct_stat/is_admin은 관리자만 변경할 수 있습니다';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_priv_cols on public.profiles;
create trigger profiles_guard_priv_cols
  before update on public.profiles
  for each row execute function public.profiles_guard_priv_cols();

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
-- Realtime: 주변인 테스트 진행 상태(수락/거절, 카드 선택, 결과 화면 행동)를 폴링 없이
-- 실시간으로 받기 위해 두 테이블을 supabase_realtime publication에 추가한다 (2026-09-09).
-- Realtime도 각 테이블의 select RLS 정책을 그대로 따르므로 당사자에게만 이벤트가 간다.
-- ============================================================
alter publication supabase_realtime add table public.blind_test_requests;
alter publication supabase_realtime add table public.blind_test_picks;

-- ============================================================
-- Realtime: 채팅 메시지도 폴링 없이 실시간으로 받기 위해 publication에 추가한다 (2026-09-11).
-- ============================================================
alter publication supabase_realtime add table public.chat_messages;
