-- Remove the admin-approval requirement for new products: they should
-- go live immediately. Change the column default for future inserts,
-- and activate any products that were stuck waiting for a review that
-- will no longer happen.
alter table public.products alter column status set default 'active';

update public.products
set status = 'active'
where status = 'pending_review';
