-- 이미 예전 버전의 schema.sql을 실행해둔 프로젝트에 shop_promotions 테이블(가게 홍보
-- 등록/심사, 체크리스트 D)을 추가한다. supabase/alter_has_shop.sql이 먼저 적용되어
-- 있어야 한다(owner_id가 참조하는 profiles에 has_shop 컬럼은 없어도 되지만, 온보딩에서
-- has_shop 체크를 이미 거친 이장이 대상이라는 전제가 같이 간다). 재실행해도 안전하다.

create table if not exists public.shop_promotions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references public.profiles(id) on delete cascade,
  shop_name     text not null,
  category      text not null,
  region        text not null,
  biz_hours     text not null default '',
  description   text not null default '',
  img_url       text,
  biz_reg_no    text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text not null default '',
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_shop_promotions_owner on public.shop_promotions (owner_id);
create index if not exists idx_shop_promotions_status on public.shop_promotions (status, created_at);

comment on table public.shop_promotions is '이장의 가게 홍보 등록/심사. status는 관리자(/admin)만 바꿀 수 있고(shop_promo_guard 트리거),
approved인 건만 홈 화면 홍보 슬롯에 노출된다.';

alter table public.shop_promotions enable row level security;

drop policy if exists "shop_promo_insert_own" on public.shop_promotions;
create policy "shop_promo_insert_own" on public.shop_promotions
  for insert with check (auth.uid() = owner_id);
drop policy if exists "shop_promo_select_own" on public.shop_promotions;
create policy "shop_promo_select_own" on public.shop_promotions
  for select using (auth.uid() = owner_id);
drop policy if exists "shop_promo_select_approved" on public.shop_promotions;
create policy "shop_promo_select_approved" on public.shop_promotions
  for select using (status = 'approved');
drop policy if exists "shop_promo_select_admin" on public.shop_promotions;
create policy "shop_promo_select_admin" on public.shop_promotions
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
drop policy if exists "shop_promo_update_own" on public.shop_promotions;
create policy "shop_promo_update_own" on public.shop_promotions
  for update using (auth.uid() = owner_id);
drop policy if exists "shop_promo_update_admin" on public.shop_promotions;
create policy "shop_promo_update_admin" on public.shop_promotions
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create or replace function public.shop_promo_role_chk()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ownr_role text;
begin
  select user_role into ownr_role from public.profiles where id = new.owner_id;
  if ownr_role is distinct from 'chief' then
    raise exception '가게 홍보는 이장님만 등록할 수 있습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists shop_promo_role_chk on public.shop_promotions;
create trigger shop_promo_role_chk
  before insert on public.shop_promotions
  for each row execute function public.shop_promo_role_chk();

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

drop trigger if exists shop_promo_guard on public.shop_promotions;
create trigger shop_promo_guard
  before insert or update on public.shop_promotions
  for each row execute function public.shop_promo_guard();
