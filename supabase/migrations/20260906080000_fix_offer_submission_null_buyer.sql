-- Fix: submitting an offer could fail with
-- "null value in column buyer_id ... violates not-null constraint"
-- whenever the underlying purchase_requests row has a null buyer_id
-- (purchase_requests.buyer_id is nullable at the DB level, but the
-- Phase-3 trigger below assumed it was always present and tried to
-- insert it into request_conversations.buyer_id, which IS not-null).
-- This makes offer submission itself robust: if the request has no
-- buyer_id, we simply skip creating the conversation/notification
-- instead of aborting the whole insert.
create or replace function public.ensure_request_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
declare conv_id uuid; req_buyer uuid; req_product text;
begin
  select buyer_id, product_name into req_buyer, req_product from public.purchase_requests where id = new.request_id;

  if req_buyer is null then
    -- Nothing sensible to link a conversation to; don't block the offer.
    return new;
  end if;

  insert into public.request_conversations (request_id, buyer_id, supplier_id)
  values (new.request_id, req_buyer, new.supplier_id)
  on conflict (request_id, supplier_id) do nothing
  returning id into conv_id;

  if conv_id is null then
    select id into conv_id from public.request_conversations where request_id = new.request_id and supplier_id = new.supplier_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (req_buyer, 'offer', 'پیشنهاد قیمت جدید', format('یک پیشنهاد جدید برای «%s» دریافت کردید.', req_product), '/buyer/requests/' || new.request_id);

  return new;
end; $$;
