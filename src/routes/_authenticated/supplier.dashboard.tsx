import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell, StatCard } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faNumber, timeAgo, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/dashboard")({
  head: () => ({
    meta: [
      { title: "داشبورد تأمین‌کننده | عمده‌یار" },
      { name: "description", content: "مدیریت پیشنهادهای قیمت، محصولات و سفارش‌های فروش عمده." },
      { property: "og:title", content: "داشبورد تأمین‌کننده عمده‌یار" },
      { property: "og:description", content: "فرصت‌های فروش عمده و عملکرد فروشگاه شما." },
    ],
  }),
  component: SupplierDashboard,
});

function SupplierDashboard() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;

  const { data } = useQuery({
    queryKey: ["supplier-dashboard", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const [supplier, offers, products, orders] = await Promise.all([
        supabase.from("suppliers").select("company_name, verification_status, rating, supplier_score, deals_count").eq("id", supplierId!).maybeSingle(),
        supabase
          .from("supplier_offers")
          .select("id, unit_price, status, created_at, purchase_requests(product_name)")
          .eq("supplier_id", supplierId!)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("products").select("id, status").eq("supplier_id", supplierId!),
        supabase.from("orders").select("id, total_amount").eq("supplier_id", supplierId!),
      ]);
      return {
        supplier: supplier.data,
        offers: offers.data ?? [],
        products: products.data ?? [],
        orders: orders.data ?? [],
      };
    },
  });

  const revenue = (data?.orders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  return (
    <PanelShell
      role="supplier"
      title={data?.supplier?.company_name ?? "داشبورد تأمین‌کننده"}
      subtitle="عملکرد فروشگاه و آخرین پیشنهادهای ارسالی"
      action={
        <Button asChild>
          <Link to="/supplier/requests">مشاهده فرصت‌های فروش</Link>
        </Button>
      }
    >
      {!supplierId ? (
        <EmptyState
          title="پروفایل فروشگاه شما کامل نیست"
          description="برای ارسال پیشنهاد قیمت ابتدا اطلاعات فروشگاه را تکمیل کنید."
          action={
            <Button asChild>
              <Link to="/supplier/profile">تکمیل پروفایل</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="پیشنهادهای ارسالی" value={faNumber(data?.offers.length ?? 0)} />
            <StatCard label="محصولات" value={faNumber(data?.products.length ?? 0)} />
            <StatCard label="سفارش‌ها" value={faNumber(data?.orders.length ?? 0)} />
            <StatCard label="فروش کل" value={toman(revenue)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <span className="text-muted-foreground">وضعیت احراز هویت:</span>
            <StatusBadge kind="verification" value={data?.supplier?.verification_status} />
            <span className="text-muted-foreground">امتیاز تأمین‌کننده:</span>
            <strong>{faNumber(data?.supplier?.supplier_score ?? 0)}</strong>
          </div>

          <h2 className="mt-8 mb-3 text-sm font-bold">آخرین پیشنهادها</h2>
          {(data?.offers.length ?? 0) === 0 ? (
            <EmptyState title="هنوز پیشنهادی نداده‌اید" description="از بخش فرصت‌های فروش، به درخواست خریداران قیمت بدهید." />
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
              {data!.offers.map((offer) => (
                <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">{offer.purchase_requests?.product_name ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(offer.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary">{toman(offer.unit_price)}</span>
                    <StatusBadge kind="offer" value={offer.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}
