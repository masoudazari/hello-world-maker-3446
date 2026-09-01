create table if not exists public.price_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text,
  is_mock boolean not null default true,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
grant select on public.price_sources to anon, authenticated;
grant all on public.price_sources to service_role;
alter table public.price_sources enable row level security;
drop policy if exists "price sources public read" on public.price_sources;
create policy "price sources public read" on public.price_sources for select using (true);

create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.price_sources(id) on delete cascade,
  search_key text not null,
  product_name text not null,
  brand text,
  variant text,
  seller_name text,
  price bigint not null,
  in_stock boolean,
  product_url text,
  is_mock boolean not null default true,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.market_prices to anon, authenticated;
grant all on public.market_prices to service_role;
alter table public.market_prices enable row level security;
drop policy if exists "market prices public read" on public.market_prices;
create policy "market prices public read" on public.market_prices for select using (true);

create index if not exists market_prices_search_idx on public.market_prices (search_key, fetched_at desc);

insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('mock-demo', 'داده نمایشی (Mock)', true, true, 'داده واقعی نیست؛ فقط برای تست معماری و UI است.')
on conflict (slug) do nothing;

insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('google-search', 'جستجوی گوگل (Custom Search API رسمی)', false, true,
  'نیازمند تنظیم GOOGLE_CSE_API_KEY و GOOGLE_CSE_CX در Edge Function secrets؛ تا آن زمان نتیجه خالی برمی‌گرداند.')
on conflict (slug) do nothing;

insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('torob', 'ترب', false, false, 'غیرفعال — تا بررسی API رسمی یا مجوز استفاده، متصل نمی‌شود.')
on conflict (slug) do nothing;

create or replace view public.product_market_stats
with (security_invoker = true) as
select
  p.id as product_id,
  p.supplier_id,
  p.base_price as my_price,
  count(mp.id) as sample_count,
  min(mp.price) as market_min,
  round(avg(mp.price))::bigint as market_avg,
  max(mp.price) as market_max,
  max(mp.fetched_at) as last_checked_at,
  bool_or(mp.is_mock) as includes_mock_data
from public.products p
left join public.market_prices mp
  on mp.product_name ilike '%' || p.name || '%' or p.name ilike '%' || mp.product_name || '%'
group by p.id, p.supplier_id, p.base_price;

grant select on public.product_market_stats to authenticated;