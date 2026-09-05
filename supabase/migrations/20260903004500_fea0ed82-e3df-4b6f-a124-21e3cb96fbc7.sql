-- 1) RFQ anti-spam rate limiting -------------------------------------------
create or replace function public.enforce_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hourly int;
  daily int;
  dup int;
begin
  if new.buyer_id is null then
    return new;
  end if;

  select count(*) into hourly from public.purchase_requests
   where buyer_id = new.buyer_id and created_at > now() - interval '1 hour';
  if hourly >= 5 then
    raise exception 'RATE_LIMIT_HOURLY: حداکثر ۵ درخواست در هر ساعت مجاز است.';
  end if;

  select count(*) into daily from public.purchase_requests
   where buyer_id = new.buyer_id and created_at > now() - interval '24 hours';
  if daily >= 20 then
    raise exception 'RATE_LIMIT_DAILY: حداکثر ۲۰ درخواست در شبانه‌روز مجاز است.';
  end if;

  select count(*) into dup from public.purchase_requests
   where buyer_id = new.buyer_id
     and lower(btrim(product_name)) = lower(btrim(new.product_name))
     and created_at > now() - interval '10 minutes';
  if dup > 0 then
    raise exception 'RATE_LIMIT_DUPLICATE: درخواست مشابه به‌تازگی ثبت شده است.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_request_rate_limit on public.purchase_requests;
create trigger trg_request_rate_limit
before insert on public.purchase_requests
for each row execute function public.enforce_request_rate_limit();

-- 2) Trustworthy supplier ratings -------------------------------------------
delete from public.reviews a using public.reviews b
 where a.order_id is not null and a.order_id = b.order_id and a.ctid > b.ctid;

create unique index if not exists reviews_order_id_key on public.reviews(order_id) where order_id is not null;

drop policy if exists "reviews buyer insert" on public.reviews;
create policy "reviews buyer insert on completed order"
on public.reviews for insert to authenticated
with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.orders o
     where o.id = reviews.order_id
       and o.buyer_id = auth.uid()
       and o.supplier_id = reviews.supplier_id
       and o.status = 'completed'
  )
);

create or replace function public.recompute_supplier_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := coalesce(new.supplier_id, old.supplier_id);
begin
  update public.suppliers s
     set rating = coalesce((select round(avg(r.overall_score)::numeric, 2) from public.reviews r where r.supplier_id = sid), 0),
         reviews_count = (select count(*) from public.reviews r where r.supplier_id = sid)
   where s.id = sid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_supplier_rating on public.reviews;
create trigger trg_recompute_supplier_rating
after insert or update or delete on public.reviews
for each row execute function public.recompute_supplier_rating();

create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select user_id into uid from public.suppliers where id = new.supplier_id;
  if uid is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (uid, 'review', 'نظر جدید از خریدار',
            'امتیاز کلی: ' || new.overall_score::text, '/supplier/profile');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review
after insert on public.reviews
for each row execute function public.notify_new_review();

-- backfill ratings from real reviews
update public.suppliers s
   set rating = coalesce((select round(avg(r.overall_score)::numeric,2) from public.reviews r where r.supplier_id = s.id), 0),
       reviews_count = (select count(*) from public.reviews r where r.supplier_id = s.id);

-- 3) Structured payment terms ------------------------------------------------
create table if not exists public.product_payment_terms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  term_code text not null check (term_code in ('cash','prepay_50','net_7','net_30','net_60','check_1m','check_3m')),
  surcharge_percent numeric(5,2) not null default 0 check (surcharge_percent >= 0 and surcharge_percent <= 100),
  created_at timestamptz not null default now(),
  unique (product_id, term_code)
);

grant select on public.product_payment_terms to anon;
grant select, insert, update, delete on public.product_payment_terms to authenticated;
grant all on public.product_payment_terms to service_role;

alter table public.product_payment_terms enable row level security;

create policy "product payment terms public read"
on public.product_payment_terms for select using (true);

create policy "supplier manages own product payment terms"
on public.product_payment_terms for all to authenticated
using (exists (select 1 from public.products p join public.suppliers s on s.id = p.supplier_id
               where p.id = product_payment_terms.product_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.products p join public.suppliers s on s.id = p.supplier_id
               where p.id = product_payment_terms.product_id and s.user_id = auth.uid()));

alter table public.supplier_offers
  add column if not exists payment_term_code text,
  add column if not exists payment_surcharge_percent numeric(5,2) not null default 0;

alter table public.orders
  add column if not exists payment_term_code text,
  add column if not exists payment_surcharge_percent numeric(5,2) not null default 0,
  add column if not exists payment_surcharge_amount bigint not null default 0;

-- 4) Realtime for live notifications ----------------------------------------
alter table public.notifications replica identity full;
alter table public.request_messages replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.request_messages;
  exception when duplicate_object then null;
  end;
end;
$$;