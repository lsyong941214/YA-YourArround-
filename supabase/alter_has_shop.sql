-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 profiles.has_shop 컬럼을 추가한다
-- (2026-09-27, 가게 사장 온보딩/홍보 등록 준비 - LAUNCH_CHECKLIST.md D). 가입 시 "가게를
-- 운영 중"으로 표시한 이장 계정만 이 값이 true가 되고, 마이페이지의 가게 홍보 등록 화면
-- 진입 조건으로 쓴다. 재실행해도 안전하다.

alter table public.profiles
  add column if not exists has_shop boolean not null default false;
