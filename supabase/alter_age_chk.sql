-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 만 19세 미만 가입을 서버에서도
-- 막는 트리거를 추가한다 (2026-09-20, 서비스 출시 체크리스트 9번 "연령 검증" 대응).
--
-- 배경: 온보딩 화면(OnbdScreen)이 calc_age(birth_dt)로 클라이언트에서 만 19세 미만
-- 가입을 이미 막고 있지만, 그건 화면 코드일 뿐이라 API를 직접 호출하면 우회할 수 있었다.
-- 이 트리거는 profiles.birth_dt가 새로 들어오거나(온보딩) 바뀔 때마다 같은 계산(만 나이)을
-- 서버에서 다시 검증한다. 나이는 매일 바뀌는 값이라 CHECK 제약(불변 함수만 허용)으로는
-- 표현할 수 없어 트리거로 구현한다. 재실행해도 안전하다(함수/트리거 재정의).
create or replace function public.profiles_age_chk()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.birth_dt is not null
     and date_part('year', age(current_date, new.birth_dt)) < 19 then
    raise exception '만 19세 미만은 가입할 수 없습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_age_chk on public.profiles;
create trigger profiles_age_chk
  before insert or update of birth_dt on public.profiles
  for each row execute function public.profiles_age_chk();

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
