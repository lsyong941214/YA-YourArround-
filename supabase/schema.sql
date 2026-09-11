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
  -- pend=응답 대기, acpt=수락(게임~결과 대기), rjct=거절/결과에서 종료, done=결과에서 매칭 확정
  status            text not null default 'pend' check (status in ('pend', 'acpt', 'rjct', 'done')),
  seen              boolean not null default false,
  card_ids          text[] not null default '{}', -- 이번 테스트에 쓸 문항 id 10개 (신청 시 카테고리별 랜덤 선정, 순서 고정)
  req_actn          text check (req_actn in ('ctct', 'rvw', 'end')),   -- 결과 화면에서 신청자가 고른 행동
  memb_actn         text check (memb_actn in ('ctct', 'rvw', 'end')),  -- 결과 화면에서 대상 주민이 고른 행동
  link_mtc_id       uuid references public.match_requests(id) on delete set null, -- 확인요청/연락하기로 만들어진 매칭 요청
  created_at        timestamptz not null default now()
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

  if p_actn = 'ctct' and opp_actn = 'ctct' then
    update public.blind_test_requests set status = 'done' where id = p_blnd_id;
  end if;

  return jsonb_build_object('stat', 'ok');
end;
$$;

revoke all on function public.blnd_submit_actn(uuid, text) from public;
grant execute on function public.blnd_submit_actn(uuid, text) to authenticated;

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
