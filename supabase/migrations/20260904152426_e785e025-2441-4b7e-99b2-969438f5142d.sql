create table if not exists public.reference_prices (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  brand text,
  unit text not null default 'عدد',
  approx_price bigint not null,
  price_range_min bigint,
  price_range_max bigint,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.reference_prices to authenticated;
grant all on public.reference_prices to service_role;
alter table public.reference_prices enable row level security;

drop policy if exists "reference prices public read" on public.reference_prices;
create policy "reference prices public read" on public.reference_prices for select to authenticated using (true);

drop policy if exists "reference prices admin write" on public.reference_prices;
create policy "reference prices admin write" on public.reference_prices for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

create or replace function public.touch_reference_price()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_reference_price on public.reference_prices;
create trigger trg_touch_reference_price before update on public.reference_prices
for each row execute function public.touch_reference_price();

create index if not exists reference_prices_name_idx on public.reference_prices (product_name);