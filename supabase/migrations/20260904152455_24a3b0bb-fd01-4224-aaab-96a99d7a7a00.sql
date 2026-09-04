insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('user-reported', 'گزارش کاربران', false, true, 'هر ردیف یک قیمت واقعی است که یک کاربر شخصاً مشاهده و ثبت کرده.')
on conflict (slug) do nothing;

create or replace function public.report_market_price(
  _product_name text,
  _price bigint,
  _seller_name text default null,
  _product_url text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  source_id uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if _product_name is null or length(trim(_product_name)) < 2 then
    raise exception 'product name required';
  end if;
  if _price is null or _price <= 0 then
    raise exception 'a positive price is required';
  end if;

  select id into source_id from public.price_sources where slug = 'user-reported';

  insert into public.market_prices
    (source_id, search_key, product_name, seller_name, price, product_url, is_mock, fetched_at)
  values
    (source_id, lower(trim(_product_name)), trim(_product_name), _seller_name, _price, _product_url, false, now())
  returning id into new_id;

  return new_id;
end; $$;

revoke all on function public.report_market_price(text, bigint, text, text) from public, anon;
grant execute on function public.report_market_price(text, bigint, text, text) to authenticated;