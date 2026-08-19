insert into public.categories (name, slug, icon, sort_order) values
('موبایل و لوازم جانبی','mobile-accessories','Smartphone',1),
('پوشاک','apparel','Shirt',2),
('کیف و کفش','bags-shoes','ShoppingBag',3),
('لوازم خانه و آشپزخانه','home-kitchen','CookingPot',4),
('آرایشی و بهداشتی','beauty-health','Sparkles',5),
('قطعات خودرو','auto-parts','Car',6),
('ابزار و تجهیزات','tools-equipment','Wrench',7),
('تجهیزات صنعتی','industrial','Factory',8),
('مواد اولیه','raw-materials','Boxes',9),
('مواد غذایی','food','Apple',10),
('تجهیزات اداری','office','Printer',11),
('سایر','other','Layers',12);

insert into public.suppliers (company_name, slug, business_type, city, description, founded_year, verification_status, supplier_score, rating, reviews_count, deals_count, response_rate, avg_response_hours, official_invoice, is_demo)
select
  'شرکت ' || (array['بازرگانی آرین','پخش سپهر','صنایع پارس','تجارت البرز','گروه کیان','بازرگانی مهر','پخش نوین','صنعت اطلس','تجارت رادین','گروه ساینا','بازرگانی دیبا','پخش کوروش','صنایع تابان','تجارت هرمس','گروه ویرا','بازرگانی سروش','پخش آتیه','صنعت پویا','تجارت زرین','گروه فرتاک'])[i],
  'demo-supplier-' || i,
  (array['manufacturer','importer','distributor','wholesaler'])[1 + (i % 4)],
  (array['تهران','اصفهان','مشهد','تبریز','شیراز','کرج','قم','اهواز'])[1 + (i % 8)],
  'تأمین‌کننده نمونه (Demo) با سابقه فعالیت در بازار عمده ایران.',
  1985 + (i % 30),
  case when i % 3 = 0 then 'verified' else case when i % 3 = 1 then 'verified' else 'pending' end end,
  55 + (i * 2) % 45,
  round((3.6 + ((i * 7) % 14) / 10.0)::numeric, 2),
  5 + (i * 3) % 60,
  10 + (i * 11) % 300,
  60 + (i * 5) % 40,
  1 + (i % 12),
  (i % 2 = 0),
  true
from generate_series(1,20) as i;

with s as (select id, city, row_number() over (order by created_at, id) rn from public.suppliers where is_demo),
     c as (select id, name, row_number() over (order by sort_order) rn from public.categories)
insert into public.products (supplier_id, category_id, name, slug, description, brand, unit, minimum_order, stock, city, base_price, preparation_time, shipping_method, status, is_featured, is_demo, specs)
select
  s.id, c.id,
  (array['کابل شارژ Type-C','شارژر فست ۲۰ وات','هدفون بلوتوثی','تیشرت نخی','شلوار جین','کفش ورزشی','کیف چرمی','ست قابلمه','آبمیوه‌گیری','کرم مرطوب‌کننده','شامپو ۱ لیتری','لنت ترمز','روغن موتور','دریل برقی','آچار فرانسه','الکتروموتور','ورق گالوانیزه','گرانول پلی‌اتیلن','برنج ایرانی','روغن آفتابگردان','کاغذ A4','زونکن اداری','پاوربانک ۱۰۰۰۰','گلس محافظ صفحه','جوراب نخی'])[1 + (i % 25)] || ' - مدل ' || i,
  'demo-product-' || i,
  'محصول نمونه (Demo) با کیفیت مناسب بازار عمده. مشخصات کامل در بخش مشخصات فنی.',
  (array['سامسونگ','شیائومی','ایرانی','بدون برند','انکر','بایسوس'])[1 + (i % 6)],
  (array['عدد','کارتن','بسته','کیلوگرم'])[1 + (i % 4)],
  (array[10,20,50,100,500])[1 + (i % 5)],
  200 + (i * 37) % 5000,
  s.city,
  ((30 + (i * 13) % 500) * 1000)::bigint,
  (array['۱ روز کاری','۲ تا ۳ روز کاری','۵ روز کاری'])[1 + (i % 3)],
  (array['باربری','پست','تیپاکس','ارسال با هماهنگی'])[1 + (i % 4)],
  'active',
  (i % 9 = 0),
  true,
  jsonb_build_object('جنس', (array['پلاستیک','فلز','نخ','چرم مصنوعی'])[1 + (i % 4)], 'گارانتی', (array['دارد','ندارد'])[1 + (i % 2)], 'بسته‌بندی', 'کارتن ۲۴ تایی')
from generate_series(1,100) as i
join s on s.rn = 1 + (i % 20)
join c on c.rn = 1 + (i % 12);

insert into public.product_prices (product_id, min_quantity, max_quantity, unit_price)
select p.id, t.minq, t.maxq, (p.base_price * t.mult)::bigint
from public.products p
cross join (values (10,49,1.00),(50,99,0.92),(100,499,0.85),(500,null,0.78)) as t(minq,maxq,mult)
where p.is_demo;

insert into public.purchase_requests (category_id, product_name, quantity, unit, quality, min_price, max_price, delivery_city, required_date, description, status, is_demo, created_at)
select
  (select id from public.categories order by sort_order offset (i % 12) limit 1),
  (array['کابل شارژ Type-C','تیشرت نخی جهت پخش','کفش ورزشی زنانه','ست قابلمه گرانیتی','کرم مرطوب‌کننده','لنت ترمز پراید','دریل برقی صنعتی','الکتروموتور تک فاز','گرانول پلی‌اتیلن','برنج ایرانی درجه یک','کاغذ A4 هفتاد گرمی','پاوربانک ۱۰۰۰۰','جوراب نخی مردانه','هدفون بلوتوثی','روغن موتور','کیف چرمی اداری','ورق گالوانیزه','شامپو صنعتی','شلوار جین مردانه','زونکن اداری'])[i],
  (array[100,200,300,500,1000,2000,5000])[1 + (i % 7)],
  (array['عدد','کارتن','بسته','کیلوگرم'])[1 + (i % 4)],
  (array['economy','normal','premium','any'])[1 + (i % 4)],
  ((20 + i) * 1000)::bigint,
  ((80 + i * 3) * 1000)::bigint,
  (array['تهران','اصفهان','مشهد','تبریز','شیراز','کرج'])[1 + (i % 6)],
  (array['urgent','3days','7days','30days','flexible'])[1 + (i % 5)],
  'درخواست نمونه (Demo) برای خرید عمده. کیفیت متوسط به بالا مدنظر است.',
  'matching',
  true,
  now() - (i || ' hours')::interval
from generate_series(1,20) as i;

with r as (select id, quantity, row_number() over (order by created_at desc) rn from public.purchase_requests where is_demo),
     s as (select id, row_number() over (order by created_at, id) rn from public.suppliers where is_demo)
insert into public.supplier_offers (request_id, supplier_id, unit_price, total_price, available_quantity, min_supply_quantity, preparation_time, shipping_time, shipping_cost, payment_terms, description, is_demo)
select r.id, s.id,
  ((70 + (i * 9) % 40) * 1000)::bigint,
  (((70 + (i * 9) % 40) * 1000) * r.quantity)::bigint,
  r.quantity * (1 + (i % 3)),
  greatest(50, r.quantity / 2),
  (array['۱ روز کاری','۳ روز کاری','۷ روز کاری'])[1 + (i % 3)],
  (array['۲ روز','۳ تا ۵ روز','۱ هفته'])[1 + (i % 3)],
  ((100 + (i % 5) * 50) * 1000)::bigint,
  (array['نقدی','۵۰٪ پیش‌پرداخت','چک ۱ ماهه'])[1 + (i % 3)],
  'پیشنهاد نمونه (Demo). امکان مذاکره روی قیمت وجود دارد.',
  true
from generate_series(1,50) as i
join r on r.rn = 1 + (i % 20)
join s on s.rn = 1 + ((i * 7) % 20)
on conflict do nothing;