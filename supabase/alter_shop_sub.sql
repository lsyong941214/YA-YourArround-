-- 이미 supabase/alter_shop_promo.sql을 실행해둔 프로젝트에 가게 홍보 구독 요금표/쿠폰/구독
-- 이력 테이블을 추가한다(2026-09-27, BM 개편 - 체크리스트 B3). shop_promo_select_approved
-- 정책을 "승인 + 활성 구독"으로 강화하는 부분도 포함되어 있다. 재실행해도 안전하다.

create table if not exists public.shop_sub_plans (
  id              uuid primary key default gen_random_uuid(),
  duration_months int not null unique check (duration_months in (1, 3, 6, 9)),
  price           int not null check (price >= 0),
  is_active       boolean not null default true,
  updated_by      uuid references public.profiles(id),
  updated_at      timestamptz not null default now()
);
comment on table public.shop_sub_plans is '가게 홍보 구독 요금표(기간별, 관리자 설정). 가격 변경은 이미 구독 중인 가게의
다음 갱신부터 적용된다(shop_subscriptions.price_applied 스냅샷 참고).';

insert into public.shop_sub_plans (duration_months, price) values
  (1, 9900), (3, 26700), (6, 47500), (9, 62400)
on conflict (duration_months) do nothing;

create table if not exists public.shop_coupons (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  discount_pct int not null default 100 check (discount_pct between 1 and 100),
  max_uses     int,
  used_count   int not null default 0,
  valid_until  timestamptz,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
comment on table public.shop_coupons is '가게 홍보 구독 할인/무료 이벤트 쿠폰. 코드 자체는 일반 유저에게 조회 정책을 열어주지 않고
(redeem_shop_coupon() 함수로만 검증/사용), 관리자만 /admin에서 발급·조회한다.';

create table if not exists public.shop_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shop_promotions(id) on delete cascade,
  duration_months int not null,
  price_applied   int not null,
  coupon_id       uuid references public.shop_coupons(id),
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz not null,
  status          text not null default 'active' check (status in ('active', 'canceled')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_shop_subscriptions_shop on public.shop_subscriptions (shop_id, ends_at desc);
comment on table public.shop_subscriptions is '가게 홍보 구독 이력. "현재 구독 중"인지는 status<>''canceled'' and ends_at > now()로
판단한다(만료를 별도 배치로 status를 바꿔주지 않아도 됨). C의 홈 화면 노출 조건(shop_promo_select_approved
정책)이 이 테이블의 활성 구독 존재 여부를 함께 확인한다.';

alter table public.shop_sub_plans enable row level security;
alter table public.shop_coupons enable row level security;
alter table public.shop_subscriptions enable row level security;

drop policy if exists "shop_promo_select_approved" on public.shop_promotions;
create policy "shop_promo_select_approved" on public.shop_promotions
  for select using (
    status = 'approved'
    and exists (
      select 1 from public.shop_subscriptions s
      where s.shop_id = shop_promotions.id and s.status <> 'canceled' and s.ends_at > now()
    )
  );

drop policy if exists "sub_plans_select_all" on public.shop_sub_plans;
create policy "sub_plans_select_all" on public.shop_sub_plans
  for select using (auth.role() = 'authenticated');
drop policy if exists "sub_plans_update_admin" on public.shop_sub_plans;
create policy "sub_plans_update_admin" on public.shop_sub_plans
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "coupons_select_admin" on public.shop_coupons;
create policy "coupons_select_admin" on public.shop_coupons
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "coupons_insert_admin" on public.shop_coupons;
create policy "coupons_insert_admin" on public.shop_coupons
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "coupons_update_admin" on public.shop_coupons;
create policy "coupons_update_admin" on public.shop_coupons
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "subs_select_own" on public.shop_subscriptions;
create policy "subs_select_own" on public.shop_subscriptions
  for select using (
    exists (select 1 from public.shop_promotions sp where sp.id = shop_id and sp.owner_id = auth.uid())
  );
drop policy if exists "subs_select_admin" on public.shop_subscriptions;
create policy "subs_select_admin" on public.shop_subscriptions
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "subs_insert_admin" on public.shop_subscriptions;
create policy "subs_insert_admin" on public.shop_subscriptions
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "subs_update_admin" on public.shop_subscriptions;
create policy "subs_update_admin" on public.shop_subscriptions
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create or replace function public.redeem_shop_coupon(p_shop_id uuid, p_code text, p_duration int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_uid    uuid := auth.uid();
  shop_row  public.shop_promotions%rowtype;
  plan_row  public.shop_sub_plans%rowtype;
  cpn_row   public.shop_coupons%rowtype;
  price_val int;
  ends_val  timestamptz;
begin
  if me_uid is null then
    return jsonb_build_object('stat', 'no_auth');
  end if;

  select * into shop_row from public.shop_promotions where id = p_shop_id for update;
  if not found then
    return jsonb_build_object('stat', 'no_shop');
  end if;
  if shop_row.owner_id <> me_uid then
    return jsonb_build_object('stat', 'not_owner');
  end if;

  select * into plan_row from public.shop_sub_plans
  where duration_months = p_duration and is_active;
  if not found then
    return jsonb_build_object('stat', 'no_plan');
  end if;

  select * into cpn_row from public.shop_coupons
  where code = upper(btrim(p_code)) for update;
  if not found then
    return jsonb_build_object('stat', 'bad_code');
  end if;
  if not cpn_row.is_active then
    return jsonb_build_object('stat', 'inactive');
  end if;
  if cpn_row.valid_until is not null and cpn_row.valid_until < now() then
    return jsonb_build_object('stat', 'expired');
  end if;
  if cpn_row.max_uses is not null and cpn_row.used_count >= cpn_row.max_uses then
    return jsonb_build_object('stat', 'sold_out');
  end if;

  price_val := round(plan_row.price * (100 - cpn_row.discount_pct) / 100.0);
  ends_val := now() + (p_duration || ' months')::interval;

  insert into public.shop_subscriptions (shop_id, duration_months, price_applied, coupon_id, starts_at, ends_at)
  values (p_shop_id, p_duration, price_val, cpn_row.id, now(), ends_val);

  update public.shop_coupons set used_count = used_count + 1 where id = cpn_row.id;

  return jsonb_build_object('stat', 'ok', 'ends_at', ends_val, 'price_applied', price_val);
end;
$$;

revoke all on function public.redeem_shop_coupon(uuid, text, int) from public;
grant execute on function public.redeem_shop_coupon(uuid, text, int) to authenticated;
