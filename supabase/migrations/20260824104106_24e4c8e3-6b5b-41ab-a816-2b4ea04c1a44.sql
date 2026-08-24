-- 1. Private schema for internal helpers
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function private.my_supplier_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.suppliers where user_id = auth.uid() limit 1
$$;

create or replace function private.shares_business_context(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.messages m
    where (m.sender_id = auth.uid() and m.receiver_id = _other)
       or (m.receiver_id = auth.uid() and m.sender_id = _other)
  ) or exists (
    select 1 from public.orders o join public.suppliers s on s.id = o.supplier_id
    where (o.buyer_id = auth.uid() and s.user_id = _other)
       or (o.buyer_id = _other and s.user_id = auth.uid())
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
revoke all on function private.my_supplier_id() from public;
revoke all on function private.shares_business_context(uuid) from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.my_supplier_id() to authenticated, service_role;
grant execute on function private.shares_business_context(uuid) to authenticated, service_role;

-- 2. Recreate policies to use private helpers
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "messages parties read" on public.messages;
create policy "messages parties read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid() or private.has_role(auth.uid(), 'admin'));

drop policy if exists "product images owner write" on public.product_images;
create policy "product images owner write" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))));

drop policy if exists "product prices owner write" on public.product_prices;
create policy "product prices owner write" on public.product_prices for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (p.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))));

drop policy if exists "products owner delete" on public.products;
create policy "products owner delete" on public.products for delete to authenticated
  using (supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));
drop policy if exists "products owner insert" on public.products;
create policy "products owner insert" on public.products for insert to authenticated
  with check (supplier_id = private.my_supplier_id());
drop policy if exists "products owner read" on public.products;
create policy "products owner read" on public.products for select to authenticated
  using (supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));
drop policy if exists "products owner update" on public.products;
create policy "products owner update" on public.products for update to authenticated
  using (supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))
  with check (supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));

drop policy if exists "promotions admin write" on public.promotions;
create policy "promotions admin write" on public.promotions for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "request items buyer write" on public.purchase_request_items;
create policy "request items buyer write" on public.purchase_request_items for all to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = request_id and (r.buyer_id = auth.uid() or private.has_role(auth.uid(), 'admin'))))
  with check (exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid()));

drop policy if exists "requests admin delete" on public.purchase_requests;
create policy "requests admin delete" on public.purchase_requests for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'));
drop policy if exists "requests buyer read" on public.purchase_requests;
create policy "requests buyer read" on public.purchase_requests for select to authenticated
  using (buyer_id = auth.uid() or private.has_role(auth.uid(), 'admin'));
drop policy if exists "requests buyer update" on public.purchase_requests;
create policy "requests buyer update" on public.purchase_requests for update to authenticated
  using (buyer_id = auth.uid() or private.has_role(auth.uid(), 'admin'))
  with check (buyer_id = auth.uid() or private.has_role(auth.uid(), 'admin'));

drop policy if exists "stock plans own" on public.stock_plans;
create policy "stock plans own" on public.stock_plans for all to authenticated
  using (buyer_id = auth.uid() or private.has_role(auth.uid(), 'admin'))
  with check (buyer_id = auth.uid());

drop policy if exists "suppliers admin delete" on public.suppliers;
create policy "suppliers admin delete" on public.suppliers for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'));
drop policy if exists "suppliers owner update" on public.suppliers;
create policy "suppliers owner update" on public.suppliers for update to authenticated
  using (user_id = auth.uid() or private.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or private.has_role(auth.uid(), 'admin'));

drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or private.has_role(auth.uid(), 'admin'));

-- 3. Profiles: no public PII exposure
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable to related users" on public.profiles for select to authenticated
  using (id = auth.uid() or private.has_role(auth.uid(), 'admin') or private.shares_business_context(id));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using (auth.uid() = id or private.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = id or private.has_role(auth.uid(), 'admin'));
revoke select on public.profiles from anon;

-- 4. Notifications: only for yourself
drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert own" on public.notifications for insert to authenticated
  with check (user_id = auth.uid());

-- 5. Orders / offers: strict update checks + immutable key fields
drop policy if exists "orders parties update" on public.orders;
drop policy if exists "orders parties read" on public.orders;
create policy "orders parties read" on public.orders for select to authenticated
  using (buyer_id = auth.uid() or supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));
create policy "orders parties update" on public.orders for update to authenticated
  using (buyer_id = auth.uid() or supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))
  with check (buyer_id = auth.uid() or supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));

drop policy if exists "offers parties read" on public.supplier_offers;
create policy "offers parties read" on public.supplier_offers for select to authenticated
  using (supplier_id = private.my_supplier_id()
    or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
    or private.has_role(auth.uid(), 'admin'));
drop policy if exists "offers supplier insert" on public.supplier_offers;
create policy "offers supplier insert" on public.supplier_offers for insert to authenticated
  with check (supplier_id = private.my_supplier_id());
drop policy if exists "offers delete" on public.supplier_offers;
create policy "offers delete" on public.supplier_offers for delete to authenticated
  using (supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'));
drop policy if exists "offers update" on public.supplier_offers;
create policy "offers update" on public.supplier_offers for update to authenticated
  using (supplier_id = private.my_supplier_id()
    or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
    or private.has_role(auth.uid(), 'admin'))
  with check (supplier_id = private.my_supplier_id()
    or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
    or private.has_role(auth.uid(), 'admin'));

create or replace function public.guard_order_immutable_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if private.has_role(auth.uid(), 'admin') then return new; end if;
  if new.buyer_id is distinct from old.buyer_id
     or new.supplier_id is distinct from old.supplier_id
     or new.request_id is distinct from old.request_id
     or new.offer_id is distinct from old.offer_id
     or new.total_amount is distinct from old.total_amount
     or new.quantity is distinct from old.quantity then
    raise exception 'تغییر اطلاعات پایه سفارش مجاز نیست.';
  end if;
  return new;
end; $$;
revoke all on function public.guard_order_immutable_fields() from public, anon, authenticated;
drop trigger if exists trg_guard_order_fields on public.orders;
create trigger trg_guard_order_fields before update on public.orders
  for each row execute function public.guard_order_immutable_fields();

create or replace function public.guard_offer_immutable_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if private.has_role(auth.uid(), 'admin') then return new; end if;
  if new.supplier_id is distinct from old.supplier_id
     or new.request_id is distinct from old.request_id then
    raise exception 'تغییر مالکیت پیشنهاد مجاز نیست.';
  end if;
  if private.my_supplier_id() is distinct from new.supplier_id then
    -- buyer side may only change the offer status
    if new.unit_price is distinct from old.unit_price
       or new.total_price is distinct from old.total_price
       or new.available_quantity is distinct from old.available_quantity
       or new.shipping_cost is distinct from old.shipping_cost then
      raise exception 'فقط تأمین‌کننده می‌تواند شرایط پیشنهاد را تغییر دهد.';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.guard_offer_immutable_fields() from public, anon, authenticated;
drop trigger if exists trg_guard_offer_fields on public.supplier_offers;
create trigger trg_guard_offer_fields before update on public.supplier_offers
  for each row execute function public.guard_offer_immutable_fields();

-- 6. Storage: owner-only reads
drop policy if exists "uploads read for signed in" on storage.objects;
create policy "uploads read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Remove client-callable SECURITY DEFINER functions from the exposed schema
drop function if exists public.setup_account(text, text, public.app_role, text, text);
drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.my_supplier_id();