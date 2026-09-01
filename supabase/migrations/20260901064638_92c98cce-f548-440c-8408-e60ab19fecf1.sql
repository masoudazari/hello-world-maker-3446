-- =====================================================================
-- Phase 2: Bulk price management
-- Adds a single security-definer RPC that updates base_price for a set
-- of the caller's own products, in one transaction. The existing
-- trg_log_price_change trigger (phase 1) fires per-row automatically,
-- so every change made through this RPC is still recorded in
-- product_price_history with no extra code needed here.
-- =====================================================================

create or replace function public.bulk_update_product_prices(
  _product_ids uuid[],
  _mode text,           -- 'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price'
  _value numeric
) returns table (product_id uuid, old_price bigint, new_price bigint) as $$
declare
  my_supplier uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  my_supplier := private.my_supplier_id();
  if my_supplier is null and not private.has_role(auth.uid(), 'admin') then
    raise exception 'no supplier profile';
  end if;

  if _mode not in ('percent_increase','percent_decrease','fixed_increase','fixed_decrease','set_price') then
    raise exception 'invalid mode: %', _mode;
  end if;

  if _value < 0 then
    raise exception 'value must be non-negative';
  end if;

  return query
  with target as (
    select p.id, p.base_price as old_price
    from public.products p
    where p.id = any(_product_ids)
      and (p.supplier_id = my_supplier or private.has_role(auth.uid(), 'admin'))
  ),
  computed as (
    select
      t.id,
      t.old_price,
      greatest(0, case _mode
        when 'percent_increase' then round(t.old_price * (1 + _value / 100.0))
        when 'percent_decrease' then round(t.old_price * (1 - _value / 100.0))
        when 'fixed_increase'   then t.old_price + round(_value)
        when 'fixed_decrease'   then t.old_price - round(_value)
        when 'set_price'        then round(_value)
      end)::bigint as computed_price
    from target t
  ),
  applied as (
    update public.products p
    set base_price = c.computed_price
    from computed c
    where p.id = c.id
    returning p.id as product_id, c.old_price, p.base_price as new_price
  )
  select * from applied;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.bulk_update_product_prices(uuid[], text, numeric) from public, anon;
grant execute on function public.bulk_update_product_prices(uuid[], text, numeric) to authenticated;