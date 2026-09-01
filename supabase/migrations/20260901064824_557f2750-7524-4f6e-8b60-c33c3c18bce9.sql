create or replace view public.buyer_reorder_patterns
with (security_invoker = true) as
with ordered as (
  select
    o.buyer_id,
    o.product_name_snapshot,
    o.unit_snapshot,
    o.quantity,
    o.created_at,
    lag(o.created_at) over (
      partition by o.buyer_id, o.product_name_snapshot order by o.created_at
    ) as prev_created_at
  from public.orders o
  where o.product_name_snapshot is not null
),
gaps as (
  select
    buyer_id,
    product_name_snapshot,
    unit_snapshot,
    quantity,
    created_at,
    extract(day from created_at - prev_created_at) as gap_days
  from ordered
)
select
  buyer_id,
  product_name_snapshot as product_name,
  unit_snapshot as unit,
  count(*) as order_count,
  round(avg(quantity))::numeric as typical_quantity,
  round(avg(gap_days) filter (where gap_days is not null))::int as avg_interval_days,
  max(created_at) as last_ordered_at,
  min(created_at) as first_ordered_at
from gaps
group by buyer_id, product_name_snapshot, unit_snapshot
having count(*) >= 2;

grant select on public.buyer_reorder_patterns to authenticated;

create table if not exists public.promoted_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  suggested_quantity numeric,
  unit text default 'عدد',
  note text,
  product_id uuid references public.products(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.promoted_listings to authenticated;
grant all on public.promoted_listings to service_role;
alter table public.promoted_listings enable row level security;

drop policy if exists "promoted listings public read active" on public.promoted_listings;
create policy "promoted listings public read active" on public.promoted_listings for select to authenticated
  using (is_active or private.has_role(auth.uid(), 'admin'));

drop policy if exists "promoted listings admin write" on public.promoted_listings;
create policy "promoted listings admin write" on public.promoted_listings for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

-- Remove the admin-approval requirement for new products.
alter table public.products alter column status set default 'active';

update public.products
set status = 'active'
where status = 'pending_review';