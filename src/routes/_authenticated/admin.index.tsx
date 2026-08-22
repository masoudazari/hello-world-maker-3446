import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell, StatCard } from "@/components/layout/PanelShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { faNumber } from "@/lib/format";

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
      const [suppliers, pendingSuppliers, products, pendingProducts, requests, offers] = await Promise.all([
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("purchase_requests").select("id", { count: "exact", head: true }),
        supabase.from("supplier_offers").select("id", { count: "exact", head: true }),
      ]);
      return {
        suppliers: suppliers.count ?? 0,
        pendingSuppliers: pendingSuppliers.count ?? 0,
        products: products.count ?? 0,
        pendingProducts: pendingProducts.count ?? 0,
        requests: requests.count ?? 0,
        offers: offers.count ?? 0,
      };
    },
  });

  return (
    <PanelShell role="admin" title="داشبورد مدیریت" subtitle="وضعیت کلی پلتفرم عمده‌یار">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="تأمین‌کنندگان" value={faNumber(data?.suppliers ?? 0)} hint={`${faNumber(data?.pendingSuppliers ?? 0)} در انتظار احراز`} />
        <StatCard label="محصولات" value={faNumber(data?.products ?? 0)} hint={`${faNumber(data?.pendingProducts ?? 0)} در انتظار تأیید`} />
        <StatCard label="درخواست‌های خرید" value={faNumber(data?.requests ?? 0)} />
        <StatCard label="پیشنهادهای قیمت" value={faNumber(data?.offers ?? 0)} />
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
