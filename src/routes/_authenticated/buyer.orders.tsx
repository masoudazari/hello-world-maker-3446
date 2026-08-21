import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyer/orders")({
  head: () => ({
    meta: [
      { title: "سفارش‌های من | عمده‌یار" },
      { name: "description", content: "پیگیری وضعیت سفارش‌های عمده ثبت‌شده با تأمین‌کنندگان." },
      { property: "og:title", content: "سفارش‌های من" },
      { property: "og:description", content: "وضعیت پرداخت، آماده‌سازی و ارسال سفارش‌های عمده." },
    ],
  }),
  component: BuyerOrders,
});

function BuyerOrders() {
  const { data: account } = useAccount();
  const userId = account?.userId ?? null;

  const { data: orders = [] } = useQuery({
    queryKey: ["buyer-orders", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, quantity, total_amount, status, created_at, suppliers(company_name, city), purchase_requests(product_name, unit)")
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PanelShell role="buyer" title="سفارش‌های من" subtitle="سفارش‌هایی که پس از پذیرش پیشنهاد ایجاد شده‌اند.">
      {orders.length === 0 ? (
        <EmptyState title="سفارشی ثبت نشده" description="با پذیرش یکی از پیشنهادهای دریافتی، سفارش ایجاد می‌شود." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">کالا</th>
                <th className="p-3 font-medium">تأمین‌کننده</th>
                <th className="p-3 font-medium">مقدار</th>
                <th className="p-3 font-medium">مبلغ</th>
                <th className="p-3 font-medium">تاریخ</th>
                <th className="p-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 font-medium">{o.purchase_requests?.product_name ?? "—"}</td>
                  <td className="p-3">{o.suppliers?.company_name ?? "—"}</td>
                  <td className="p-3">{faNumber(Number(o.quantity))} {o.purchase_requests?.unit ?? ""}</td>
                  <td className="p-3">{toman(o.total_amount)}</td>
                  <td className="p-3 text-muted-foreground">{faDate(o.created_at)}</td>
                  <td className="p-3"><StatusBadge kind="order" value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
