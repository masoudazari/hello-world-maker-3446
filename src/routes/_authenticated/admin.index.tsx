import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell, StatCard } from "@/components/layout/PanelShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fa, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "داشبورد مدیریت | عمده‌یار" },
      { name: "description", content: "نمای کلی کاربران، تأمین‌کنندگان، محصولات و درخواست‌های پلتفرم." },
      { property: "og:title", content: "داشبورد مدیریت عمده‌یار" },
      { property: "og:description", content: "مدیریت احراز هویت تأمین‌کنندگان و تأیید محصولات." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [
        suppliers,
        pendingSuppliers,
        products,
        pendingProducts,
        requests,
        requestsWeek,
        offers,
        orders,
        completedOrders,
        answeredRequests,
        activeSuppliers,
        reviews,
      ] = await Promise.all([
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("purchase_requests").select("id", { count: "exact", head: true }),
        supabase.from("purchase_requests").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("supplier_offers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("purchase_requests").select("id", { count: "exact", head: true }).gt("offers_count", 0),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).gte("last_seen_at", weekAgo),
        supabase.from("reviews").select("overall_score"),
      ]);

      const orderRows = orders.data ?? [];
      const gmv = orderRows.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
      const reviewRows = reviews.data ?? [];
      const avgRating = reviewRows.length
        ? reviewRows.reduce((s, r) => s + Number(r.overall_score ?? 0), 0) / reviewRows.length
        : 0;
      const totalRequests = requests.count ?? 0;

      return {
        suppliers: suppliers.count ?? 0,
        pendingSuppliers: pendingSuppliers.count ?? 0,
        products: products.count ?? 0,
        pendingProducts: pendingProducts.count ?? 0,
        requests: totalRequests,
        requestsWeek: requestsWeek.count ?? 0,
        offers: offers.count ?? 0,
        orders: orderRows.length,
        completedOrders: completedOrders.count ?? 0,
        gmv,
        activeSuppliers: activeSuppliers.count ?? 0,
        reviews: reviewRows.length,
        avgRating,
        conversionRate: totalRequests > 0 ? (orderRows.length / totalRequests) * 100 : 0,
        answerRate: totalRequests > 0 ? ((answeredRequests.count ?? 0) / totalRequests) * 100 : 0,
      };
    },
  });

  const pct = (value: number | undefined) => `${fa((value ?? 0).toFixed(1))}٪`;

  return (
    <PanelShell role="admin" title="داشبورد مدیریت" subtitle="وضعیت کلی پلتفرم عمده‌یار">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="تأمین‌کنندگان" value={faNumber(data?.suppliers ?? 0)} hint={`${faNumber(data?.pendingSuppliers ?? 0)} در انتظار احراز`} />
        <StatCard label="محصولات" value={faNumber(data?.products ?? 0)} hint={`${faNumber(data?.pendingProducts ?? 0)} در انتظار تأیید`} />
        <StatCard label="درخواست‌های خرید" value={faNumber(data?.requests ?? 0)} hint={`${faNumber(data?.requestsWeek ?? 0)} در ۷ روز اخیر`} />
        <StatCard label="پیشنهادهای قیمت" value={faNumber(data?.offers ?? 0)} />
      </div>

      <h2 className="mt-8 text-sm font-bold">سلامت پلتفرم</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="تبدیل درخواست به سفارش"
          value={pct(data?.conversionRate)}
          hint={`${faNumber(data?.orders ?? 0)} سفارش از ${faNumber(data?.requests ?? 0)} درخواست`}
        />
        <StatCard
          label="نرخ پاسخ‌گویی به درخواست‌ها"
          value={pct(data?.answerRate)}
          hint="درخواست‌هایی که حداقل یک پیشنهاد گرفته‌اند"
        />
        <StatCard label="تأمین‌کنندگان فعال هفته" value={faNumber(data?.activeSuppliers ?? 0)} />
        <StatCard label="ارزش کل معاملات" value={toman(data?.gmv ?? 0)} />
        <StatCard label="سفارش‌های تکمیل‌شده" value={faNumber(data?.completedOrders ?? 0)} />
        <StatCard
          label="میانگین امتیاز خریداران"
          value={fa((data?.avgRating ?? 0).toFixed(1))}
          hint={`${faNumber(data?.reviews ?? 0)} نظر ثبت‌شده`}
        />
      </div>


      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/admin/suppliers">بررسی تأمین‌کنندگان</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/products">تأیید محصولات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/requests">درخواست‌های خرید</Link>
        </Button>
      </div>
    </PanelShell>
  );
}
