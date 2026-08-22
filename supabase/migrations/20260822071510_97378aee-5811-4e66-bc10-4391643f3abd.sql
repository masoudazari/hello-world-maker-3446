-- 1) schema extensions
alter table public.profiles
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists business_description text;

alter table public.products
  add column if not exists units_per_package integer,
  add column if not exists allow_partial_package boolean not null default true,
  add column if not exists tags text[] not null default '{}';

alter table public.suppliers
  add column if not exists last_seen_at timestamptz;

alter table public.purchase_requests
  add column if not exists product_id uuid references public.products(id) on delete set null;

-- 2) promotions
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_percent integer not null default 0,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '30 days'),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.promotions to anon;
grant select, insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
drop policy if exists "promotions public read" on public.promotions;
create policy "promotions public read" on public.promotions for select using (is_active and now() between starts_at and ends_at);
drop policy if exists "promotions admin write" on public.promotions;
create policy "promotions admin write" on public.promotions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- 3) stock plans
create table if not exists public.stock_plans (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  quantity numeric not null,
  unit text not null default 'کارتن',
  period_days integer not null default 30,
  last_ordered_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stock_plans to authenticated;
grant all on public.stock_plans to service_role;
alter table public.stock_plans enable row level security;
drop policy if exists "stock plans own" on public.stock_plans;
create policy "stock plans own" on public.stock_plans for all to authenticated
  using (buyer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (buyer_id = auth.uid());

-- 4) request items (future multi-item support)
create table if not exists public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  product_name text not null,
  quantity numeric not null,
  unit text not null,
  description text,
  created_at timestamptz not null default now()
);
grant select on public.purchase_request_items to anon;
grant select, insert, update, delete on public.purchase_request_items to authenticated;
grant all on public.purchase_request_items to service_role;
alter table public.purchase_request_items enable row level security;
drop policy if exists "request items public read" on public.purchase_request_items;
create policy "request items public read" on public.purchase_request_items for select using (
  exists (select 1 from public.purchase_requests r where r.id = request_id and r.status <> 'closed')
);
drop policy if exists "request items buyer write" on public.purchase_request_items;
create policy "request items buyer write" on public.purchase_request_items for all to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = request_id and (r.buyer_id = auth.uid() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid()));

-- 5) packaging validation trigger
create or replace function public.validate_request_packaging()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.product_id is null then return new; end if;
  select units_per_package, allow_partial_package into p from public.products where id = new.product_id;
  if p.units_per_package is not null and p.allow_partial_package = false then
    if new.quantity <> floor(new.quantity) then
      raise exception 'این کالا فقط به صورت بسته کامل عرضه می‌شود.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_validate_request_packaging on public.purchase_requests;
create trigger trg_validate_request_packaging before insert or update on public.purchase_requests
  for each row execute function public.validate_request_packaging();

-- 6) reseed demo data for cafe & restaurant market
delete from public.reviews;
delete from public.orders;
delete from public.supplier_offers;
delete from public.purchase_request_items;
delete from public.purchase_requests where is_demo or buyer_id is null;
delete from public.product_prices;
delete from public.product_images;
delete from public.products;
delete from public.suppliers where user_id is null;
delete from public.categories;

insert into public.categories (name, slug, icon, sort_order, status) values
  ('نوشیدنی','beverages','cup-soda',1,'active'),
  ('قهوه و چای','coffee-tea','coffee',2,'active'),
  ('مواد اولیه کافه','cafe-supplies','milk',3,'active'),
  ('مواد اولیه رستوران','restaurant-supplies','chef-hat',4,'active'),
  ('لبنیات','dairy','milk',5,'active'),
  ('مواد غذایی خشک','dry-goods','wheat',6,'active'),
  ('بسته‌بندی و ظروف یکبارمصرف','packaging','package',7,'active'),
  ('سایر ملزومات کافه و رستوران','other-supplies','boxes',8,'active');

insert into public.categories (name, slug, parent_id, sort_order, status)
select v.name, v.slug, c.id, v.ord, 'active' from (values
  ('نوشابه','soda','beverages',1),
  ('دلستر و ماءالشعیر','malt-drinks','beverages',2),
  ('آب معدنی','mineral-water','beverages',3),
  ('نوشیدنی انرژی‌زا','energy-drinks','beverages',4),
  ('آبمیوه','juice','beverages',5),
  ('نوشیدنی ورزشی','sport-drinks','beverages',6),
  ('دانه قهوه','coffee-beans','coffee-tea',1),
  ('قهوه آسیاب‌شده','ground-coffee','coffee-tea',2),
  ('چای','tea','coffee-tea',3),
  ('دمنوش','herbal-tea','coffee-tea',4),
  ('پودر هات‌چاکلت','hot-chocolate','coffee-tea',5),
  ('شیر','milk','cafe-supplies',1),
  ('شیر گیاهی','plant-milk','cafe-supplies',2),
  ('سیروپ','syrup','cafe-supplies',3),
  ('پودر نوشیدنی','drink-powder','cafe-supplies',4),
  ('شکلات','chocolate','cafe-supplies',5),
  ('سس و تاپینگ','sauce-topping','cafe-supplies',6)
) as v(name, slug, parent, ord)
join public.categories c on c.slug = v.parent;

insert into public.suppliers (company_name, slug, business_type, city, description, verification_status, supplier_score, rating, reviews_count, deals_count, response_rate, avg_response_hours, official_invoice, is_demo, last_seen_at, founded_year)
values
  ('پخش نوشیدنی آرمان','arman-beverage','distributor','تهران','پخش سراسری نوشابه، دلستر و آب معدنی برای کافه و رستوران','verified',92,4.7,38,120,95,2,true,true, now() - interval '4 minutes',1392),
  ('قهوه سبز کارن','karen-coffee','importer','تهران','واردات دانه قهوه عربیکا و روبوستا','verified',88,4.6,25,88,90,3,true,true, now() - interval '2 hours',1395),
  ('لبنیات روزانه پارس','pars-dairy','manufacturer','کرج','تولید شیر و خامه صنعتی مخصوص کافه','verified',85,4.5,19,64,88,4,true,true, now() - interval '20 minutes',1390),
  ('پخش مواد غذایی سپهر','sepehr-foods','wholesaler','اصفهان','عمده‌فروشی مواد غذایی خشک رستورانی','verified',80,4.3,14,47,82,5,false,true, now() - interval '2 days',1394),
  ('سیروپ و تاپینگ ونیز','venice-syrup','importer','تهران','واردات سیروپ، سس و تاپینگ کافه','verified',83,4.4,21,55,86,3,true,true, now() - interval '15 minutes',1397),
  ('بسته‌بندی یکبارمصرف نیک','nik-packaging','manufacturer','مشهد','تولید لیوان و ظروف یکبارمصرف کافی‌شاپ','pending',72,4.1,9,31,75,6,false,true, now() - interval '5 days',1396),
  ('چای و دمنوش خاورمیانه','me-tea','wholesaler','گیلان','عمده‌فروشی چای شمال و دمنوش','verified',78,4.2,12,40,80,5,true,true, now() - interval '1 hours',1388),
  ('پخش پروتئین رستورانی مهر','mehr-protein','distributor','تهران','تأمین مواد اولیه پروتئینی رستوران و فست‌فود','verified',86,4.6,17,58,89,3,true,true, now() - interval '35 minutes',1393),
  ('شکلات و کاکائو نوین','novin-chocolate','manufacturer','تبریز','تولید پودر کاکائو و شکلات کافه','pending',70,4.0,7,22,70,8,false,true, now() - interval '9 days',1399),
  ('آب معدنی چشمه سبز','sabz-water','manufacturer','شیراز','تولید آب معدنی بطری و گالن','verified',81,4.3,11,36,84,4,true,true, now() - interval '3 hours',1391);

insert into public.products (supplier_id, category_id, name, slug, description, brand, unit, minimum_order, stock, city, base_price, preparation_time, shipping_method, status, is_featured, is_demo, units_per_package, allow_partial_package, tags, specs)
select s.id, c.id, v.name, v.slug, v.descr, v.brand, v.unit, v.moq, v.stock, s.city, v.price, v.prep, 'ارسال با باربری', 'active', v.featured, true, v.upp, v.partial, v.tags, '{}'::jsonb
from (values
  ('نوشابه کوکاکولا قوطی ۳۳۰','soda-coca-330','کارتن ۲۴ عددی قوطی کوکاکولا','کوکاکولا','کارتن',5,400,540000,'۱ روز کاری',true,24,false,array['نوشابه','کوکاکولا','نوشابه مشکی'],'arman-beverage','soda'),
  ('نوشابه پپسی بطری ۱.۵ لیتری','soda-pepsi-15','کارتن ۶ عددی بطری پپسی','پپسی','کارتن',5,320,320000,'۱ روز کاری',true,6,false,array['نوشابه','پپسی','نوشابه مشکی'],'arman-beverage','soda'),
  ('نوشابه زمزم کولا خانواده','soda-zamzam','کارتن ۶ عددی زمزم کولا','زمزم','کارتن',5,280,270000,'۱ روز کاری',false,6,false,array['نوشابه','زمزم','نوشابه مشکی'],'arman-beverage','soda'),
  ('دلستر هی‌دی استوایی','malt-hey-day','کارتن ۶ عددی ماءالشعیر','هی‌دی','کارتن',5,250,330000,'۲ روز کاری',true,6,false,array['دلستر','ماءالشعیر'],'arman-beverage','malt-drinks'),
  ('ماءالشعیر جوجو لیمو','malt-jojo','کارتن ۲۴ عددی قوطی','جوجو','کارتن',5,180,600000,'۲ روز کاری',false,24,false,array['دلستر','ماءالشعیر'],'arman-beverage','malt-drinks'),
  ('نوشیدنی انرژی‌زا هایپ','energy-hype','کارتن ۲۴ عددی','هایپ','کارتن',3,120,1150000,'۲ روز کاری',false,24,false,array['انرژی زا'],'arman-beverage','energy-drinks'),
  ('آبمیوه سن‌ایچ پرتقال ۱ لیتری','juice-sunich','کارتن ۱۲ عددی','سن‌ایچ','کارتن',3,140,780000,'۲ روز کاری',false,12,false,array['آبمیوه'],'arman-beverage','juice'),
  ('نوشیدنی ورزشی ایزوتونیک','sport-iso','کارتن ۱۲ عددی','گاتورید','کارتن',3,80,960000,'۳ روز کاری',false,12,false,array['نوشیدنی ورزشی'],'arman-beverage','sport-drinks'),
  ('آب معدنی ۰.۵ لیتری','water-05','شیرینک ۱۲ عددی آب معدنی','چشمه سبز','بسته',10,900,72000,'۱ روز کاری',true,12,false,array['آب معدنی'],'sabz-water','mineral-water'),
  ('آب معدنی ۱.۵ لیتری','water-15','شیرینک ۶ عددی','چشمه سبز','بسته',10,600,96000,'۱ روز کاری',false,6,false,array['آب معدنی'],'sabz-water','mineral-water'),
  ('گالن آب ۲۰ لیتری','water-gallon','گالن آب آشامیدنی','چشمه سبز','عدد',5,300,120000,'۱ روز کاری',false,null,true,array['آب معدنی'],'sabz-water','mineral-water'),
  ('دانه قهوه عربیکا برزیل','beans-brazil','دانه قهوه تک‌خاستگاه برزیل، بسته ۱ کیلویی','کارن','کیلوگرم',5,320,1350000,'۲ روز کاری',true,null,true,array['قهوه','دانه قهوه','عربیکا'],'karen-coffee','coffee-beans'),
  ('دانه قهوه روبوستا هند','beans-robusta','دانه قهوه روبوستا هند','کارن','کیلوگرم',5,280,980000,'۲ روز کاری',false,null,true,array['قهوه','دانه قهوه','روبوستا'],'karen-coffee','coffee-beans'),
  ('میکس اسپرسو ۷۰/۳۰','beans-mix-7030','میکس تخصصی کافه','کارن','کیلوگرم',5,400,1180000,'۱ روز کاری',true,null,true,array['قهوه','میکس اسپرسو'],'karen-coffee','coffee-beans'),
  ('قهوه آسیاب‌شده ترک','ground-turkish','قهوه ترک آسیاب ریز','کارن','کیلوگرم',3,150,1050000,'۲ روز کاری',false,null,true,array['قهوه آسیاب شده'],'karen-coffee','ground-coffee'),
  ('چای سیاه ممتاز لاهیجان','tea-lahijan','چای شمال درجه یک، کیسه ۵ کیلویی','خاورمیانه','کیلوگرم',10,500,720000,'۳ روز کاری',true,null,true,array['چای'],'me-tea','tea'),
  ('چای کیسه‌ای ۱۰۰ عددی','tea-bags','کارتن ۲۴ بسته','خاورمیانه','کارتن',2,90,1450000,'۳ روز کاری',false,24,false,array['چای'],'me-tea','tea'),
  ('دمنوش گیاهی مخلوط','herbal-mix','دمنوش ترش و به‌لیمو','خاورمیانه','کیلوگرم',5,120,860000,'۳ روز کاری',false,null,true,array['دمنوش'],'me-tea','herbal-tea'),
  ('پودر هات‌چاکلت کافه','hot-choco-powder','بسته ۱ کیلویی مخصوص کافه','نوین','کیلوگرم',5,200,690000,'۲ روز کاری',true,null,true,array['هات چاکلت','شکلات'],'novin-chocolate','hot-chocolate'),
  ('پودر کاکائو ۱۰-۱۲٪','cocoa-powder','پودر کاکائو الکالایز','نوین','کیلوگرم',5,180,880000,'۲ روز کاری',false,null,true,array['کاکائو','شکلات'],'novin-chocolate','chocolate'),
  ('سس شکلات تاپینگ','sauce-chocolate','بطری ۱ کیلویی تاپینگ شکلات','ونیز','عدد',6,240,210000,'۱ روز کاری',false,null,true,array['سس','تاپینگ'],'venice-syrup','sauce-topping'),
  ('سیروپ کارامل','syrup-caramel','بطری ۱ لیتری سیروپ کارامل','ونیز','عدد',6,300,340000,'۱ روز کاری',true,null,true,array['سیروپ','کارامل'],'venice-syrup','syrup'),
  ('سیروپ وانیل','syrup-vanilla','بطری ۱ لیتری سیروپ وانیل','ونیز','عدد',6,280,330000,'۱ روز کاری',false,null,true,array['سیروپ','وانیل'],'venice-syrup','syrup'),
  ('پودر ماچا لاته','powder-matcha','بسته ۵۰۰ گرمی','ونیز','عدد',4,90,480000,'۲ روز کاری',false,null,true,array['پودر نوشیدنی','ماچا'],'venice-syrup','drink-powder'),
  ('شیر پرچرب کافه ۱ لیتری','milk-cafe','کارتن ۱۲ عددی شیر مخصوص لاته‌آرت','پارس','کارتن',5,260,384000,'۱ روز کاری',true,12,false,array['شیر'],'pars-dairy','milk'),
  ('خامه صبحانه ۱۰۰ گرمی','cream-breakfast','کارتن ۲۴ عددی','پارس','کارتن',3,180,336000,'۱ روز کاری',false,24,false,array['لبنیات','خامه'],'pars-dairy','dairy'),
  ('شیر بادام بدون شکر','milk-almond','کارتن ۱۲ عددی شیر گیاهی','پارس','کارتن',3,120,960000,'۲ روز کاری',false,12,false,array['شیر گیاهی','بادام'],'pars-dairy','plant-milk'),
  ('برنج ایرانی درجه یک','rice-iranian','کیسه ۱۰ کیلویی','سپهر','کیلوگرم',100,3000,132000,'۲ روز کاری',false,null,true,array['برنج','مواد خشک'],'sepehr-foods','dry-goods'),
  ('روغن سرخ‌کردنی صنعتی ۱۶ لیتری','oil-frying','حلب ۱۶ لیتری مخصوص فست‌فود','سپهر','عدد',4,220,1150000,'۲ روز کاری',true,null,true,array['روغن','رستوران'],'sepehr-foods','restaurant-supplies'),
  ('لیوان کاغذی ۲۴۰ سی‌سی','cup-paper-240','کارتن ۱۰۰۰ عددی لیوان کافی‌شاپ','نیک','کارتن',2,150,1450000,'۳ روز کاری',true,1000,false,array['لیوان','بسته بندی'],'nik-packaging','packaging')
) as v(name, slug, descr, brand, unit, moq, stock, price, prep, featured, upp, partial, tags, sup, cat)
join public.suppliers s on s.slug = v.sup
join public.categories c on c.slug = v.cat;

insert into public.purchase_requests (product_name, quantity, unit, quality, delivery_city, required_date, description, status, is_demo, category_id, expires_at)
select v.name, v.qty, v.unit, 'any', v.city, v.tf, v.descr, v.status, true, c.id, now() + interval '14 days'
from (values
  ('نوشابه کوکاکولا قوطی',10,'کارتن','تهران','3days','برای کافه در محدوده ونک، تحویل تا ۳ روز','offers_received','soda'),
  ('دلستر هی‌دی',5,'کارتن','تهران','7days','رستوران ایتالیایی، طعم استوایی و لیمو','matching','malt-drinks'),
  ('دانه قهوه میکس اسپرسو',20,'کیلوگرم','اصفهان','urgent','کافه تخصصی، میکس ۷۰/۳۰ عربیکا','offers_received','coffee-beans'),
  ('شیر پرچرب کافه',15,'کارتن','تهران','3days','مصرف هفتگی کافه، مناسب لاته‌آرت','matching','milk'),
  ('لیوان کاغذی ۳۶۰ سی‌سی',5,'کارتن','مشهد','7days','با چاپ اختصاصی لوگو','matching','packaging'),
  ('سیروپ کارامل و وانیل',24,'عدد','تهران','7days','۱۲ عدد از هر طعم','matching','syrup'),
  ('آب معدنی نیم لیتری',40,'بسته','کرج','3days','فست‌فود، تحویل هفتگی','offers_received','mineral-water'),
  ('چای سیاه ممتاز',50,'کیلوگرم','تبریز','30days','چای شمال برای رستوران سنتی','matching','tea'),
  ('روغن سرخ‌کردنی ۱۶ لیتری',8,'عدد','تهران','urgent','فست‌فود، مصرف بالا','matching','restaurant-supplies'),
  ('پودر هات‌چاکلت',10,'کیلوگرم','شیراز','7days','کافه، کیفیت درجه یک','matching','hot-chocolate')
) as v(name, qty, unit, city, tf, descr, status, cat)
join public.categories c on c.slug = v.cat;

insert into public.promotions (title, description, discount_percent, supplier_id, starts_at, ends_at, is_active, is_demo)
select 'تخفیف ویژه نوشیدنی تابستان','۱۰٪ تخفیف روی سفارش‌های بالای ۲۰ کارتن',10,s.id, now() - interval '1 day', now() + interval '20 days', true, true
from public.suppliers s where s.slug = 'arman-beverage';
insert into public.promotions (title, description, discount_percent, category_id, starts_at, ends_at, is_active, is_demo)
select 'تخفیف قهوه کافه‌داران','۷٪ تخفیف روی دانه قهوه',7,c.id, now() - interval '1 day', now() + interval '15 days', true, true
from public.categories c where c.slug = 'coffee-beans';