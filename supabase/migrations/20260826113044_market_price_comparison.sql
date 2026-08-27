-- =====================================================================
-- Phase 4: Market price comparison — data layer + provider registry
-- =====================================================================
-- Design constraint (explicit, from spec): the site must never fan out
-- live requests to dozens of external sites on every user visit. All
-- collection happens out-of-band (an edge function acting as the
-- "Collector"), writes land here with a timestamp, and the UI only
-- ever reads from this table. No table here performs live scraping.
--
-- IMPORTANT HONESTY NOTE: at this stage no real external price source
-- is wired up. The only registered source is a clearly-flagged mock
-- provider so the architecture and UI can be built and tested end to
-- end. Nothing here pretends mock rows are real market data — every
-- row and every source carries an explicit is_mock flag, and the UI
-- must surface that flag rather than hide it. Wiring a real provider
-- (e.g. an official API, if one exists and its terms allow it) is a
-- separate, deliberate step — see the "Adding a real provider" note
-- in supabase/functions/market-price-collector/index.ts.
-- =====================================================================

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
  search_key text not null,          -- normalized query this row was collected for
  product_name text not null,
  brand text,
  variant text,                       -- model / weight / volume, free text
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
-- Only the collector (running with the service_role key inside the edge
-- function) may write. No client-side insert/update/delete policy is
-- created on purpose — this is deliberately not authenticated-writable.

create index if not exists market_prices_search_idx on public.market_prices (search_key, fetched_at desc);

-- Seed the mock provider so the UI has something honest to show immediately.
insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('mock-demo', 'داده نمایشی (Mock)', true, true, 'داده واقعی نیست؛ فقط برای تست معماری و UI است.')
on conflict (slug) do nothing;

-- A placeholder row for a real future source, inactive until someone
-- actually wires it up per its terms of use / official API.
insert into public.price_sources (slug, name, is_mock, is_active, notes)
values ('torob', 'ترب', false, false, 'غیرفعال — تا بررسی API رسمی یا مجوز استفاده، متصل نمی‌شود.')
on conflict (slug) do nothing;

-- 2) Per-product market comparison (requirement #9: my price vs market min/avg/max)
-- Naive text match against the product name; this is intentionally simple
-- (no fuzzy NLP) since with only a mock source, precise matching adds
-- complexity without real value yet. This view only ever reflects rows
-- that already exist in market_prices, so with zero real sources it will
-- correctly report "no data" rather than inventing a comparison.
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
