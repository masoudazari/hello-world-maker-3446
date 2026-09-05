-- Fix an interaction bug between two independently-correct features:
-- the RFQ anti-spam rate limiter (5/hour, 20/day) counts raw rows in
-- purchase_requests, but a multi-item order (batch_id) legitimately
-- inserts several rows for what is conceptually ONE buyer action
-- (e.g. "Coca-Cola + coffee + Delster" = 3 rows, 1 order). Without this
-- fix, submitting a single 5-item order could exhaust a buyer's entire
-- hourly quota. This makes the limiter count distinct orders
-- (coalesce(batch_id, id)) instead of raw rows.
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

  select count(distinct coalesce(batch_id, id)) into hourly from public.purchase_requests
   where buyer_id = new.buyer_id and created_at > now() - interval '1 hour';
  if hourly >= 5 then
    raise exception 'RATE_LIMIT_HOURLY: حداکثر ۵ سفارش (هر سفارش شامل چند قلم می‌تواند باشد) در هر ساعت مجاز است.';
  end if;

  select count(distinct coalesce(batch_id, id)) into daily from public.purchase_requests
   where buyer_id = new.buyer_id and created_at > now() - interval '24 hours';
  if daily >= 20 then
    raise exception 'RATE_LIMIT_DAILY: حداکثر ۲۰ سفارش در شبانه‌روز مجاز است.';
  end if;

  -- Duplicate-product check stays per-row (unrelated to batching): it
  -- protects against resubmitting the *same single item* repeatedly,
  -- which is orthogonal to how many items one order contains.
  select count(*) into dup from public.purchase_requests
   where buyer_id = new.buyer_id
     and lower(btrim(product_name)) = lower(btrim(new.product_name))
     and created_at > now() - interval '10 minutes'
     and (new.batch_id is null or batch_id is distinct from new.batch_id);
  if dup > 0 then
    raise exception 'RATE_LIMIT_DUPLICATE: درخواست مشابه به‌تازگی ثبت شده است.';
  end if;

  return new;
end;
$$;
