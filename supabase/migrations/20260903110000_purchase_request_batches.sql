-- =====================================================================
-- Multi-item purchase requests ("سبد" of several products submitted
-- together, e.g. Coca-Cola + coffee + Delster in one go).
--
-- Design choice: rather than redesigning the whole RFQ pipeline (fan-out,
-- offers, versioning, per-request chat — all already built and tested
-- around ONE product per request) to support N products per request row,
-- each item stays its own independent purchase_requests row — this is
-- actually more correct, since a soda wholesaler and a coffee wholesaler
-- are different suppliers who should each only see and quote the item
-- relevant to them. What's new is a shared `batch_id` that ties items
-- submitted together into one visual "order" in the buyer's UI, without
-- touching any RLS, fan-out, or offer logic already in place.
-- =====================================================================

alter table public.purchase_requests
  add column if not exists batch_id uuid;

create index if not exists purchase_requests_batch_idx on public.purchase_requests (batch_id);
