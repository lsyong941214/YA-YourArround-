-- 주변(Jubyeon) 스키마 변경분 — 2026-08-24 "초대코드 기반 연결" 도입
--
-- 이미 schema.sql 을 실행해둔 기존 Supabase 프로젝트에 적용하는 델타 스크립트다.
-- (새 프로젝트라면 이 파일 대신 갱신된 schema.sql 을 그대로 한 번 실행하면 된다.)
--
-- 설계 결정 (2026-08-24, 사용자 확인):
-- 1) 발급 방향: **이장이 발급 -> 주민이 입력**. 마을 가입 코드에 가까운 형태로, 이장이
--    지인들에게 코드를 나눠주고 받은 사람이 입력해 합류한다. 코드 자체가 "이장이 인정한
--    사람"이라는 인증 수단이므로, 코드 사용 후 별도 승인 단계는 두지 않는다.
-- 2) 코드 수명: **1회용, 만료 없음**. 한 번 쓰이면 소멸(used_by/used_at 기록)하고
--    시간 제한은 두지 않는다.
-- 3) 연결 생성은 반드시 use_invt_code() 함수를 거친다. 주민이 village_contacts 에
--    직접 INSERT 하던 정책(contacts_insert_resident)은 **제거**한다 — 그 정책은 주민이
--    아무 이장에게나 동의 없이 자신을 붙일 수 있게 허용하는 구멍이었다.

-- ============================================================
-- invite_codes: 이장이 발급하는 1회용 초대코드
-- ============================================================
create table if not exists public.invite_codes (
  code        text primary key,
  chief_id    uuid not null references public.profiles(id) on delete cascade,
  used_by     uuid references public.profiles(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_invite_codes_chief on public.invite_codes (chief_id);

comment on table public.invite_codes is '이장이 발급하는 1회용 초대코드. used_by/used_at 이 null 이면 미사용.';
comment on column public.invite_codes.code is '사람이 눈으로 읽고 옮겨 적는 코드. 혼동 문자(0/O/1/I/L) 제외 8자리.';

alter table public.invite_codes enable row level security;

-- 발급: 이장 본인만, 자기 것으로만
drop policy if exists "invt_insert_chief" on public.invite_codes;
create policy "invt_insert_chief" on public.invite_codes
  for insert with check (
    auth.uid() = chief_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_role = 'chief'
    )
  );

-- 조회: 발급한 이장 본인만. 주민은 코드를 조회하지 못한다(코드 열거 방지) --
-- 주민의 코드 사용은 아래 use_invt_code() 함수가 대신 처리한다.
drop policy if exists "invt_select_own" on public.invite_codes;
create policy "invt_select_own" on public.invite_codes
  for select using (auth.uid() = chief_id);

-- 폐기: 아직 쓰이지 않은 자기 코드만 지울 수 있다
drop policy if exists "invt_delete_own_unused" on public.invite_codes;
create policy "invt_delete_own_unused" on public.invite_codes
  for delete using (auth.uid() = chief_id and used_by is null);

-- ============================================================
-- use_invt_code: 주민이 초대코드를 입력해 이장과 연결한다
-- ============================================================
-- SECURITY DEFINER 로 실행해서, 주민에게 invite_codes 조회 권한이나
-- village_contacts INSERT 권한을 열어주지 않고도 연결을 만들 수 있게 한다.
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
-- village_contacts: 주민의 직접 INSERT 정책 제거
-- ============================================================
-- 연결은 이제 use_invt_code() 를 통해서만 생성된다.
-- (기존 정책은 주민이 임의의 이장에게 동의 없이 자신을 붙일 수 있었다)
drop policy if exists "contacts_insert_resident" on public.village_contacts;
