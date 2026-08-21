import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell, StatCard } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faNumber, timeAgo, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyer/dashboard")({
  head: () => ({
    meta: [
      { title: "داشبورد خریدار | عمده‌یار" },
      { name: "description", content: "مدیریت درخواست‌های خرید عمده، پیشنهادهای دریافتی و سفارش‌ها." },
      { property: "og:title", content: "داشبورد خریدار عمده‌یار" },
      { property: "og:description", content: "درخواست‌ها و سفارش‌های خرید عمده خود را مدیریت کنید." },
    ],
  }),
  component: BuyerDashboard,
});

function BuyerDashboard() {
  const { data: account } = useAccount();
  const userId = account?.userId ?? null;

  const { data } = useQuery({
    queryKey: ["buyer-dashboard", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [requests, orders] = await Promise.all([
        supabase
          .from("purchase_requests")
          .select("id, product_name, quantity, unit, status, offers_count, created_at")
          .eq("buyer_id", userId!)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("orders")
          .select("id, total_amount, status, created_at")
          .eq("buyer_id", userId!)
          .order("created_at", { ascending: false }),
      ]);
      return { requests: requests.data ?? [], orders: orders.data ?? [] };
    },
  });

  const requests = data?.requests ?? [];
  const orders = data?.orders ?? [];
  const totalOffers = requests.reduce((sum, r) => sum + (r.offers_count ?? 0), 0);
  const spent = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  return (
    <PanelShell
      role="buyer"
      title="داشبورد خریدار"
      subtitle="وضعیت درخواست‌ها و سفارش‌های شما در یک نگاه"
      action={
        <Button asChild>
          <Link to="/buyer/requests/new">ثبت درخواست خرید</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="درخواست‌های اخیر" value={faNumber(requests.length)} />
        <StatCard label="پیشنهادهای دریافتی" value={faNumber(totalOffers)} />
        <StatCard label="سفارش‌ها" value={faNumber(orders.length)} />
        <StatCard label="مجموع خرید" value={toman(spent)} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold">آخرین درخواست‌ها</h2>
      {requests.length === 0 ? (
        <EmptyState
          title="هنوز درخواستی ثبت نکرده‌اید"
          description="نیاز خود را ثبت کنید تا تأمین‌کنندگان مرتبط برایتان قیمت بدهند."
          action={
            <Button asChild>
              <Link to="/buyer/requests/new">ثبت اولین درخواست</Link>
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {requests.map((r) => (
            <Link
              key={r.id}
              to="/buyer/requests/$id"
              params={{ id: r.id }}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-secondary/40"
            >
              <div>
                <p className="text-sm font-semibold">{r.product_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {faNumber(Number(r.quantity))} {r.unit} · {timeAgo(r.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {faNumber(r.offers_count ?? 0)} پیشنهاد
                </span>
                <StatusBadge kind="request" value={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
