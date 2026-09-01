-- =====================================================================
-- Phase 1: Customer purchase-history CRM + price snapshot + price history
-- Builds on existing: orders, purchase_requests, supplier_offers, products
-- Additive only — no existing table/column is dropped or renamed.
-- =====================================================================

-- 1) Invoice numbering + immutable price snapshot on orders
--    (previously: orders had total_amount + quantity but no per-unit
--    snapshot, and product identity was only reachable via request_id/
--    offer_id, both nullable on delete — meaning historical invoices
--    could lose their product/price data. This fixes that.)
create sequence if not exists public.invoice_number_seq start 1000;

alter table public.orders
  add column if not exists invoice_number bigint not null default nextval('public.invoice_number_seq'),
  add column if not exists product_name_snapshot text,
  add column if not exists unit_snapshot text,
  add column if not exists unit_price_snapshot bigint not null default 0,
  add column if not exists discount_amount bigint not null default 0,
  add column if not exists buyer_name_snapshot text,
  add column if not exists buyer_phone_snapshot text;

create unique index if not exists orders_invoice_number_key on public.orders (invoice_number);

-- Populate snapshot fields for any existing rows from linked request/offer/profile.
update public.orders o
set
  product_name_snapshot = coalesce(o.product_name_snapshot, r.product_name),
  unit_snapshot = coalesce(o.unit_snapshot, r.unit),
  unit_price_snapshot = case when o.unit_price_snapshot = 0 and o.quantity > 0
    then round(o.total_amount / o.quantity) else o.unit_price_snapshot end,
  buyer_name_snapshot = coalesce(o.buyer_name_snapshot, p.full_name),
  buyer_phone_snapshot = coalesce(o.buyer_phone_snapshot, p.mobile)
from public.purchase_requests r, public.profiles p
where r.id = o.request_id and p.id = o.buyer_id
  and (o.product_name_snapshot is null or o.buyer_name_snapshot is null);

-- Freeze the snapshot at insert time so future price/name edits never
-- retroactively change an existing invoice.
create or replace function public.snapshot_order_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req record;
  offer record;
  buyer record;
begin
  if new.request_id is not null then
    select product_name, unit into req from public.purchase_requests where id = new.request_id;
  end if;
  if new.offer_id is not null then
    select unit_price into offer from public.supplier_offers where id = new.offer_id;
  end if;
  select full_name, mobile into buyer from public.profiles where id = new.buyer_id;

  new.product_name_snapshot := coalesce(new.product_name_snapshot, req.product_name);
  new.unit_snapshot := coalesce(new.unit_snapshot, req.unit);
  if new.unit_price_snapshot = 0 then
    new.unit_price_snapshot := coalesce(offer.unit_price,
      case when new.quantity > 0 then round(new.total_amount / new.quantity) else 0 end);
  end if;
  new.buyer_name_snapshot := coalesce(new.buyer_name_snapshot, buyer.full_name);
  new.buyer_phone_snapshot := coalesce(new.buyer_phone_snapshot, buyer.mobile);
  return new;
end; $$;

drop trigger if exists trg_snapshot_order on public.orders;
create trigger trg_snapshot_order before insert on public.orders
for each row execute function public.snapshot_order_on_insert();

revoke all on function public.snapshot_order_on_insert() from public, anon, authenticated;

-- 2) Product price history — every change to products.base_price is logged.
create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  old_price bigint not null,
  new_price bigint not null,
  change_percent numeric(6,2) not null default 0,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.product_price_history to authenticated;
grant all on public.product_price_history to service_role;
alter table public.product_price_history enable row level security;

drop policy if exists "price history owner read" on public.product_price_history;
create policy "price history owner read" on public.product_price_history for select to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))
    )
  );

create or replace function public.log_price_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.base_price is distinct from old.base_price then
    insert into public.product_price_history (product_id, old_price, new_price, change_percent, changed_by)
    values (
      new.id, old.base_price, new.base_price,
      case when old.base_price > 0
        then round(((new.base_price - old.base_price)::numeric / old.base_price) * 100, 2)
        else 0 end,
      auth.uid()
    );
  end if;
  return new;
end; $$;

drop trigger if exists trg_log_price_change on public.products;
create trigger trg_log_price_change after update on public.products
for each row execute function public.log_price_change();

revoke all on function public.log_price_change() from public, anon, authenticated;

-- 3) Customer summary view for the "customer search" screen.
--    Scoped per-supplier via orders.supplier_id — RLS on the base
--    `orders` table already restricts rows to the owning supplier or an
--    admin, and this view inherits that restriction (security_invoker).
create or replace view public.supplier_customer_summary
with (security_invoker = true) as
select
  o.supplier_id,
  o.buyer_id,
  coalesce(o.buyer_name_snapshot, p.full_name) as customer_name,
  coalesce(o.buyer_phone_snapshot, p.mobile) as customer_phone,
  count(*) as orders_count,
  min(o.created_at) as first_purchase_at,
  max(o.created_at) as last_purchase_at,
  sum(o.total_amount) as total_spent,
  sum(o.quantity) as total_items
from public.orders o
left join public.profiles p on p.id = o.buyer_id
group by o.supplier_id, o.buyer_id, coalesce(o.buyer_name_snapshot, p.full_name), coalesce(o.buyer_phone_snapshot, p.mobile);

grant select on public.supplier_customer_summary to authenticated;

create index if not exists orders_supplier_buyer_idx on public.orders (supplier_id, buyer_id);
create index if not exists orders_invoice_search_idx on public.orders (supplier_id, created_at desc);