-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 지역(user_reg) 길이 제한을 추가한다
-- (2026-09-20, 서비스 출시 체크리스트 8번 "민감정보 최소 수집" 대응). 동/번지 등 상세 주소가
-- 들어오지 못하도록 시/구 단위 길이로만 제한한다. 재실행해도 안전하다.

-- 제약을 걸기 전에 이미 저장된 값 중 12자를 넘는 게 있으면 제약 추가 자체가 실패하므로 먼저 자른다.
update public.profiles set user_reg = left(user_reg, 12) where char_length(user_reg) > 12;

alter table public.profiles drop constraint if exists profiles_user_reg_check;
alter table public.profiles add constraint profiles_user_reg_check check (char_length(user_reg) <= 12);
