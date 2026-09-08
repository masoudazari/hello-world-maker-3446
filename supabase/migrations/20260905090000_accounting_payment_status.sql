-- =====================================================================
-- Accounting module — inspired by a reference café/restaurant POS
-- feature set (سفارش گیری / گزارش تسویه / ریز فروش): a payment status
-- that is tracked SEPARATELY from delivery/fulfillment status (an
-- order can be "delivered" but not yet "paid" under net-30 terms, for
-- example), plus a settlement RPC for the supplier to mark an invoice
-- as paid.
-- =====================================================================

alter table public.orders
  add column if not exists is_paid boolean not null default false,
  add column if not exists paid_at timestamptz;

-- Cash and 50%-prepay orders are conceptually paid at creation time;
-- backfill so existing rows aren't all incorrectly "unpaid".
update public.orders
set is_paid = true, paid_at = coalesce(paid_at, created_at)
where payment_term_code in ('cash', 'prepay_50') and is_paid = false;

create index if not exists orders_supplier_paid_idx on public.orders (supplier_id, is_paid, created_at);

create or replace function public.mark_order_paid(_order_id uuid, _paid boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
declare
  owner_supplier uuid;
begin
  select supplier_id into owner_supplier from public.orders where id = _order_id;
  if owner_supplier is null then
    raise exception 'order not found';
  end if;
  if owner_supplier <> private.my_supplier_id() and not private.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  update public.orders
  set is_paid = _paid, paid_at = case when _paid then now() else null end
  where id = _order_id;
end;
$$;

revoke all on function public.mark_order_paid(uuid, boolean) from public, anon;
grant execute on function public.mark_order_paid(uuid, boolean) to authenticated;
