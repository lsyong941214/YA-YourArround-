-- 이미 supabase/alter_shop_sub.sql까지 실행해둔 프로젝트에 가게 등록 심사 세부 체크리스트를
-- 추가한다(2026-09-28, 음식점/카페 입점 심사 기준 - 체크리스트 D 확장). 동일 사업자등록번호
-- 중복 등록 방지, 가게 주인 쓰기 시 사업자등록번호 필수화, 구독 갱신 시 재검증 큐잉도 포함되어
-- 있다. 재실행해도 안전하다.

-- 동일 사업자등록번호로 여러 계정이 중복 등록하는 어뷰징을 DB 제약으로 막는다(반려된 건은
-- 제외해서 반려 후 재신청까지 막지는 않는다)
drop index if exists idx_shop_promotions_biz_reg_no_uniq;
create unique index idx_shop_promotions_biz_reg_no_uniq on public.shop_promotions (biz_reg_no)
  where biz_reg_no is not null and status <> 'rejected';

create table if not exists public.shop_review_checks (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shop_promotions(id) on delete cascade,
  check_type   text not null check (check_type in (
                 'biz_reg_verify', 'biz_status', 'food_biz_report', 'onl_sale_report',
                 'addr_verify', 'img_origin', 'label_compliance', 'admin_penalty',
                 'payer_match', 'categ_fit'
               )),
  method       text not null default 'manual' check (method in ('manual', 'auto')),
  result       text not null default 'pending' check (result in ('pending', 'pass', 'fail', 'skip')),
  note         text not null default '',
  evidence_url text,
  checked_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_shop_review_checks_shop
  on public.shop_review_checks (shop_id, check_type, created_at desc);
comment on table public.shop_review_checks is '가게 등록 심사 세부 체크리스트(사업자 진위/영업신고증/주소/이미지 도용 등) 이력.
append-only - shop_id+check_type별 최신 행이 현재 상태다. 관리자만 기록하고(checks_insert_admin), 가게
주인은 자기 가게 것만 조회할 수 있다(반려 사유를 보여주는 것과 같은 투명성 원칙).';

alter table public.shop_review_checks enable row level security;

drop policy if exists "checks_select_own" on public.shop_review_checks;
create policy "checks_select_own" on public.shop_review_checks
  for select using (
    exists (select 1 from public.shop_promotions sp where sp.id = shop_id and sp.owner_id = auth.uid())
  );
drop policy if exists "checks_select_admin" on public.shop_review_checks;
create policy "checks_select_admin" on public.shop_review_checks
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "checks_insert_admin" on public.shop_review_checks;
create policy "checks_insert_admin" on public.shop_review_checks
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- shop_promo_guard: 기존 버전에 "가게 주인 쓰기 시 사업자등록번호 필수" 검증을 추가한 버전으로
-- 교체한다(관리자 심사 액션은 그대로 예외 - biz_reg_no를 건드리지 않는 UPDATE라 검증을 안 탄다).
create or replace function public.shop_promo_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actr_admn boolean;
begin
  if auth.role() = 'authenticated' then
    select is_admin into actr_admn from public.profiles where id = auth.uid();
    if not coalesce(actr_admn, false) then
      if new.biz_reg_no is null or btrim(new.biz_reg_no) = '' then
        raise exception '사업자등록번호를 입력해주세요';
      end if;
      new.status := 'pending';
      if tg_op = 'UPDATE' then
        new.reject_reason := old.reject_reason;
        new.reviewed_by := old.reviewed_by;
        new.reviewed_at := old.reviewed_at;
      else
        new.reject_reason := '';
        new.reviewed_by := null;
        new.reviewed_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- shop_sub_renew_recheck: 구독이 새로 생길 때마다(최초 구독/갱신) 시간이 지나며 값이 바뀔 수 있는
-- 항목(휴폐업 여부/행정처분 이력)을 재검증 대기(pending)로 다시 큐잉한다.
create or replace function public.shop_sub_renew_recheck()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.shop_review_checks (shop_id, check_type, method, result)
  values
    (new.shop_id, 'biz_status', 'manual', 'pending'),
    (new.shop_id, 'admin_penalty', 'manual', 'pending');
  return new;
end;
$$;

drop trigger if exists shop_sub_renew_recheck on public.shop_subscriptions;
create trigger shop_sub_renew_recheck
  after insert on public.shop_subscriptions
  for each row execute function public.shop_sub_renew_recheck();
