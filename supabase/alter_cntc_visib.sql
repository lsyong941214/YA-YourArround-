-- 주변(Jubyeon) 스키마 변경분 — 2026-08-30 "같은 이장의 다른 주민" 조회 허용
--
-- 이미 schema.sql(+ alter_invt.sql)을 실행해둔 기존 Supabase 프로젝트에 적용하는
-- 델타 스크립트다. (새 프로젝트라면 이 파일 대신 갱신된 schema.sql을 그대로 한 번
-- 실행하면 된다.)
--
-- 버그: village_contacts 의 select 정책이 "이 행의 당사자(주민 본인 또는 이장 본인)만
-- 조회 가능"으로 되어 있어서, 주민이 "연락처 정보"에서 자기 이장님을 눌러 봐도 그
-- 이장님과 연결된 "다른" 주민들(연결 요청을 보낼 대상)이 전혀 보이지 않았다 - DB에는
-- 분명히 여러 명이 연결되어 있는데도 화면엔 "아직 연결된 주민이 없어요"만 떴다.
-- (같은 이장 밑의 다른 주민 행은, 그 행 기준으로 보면 제3자이므로 RLS가 걸러냄)
--
-- 수정: "나도 이 이장의 주민이다"를 확인하는 is_res_of_chief() 함수를 추가하고,
-- 정책에 그 조건을 더한다. 같은 정책 안에서 village_contacts 를 직접 재참조하면
-- infinite recursion 에러가 나서 SECURITY DEFINER 함수로 분리했다.

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

drop policy if exists "contacts_select_related" on public.village_contacts;
create policy "contacts_select_related" on public.village_contacts
  for select using (
    auth.uid() = resident_id
    or auth.uid() = chief_id
    or public.is_res_of_chief(chief_id)
  );
