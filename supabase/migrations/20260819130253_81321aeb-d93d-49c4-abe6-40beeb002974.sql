-- ===== enums =====
create type public.app_role as enum ('admin','buyer','supplier');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  mobile text,
  avatar_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ===== categories =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  sort_order int not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin write" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== suppliers =====
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  company_name text not null,
  slug text unique,
  business_type text not null default 'wholesaler',
  city text not null default 'تهران',
  address text,
  phone text,
  description text,
  logo_url text,
  founded_year int,
  verification_status text not null default 'pending',
  supplier_score int not null default 40,
  rating numeric(3,2) not null default 0,
  reviews_count int not null default 0,
  deals_count int not null default 0,
  response_rate int not null default 0,
  avg_response_hours int not null default 24,
  official_invoice boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.suppliers to anon, authenticated;
grant insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "suppliers public read" on public.suppliers for select using (true);
create policy "suppliers owner insert" on public.suppliers for insert to authenticated with check (user_id = auth.uid());
create policy "suppliers owner update" on public.suppliers for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "suppliers admin delete" on public.suppliers for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.my_supplier_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.suppliers where user_id = auth.uid() limit 1
$$;

-- ===== products =====
create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  unit text not null default 'عدد',
  minimum_order int not null default 1,
  stock int not null default 0,
  city text not null default 'تهران',
  base_price bigint not null default 0,
  preparation_time text,
  shipping_method text,
  specs jsonb not null default '{}'::jsonb,
  image_url text,
  status text not null default 'pending_review',
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read active" on public.products for select using (status = 'active');
create policy "products owner read" on public.products for select to authenticated
  using (supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'));
create policy "products owner insert" on public.products for insert to authenticated with check (supplier_id = public.my_supplier_id());
create policy "products owner update" on public.products for update to authenticated
  using (supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))
  with check (supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'));
create policy "products owner delete" on public.products for delete to authenticated
  using (supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "product images public read" on public.product_images for select using (true);
create policy "product images owner write" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))));

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_quantity int not null,
  max_quantity int,
  unit_price bigint not null
);
grant select on public.product_prices to anon, authenticated;
grant insert, update, delete on public.product_prices to authenticated;
grant all on public.product_prices to service_role;
alter table public.product_prices enable row level security;
create policy "product prices public read" on public.product_prices for select using (true);
create policy "product prices owner write" on public.product_prices for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))));

-- ===== purchase requests =====
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  product_name text not null,
  quantity numeric not null,
  unit text not null default 'عدد',
  quality text not null default 'any',
  min_price bigint,
  max_price bigint,
  delivery_city text not null default 'تهران',
  required_date text not null default 'flexible',
  description text,
  image_url text,
  status text not null default 'pending',
  offers_count int not null default 0,
  is_demo boolean not null default false,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.purchase_requests to authenticated;
grant select on public.purchase_requests to anon;
grant all on public.purchase_requests to service_role;
alter table public.purchase_requests enable row level security;
create policy "requests public read open" on public.purchase_requests for select using (status <> 'closed');
create policy "requests buyer read" on public.purchase_requests for select to authenticated
  using (buyer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "requests buyer insert" on public.purchase_requests for insert to authenticated with check (buyer_id = auth.uid());
create policy "requests buyer update" on public.purchase_requests for update to authenticated
  using (buyer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (buyer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "requests admin delete" on public.purchase_requests for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ===== supplier offers =====
create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  unit_price bigint not null,
  total_price bigint not null default 0,
  available_quantity numeric not null default 0,
  min_supply_quantity numeric,
  preparation_time text,
  shipping_time text,
  shipping_cost bigint not null default 0,
  payment_terms text,
  description text,
  status text not null default 'pending',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
grant select, insert, update, delete on public.supplier_offers to authenticated;
grant all on public.supplier_offers to service_role;
alter table public.supplier_offers enable row level security;
create policy "offers parties read" on public.supplier_offers for select to authenticated using (
  supplier_id = public.my_supplier_id()
  or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "offers supplier insert" on public.supplier_offers for insert to authenticated with check (supplier_id = public.my_supplier_id());
create policy "offers update" on public.supplier_offers for update to authenticated using (
  supplier_id = public.my_supplier_id()
  or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
) with check (true);
create policy "offers delete" on public.supplier_offers for delete to authenticated
  using (supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'));

create or replace function public.bump_offers_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.purchase_requests
    set offers_count = offers_count + 1,
        status = case when status in ('pending','matching') then 'offers_received' else status end
  where id = new.request_id;
  return new;
end; $$;
create trigger trg_bump_offers after insert on public.supplier_offers
for each row execute function public.bump_offers_count();

-- ===== orders =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  request_id uuid references public.purchase_requests(id) on delete set null,
  offer_id uuid references public.supplier_offers(id) on delete set null,
  quantity numeric not null default 0,
  total_amount bigint not null default 0,
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders parties read" on public.orders for select to authenticated
  using (buyer_id = auth.uid() or supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'));
create policy "orders buyer insert" on public.orders for insert to authenticated with check (buyer_id = auth.uid());
create policy "orders parties update" on public.orders for update to authenticated
  using (buyer_id = auth.uid() or supplier_id = public.my_supplier_id() or public.has_role(auth.uid(),'admin'))
  with check (true);

-- ===== messages =====
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  request_id uuid references public.purchase_requests(id) on delete cascade,
  message text not null,
  attachment_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages parties read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "messages send" on public.messages for insert to authenticated with check (sender_id = auth.uid());
create policy "messages mark read" on public.messages for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

-- ===== reviews =====
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  quality_score int not null default 5,
  accuracy_score int not null default 5,
  price_score int not null default 5,
  delivery_score int not null default 5,
  communication_score int not null default 5,
  overall_score numeric(3,2) not null default 5,
  comment text,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews buyer insert" on public.reviews for insert to authenticated with check (buyer_id = auth.uid());

-- ===== notifications =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications insert" on public.notifications for insert to authenticated with check (true);
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index on public.products (category_id);
create index on public.products (supplier_id);
create index on public.products (status);
create index on public.supplier_offers (request_id);
create index on public.purchase_requests (category_id);
create index on public.messages (sender_id, receiver_id);

-- account setup RPC (called by the app right after sign-up / first login)
create or replace function public.setup_account(
  _full_name text,
  _mobile text default null,
  _role public.app_role default 'buyer',
  _company_name text default null,
  _city text default 'تهران'
) returns void language plpgsql security definer set search_path = public as $$
declare r public.app_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  r := case when _role = 'admin' then 'buyer'::public.app_role else _role end;

  insert into public.profiles (id, full_name, mobile)
  values (auth.uid(), coalesce(_full_name,''), _mobile)
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
    mobile = coalesce(excluded.mobile, public.profiles.mobile);

  if not exists (select 1 from public.user_roles where user_id = auth.uid()) then
    insert into public.user_roles (user_id, role) values (auth.uid(), r);
  end if;

  if r = 'supplier' and not exists (select 1 from public.suppliers where user_id = auth.uid()) then
    insert into public.suppliers (user_id, company_name, city)
    values (auth.uid(), coalesce(nullif(_company_name,''), coalesce(nullif(_full_name,''),'تأمین‌کننده')), coalesce(_city,'تهران'));
  end if;
end; $$;
grant execute on function public.setup_account(text,text,public.app_role,text,text) to authenticated;