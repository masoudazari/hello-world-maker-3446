revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.my_supplier_id() from public, anon;
revoke all on function public.bump_offers_count() from public, anon, authenticated;
revoke all on function public.setup_account(text,text,public.app_role,text,text) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.my_supplier_id() to authenticated;
grant execute on function public.setup_account(text,text,public.app_role,text,text) to authenticated;