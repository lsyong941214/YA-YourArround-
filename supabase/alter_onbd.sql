-- 주변(Jubyeon) 스키마 변경분 — 2026-08-24 "최초 로그인 온보딩" 도입
--
-- 이미 schema.sql 을 실행해둔 기존 Supabase 프로젝트에 적용하는 델타 스크립트다.
-- (새 프로젝트라면 이 파일 대신 갱신된 schema.sql 을 그대로 한 번 실행하면 된다.)
-- 마이그레이션 도구 없이 파일 단위로 관리하는 이 프로젝트 방식(schema.sql 주석 참고)을 따른다.
--
-- 변경 요약
-- 1) profiles.user_age(int) -> profiles.birth_dt(date) 로 교체.
--    나이는 앱에서 birth_dt 로부터 파생 계산한다(둘 다 저장하면 나이가 낡는 문제가 생김).
--    ** 주의: 나이만으로는 생년월일을 복원할 수 없어 기존 행의 나이 값은 보존되지 않는다.
--       기존 계정은 birth_dt 가 null 이 되고, 앱에서는 나이가 "-" 로 보인다.
--       (데모용 테스트 계정 기준의 결정 — 필요하면 아래 UPDATE 로 손으로 채워 넣을 것) **
-- 2) 프로필 사진/사진첩 업로드용 Storage 버킷 prof-img 및 접근 정책 추가.

-- 1) birth_dt 추가 후 user_age 제거
alter table public.profiles add column if not exists birth_dt date;
comment on column public.profiles.birth_dt is '생년월일. 나이(user_age)는 이 값에서 앱이 파생 계산한다';
alter table public.profiles drop column if exists user_age;

-- (선택) 기존 테스트 계정의 생년월일을 손으로 채우고 싶다면 예시처럼 실행
-- update public.profiles set birth_dt = '1995-03-21' where user_name = '홍길동';

-- 2) Storage 버킷 + 정책
insert into storage.buckets (id, name, public)
values ('prof-img', 'prof-img', true)
on conflict (id) do nothing;

drop policy if exists "prof_img_select_all" on storage.objects;
drop policy if exists "prof_img_insert_own" on storage.objects;
drop policy if exists "prof_img_update_own" on storage.objects;
drop policy if exists "prof_img_delete_own" on storage.objects;

create policy "prof_img_select_all" on storage.objects
  for select using (bucket_id = 'prof-img');
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
